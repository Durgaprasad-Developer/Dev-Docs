import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { computeTextDiff } from '@/services/diff';
import { ApproveDocSchema } from '@/utils/validation';
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await context.params;
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const doc = await prisma.documentation.findUnique({
    where: { id },
    include: {
      codeUnit: {
        include: {
          file: {
            include: { repository: true },
          },
        },
      },
      versions: {
        orderBy: { version: 'desc' },
        take: 5,
      },
    },
  });

  if (!doc) {
    return NextResponse.json({ success: false, error: 'Documentation not found' }, { status: 404 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;
  if (doc.codeUnit.file.repository.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const prevVersion = doc.versions.find((v) => v.version === doc.version - 1);
  const diff = prevVersion
    ? computeTextDiff(prevVersion.markdown, doc.markdown)
    : null;

  return NextResponse.json({ success: true, data: { ...doc, diff } });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await context.params;
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ApproveDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 }
    );
  }

  const { action } = parsed.data;

  const doc = await prisma.documentation.findUnique({
    where: { id },
    include: {
      codeUnit: {
        include: { file: { include: { repository: true } } },
      },
    },
  });

  if (!doc) {
    return NextResponse.json({ success: false, error: 'Documentation not found' }, { status: 404 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;
  if (doc.codeUnit.file.repository.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (action === 'approve') {
    await prisma.documentation.update({
      where: { id },
      data: { status: 'CURRENT', reviewedAt: new Date() },
    });
    logger.info('Doc approved', { docId: id });
    return NextResponse.json({ success: true, data: { action: 'approved' } });
  } else {
    const prevVersion = await prisma.documentationVersion.findFirst({
      where: { documentationId: id },
      orderBy: { version: 'desc' },
    });

    if (prevVersion) {
      await prisma.documentation.update({
        where: { id },
        data: {
          markdown: prevVersion.markdown,
          status: 'CURRENT',
          version: prevVersion.version,
          reviewedAt: new Date(),
        },
      });
    }

    logger.info('Doc rejected, reverted to previous', { docId: id });
    return NextResponse.json({ success: true, data: { action: 'rejected' } });
  }
}
