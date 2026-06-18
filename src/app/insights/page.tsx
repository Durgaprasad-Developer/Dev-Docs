'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Loader2,
  ChevronDown,
  GitBranch,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  BookOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sidebar } from '@/components/Sidebar';

interface Repo {
  id: string;
  fullName: string;
  status: string;
}

interface RepoStats {
  totalFiles: number;
  totalCodeUnits: number;
  totalDocumented: number;
  staleCount: number;
  brokenCount: number;
  coveragePercent: number;
}

interface DocStatusCounts {
  CURRENT: number;
  OUTDATED: number;
  BROKEN: number;
  REVIEW_REQUIRED: number;
  PENDING_REVIEW: number;
}

interface CodeUnitLite {
  id: string;
  name: string;
  type: string;
  file?: { path?: string };
  documentation?: { status: string }[];
}

const EMPTY_STATUS: DocStatusCounts = {
  CURRENT: 0,
  OUTDATED: 0,
  BROKEN: 0,
  REVIEW_REQUIRED: 0,
  PENDING_REVIEW: 0,
};

// Visual config for each documentation status, kept in the warm terminal palette.
const STATUS_META: Record<
  keyof DocStatusCounts,
  { label: string; color: string; icon: React.ElementType }
> = {
  CURRENT: { label: 'Current', color: '#4ade80', icon: CheckCircle },
  OUTDATED: { label: 'Outdated', color: '#fbbf24', icon: Clock },
  REVIEW_REQUIRED: { label: 'Review', color: '#67e8f9', icon: AlertCircle },
  PENDING_REVIEW: { label: 'Pending', color: '#c084fc', icon: Clock },
  BROKEN: { label: 'Broken', color: '#f87171', icon: AlertTriangle },
};

