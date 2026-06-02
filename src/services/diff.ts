import type { DiffResult, DiffHunk, DiffLine } from '@/types';

export function computeTextDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const hunks: DiffHunk[] = [];
  const diffLines: DiffLine[] = [];

  // Build LCS-based diff using Myers algorithm (simplified)
  const lcs = computeLCS(oldLines, newLines);
  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  let oldLineNum = 1;
  let newLineNum = 1;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (
      lcsIdx < lcs.length &&
      oldIdx < oldLines.length &&
      newIdx < newLines.length &&
      oldLines[oldIdx] === lcs[lcsIdx] &&
      newLines[newIdx] === lcs[lcsIdx]
    ) {
      // Context line
      diffLines.push({
        type: 'context',
        content: oldLines[oldIdx],
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      });
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else if (
      newIdx < newLines.length &&
      (oldIdx >= oldLines.length || newLines[newIdx] !== lcs[lcsIdx])
    ) {
      // Addition
      diffLines.push({
        type: 'add',
        content: newLines[newIdx],
        newLineNumber: newLineNum++,
      });
      newIdx++;
    } else {
      // Removal
      diffLines.push({
        type: 'remove',
        content: oldLines[oldIdx],
        oldLineNumber: oldLineNum++,
      });
      oldIdx++;
    }
  }

  // Group into hunks (consecutive changed lines)
  if (diffLines.some((l) => l.type !== 'context')) {
    hunks.push({
      oldStart: 1,
      oldLines: oldLines.length,
      newStart: 1,
      newLines: newLines.length,
      lines: diffLines,
    });
  }

  return { oldContent: oldText, newContent: newText, hunks };
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = Math.min(a.length, 200); // cap for performance
  const n = Math.min(b.length, 200);
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

export function formatDiffAsMarkdown(diff: DiffResult): string {
  if (diff.hunks.length === 0) return '_No changes detected._';

  const lines: string[] = ['```diff'];
  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
      lines.push(`${prefix} ${line.content}`);
    }
  }
  lines.push('```');
  return lines.join('\n');
}

export function getDiffStats(diff: DiffResult): {
  additions: number;
  deletions: number;
  changes: number;
} {
  let additions = 0;
  let deletions = 0;

  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') additions++;
      else if (line.type === 'remove') deletions++;
    }
  }

  return { additions, deletions, changes: additions + deletions };
}
