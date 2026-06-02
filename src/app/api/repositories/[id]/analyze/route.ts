import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createGithubClient, getRepositoryTree, getFileContent, getLatestCommit } from '@/lib/github';
import { parseSourceFile } from '@/services/parser';
import { generateAndStoreDocumentation, generateUpdatedDocumentation } from '@/services/generator';
import { generateAndStoreEmbedding } from '@/services/embeddings';
import { parseGithubUrl } from '@/lib/github';
import { computeTextDiff, formatDiffAsMarkdown } from '@/services/diff';
import { createHash } from 'crypto';
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types';

function getStalenessStatus(
  oldCode: string,
  newCode: string,
  oldMeta: any,
  newMeta: any
): 'CURRENT' | 'OUTDATED' | 'REVIEW_REQUIRED' {
  if (oldCode === newCode) return 'CURRENT';

  // Compare parameters
  const oldParams = oldMeta?.parameters || [];
  const newParams = newMeta?.parameters || [];

  if (oldParams.length !== newParams.length) {
    return 'OUTDATED'; // Parameter count changed (signature change)
  }

  for (let i = 0; i < oldParams.length; i++) {
    if (oldParams[i].name !== newParams[i].name || oldParams[i].type !== newParams[i].type) {
      return 'OUTDATED'; // Parameter name or type changed (signature change)
    }
  }

  // Compare return type
  if (oldMeta?.returnType !== newMeta?.returnType) {
    return 'OUTDATED'; // Return type changed (signature change)
  }

  // Body changed but signature remains same
  return 'REVIEW_REQUIRED';
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;
  const accessToken = (session as typeof session & { accessToken?: string }).accessToken || process.env.GITHUB_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'GitHub access token required. Configure GITHUB_ACCESS_TOKEN in .env.local' },
      { status: 401 }
    );
  }

  const repo = await prisma.repository.findFirst({
    where: { id, userId },
  });

  if (!repo) {
    return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
  }

  await prisma.repository.update({
    where: { id },
    data: { status: 'ANALYZING' },
  });

  runAnalysis(id, repo, accessToken).catch((err) => {
    logger.error('Async analysis failed', { repoId: id, error: err });
  });

  return NextResponse.json({
    success: true,
    data: { message: 'Analysis started', repositoryId: id },
  });
}

