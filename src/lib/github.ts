import { Octokit } from '@octokit/rest';

export function createGithubClient(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

export async function getRepository(
  octokit: Octokit,
  owner: string,
  repo: string
) {
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
}

export async function getRepositoryTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<{ path: string; type: string; sha: string; size?: number }[]> {
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: '1',
  });

  return (data.tree as { path?: string; type?: string; sha?: string; size?: number }[])
    .filter(
      (item) =>
        item.type === 'blob' &&
        item.path &&
        /\.(ts|tsx|js|jsx|py)$/.test(item.path) &&
        !item.path.includes('node_modules') &&
        !item.path.includes('.next') &&
        !item.path.includes('dist')
    )
    .map((item) => ({
      path: item.path!,
      type: item.type!,
      sha: item.sha!,
      size: item.size,
    }));
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const { data } = await octokit.repos.getContent({ owner, repo, path });

  if ('content' in data && typeof data.content === 'string') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }

  throw new Error(`Could not get content for ${path}`);
}

export async function getLatestCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<string> {
  const { data } = await octokit.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}

export async function getCommitDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseSha: string,
  headSha: string
) {
  const { data } = await octokit.repos.compareCommits({
    owner,
    repo,
    base: baseSha,
    head: headSha,
  });
  return data.files ?? [];
}

export function parseGithubUrl(url: string): {
  owner: string;
  repo: string;
} | null {
  try {
    const cleaned = url.replace(/\.git$/, '');
    const match = cleaned.match(
      /github\.com[/:]([\w.-]+)\/([\w.-]+)/
    );
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}
