'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Loader2, AlertCircle, GitCommit } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

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
    file: { path: string };
  };
  diff: {
    hunks: Array<{ lines: DiffLine[] }>;
    oldContent: string;
    newContent: string;
  } | null;
}

export default function DiffPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocWithDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);

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

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-[#2d2d4a] px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white font-mono">{doc.codeUnit.name}</h1>
                  <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                    Needs Review
                  </span>
                </div>
                <p className="text-sm text-[#6666a0] font-mono">{doc.codeUnit.file.path}</p>
              </div>
            </div>

            {!actionDone && (
              <div className="flex items-center gap-3">
                <button
                  id="reject-btn"
                  onClick={() => handleAction('reject')}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-lg text-red-400 text-sm font-medium transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
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
              </div>
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

        <div className="px-8 py-6">
          {!doc.diff || doc.diff.hunks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <GitCommit className="w-8 h-8 text-indigo-500/50 mx-auto mb-3" />
              <p className="text-[#a8a8c8]">No diff available — this is the initial version.</p>
              <p className="text-sm text-[#6666a0] mt-1">You can still approve or reject this documentation.</p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-2 border-b border-[#2d2d4a] bg-[#111118] flex items-center gap-2">
                <GitCommit className="w-3 h-3 text-indigo-400" />
                <span className="text-xs font-mono text-[#a8a8c8]">Documentation diff — version {doc.version - 1} → {doc.version}</span>
              </div>
              <div className="overflow-x-auto">
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
        </div>
      </main>
    </div>
  );
}
