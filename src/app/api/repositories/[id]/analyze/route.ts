import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { createGithubClient, getRepositoryTree, getFileContent } from '@/lib/github';
import { parseSourceFile } from '@/services/parser';
import { generateAndStoreDocumentation } from '@/services/generator';
import { generateAndStoreEmbedding } from '@/services/embeddings';
import { parseGithubUrl } from '@/lib/github';
import { createHash } from 'crypto';
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await context.params;
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;
  const accessToken = (session as typeof session & { accessToken?: string }).accessToken;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'GitHub access token required' },
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

    const tree = await getRepositoryTree(octokit, owner, repoName, repo.defaultBranch);
    logger.info(`Found ${tree.length} files for analysis`, { repoId });

    let totalUnits = 0;
    let totalDocs = 0;

    // Process files in batches
    const batchSize = 3;
    for (let i = 0; i < tree.length; i += batchSize) {
      const batch = tree.slice(i, i + batchSize);

      for (const item of batch) {
        try {
          const content = await getFileContent(octokit, owner, repoName, item.path);
          const hash = createHash('sha256').update(content).digest('hex');
          const language = /\.(ts|tsx)$/.test(item.path) ? 'typescript' : 'javascript';

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
              const codeUnit = await prisma.codeUnit.upsert({
                where: {
                  // We use a composite-like approach via findFirst + create
                  id: (
                    await prisma.codeUnit.findFirst({
                      where: {
                        fileId: file.id,
                        name: unit.name,
                        type: unit.type,
                      },
                    })
                  )?.id ?? 'create-new',
                },
                create: {
                  repositoryId: repoId,
                  fileId: file.id,
                  name: unit.name,
                  type: unit.type,
                  startLine: unit.startLine,
                  endLine: unit.endLine,
                  metadata: unit.metadata as object,
                  rawCode: unit.rawCode,
                },
                update: {
                  startLine: unit.startLine,
                  endLine: unit.endLine,
                  metadata: unit.metadata as object,
                  rawCode: unit.rawCode,
                },
              });

              const docId = await generateAndStoreDocumentation(
                codeUnit.id,
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

    await prisma.repository.update({
      where: { id: repoId },
      data: { status: 'READY' },
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
