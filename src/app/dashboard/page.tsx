'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  GitBranch,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Trash2,
  RefreshCw,
  BookOpen,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import type { Repository } from '@/types';

type RepoWithCount = Repository & { _count?: { files: number } };

const statusConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  PENDING: { icon: Clock, label: 'Pending', className: 'badge-pending' },
  ANALYZING: { icon: Loader2, label: 'Analyzing...', className: 'badge-pending' },
  READY: { icon: CheckCircle, label: 'Ready', className: 'badge-current' },
  ERROR: { icon: AlertTriangle, label: 'Error', className: 'badge-broken' },
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<RepoWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRepo, setAddingRepo] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [addError, setAddError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') fetchRepos();
  }, [status]);

  async function fetchRepos() {
    setLoading(true);
    try {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.success) setRepos(data.data);
    } catch (err) {
      console.error('Failed to fetch repos', err);
    } finally {
      setLoading(false);
    }
  }

  async function addRepository() {
    if (!newRepoUrl.trim()) return;
    setAddingRepo(true);
    setAddError('');

    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: newRepoUrl.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setNewRepoUrl('');
        setShowAddForm(false);
        await fetchRepos();
      } else {
        setAddError(data.error || 'Failed to add repository');
      }
    } catch {
      setAddError('Network error. Please try again.');
    } finally {
      setAddingRepo(false);
    }
  }

  async function analyzeRepository(repoId: string) {
    try {
      await fetch(`/api/repositories/${repoId}/analyze`, { method: 'POST' });
      // Poll for status update
      setRepos((prev) =>
        prev.map((r) => (r.id === repoId ? { ...r, status: 'ANALYZING' } : r))
      );
      setTimeout(fetchRepos, 5000);
    } catch (err) {
      console.error('Failed to start analysis', err);
    }
  }

  async function deleteRepository(repoId: string) {
    if (!confirm('Delete this repository and all its documentation?')) return;
    await fetch(`/api/repositories/${repoId}`, { method: 'DELETE' });
    setRepos((prev) => prev.filter((r) => r.id !== repoId));
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-[#2d2d4a] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">
                Dashboard
              </h1>
              <p className="text-sm text-[#a8a8c8]">
                {session?.user?.name ? `Welcome back, ${session.user.name}` : 'Manage your repositories'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="refresh-repos"
                onClick={fetchRepos}
                className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                id="add-repo-btn"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Repository
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Add Repo Form */}
          {showAddForm && (
            <div className="glass-card p-5 animate-slide-up">
              <h3 className="text-sm font-medium text-white mb-3">Add a GitHub Repository</h3>
              <div className="flex gap-3">
                <input
                  id="repo-url-input"
                  type="url"
                  placeholder="https://github.com/owner/repository"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRepository()}
                  className="flex-1 bg-[#111118] border border-[#2d2d4a] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#6666a0] focus:border-indigo-500 focus:outline-none transition-colors"
                />
                <button
                  id="add-repo-submit"
                  onClick={addRepository}
                  disabled={addingRepo || !newRepoUrl.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                >
                  {addingRepo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {addingRepo ? 'Adding...' : 'Add'}
                </button>
              </div>
              {addError && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {addError}
                </p>
              )}
              <p className="mt-2 text-xs text-[#6666a0]">
                Supports public repositories. Private repos require the <code>repo</code> OAuth scope.
              </p>
            </div>
          )}

          {/* Stats row */}
          {!loading && repos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Repos', value: repos.length, icon: GitBranch, color: 'text-indigo-400' },
                {
                  label: 'Ready',
                  value: repos.filter((r) => r.status === 'READY').length,
                  icon: CheckCircle,
                  color: 'text-emerald-400',
                },
                {
                  label: 'Analyzing',
                  value: repos.filter((r) => r.status === 'ANALYZING').length,
                  icon: Loader2,
                  color: 'text-blue-400',
                },
                {
                  label: 'Errors',
                  value: repos.filter((r) => r.status === 'ERROR').length,
                  icon: AlertTriangle,
                  color: 'text-red-400',
                },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                  </div>
                  <p className="text-xs text-[#a8a8c8]">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Repository List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-5 h-24 shimmer" />
              ))}
            </div>
          ) : repos.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <BookOpen className="w-12 h-12 text-indigo-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No repositories yet</h3>
              <p className="text-[#a8a8c8] text-sm mb-6">
                Add a GitHub repository to start generating documentation automatically.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Add your first repository
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => {
                const status = statusConfig[repo.status] ?? statusConfig.PENDING;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={repo.id}
                    className="glass-card glass-card-hover p-5 cursor-pointer"
                    onClick={() => router.push(`/repositories/${repo.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                          <GitBranch className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white">{repo.fullName}</h3>
                            {repo.language && (
                              <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-[#a8a8c8]">
                                {repo.language}
                              </span>
                            )}
                            {repo.isPrivate && (
                              <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-[#a8a8c8]">
                                Private
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-sm text-[#a8a8c8] mt-1 line-clamp-1">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.className}`}
                            >
                              <StatusIcon
                                className={`w-3 h-3 ${repo.status === 'ANALYZING' ? 'animate-spin' : ''}`}
                              />
                              {status.label}
                            </span>
                            {repo._count && (
                              <span className="text-xs text-[#6666a0]">
                                {repo._count.files} files
                              </span>
                            )}
                            <span className="text-xs text-[#6666a0]">
                              {new Date(repo.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        {repo.status === 'PENDING' || repo.status === 'ERROR' ? (
                          <button
                            id={`analyze-${repo.id}`}
                            onClick={() => analyzeRepository(repo.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-600/30 rounded-lg text-indigo-400 text-xs font-medium transition-all"
                            title="Start Analysis"
                          >
                            <Zap className="w-3 h-3" />
                            Analyze
                          </button>
                        ) : null}
                        <a
                          href={repo.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-white/5 rounded-lg text-[#6666a0] hover:text-white transition-all"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          id={`delete-${repo.id}`}
                          onClick={() => deleteRepository(repo.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-[#6666a0] hover:text-red-400 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
