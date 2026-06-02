import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

  const file = await prisma.file.findUnique({
    where: { id },
    include: {
      repository: true,
      codeUnits: {
        include: {
          documentation: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { startLine: 'asc' },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
  }

  if (file.repository.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: file });
}
