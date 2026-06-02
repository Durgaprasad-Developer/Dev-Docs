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

          {/* File list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Source Files</h2>
              <span className="text-xs text-[#a8a8c8]">{repo.files.length} files</span>
            </div>

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
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors"
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
        </div>
      </main>
    </div>
  );
}
