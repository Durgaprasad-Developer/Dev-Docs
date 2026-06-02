import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chat } from '@/services/chat';
import { ChatMessageSchema } from '@/utils/validation';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ChatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 }
    );
  }

  const { repositoryId, message } = parsed.data;

  // Verify repo belongs to user
  const repo = await prisma.repository.findFirst({
    where: { id: repositoryId, userId },
  });

  if (!repo) {
    return NextResponse.json(
      { success: false, error: 'Repository not found' },
      { status: 404 }
    );
  }

  if (repo.status !== 'READY') {
    return NextResponse.json(
      {
        success: false,
        error: 'Repository analysis is not complete. Please wait for analysis to finish.',
      },
      { status: 400 }
    );
  }

  try {
    const answer = await chat(repositoryId, userId, message);
    logger.info('Chat response generated', { repositoryId, userId });
    return NextResponse.json({ success: true, data: { answer } });
  } catch (error) {
    logger.error('Chat error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;
  const { searchParams } = new URL(req.url);
  const repositoryId = searchParams.get('repositoryId');

  if (!repositoryId) {
    return NextResponse.json({ success: false, error: 'repositoryId required' }, { status: 400 });
  }

  const history = await prisma.chatHistory.findMany({
    where: { repositoryId, userId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ success: true, data: history });
}
