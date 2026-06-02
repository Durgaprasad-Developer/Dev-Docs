import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRepositoryWithStats } from '@/services/ingestion';
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;

  const repo = await getRepositoryWithStats(id);
  if (!repo || repo.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
  }

  const files = await prisma.file.findMany({
    where: { repositoryId: id },
    include: {
      _count: { select: { codeUnits: true } },
    },
    orderBy: { path: 'asc' },
  });

  const codeUnits = await prisma.codeUnit.findMany({
    where: { repositoryId: id },
    include: {
      file: { select: { path: true, id: true } },
      documentation: {
        select: { status: true, id: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ success: true, data: { ...repo, files, codeUnits } });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;

  const repo = await prisma.repository.findFirst({
    where: { id, userId },
  });

  if (!repo) {
    return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
  }

  await prisma.repository.delete({ where: { id } });

  logger.info('Repository deleted', { repoId: id });

  return NextResponse.json({ success: true, data: { deleted: true } });
}
