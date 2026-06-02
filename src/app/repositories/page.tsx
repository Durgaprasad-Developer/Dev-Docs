'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Plus, Loader2, CheckCircle, AlertTriangle, Clock, BookOpen, FileCode, MessageSquare } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import type { Repository } from '@/types';

interface RepoWithDocs extends Repository {
  _count?: { files: number };
  docCounts?: { current: number; stale: number; broken: number };
}

export default function RepositoriesPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<RepoWithDocs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRepos() {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.success) setRepos(data.data);
      setLoading(false);
    }
    fetchRepos();
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-[#2d2d4a] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Repositories</h1>
              <p className="text-sm text-[#a8a8c8]">All connected GitHub repositories</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Repository
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : repos.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <GitBranch className="w-12 h-12 text-indigo-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No repositories connected</h3>
              <p className="text-[#a8a8c8] text-sm mb-6">Add a GitHub repository to get started.</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Repository
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="glass-card glass-card-hover p-5 cursor-pointer"
                  onClick={() => router.push(`/repositories/${repo.id}`)}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <GitBranch className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">{repo.fullName}</h3>
                      {repo.description && (
                        <p className="text-xs text-[#a8a8c8] mt-0.5 line-clamp-2">{repo.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {repo.language && (
                      <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-[#a8a8c8]">
                        {repo.language}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      repo.status === 'READY' ? 'badge-current' :
                      repo.status === 'ANALYZING' ? 'badge-pending' :
                      repo.status === 'ERROR' ? 'badge-broken' : 'badge-review'
                    }`}>
                      {repo.status === 'READY' && <CheckCircle className="w-3 h-3" />}
                      {repo.status === 'ANALYZING' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {repo.status === 'ERROR' && <AlertTriangle className="w-3 h-3" />}
                      {repo.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {repo.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2d2d4a]">
                    <div className="flex items-center gap-1 text-xs text-[#6666a0]">
                      <FileCode className="w-3 h-3" />
                      {repo._count?.files ?? 0} files
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#6666a0]">
                      <BookOpen className="w-3 h-3" />
                      {repo.status === 'READY' ? 'Analyzed' : 'Pending'}
                    </div>
                    {repo.status === 'READY' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push('/chat'); }}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 ml-auto transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
