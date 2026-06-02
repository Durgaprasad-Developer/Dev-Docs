import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createHash } from 'crypto';
import type { DocStatus } from '@/types';

interface ChangedFile {
  filename: string;
  status: string; // 'modified' | 'added' | 'removed' | 'renamed'
  additions: number;
  deletions: number;
  patch?: string;
}

export async function detectStaleness(
  repositoryId: string,
  changedFiles: ChangedFile[]
): Promise<{
  staleDocIds: string[];
  summary: { broken: number; outdated: number; review: number };
}> {
  const staleDocIds: string[] = [];
  const summary = { broken: 0, outdated: 0, review: 0 };

  for (const changedFile of changedFiles) {
    if (!/\.(ts|tsx|js|jsx)$/.test(changedFile.filename)) continue;

    // Find the file in DB
    const file = await prisma.file.findFirst({
      where: { repositoryId, path: changedFile.filename },
      include: {
        codeUnits: {
          include: {
            documentation: { take: 1 },
          },
        },
      },
    });

    if (!file) continue;

    for (const unit of file.codeUnits) {
      if (unit.documentation.length === 0) continue;

      const doc = unit.documentation[0];
      let newStatus: DocStatus;

      if (changedFile.status === 'removed') {
        newStatus = 'BROKEN';
        summary.broken++;
      } else if (changedFile.deletions > 10 || changedFile.additions > 20) {
        // Significant change
        newStatus = 'OUTDATED';
        summary.outdated++;
      } else {
        newStatus = 'REVIEW_REQUIRED';
        summary.review++;
      }

      await prisma.documentation.update({
        where: { id: doc.id },
        data: { status: newStatus },
      });

      staleDocIds.push(doc.id);
      logger.info(`Marked doc stale: ${doc.id}`, { status: newStatus, file: changedFile.filename });
    }
  }

  return { staleDocIds, summary };
}

export async function classifyDocStaleness(
  docId: string,
  newCodeContent: string
): Promise<DocStatus> {
  const doc = await prisma.documentation.findUniqueOrThrow({
    where: { id: docId },
    include: { codeUnit: true },
  });

  const currentHash = createHash('sha256').update(doc.codeUnit.rawCode).digest('hex');
  const newHash = createHash('sha256').update(newCodeContent).digest('hex');

  if (currentHash === newHash) return 'CURRENT';

  // Check how different the code is
  const oldLines = doc.codeUnit.rawCode.split('\n').length;
  const newLines = newCodeContent.split('\n').length;
  const lineDiff = Math.abs(oldLines - newLines);
  const percentChange = lineDiff / oldLines;

  if (percentChange > 0.5) return 'BROKEN';
  if (percentChange > 0.2) return 'OUTDATED';
  return 'REVIEW_REQUIRED';
}

export async function getStalenessReport(repositoryId: string) {
  const counts = await prisma.documentation.groupBy({
    by: ['status'],
    where: {
      codeUnit: { repositoryId },
    },
    _count: { status: true },
  });

  const report: Record<DocStatus, number> = {
    CURRENT: 0,
    OUTDATED: 0,
    BROKEN: 0,
    REVIEW_REQUIRED: 0,
    PENDING_REVIEW: 0,
  };

  for (const c of counts) {
    report[c.status as DocStatus] = c._count.status;
  }

  return report;
}

export async function getStaleDocumentation(repositoryId: string) {
  return prisma.documentation.findMany({
    where: {
      status: { in: ['OUTDATED', 'BROKEN', 'REVIEW_REQUIRED'] },
      codeUnit: { repositoryId },
    },
    include: {
      codeUnit: {
        include: { file: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