async function runAnalysis(
  repoId: string,
  repo: { fullName: string; defaultBranch: string; githubUrl: string },
  accessToken: string
) {
  try {
    const parsed = parseGithubUrl(repo.githubUrl);
    if (!parsed) throw new Error('Invalid GitHub URL');

    const { owner, repo: repoName } = parsed;
    const octokit = createGithubClient(accessToken);

    const latestCommit = await getLatestCommit(octokit, owner, repoName, repo.defaultBranch);
    const tree = await getRepositoryTree(octokit, owner, repoName, repo.defaultBranch);
    logger.info(`Found ${tree.length} files for analysis`, { repoId });

    let totalUnits = 0;
    let totalDocs = 0;
    const processedCodeUnitIds = new Set<string>();

    // Process files in batches
    const batchSize = 3;
    for (let i = 0; i < tree.length; i += batchSize) {
      const batch = tree.slice(i, i + batchSize);

      for (const item of batch) {
        try {
          const content = await getFileContent(octokit, owner, repoName, item.path);
          const hash = createHash('sha256').update(content).digest('hex');
          const language =
            /\.(ts|tsx)$/.test(item.path)
              ? 'typescript'
              : /\.py$/.test(item.path)
              ? 'python'
              : 'javascript';

          const file = await prisma.file.upsert({
            where: { repositoryId_path: { repositoryId: repoId, path: item.path } },
            create: {
              repositoryId: repoId,
              path: item.path,
              hash,
              language,
              size: content.length,
            },
            update: { hash, size: content.length },
          });

          // Parse code units
          const units = parseSourceFile(content, item.path);
          totalUnits += units.length;

          logger.info(`Parsed ${units.length} units from ${item.path}`);

          // Generate docs for each unit
          for (const unit of units.slice(0, 20)) { // cap per file
            try {
              const existingCodeUnit = await prisma.codeUnit.findFirst({
                where: {
                  fileId: file.id,
                  name: unit.name,
                  type: unit.type,
                },
              });

              const existingDoc = existingCodeUnit
                ? await prisma.documentation.findFirst({
                    where: { codeUnitId: existingCodeUnit.id },
                  })
                : null;

              let codeUnitId = existingCodeUnit?.id;

              if (existingCodeUnit && existingDoc) {
                // Classify code staleness based on AST signature vs logic comparisons
                const staleness = getStalenessStatus(
                  existingCodeUnit.rawCode,
                  unit.rawCode,
                  existingCodeUnit.metadata,
                  unit.metadata
                );

                if (staleness !== 'CURRENT') {
                  logger.info(`Change detected in code unit ${unit.name} (staleness: ${staleness}), generating draft update...`);

                  const codeDiff = computeTextDiff(existingCodeUnit.rawCode, unit.rawCode);
                  const codeDiffMarkdown = formatDiffAsMarkdown(codeDiff);

                  const updatedMarkdown = await generateUpdatedDocumentation(
                    existingDoc.id,
                    codeDiffMarkdown,
                    item.path
                  );

                  // Create version history
                  await prisma.documentationVersion.create({
                    data: {
                      documentationId: existingDoc.id,
                      version: existingDoc.version,
                      markdown: existingDoc.markdown,
                      changedBy: 'ai',
                    },
                  });

                  // Update documentation and flag status (OUTDATED or REVIEW_REQUIRED)
                  await prisma.documentation.update({
                    where: { id: existingDoc.id },
                    data: {
                      markdown: updatedMarkdown,
                      status: staleness,
                      version: existingDoc.version + 1,
                    },
                  });

                  // Update code unit
                  await prisma.codeUnit.update({
                    where: { id: existingCodeUnit.id },
                    data: {
                      startLine: unit.startLine,
                      endLine: unit.endLine,
                      metadata: unit.metadata as object,
                      rawCode: unit.rawCode,
                    },
                  });

                  // Regenerate embeddings
                  try {
                    await generateAndStoreEmbedding(existingDoc.id);
                  } catch (embErr) {
                    logger.warn(`Embedding failed for ${unit.name}`, { error: embErr });
                  }
                  totalDocs++;
                } else {
                  // No code changes, just update start/end lines in case they shifted
                  await prisma.codeUnit.update({
                    where: { id: existingCodeUnit.id },
                    data: {
                      startLine: unit.startLine,
                      endLine: unit.endLine,
                    },
                  });
                }

                if (codeUnitId) processedCodeUnitIds.add(codeUnitId);
              } else {
                // Brand new code unit or undocumented code unit
                if (!codeUnitId) {
                  const created = await prisma.codeUnit.create({
                    data: {
                      repositoryId: repoId,
                      fileId: file.id,
                      name: unit.name,
                      type: unit.type,
                      startLine: unit.startLine,
                      endLine: unit.endLine,
                      metadata: unit.metadata as object,
                      rawCode: unit.rawCode,
                    },
                  });
                  codeUnitId = created.id;
                } else {
                  await prisma.codeUnit.update({
                    where: { id: codeUnitId },
                    data: {
                      startLine: unit.startLine,
                      endLine: unit.endLine,
                      metadata: unit.metadata as object,
                      rawCode: unit.rawCode,
                    },
                  });
                }

                processedCodeUnitIds.add(codeUnitId);

                const docId = await generateAndStoreDocumentation(
                  codeUnitId,
                  item.path,
                  unit
                );

                // Generate embeddings
                try {
                  await generateAndStoreEmbedding(docId);
                } catch (embErr) {
                  logger.warn(`Embedding failed for ${unit.name}`, { error: embErr });
                }
                totalDocs++;
              }
            } catch (unitErr) {
              logger.warn(`Failed to process unit ${unit.name}`, { error: unitErr });
            }
          }
        } catch (fileErr) {
          logger.warn(`Failed to process file ${item.path}`, { error: fileErr });
        }
      }

      // Rate limit buffer between batches
      await new Promise((res) => setTimeout(res, 2000));
    }

    // Flag removed functions/classes as BROKEN
    const allRepoCodeUnits = await prisma.codeUnit.findMany({
      where: { repositoryId: repoId },
      select: { id: true },
    });
    const deletedCodeUnitIds = allRepoCodeUnits
      .map((u) => u.id)
      .filter((id) => !processedCodeUnitIds.has(id));

    if (deletedCodeUnitIds.length > 0) {
      logger.info(`Flagging ${deletedCodeUnitIds.length} deleted code units as BROKEN...`);
      await prisma.documentation.updateMany({
        where: { codeUnitId: { in: deletedCodeUnitIds } },
        data: { status: 'BROKEN' },
      });
    }

    await prisma.repository.update({
      where: { id: repoId },
      data: { status: 'READY', lastCommit: latestCommit },
    });

    logger.info('Analysis complete', { repoId, totalUnits, totalDocs });
  } catch (error) {
    logger.error('Analysis pipeline failed', { repoId, error });
    await prisma.repository.update({
      where: { id: repoId },
      data: { status: 'ERROR' },
    });
  }
}
