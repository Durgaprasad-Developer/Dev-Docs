import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { detectStaleness } from '@/services/staleness';
import { generateUpdatedDocumentation } from '@/services/generator';
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    logger.warn('GITHUB_WEBHOOK_SECRET not set — skipping signature verification');
    return true;
  }

  const expected = `sha256=${createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')}`;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const signature = req.headers.get('x-hub-signature-256') ?? '';
  const event = req.headers.get('x-github-event') ?? '';

  const rawBody = await req.text();

  // Verify webhook signature
  if (signature && !verifySignature(rawBody, signature)) {
    logger.warn('Invalid webhook signature');
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  // Only handle push events
  if (event !== 'push') {
    return NextResponse.json({ success: true, data: { ignored: true, event } });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const p = payload as {
    repository?: { full_name?: string; default_branch?: string };
    commits?: Array<{ modified?: string[]; added?: string[]; removed?: string[] }>;
    after?: string;
  };

  const fullName = p.repository?.full_name;
  if (!fullName) {
    return NextResponse.json({ success: true, data: { ignored: true } });
  }

  logger.info('Webhook received', { event, fullName });

  // Find the repository in our DB
  const repo = await prisma.repository.findFirst({
    where: { fullName },
  });

  if (!repo) {
    logger.info('Webhook for unregistered repo', { fullName });
    return NextResponse.json({ success: true, data: { ignored: true } });
  }

  // Collect all changed files from commits
  const changedFiles = new Map<
    string,
    { filename: string; status: string; additions: number; deletions: number }
  >();

  for (const commit of p.commits ?? []) {
    for (const path of commit.modified ?? []) {
      if (!changedFiles.has(path)) {
        changedFiles.set(path, {
          filename: path,
          status: 'modified',
          additions: 10,
          deletions: 5,
        });
      }
    }
    for (const path of commit.added ?? []) {
      changedFiles.set(path, { filename: path, status: 'added', additions: 50, deletions: 0 });
    }
    for (const path of commit.removed ?? []) {
      changedFiles.set(path, { filename: path, status: 'removed', additions: 0, deletions: 50 });
    }
  }

  if (changedFiles.size === 0) {
    return NextResponse.json({ success: true, data: { message: 'No relevant file changes' } });
  }

  // Run staleness detection
  const { staleDocIds, summary } = await detectStaleness(
    repo.id,
    Array.from(changedFiles.values())
  );

  // Update repository last commit
  if (p.after) {
    await prisma.repository.update({
      where: { id: repo.id },
      data: { lastCommit: p.after },
    });
  }

  logger.info('Staleness detection complete', { repoId: repo.id, summary });

  // Trigger AI update drafts for stale docs (async, non-blocking)
  for (const docId of staleDocIds.slice(0, 5)) {
    generateUpdatedDocumentation(docId, 'Code was modified', 'unknown').then(
      async (updatedMarkdown) => {
        const doc = await prisma.documentation.findUnique({ where: { id: docId } });
        if (doc) {
          await prisma.documentationVersion.create({
            data: {
              documentationId: docId,
              version: doc.version,
              markdown: doc.markdown,
              changedBy: 'ai',
            },
          });
          await prisma.documentation.update({
            where: { id: docId },
            data: {
              markdown: updatedMarkdown,
              status: 'PENDING_REVIEW',
              version: doc.version + 1,
            },
          });
          logger.info(`AI draft updated for doc ${docId}`);
        }
      }
    ).catch((err) => logger.warn(`AI draft failed for doc ${docId}`, { error: err }));
  }

  return NextResponse.json({
    success: true,
    data: { processed: changedFiles.size, stale: staleDocIds.length, summary },
  });
}