export default function InsightsPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [stats, setStats] = useState<RepoStats | null>(null);
  const [statusCounts, setStatusCounts] = useState<DocStatusCounts>(EMPTY_STATUS);
  const [loadingStats, setLoadingStats] = useState(false);

  const [aiSummary, setAiSummary] = useState('');
  const [generating, setGenerating] = useState(false);

  // Load the user's analyzed repositories.
  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch('/api/repositories');
        const data = await res.json();
        if (data.success) {
          const ready = (data.data as Repo[]).filter((r) => r.status === 'READY');
          setRepos(ready);
          if (ready.length > 0) setSelectedRepo(ready[0].id);
        }
      } catch {
        // ignore — handled by empty state
      }
    }
    fetchRepos();
  }, []);

  // Whenever the selected repo changes, pull its health stats and reset the AI summary.
  useEffect(() => {
    if (selectedRepo) {
      loadHealth(selectedRepo);
      setAiSummary('');
    }
  }, [selectedRepo]);

  async function loadHealth(repoId: string) {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/repositories/${repoId}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats ?? null);

        // Tally documentation statuses from the code units the API returns.
        const counts: DocStatusCounts = { ...EMPTY_STATUS };
        const units: CodeUnitLite[] = data.data.codeUnits ?? [];
        for (const unit of units) {
          const status = unit.documentation?.[0]?.status as keyof DocStatusCounts | undefined;
          if (status && status in counts) counts[status]++;
        }
        setStatusCounts(counts);
      }
    } catch {
      setStats(null);
      setStatusCounts(EMPTY_STATUS);
    } finally {
      setLoadingStats(false);
    }
  }

  // Ask the existing RAG chat endpoint to write a documentation-health briefing.
  // This reuses the project's GenAI pipeline — no new backend needed.
  async function generateSummary() {
    if (!selectedRepo || generating) return;
    setGenerating(true);
    setAiSummary('');

    const brokenN = statusCounts.BROKEN;
    const outdatedN = statusCounts.OUTDATED;
    const reviewN = statusCounts.REVIEW_REQUIRED + statusCounts.PENDING_REVIEW;

    const prompt = `You are a documentation health advisor for this codebase. Based on the documentation you have, write a short briefing (4-6 sentences) for a developer about the state of the documentation. Current metrics: coverage ${stats?.coveragePercent ?? 0}%, ${brokenN} broken docs, ${outdatedN} outdated docs, ${reviewN} docs needing review across ${stats?.totalCodeUnits ?? 0} code units. Explain what these numbers mean, which areas to prioritise, and end with one concrete next step. Be specific and reference functions or modules where the documentation supports it. Do not invent functionality that is not documented.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: selectedRepo, message: prompt }),
      });
      const data = await res.json();
      setAiSummary(
        data.success
          ? data.data.answer
          : data.error || 'Could not generate a summary. Make sure the repository has been analyzed.'
      );
    } catch {
      setAiSummary('Network error while generating the summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  const selectedRepoName = repos.find((r) => r.id === selectedRepo)?.fullName;
  const coverage = stats?.coveragePercent ?? 0;

  // Healthy when coverage is decent and nothing is broken.
  const healthColor = coverage >= 70 && statusCounts.BROKEN === 0 ? '#4ade80' : coverage >= 40 ? '#fbbf24' : '#f87171';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0e0c0a' }}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* ── Header ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-7 py-4"
          style={{ background: 'rgba(14,12,10,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2e2b26' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(218,119,86,0.1)', border: '1px solid rgba(218,119,86,0.2)' }}
            >
              <Activity className="w-4 h-4" style={{ color: '#DA7756' }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: '#F5ECD7' }}>
                Documentation Health Insights
              </h1>
              <p className="text-sm mt-0.5" style={{ color: '#5a5248' }}>
                AI-generated briefing on your documentation freshness
              </p>
            </div>
          </div>

          {/* Repo selector */}
          <div className="relative">
            <button
              id="insights-repo-selector"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
              style={{ background: '#141210', border: '1px solid #2e2b26', color: '#F5ECD7' }}
            >
              <GitBranch className="w-3.5 h-3.5" style={{ color: '#DA7756' }} />
              <span className="max-w-48 truncate">{selectedRepoName ?? 'Select repository'}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: '#5a5248' }} />
            </button>

            {showDropdown && (
              <div
                className="absolute right-0 top-full mt-1 w-64 rounded-lg shadow-xl z-20 overflow-hidden"
                style={{ background: '#141210', border: '1px solid #2e2b26' }}
              >
                {repos.length === 0 ? (
                  <div className="px-4 py-3 text-sm" style={{ color: '#5a5248' }}>
                    No analyzed repositories
                  </div>
                ) : (
                  repos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => {
                        setSelectedRepo(repo.id);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{ color: selectedRepo === repo.id ? '#DA7756' : '#F5ECD7' }}
                    >
                      {repo.fullName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-7 py-6 space-y-5 max-w-5xl">
          {!selectedRepo ? (
            <div className="rounded-lg p-16 text-center" style={{ background: '#141210', border: '1px solid #2e2b26' }}>
              <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(218,119,86,0.35)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#F5ECD7' }}>
                No analyzed repository
              </h3>
              <p className="text-sm" style={{ color: '#9a8f82' }}>
                Analyze a repository first, then come back to see its documentation health.
              </p>
            </div>
          ) : loadingStats ? (
            <div className="flex items-center gap-2 py-10" style={{ color: '#5a5248' }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#DA7756' }} />
              <span className="text-sm">Loading documentation health...</span>
            </div>
          ) : (
            <>
              {/* ── Coverage gauge ── */}
              <div className="rounded-lg p-6" style={{ background: '#141210', border: '1px solid #2e2b26' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#5a5248' }}>
                    Documentation Coverage
                  </span>
                  <span className="text-2xl font-bold font-mono" style={{ color: healthColor }}>
                    {coverage}%
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: '#0e0c0a' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${coverage}%`, background: healthColor }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs font-mono" style={{ color: '#5a5248' }}>
                  <span>{stats?.totalCodeUnits ?? 0} code units</span>
                  <span>{stats?.totalFiles ?? 0} files</span>
                  <span>{stats?.totalDocumented ?? 0} documented</span>
                </div>
              </div>

              {/* ── Status breakdown ── */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(Object.keys(STATUS_META) as (keyof DocStatusCounts)[]).map((key) => {
                  const meta = STATUS_META[key];
                  const Icon = meta.icon;
                  return (
                    <div key={key} className="rounded-lg p-4" style={{ background: '#141210', border: '1px solid #2e2b26' }}>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        <span className="text-2xl font-bold font-mono" style={{ color: meta.color }}>
                          {statusCounts[key]}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#9a8f82' }}>{meta.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* ── AI summary ── */}
              <div className="rounded-lg overflow-hidden" style={{ background: '#141210', border: '1px solid rgba(218,119,86,0.25)' }}>
                <div
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ background: '#1c1917', borderBottom: '1px solid #2e2b26' }}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4" style={{ color: '#DA7756' }} />
                    <span className="font-medium text-sm" style={{ color: '#F5ECD7' }}>
                      AI Health Briefing
                    </span>
                  </div>
                  <button
                    id="generate-summary-btn"
                    onClick={generateSummary}
                    disabled={generating}
                    className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background: 'rgba(218,119,86,0.12)',
                      border: '1px solid rgba(218,119,86,0.35)',
                      color: '#DA7756',
                    }}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        {aiSummary ? 'Regenerate' : 'Generate Briefing'}
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5">
                  {generating ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5a5248' }}>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#DA7756', animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#DA7756', animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#DA7756', animationDelay: '300ms' }} />
                      </span>
                      Analyzing documentation...
                    </div>
                  ) : aiSummary ? (
                    <article className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSummary}</ReactMarkdown>
                    </article>
                  ) : (
                    <p className="text-sm font-mono" style={{ color: '#5a5248' }}>
                      <span style={{ color: '#DA7756' }}>// </span>
                      click <span style={{ color: '#F5ECD7' }}>Generate Briefing</span> to get an AI summary of what needs attention
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
