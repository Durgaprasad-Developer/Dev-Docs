'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  GitCommit,
  AlertTriangle,
  Info,
  Code2,
  BookOpen,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DocWithDiff {
  id: string;
  markdown: string;
  status: string;
  version: number;
  codeUnit: {
    name: string;
    type: string;
    rawCode: string;
    file: { path: string };
  };
  versions: Array<{
    id: string;
    version: number;
    markdown: string;
  }>;
  diff: {
    hunks: Array<{ lines: DiffLine[] }>;
    oldContent: string;
    newContent: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string; icon: string }> = {
  OUTDATED: {
    label: 'Signature Changed',
    color: 'border-amber-500/30 bg-amber-500/8 text-amber-400',
    description: 'Function signature changed (parameters, return type). Gemini has drafted an updated documentation.',
    icon: 'amber',
  },
  REVIEW_REQUIRED: {
    label: 'Review Recommended',
    color: 'border-blue-500/30 bg-blue-500/8 text-blue-400',
    description: 'Internal logic changed while the signature remained the same. A human review is recommended.',
    icon: 'blue',
  },
  BROKEN: {
    label: 'Code Unit Missing',
    color: 'border-red-500/30 bg-red-500/8 text-red-400',
    description: 'This function or class was not found in the latest codebase. It may have been deleted or renamed.',
    icon: 'red',
  },
};

export default function DiffPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocWithDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);
  const [activePanel, setActivePanel] = useState<'docs' | 'code'>('docs');

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/docs/${id}`);
        const data = await res.json();
        if (data.success) setDoc(data.data);
        else setError(data.error || 'Not found');
      } catch {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [id]);

  async function handleAction(action: 'approve' | 'reject') {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/docs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setActionDone(action === 'approve' ? 'approved' : 'rejected');
        setTimeout(() => router.back(), 2000);
      }
    } catch {
      setError('Action failed');
    } finally {
      setSubmitting(false);
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

  if (error || !doc) {
    return (
      <div className="flex h-screen bg-[#0a0a0f]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white">{error || 'Not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.OUTDATED;
  const prevVersion = doc.versions?.find((v) => v.version === doc.version - 1);
  const canApprove = doc.status !== 'BROKEN';

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-[#2d2d4a] px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white font-mono">{doc.codeUnit.name}</h1>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm text-[#6666a0] font-mono">{doc.codeUnit.file.path}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!actionDone && canApprove && (
                <>
                  <button
                    id="reject-btn"
                    onClick={() => handleAction('reject')}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-lg text-red-400 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject (Revert)
                  </button>
                  <button
                    id="approve-btn"
                    onClick={() => handleAction('approve')}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-all"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                </>
              )}

              {actionDone && (
                <div className={`flex items-center gap-2 text-sm font-medium ${actionDone === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {actionDone === 'approved' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {actionDone === 'approved' ? 'Approved! Redirecting...' : 'Rejected. Reverting...'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6 max-w-6xl mx-auto">
          {/* Staleness alert */}
          <div className={`glass-card border p-4 rounded-xl flex gap-3 ${statusCfg.color}`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">
                {doc.status === 'OUTDATED' && 'Signature Changed — Stale Documentation'}
                {doc.status === 'REVIEW_REQUIRED' && 'Internal Logic Changed — Review Recommended'}
                {doc.status === 'BROKEN' && 'Code Unit Missing — Broken Documentation'}
              </p>
              <p className="text-xs text-[#a8a8c8] mt-0.5">{statusCfg.description}</p>
            </div>
          </div>

          {/* Panel toggle */}
          <div className="flex items-center justify-between">
            <div className="flex bg-[#111118] border border-[#2d2d4a] p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActivePanel('docs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activePanel === 'docs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[#a8a8c8] hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Documentation Diff
              </button>
              <button
                onClick={() => setActivePanel('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activePanel === 'code' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[#a8a8c8] hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Current Source Code
              </button>
            </div>

            {doc.diff && (
              <span className="text-xs text-[#6666a0] font-mono">
                Version {doc.version - 1} → {doc.version}
              </span>
            )}
          </div>

          {/* Documentation Diff Panel */}
          {activePanel === 'docs' && (
            <div className="space-y-4">
              {!doc.diff || doc.diff.hunks.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <GitCommit className="w-8 h-8 text-indigo-500/50 mx-auto mb-3" />
                  <p className="text-[#a8a8c8]">No previous version to diff — this is the initial version.</p>
                  <p className="text-sm text-[#6666a0] mt-1">Review the documentation below.</p>
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#2d2d4a] bg-[#111118] flex items-center gap-2">
                    <GitCommit className="w-3 h-3 text-indigo-400" />
                    <span className="text-xs font-mono text-[#a8a8c8]">Documentation diff</span>
                  </div>
                  <div className="overflow-x-auto max-h-[420px]">
                    <table className="w-full font-mono text-xs">
                      <tbody>
                        {doc.diff.hunks.flatMap((hunk, hi) =>
                          hunk.lines.map((line, li) => (
                            <tr
                              key={`${hi}-${li}`}
                              className={
                                line.type === 'add'
                                  ? 'diff-add'
                                  : line.type === 'remove'
                                  ? 'diff-remove'
                                  : ''
                              }
                            >
                              <td className="w-10 px-2 py-0.5 text-right text-[#6666a0] select-none border-r border-[#2d2d4a]">
                                {line.oldLineNumber ?? ''}
                              </td>
                              <td className="w-10 px-2 py-0.5 text-right text-[#6666a0] select-none border-r border-[#2d2d4a]">
                                {line.newLineNumber ?? ''}
                              </td>
                              <td className="w-6 px-2 py-0.5 text-center border-r border-[#2d2d4a]">
                                <span className={line.type === 'add' ? 'text-emerald-400' : line.type === 'remove' ? 'text-red-400' : 'text-[#6666a0]'}>
                                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                                </span>
                              </td>
                              <td className="px-4 py-0.5 whitespace-pre text-[#d4d4f0]">{line.content}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* New Documentation Preview */}
              <div className="glass-card border-[#2d2d4a] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#2d2d4a] bg-[#111118] flex items-center gap-2">
                  <Info className="w-3 h-3 text-indigo-400" />
                  <span className="text-xs font-mono text-[#a8a8c8]">AI Draft — New Documentation (v{doc.version})</span>
                </div>
                <div className="p-6">
                  <article className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.markdown}</ReactMarkdown>
                  </article>
                </div>
              </div>

              {/* Previous Documentation Preview */}
              {prevVersion && (
                <div className="glass-card border-[#2d2d4a] overflow-hidden opacity-70">
                  <div className="px-4 py-2.5 border-b border-[#2d2d4a] bg-[#111118] flex items-center gap-2">
                    <Info className="w-3 h-3 text-[#6666a0]" />
                    <span className="text-xs font-mono text-[#6666a0]">Previous Documentation (v{prevVersion.version})</span>
                  </div>
                  <div className="p-6">
                    <article className="prose prose-invert max-w-none opacity-60">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{prevVersion.markdown}</ReactMarkdown>
                    </article>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Source Code Panel */}
          {activePanel === 'code' && (
            <div className="glass-card border-[#2d2d4a] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#2d2d4a] bg-[#111118] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3 h-3 text-indigo-400" />
                  <span className="text-xs font-mono text-[#a8a8c8]">Current source code: {doc.codeUnit.name}</span>
                </div>
                <span className="text-[10px] font-mono text-[#6666a0]">{doc.codeUnit.file.path}</span>
              </div>
              <pre className="p-6 overflow-x-auto text-sm leading-relaxed bg-[#111118]/30 max-h-[500px]">
                <code className="text-[#e0e0ff] font-mono">{doc.codeUnit.rawCode}</code>
              </pre>
            </div>
          )}

          {/* Action Footer */}
          {!actionDone && canApprove && (
            <div className="glass-card border-[#2d2d4a] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Human-in-the-Loop Review</p>
                <p className="text-xs text-[#a8a8c8] mt-0.5">
                  <strong className="text-emerald-400">Approve</strong> to accept Gemini&apos;s draft and mark as CURRENT.&nbsp;
                  <strong className="text-red-400">Reject</strong> to revert to the previous version.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('reject')}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-lg text-red-400 text-sm font-medium transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white text-sm font-semibold transition-all"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
