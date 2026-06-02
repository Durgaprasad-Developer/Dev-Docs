'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  GitCommit,
  History,
  Code2,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sidebar } from '@/components/Sidebar';

interface DocDetail {
  id: string;
  markdown: string;
  status: string;
  version: number;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  codeUnit: {
    name: string;
    type: string;
    rawCode: string;
    file: {
      path: string;
      repository: { fullName: string; id: string };
    };
  };
  versions: Array<{ id: string; version: number; markdown: string; changedBy?: string; createdAt: string }>;
  diff: {
    hunks: Array<{
      lines: Array<{ type: 'add' | 'remove' | 'context'; content: string }>;
    }>;
  } | null;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  CURRENT: { label: 'Current', className: 'badge-current', icon: CheckCircle },
  OUTDATED: { label: 'Outdated', className: 'badge-outdated', icon: AlertTriangle },
  BROKEN: { label: 'Broken', className: 'badge-broken', icon: AlertCircle },
  REVIEW_REQUIRED: { label: 'Review Required', className: 'badge-review', icon: Clock },
  PENDING_REVIEW: { label: 'Pending Review', className: 'badge-pending', icon: GitCommit },
};

export default function DocumentationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'docs' | 'code' | 'history'>('docs');
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/docs/${id}`);
        const data = await res.json();
        if (data.success) setDoc(data.data);
        else setError(data.error || 'Not found');
      } catch {
        setError('Failed to load documentation');
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [id]);

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

  if (error || !doc) {
    return (
      <div className="flex h-screen bg-[#0a0a0f]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white">{error || 'Documentation not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  const statusInfo = statusConfig[doc.status] ?? statusConfig.CURRENT;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-[#2d2d4a] px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white font-mono">{doc.codeUnit.name}</h1>
                  <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-[#a8a8c8] capitalize">
                    {doc.codeUnit.type.toLowerCase()}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-sm text-[#6666a0] font-mono">{doc.codeUnit.file.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6666a0]">
              <GitCommit className="w-3 h-3" />
              v{doc.version}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {[
              { key: 'docs', label: 'Documentation', icon: CheckCircle },
              { key: 'code', label: 'Source Code', icon: Code2 },
              { key: 'history', label: `History (${doc.versions.length})`, icon: History },
            ].map((tab) => (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                    : 'text-[#a8a8c8] hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-6">
          {activeTab === 'docs' && (
            <div className="glass-card p-6 max-w-4xl">
              <article className="prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {doc.markdown}
                </ReactMarkdown>
              </article>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="glass-card p-0 overflow-hidden max-w-4xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#2d2d4a] bg-[#111118]">
                <span className="text-xs font-mono text-[#a8a8c8]">{doc.codeUnit.file.path}</span>
                <span className="text-xs text-[#6666a0]">{doc.codeUnit.type}</span>
              </div>
              <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
                <code className="text-[#e0e0ff] font-mono">{doc.codeUnit.rawCode}</code>
              </pre>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 max-w-4xl">
              {doc.versions.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <History className="w-8 h-8 text-indigo-500/50 mx-auto mb-3" />
                  <p className="text-[#a8a8c8] text-sm">No version history yet</p>
                </div>
              ) : (
                doc.versions.map((version) => (
                  <div key={version.id} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GitCommit className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-medium text-white">Version {version.version}</span>
                        {version.changedBy && (
                          <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-[#a8a8c8]">
                            by {version.changedBy}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#6666a0]">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#a8a8c8] line-clamp-3 font-mono">
                      {version.markdown.slice(0, 200)}...
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
