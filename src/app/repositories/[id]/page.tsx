'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  GitBranch,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Zap,
  ExternalLink,
  Clock,
  BookOpen,
  AlertCircle,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import type { DocStatus } from '@/types';

interface RepoDetail {
  id: string;
  name: string;
  fullName: string;
  githubUrl: string;
  description?: string | null;
  language?: string | null;
  status: 'PENDING' | 'ANALYZING' | 'READY' | 'ERROR';
  lastCommit?: string | null;
  createdAt: string;
  stats: {
    totalFiles: number;
    totalCodeUnits: number;
    totalDocumented: number;
    staleCount: number;
    brokenCount: number;
    coveragePercent: number;
  };
  files: Array<{
    id: string;
    path: string;
    language?: string | null;
    size?: number | null;
    _count: { codeUnits: number };
  }>;
  codeUnits?: Array<{
    id: string;
    name: string;
    type: string;
    file: { path: string; id: string };
    documentation: Array<{ status: string; id: string }>;
  }>;
}

const statusColors: Record<DocStatus | string, string> = {
  CURRENT: 'text-emerald-400',
  OUTDATED: 'text-amber-400',
  BROKEN: 'text-red-400',
  REVIEW_REQUIRED: 'text-blue-400',
  PENDING_REVIEW: 'text-indigo-400',
};

