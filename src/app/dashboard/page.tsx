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
  const [remoteRepos, setRemoteRepos] = useState<any[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRepos();
      fetchRemoteRepos();
    }
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

  async function fetchRemoteRepos() {
    setLoadingRemote(true);
    try {
      const res = await fetch('/api/github/repos');
      const data = await res.json();
      if (data.success) {
        setRemoteRepos(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch remote repos', err);
    } finally {
      setLoadingRemote(false);
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

  async function addRemoteRepository(repoUrl: string) {
    setAddingRepo(true);
    setAddError('');
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: repoUrl }),
      });
      const data = await res.json();

      if (data.success) {
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
    // Optimistic UI update to provide immediate feedback
    setRepos((prev) =>
      prev.map((r) => (r.id === repoId ? { ...r, status: 'ANALYZING' } : r))
    );
    try {
      await fetch(`/api/repositories/${repoId}/analyze`, { method: 'POST' });
      setTimeout(fetchRepos, 5000);
    } catch (err) {
      console.error('Failed to start analysis', err);
      // Revert on error by refetching
      fetchRepos();
    }
  }

  async function deleteRepository(repoId: string) {
    if (!confirm('Delete this repository and all its documentation?')) return;
    await fetch(`/api/repositories/${repoId}`, { method: 'DELETE' });
    setRepos((prev) => prev.filter((r) => r.id !== repoId));
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0e0c0a' }}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">

        {/* ── Header ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-7 py-4"
          style={{ background: 'rgba(14,12,10,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2e2b26' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold" style={{ color: '#F5ECD7' }}>Dashboard</h1>
              <div className="term-cursor" />
            </div>
            <p className="text-sm mt-0.5" style={{ color: '#5a5248' }}>
              {session?.user?.name ? `Welcome back, ${session.user.name}` : 'Manage your repositories'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button id="refresh-repos" onClick={fetchRepos} className="btn-ghost" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              id="add-repo-btn"
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary text-sm px-5 py-2"
            >
              <Plus className="w-4 h-4" />
              Add Repository
            </button>
          </div>
        </div>

        <div className="px-7 py-6 space-y-5">

          {/* ── Add Repo Panel ── */}
          {showAddForm && (
            <div className="glass-card animate-slide-up overflow-hidden" style={{ borderColor: 'rgba(218,119,86,0.25)' }}>
              {/* Panel header */}
              <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ background: '#141210', borderBottom: '1px solid #2e2b26' }}>
                <GitBranch className="w-4 h-4" style={{ color: '#DA7756' }} />
                <span className="font-medium text-sm" style={{ color: '#F5ECD7' }}>Add a GitHub Repository</span>
              </div>

              <div className="p-5 space-y-5">
                {/* Code comment — developer touch */}
                <div className="font-mono text-sm" style={{ color: '#5a5248' }}>
                  <span style={{ color: '#DA7756' }}>// </span>
                  select from your GitHub repositories or paste a URL below
                </div>

                {/* Remote repos grid */}
                <div>
                  <div className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: '#5a5248' }}>Your Repositories</div>
                  {loadingRemote ? (
                    <div className="flex items-center gap-2 py-4" style={{ color: '#5a5248' }}>
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#DA7756' }} />
                      <span className="text-sm">Fetching repositories...</span>
                    </div>
                  ) : remoteRepos.length === 0 ? (
                    <p className="text-sm" style={{ color: '#5a5248' }}>No repositories found. Check your GitHub token scopes.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                      {remoteRepos.map((remote) => {
                        const isAlreadyAdded = repos.some(r => r.fullName.toLowerCase() === remote.fullName.toLowerCase());
                        return (
                          <div
                            key={remote.id}
                            className="flex items-center justify-between p-3 rounded-md"
                            style={{
                              border: `1px solid ${isAlreadyAdded ? '#201e1b' : '#2e2b26'}`,
                              background: isAlreadyAdded ? 'rgba(14,12,10,0.5)' : '#141210',
                              opacity: isAlreadyAdded ? 0.5 : 1,
                            }}
                          >
                            <div className="min-w-0 mr-3">
                              <p className="text-sm font-medium truncate" style={{ color: '#F5ECD7' }}>{remote.fullName}</p>
                              {remote.description && (
                                <p className="text-xs truncate mt-0.5" style={{ color: '#5a5248' }}>{remote.description}</p>
                              )}
                            </div>
                            <button
                              disabled={addingRepo || isAlreadyAdded}
                              onClick={() => addRemoteRepository(remote.htmlUrl)}
                              className="flex-shrink-0 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-all disabled:cursor-not-allowed"
                              style={isAlreadyAdded ? {
                                background: 'transparent',
                                border: '1px solid #2e2b26',
                                color: '#5a5248',
                              } : {
                                background: 'rgba(218,119,86,0.12)',
                                border: '1px solid rgba(218,119,86,0.35)',
                                color: '#DA7756',
                                cursor: 'pointer',
                              }}
                            >
                              {addingRepo && !isAlreadyAdded ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Adding...
                                </>
                              ) : isAlreadyAdded ? 'Added' : 'Select'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div style={{ flex: 1, height: 1, background: '#2e2b26' }} />
                  <span className="text-xs font-mono" style={{ color: '#5a5248' }}>or enter URL manually</span>
                  <div style={{ flex: 1, height: 1, background: '#2e2b26' }} />
                </div>

                {/* Manual input */}
                <div className="flex gap-2">
                  <input
                    id="repo-url-input"
                    type="url"
                    placeholder="https://github.com/owner/repository"
                    value={newRepoUrl}
                    onChange={e => setNewRepoUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addRepository()}
                    className="flex-1 text-sm px-4 py-2.5 rounded-md outline-none transition-all font-mono"
                    style={{ background: '#141210', border: '1px solid #2e2b26', color: '#F5ECD7' }}
                    onFocus={e => (e.target.style.borderColor = '#DA7756')}
                    onBlur={e => (e.target.style.borderColor = '#2e2b26')}
                  />
                  <button
                    id="add-repo-submit"
                    onClick={addRepository}
                    disabled={addingRepo || !newRepoUrl.trim()}
                    className="btn-primary px-5 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {addingRepo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {addingRepo ? 'Adding...' : 'Add'}
                  </button>
                </div>

                {addError && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#f87171' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {addError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Stats ── */}
          {!loading && repos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Repos',  value: repos.length,                                     color: '#DA7756', icon: GitBranch },
                { label: 'Ready',        value: repos.filter(r => r.status === 'READY').length,   color: '#4ade80', icon: CheckCircle },
                { label: 'Analyzing',    value: repos.filter(r => r.status === 'ANALYZING').length,color: '#c084fc', icon: Loader2 },
                { label: 'Errors',       value: repos.filter(r => r.status === 'ERROR').length,   color: '#f87171', icon: AlertTriangle },
              ].map(stat => (
                <div key={stat.label} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</span>
                  </div>
                  <p className="text-sm" style={{ color: '#9a8f82' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Repo list ── */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="glass-card h-20 shimmer" />)}
            </div>
          ) : repos.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(218,119,86,0.35)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#F5ECD7' }}>No repositories yet</h3>
              <p className="text-sm mb-6" style={{ color: '#9a8f82' }}>
                Add a GitHub repository to start generating documentation automatically.
              </p>
              <button onClick={() => setShowAddForm(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add your first repository
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {repos.map(repo => {
                const st = statusConfig[repo.status] ?? statusConfig.PENDING;
                const StatusIcon = st.icon;
                return (
                  <div
                    key={repo.id}
                    className="glass-card glass-card-hover cursor-pointer"
                    onClick={() => router.push(`/repositories/${repo.id}`)}
                  >
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Repo icon */}
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(218,119,86,0.1)', border: '1px solid rgba(218,119,86,0.2)' }}>
                          <GitBranch className="w-4 h-4" style={{ color: '#DA7756' }} />
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Title row */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-sm" style={{ color: '#F5ECD7' }}>{repo.fullName}</h3>
                            {repo.language && (
                              <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: '#1c1917', border: '1px solid #2e2b26', color: '#9a8f82' }}>
                                {repo.language}
                              </span>
                            )}
                            {repo.isPrivate && (
                              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c1917', border: '1px solid #2e2b26', color: '#5a5248' }}>
                                Private
                              </span>
                            )}
                          </div>

                          {repo.description && (
                            <p className="text-sm line-clamp-1 mb-1.5" style={{ color: '#9a8f82' }}>{repo.description}</p>
                          )}

                          {/* Meta row */}
                          <div className="flex items-center gap-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full ${st.className}`}>
                              <StatusIcon className={`w-3 h-3 ${repo.status === 'ANALYZING' ? 'animate-spin' : ''}`} />
                              {st.label}
                            </span>
                            {repo._count && (
                              <span className="text-xs" style={{ color: '#5a5248' }}>{repo._count.files} files</span>
                            )}
                            <span className="text-xs" style={{ color: '#5a5248' }}>{new Date(repo.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 ml-4" onClick={e => e.stopPropagation()}>
                        {(repo.status === 'PENDING' || repo.status === 'ERROR') && (
                          <button
                            id={`analyze-${repo.id}`}
                            onClick={() => analyzeRepository(repo.id)}
                            className="btn-ghost text-xs px-3 py-1.5"
                            style={{ color: '#DA7756', borderColor: 'rgba(218,119,86,0.3)', borderWidth: 1, borderStyle: 'solid' }}
                            title="Start Analysis"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Analyze
                          </button>
                        )}
                        <a
                          href={repo.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost p-2"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          id={`delete-${repo.id}`}
                          onClick={() => deleteRepository(repo.id)}
                          className="btn-ghost p-2"
                          style={{ color: '#5a5248' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#5a5248'; }}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer status strip */}
          <div
            className="flex justify-between items-center text-xs font-mono px-4 py-2.5 rounded-md"
            style={{ background: '#141210', border: '1px solid #201e1b', color: '#5a5248' }}
          >
            <span>repos: <span style={{ color: '#DA7756' }}>{repos.length}</span></span>
            <span>status: <span style={{ color: '#4ade80' }}>operational</span></span>
            <span>engine: <span style={{ color: '#67e8f9' }}>gemini-2.5-flash</span></span>
          </div>

        </div>
      </main>
    </div>
  );
}
