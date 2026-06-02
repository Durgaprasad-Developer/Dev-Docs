import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createGithubClient, getRepository, parseGithubUrl } from '@/lib/github';
import { AddRepositorySchema } from '@/utils/validation';
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types';

export async function GET(): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;

  const repositories = await prisma.repository.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { files: true } },
    },
  });

  return NextResponse.json({ success: true, data: repositories });
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id!;
  const accessToken = (session as typeof session & { accessToken?: string }).accessToken || process.env.GITHUB_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'GitHub access token not found. Please configure GITHUB_ACCESS_TOKEN in .env.local.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AddRepositorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 }
    );
  }

  const { githubUrl } = parsed.data;
  const urlParts = parseGithubUrl(githubUrl);
  if (!urlParts) {
    return NextResponse.json(
      { success: false, error: 'Invalid GitHub repository URL' },
      { status: 400 }
    );
  }

  const { owner, repo: repoName } = urlParts;

  // Check if already added
  const existing = await prisma.repository.findFirst({
    where: { fullName: `${owner}/${repoName}` },
  });

  if (existing) {
    if (existing.userId === userId) {
      // Already in the current user's dashboard
      return NextResponse.json(
        { success: false, error: 'Repository already added to your dashboard' },
        { status: 409 }
      );
    }
    // Owned by another session (e.g. demo/credentials user) — reassign to current user
    const reassigned = await prisma.repository.update({
      where: { id: existing.id },
      data: { userId, status: 'PENDING' },
    });
    return NextResponse.json({ success: true, data: reassigned }, { status: 200 });
  }


  try {
    const octokit = createGithubClient(accessToken);
    const ghRepo = await getRepository(octokit, owner, repoName);

    const repository = await prisma.repository.create({
      data: {
        name: ghRepo.name,
        fullName: ghRepo.full_name,
        githubUrl: ghRepo.html_url,
        owner: ghRepo.owner.login,
        description: ghRepo.description,
        language: ghRepo.language,
        isPrivate: ghRepo.private,
        defaultBranch: ghRepo.default_branch,
        userId,
        status: 'PENDING',
      },
    });

    logger.info('Repository added', { repoId: repository.id, fullName: repository.fullName });

    return NextResponse.json({ success: true, data: repository }, { status: 201 });
  } catch (error) {
    logger.error('Failed to add repository', { error, githubUrl });
    const msg = error instanceof Error ? error.message : 'Failed to fetch repository from GitHub';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