export default function RepositoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [repo, setRepo] = useState<RepoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'units'>('files');

  useEffect(() => {
    fetchRepo();
  }, [id]);

  // Poll if analyzing
  useEffect(() => {
    if (repo?.status === 'ANALYZING') {
      const interval = setInterval(fetchRepo, 10000);
      return () => clearInterval(interval);
    }
  }, [repo?.status]);

  async function fetchRepo() {
    try {
      const res = await fetch(`/api/repositories/${id}`);
      const data = await res.json();
      if (data.success) {
        setRepo(data.data);
      } else {
        setError(data.error || 'Repository not found');
      }
    } catch {
      setError('Failed to load repository');
    } finally {
      setLoading(false);
    }
  }

  async function startAnalysis() {
    setAnalyzing(true);
    try {
      await fetch(`/api/repositories/${id}/analyze`, { method: 'POST' });
      setRepo((prev) => prev ? { ...prev, status: 'ANALYZING' } : prev);
    } catch {
      setError('Failed to start analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0a0a0f]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </main>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="flex h-screen bg-[#0a0a0f]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white">{error || 'Repository not found'}</p>
            <button onClick={() => router.push('/dashboard')} className="mt-4 text-indigo-400 text-sm hover:underline">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const statsCards = [
    { label: 'Source Files', value: repo.stats.totalFiles, icon: FileCode, color: 'text-indigo-400' },
    { label: 'Code Units', value: repo.stats.totalCodeUnits, icon: BookOpen, color: 'text-purple-400' },
    { label: 'Documented', value: repo.stats.totalDocumented, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Stale Docs', value: repo.stats.staleCount, icon: AlertTriangle, color: 'text-amber-400' },
    { label: 'Broken', value: repo.stats.brokenCount, icon: AlertCircle, color: 'text-red-400' },
    { label: 'Coverage', value: `${repo.stats.coveragePercent}%`, icon: BarChart3, color: 'text-blue-400' },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-[#2d2d4a] px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white">{repo.fullName}</h1>
                  {repo.language && (
                    <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-[#a8a8c8]">
                      {repo.language}
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p className="text-sm text-[#a8a8c8]">{repo.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(repo.status === 'PENDING' || repo.status === 'ERROR' || repo.status === 'READY') && (
                <button
                  id="analyze-btn"
                  onClick={startAnalysis}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-all"
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {repo.status === 'READY' ? 'Re-analyze' : 'Start Analysis'}
                </button>
              )}
              {repo.status === 'ANALYZING' && (
                <div className="flex items-center gap-2 text-indigo-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing... (auto-refreshes)
                </div>
              )}
              <a
                href={repo.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {statsCards.map((stat) => (
              <div key={stat.label} className="glass-card p-4">
                <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-[#a8a8c8]">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Coverage bar */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#a8a8c8]">Documentation Coverage</span>
              <span className="text-sm font-semibold text-white">{repo.stats.coveragePercent}%</span>
            </div>
            <div className="h-2 bg-[#2d2d4a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${repo.stats.coveragePercent}%` }}
              />
            </div>
          </div>

          {/* Repository Summary Card */}
          <div className="glass-card p-6 border-[#2d2d4a]">
            <h2 className="text-sm font-semibold text-white mb-4">Repository Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-xs text-[#6666a0] block font-medium">Primary Language</span>
                <span className="text-sm font-medium text-white mt-1 block">{repo.language || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-xs text-[#6666a0] block font-medium">Total Code Units</span>
                <span className="text-sm font-medium text-white mt-1 block">{repo.stats.totalCodeUnits} units</span>
              </div>
              <div>
                <span className="text-xs text-[#6666a0] block font-medium">Doc Coverage</span>
                <span className="text-sm font-medium text-white mt-1 block">{repo.stats.coveragePercent}%</span>
              </div>
              <div>
                <span className="text-xs text-[#6666a0] block font-medium">Last Ingested Commit</span>
                <span className="text-sm font-mono text-white mt-1 block truncate max-w-[150px]">{repo.lastCommit?.slice(0, 7) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Tabs header */}
          <div className="flex border-b border-[#2d2d4a] gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab('files')}
              className={`pb-3 transition-colors ${
                activeTab === 'files'
                  ? 'text-indigo-400 border-b-2 border-indigo-500 font-semibold'
                  : 'text-[#a8a8c8] hover:text-white'
              }`}
            >
              Source Files ({repo.files.length})
            </button>
            <button
              onClick={() => setActiveTab('units')}
              className={`pb-3 transition-colors ${
                activeTab === 'units'
                  ? 'text-indigo-400 border-b-2 border-indigo-500 font-semibold'
                  : 'text-[#a8a8c8] hover:text-white'
              }`}
            >
              Code Units ({repo.stats.totalCodeUnits})
            </button>
          </div>

          {/* Files Tab Content */}
          {activeTab === 'files' && (
            <div>
              {repo.files.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Clock className="w-8 h-8 text-indigo-500/50 mx-auto mb-3" />
                  <p className="text-[#a8a8c8] text-sm">
                    {repo.status === 'PENDING'
                      ? 'Start analysis to discover source files'
                      : 'No source files found yet'}
                  </p>
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="divide-y divide-[#2d2d4a]">
                    {repo.files.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => router.push(`/repositories/${id}/files/${file.id}`)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <FileCode className="w-4 h-4 text-[#6666a0]" />
                          <span className="text-sm font-mono text-[#d4d4f0]">{file.path}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {file._count.codeUnits > 0 && (
                            <span className="text-xs text-[#6666a0]">
                              {file._count.codeUnits} units
                            </span>
                          )}
                          {file.language && (
                            <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-[#a8a8c8]">
                              {file.language}
                            </span>
                          )}
                          <ChevronRight className="w-3 h-3 text-[#6666a0]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Code Units Tab Content */}
          {activeTab === 'units' && (
            <div>
              {!repo.codeUnits || repo.codeUnits.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <BookOpen className="w-8 h-8 text-indigo-500/50 mx-auto mb-3" />
                  <p className="text-[#a8a8c8] text-sm">
                    {repo.status === 'PENDING'
                      ? 'Start analysis to extract code units'
                      : 'No code units found. Ensure the repository has been analyzed.'}
                  </p>
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="divide-y divide-[#2d2d4a]">
                    {repo.codeUnits.map((unit) => {
                      const doc = unit.documentation?.[0];
                      const status = doc?.status || 'NOT_DOCUMENTED';
                      
                      return (
                        <div
                          key={unit.id}
                          onClick={() => router.push(`/repositories/${id}/files/${unit.file.id}`)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                              <span className="text-[10px] text-indigo-400 font-mono">ƒ</span>
                            </div>
                            <div>
                              <span className="text-sm font-mono text-[#d4d4f0] font-medium">{unit.name}</span>
                              <span className="text-[10px] text-[#6666a0] font-mono ml-2">in {unit.file.path}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-[#a8a8c8] font-mono capitalize">
                              {unit.type.toLowerCase()}
                            </span>
                            {status && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                                status === 'CURRENT'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : status === 'OUTDATED'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-white/5 text-[#a8a8c8] border-white/10'
                              }`}>
                                {status.replace('_', ' ').toLowerCase()}
                              </span>
                            )}
                            <ChevronRight className="w-3 h-3 text-[#6666a0]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
