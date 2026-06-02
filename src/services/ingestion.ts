import { prisma } from '@/lib/prisma';
import {
  createGithubClient,
  getRepository,
  getRepositoryTree,
  getFileContent,
  getLatestCommit,
  parseGithubUrl,
} from '@/lib/github';
import { logger } from '@/lib/logger';
import { createHash } from 'crypto';

export async function ingestRepository(
  repoId: string,
  accessToken: string
): Promise<void> {
  const repo = await prisma.repository.findUniqueOrThrow({ where: { id: repoId } });

  await prisma.repository.update({
    where: { id: repoId },
    data: { status: 'ANALYZING' },
  });

  try {
    const parsed = parseGithubUrl(repo.githubUrl);
    if (!parsed) throw new Error('Invalid GitHub URL');

    const { owner, repo: repoName } = parsed;
    const octokit = createGithubClient(accessToken);

    logger.info('Starting ingestion', { owner, repo: repoName });

    // Get latest commit
    const latestCommit = await getLatestCommit(octokit, owner, repoName, repo.defaultBranch);

    // Get file tree (JS/TS only)
    const tree = await getRepositoryTree(octokit, owner, repoName, repo.defaultBranch);
    logger.info(`Found ${tree.length} source files`, { repoId });

    // Process files in batches of 5
    const batchSize = 5;
    for (let i = 0; i < tree.length; i += batchSize) {
      const batch = tree.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const content = await getFileContent(octokit, owner, repoName, item.path);
            const hash = createHash('sha256').update(content).digest('hex');
            const language =
              item.path.endsWith('.ts') || item.path.endsWith('.tsx')
                ? 'typescript'
                : item.path.endsWith('.py')
                ? 'python'
                : 'javascript';

            // Upsert file
            const file = await prisma.file.upsert({
              where: {
                repositoryId_path: {
                  repositoryId: repoId,
                  path: item.path,
                },
              },
              create: {
                repositoryId: repoId,
                path: item.path,
                hash,
                lastCommit: latestCommit,
                language,
                size: content.length,
              },
              update: {
                hash,
                lastCommit: latestCommit,
                size: content.length,
              },
            });

            // Return file with content for parsing
            return { file, content };
          } catch (err) {
            logger.warn(`Failed to fetch file: ${item.path}`, { error: err });
            return null;
          }
        })
      );
    }

    // Update repository status and last commit
    await prisma.repository.update({
      where: { id: repoId },
      data: { status: 'READY', lastCommit: latestCommit },
    });

    logger.info('Ingestion complete', { repoId, files: tree.length });
  } catch (error) {
    logger.error('Ingestion failed', { repoId, error });
    await prisma.repository.update({
      where: { id: repoId },
      data: { status: 'ERROR' },
    });
    throw error;
  }
}

export async function ingestAndAnalyzeRepository(
  repoId: string,
  accessToken: string
): Promise<void> {
  const repo = await prisma.repository.findUniqueOrThrow({ where: { id: repoId } });

  await prisma.repository.update({
    where: { id: repoId },
    data: { status: 'ANALYZING' },
  });

  try {
    const parsed = parseGithubUrl(repo.githubUrl);
    if (!parsed) throw new Error('Invalid GitHub URL');

    const { owner, repo: repoName } = parsed;
    const octokit = createGithubClient(accessToken);

    logger.info('Starting full analysis', { owner, repo: repoName });

    const latestCommit = await getLatestCommit(octokit, owner, repoName, repo.defaultBranch);
    const tree = await getRepositoryTree(octokit, owner, repoName, repo.defaultBranch);

    logger.info(`Analyzing ${tree.length} source files`);

    // Fetch all file contents and store
    const filesWithContent: { fileId: string; path: string; content: string }[] = [];

    const batchSize = 5;
    for (let i = 0; i < tree.length; i += batchSize) {
      const batch = tree.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
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
                lastCommit: latestCommit,
                language,
                size: content.length,
              },
              update: { hash, lastCommit: latestCommit, size: content.length },
            });

            return { fileId: file.id, path: item.path, content };
          } catch {
            return null;
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          filesWithContent.push(result.value);
        }
      }
    }

    await prisma.repository.update({
      where: { id: repoId },
      data: { status: 'READY', lastCommit: latestCommit },
    });

    logger.info('Analysis complete', { repoId, files: filesWithContent.length });

    // Trigger parsing asynchronously (non-blocking)
    // The parser service will be called separately per file
  } catch (error) {
    logger.error('Analysis failed', { repoId, error });
    await prisma.repository.update({
      where: { id: repoId },
      data: { status: 'ERROR' },
    });
    throw error;
  }
}

export async function getRepositoryWithStats(repoId: string) {
  const repo = await prisma.repository.findUnique({
    where: { id: repoId },
    include: {
      _count: {
        select: { files: true },
      },
    },
  });

  if (!repo) return null;

  const codeUnits = await prisma.codeUnit.count({
    where: { repositoryId: repoId },
  });

  const docs = await prisma.documentation.groupBy({
    by: ['status'],
    where: {
      codeUnit: { repositoryId: repoId },
    },
    _count: { status: true },
  });

  const docCounts = docs.reduce(
    (acc, d) => ({ ...acc, [d.status]: d._count.status }),
    {} as Record<string, number>
  );

  return {
    ...repo,
    stats: {
      totalFiles: repo._count.files,
      totalCodeUnits: codeUnits,
      totalDocumented: (docCounts['CURRENT'] ?? 0) + (docCounts['OUTDATED'] ?? 0),
      staleCount: (docCounts['OUTDATED'] ?? 0) + (docCounts['REVIEW_REQUIRED'] ?? 0),
      brokenCount: docCounts['BROKEN'] ?? 0,
      coveragePercent:
        codeUnits > 0
          ? Math.round(((docCounts['CURRENT'] ?? 0) / codeUnits) * 100)
          : 0,
    },
  };
}
