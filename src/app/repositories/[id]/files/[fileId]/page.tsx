'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Code2,
  BookOpen,
  ChevronRight,
  ExternalLink,
  GitPullRequest,
  Terminal,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sidebar } from '@/components/Sidebar';

interface Documentation {
  id: string;
  markdown: string;
  status: 'CURRENT' | 'OUTDATED' | 'BROKEN' | 'REVIEW_REQUIRED' | 'PENDING_REVIEW';
  version: number;
}

interface CodeUnit {
  id: string;
  name: string;
  type: 'FUNCTION' | 'CLASS' | 'INTERFACE' | 'METHOD' | 'VARIABLE' | 'TYPE' | 'MODULE';
  startLine: number | null;
  endLine: number | null;
  rawCode: string;
  documentation: Documentation[];
}

interface FileDetail {
  id: string;
  path: string;
  language: string | null;
  size: number | null;
  repositoryId: string;
  repository: {
    fullName: string;
  };
  codeUnits: CodeUnit[];
}

const statusColors: Record<string, string> = {
  CURRENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OUTDATED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  BROKEN: 'bg-red-500/10 text-red-400 border-red-500/20',
  REVIEW_REQUIRED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PENDING_REVIEW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function FileDocumentationPage() {
  const { id: repoId, fileId } = useParams<{ id: string; fileId: string }>();
  const router = useRouter();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<CodeUnit | null>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'code'>('docs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchFileDetails() {
      try {
        const res = await fetch(`/api/files/${fileId}`);
        const data = await res.json();
        if (data.success) {
          setFile(data.data);
          if (data.data.codeUnits && data.data.codeUnits.length > 0) {
            setSelectedUnit(data.data.codeUnits[0]);
          }
        } else {
          setError(data.error || 'Failed to load file details');
        }
      } catch (err) {
        setError('An error occurred while loading file details');
      } finally {
        setLoading(false);
      }
    }

    if (fileId) fetchFileDetails();
  }, [fileId]);

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

  if (error || !file) {
    return (
      <div className="flex h-screen bg-[#0a0a0f]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white text-lg font-medium">{error || 'File not found'}</p>
            <button
              onClick={() => router.push(`/repositories/${repoId}`)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm transition-all"
            >
              Back to Repository
            </button>
          </div>
        </main>
      </div>
    );
  }

  const doc = selectedUnit?.documentation?.[0];

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-[#2d2d4a] px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/repositories/${repoId}`)}
                className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white font-mono">{file.path.split('/').pop()}</h1>
                  {file.language && (
                    <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-[#a8a8c8] font-mono capitalize">
                      {file.language}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6666a0] font-mono">{file.repository.fullName}/{file.path}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Code Units List */}
          <div className="w-80 flex-shrink-0 border-r border-[#2d2d4a] bg-[#111118]/40 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-[#2d2d4a] flex items-center justify-between bg-[#111118]/80">
              <span className="text-xs font-semibold text-[#a8a8c8] uppercase tracking-wider">
                Code Units ({file.codeUnits.length})
              </span>
            </div>

            {file.codeUnits.length === 0 ? (
              <div className="p-8 text-center flex-1 flex flex-col justify-center items-center">
                <FileCode className="w-8 h-8 text-[#6666a0] mb-2" />
                <p className="text-sm text-[#a8a8c8]">No code units extracted from this file.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2d2d4a]/40">
                {file.codeUnits.map((unit) => {
                  const unitDoc = unit.documentation?.[0];
                  const hasWarning = unitDoc && unitDoc.status !== 'CURRENT';

                  return (
                    <button
                      key={unit.id}
                      onClick={() => {
                        setSelectedUnit(unit);
                        setActiveTab('docs');
                      }}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                        selectedUnit?.id === unit.id
                          ? 'bg-indigo-600/10 border-l-2 border-indigo-500'
                          : 'hover:bg-white/2 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="w-5 h-5 rounded bg-[#1a1a26] border border-[#2d2d4a] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Terminal className="w-3 h-3 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-medium text-white truncate font-mono block">
                            {unit.name}
                          </span>
                          {hasWarning && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-1.5 py-0.2 bg-white/5 rounded text-[#a8a8c8] font-mono">
                            {unit.type.toLowerCase()}
                          </span>
                          {unit.startLine !== null && (
                            <span className="text-[10px] text-[#6666a0] font-mono">
                              Lines {unit.startLine}-{unit.endLine}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[#6666a0] self-center flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Documentation Details */}
          <div className="flex-1 flex flex-col bg-[#0a0a0f] overflow-y-auto">
            {selectedUnit ? (
              <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
                {/* Unit Details Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2d2d4a]">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-white font-mono">{selectedUnit.name}</h2>
                      <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-[#a8a8c8] font-mono capitalize">
                        {selectedUnit.type.toLowerCase()}
                      </span>
                      {doc && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${statusColors[doc.status] ?? statusColors.CURRENT}`}>
                          {doc.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    {selectedUnit.startLine !== null && (
                      <p className="text-xs text-[#6666a0] mt-1 font-mono">
                        Source definition: lines {selectedUnit.startLine} to {selectedUnit.endLine}
                      </p>
                    )}
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex bg-[#111118] border border-[#2d2d4a] p-0.5 rounded-lg text-xs self-start">
                    <button
                      onClick={() => setActiveTab('docs')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                        activeTab === 'docs'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-[#a8a8c8] hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Documentation
                    </button>
                    <button
                      onClick={() => setActiveTab('code')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                        activeTab === 'code'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-[#a8a8c8] hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      Source Code
                    </button>
                  </div>
                </div>

                {/* Tab: Documentation */}
                {activeTab === 'docs' && (
                  <div className="space-y-6">
                    {/* Outdated Staleness Flag Alert */}
                    {doc && doc.status !== 'CURRENT' && (
                      <div className={`glass-card p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
                        doc.status === 'OUTDATED'
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : doc.status === 'REVIEW_REQUIRED'
                          ? 'border-blue-500/20 bg-blue-500/5'
                          : 'border-red-500/20 bg-red-500/5'
                      }`}>
                        <div className="flex gap-3">
                          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0 ${
                            doc.status === 'OUTDATED'
                              ? 'text-amber-400'
                              : doc.status === 'REVIEW_REQUIRED'
                              ? 'text-blue-400'
                              : 'text-red-400'
                          }`} />
                          <div>
                            <h4 className="text-sm font-semibold text-white">
                              {doc.status === 'OUTDATED'
                                ? 'Stale Documentation: Signature Changed'
                                : doc.status === 'REVIEW_REQUIRED'
                                ? 'Review Recommended: Internal Logic Changed'
                                : 'Broken Documentation: Code Unit Missing'}
                            </h4>
                            <p className="text-xs text-[#a8a8c8] mt-0.5">
                              {doc.status === 'OUTDATED'
                                ? 'The function parameters or signature changed. Gemini drafted an updated documentation.'
                                : doc.status === 'REVIEW_REQUIRED'
                                ? 'The logic inside this code unit changed but the signature remains the same. A review is recommended.'
                                : 'This function or class was not found in the latest codebase commit. It may have been deleted.'}
                            </p>
                          </div>
                        </div>
                        {doc.status !== 'BROKEN' && (
                          <button
                            onClick={() => router.push(`/diff/${doc.id}`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-md transition-all self-end sm:self-auto ${
                              doc.status === 'OUTDATED'
                                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                                : 'bg-blue-500 hover:bg-blue-400 text-white'
                            }`}
                          >
                            <GitPullRequest className="w-3.5 h-3.5" />
                            Review Diff & Approve
                          </button>
                        )}
                      </div>
                    )}

                    {/* Markdown Renderer */}
                    {doc ? (
                      <div className="glass-card p-6 border-[#2d2d4a]">
                        <article className="prose prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {doc.markdown}
                          </ReactMarkdown>
                        </article>
                      </div>
                    ) : (
                      <div className="glass-card p-8 text-center">
                        <BookOpen className="w-8 h-8 text-indigo-500/30 mx-auto mb-3" />
                        <p className="text-[#a8a8c8] text-sm">No documentation generated for this code unit yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Source Code */}
                {activeTab === 'code' && (
                  <div className="glass-card border-[#2d2d4a] overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#2d2d4a] bg-[#111118]/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#a8a8c8]">{file.path}</span>
                      <span className="text-[10px] text-[#6666a0] font-mono">Lines {selectedUnit.startLine}-{selectedUnit.endLine}</span>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm leading-relaxed bg-[#111118]/30 max-h-[500px]">
                      <code className="text-[#e0e0ff] font-mono">{selectedUnit.rawCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                <BookOpen className="w-12 h-12 text-[#2d2d4a] mb-3" />
                <p className="text-white text-lg font-medium">Select a Code Unit</p>
                <p className="text-sm text-[#a8a8c8] mt-1 max-w-xs">
                  Choose a function or class from the sidebar to inspect its auto-generated documentation.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
