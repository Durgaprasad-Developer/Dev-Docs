import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createGithubClient } from '@/lib/github';
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types';

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = (session as typeof session & { accessToken?: string }).accessToken || process.env.GITHUB_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'GitHub access token not found. Please log in with GitHub.' },
      { status: 401 }
    );
  }

  try {
    const octokit = createGithubClient(accessToken);
    
    // Fetch both owner and collaborator repositories, sorted by most recently updated
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner,collaborator',
    });

    const repos = data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      description: r.description,
      language: r.language,
      isPrivate: r.private,
      defaultBranch: r.default_branch,
    }));

    return NextResponse.json({ success: true, data: repos });
  } catch (error) {
    logger.error('Failed to fetch GitHub repositories list', { error });
    const msg = error instanceof Error ? error.message : 'Failed to fetch repositories';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
