'use client';

import {
  GitBranch,
  Code2,
  Sparkles,
  Database,
  Search,
  AlertTriangle,
  FileEdit,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

interface Step {
  icon: React.ElementType;
  title: string;
  body: string;
}

// Static, dependency-free walkthrough of the documentation pipeline.
// No API calls, so nothing here can fail at runtime.
const PIPELINE: Step[] = [
  {
    icon: GitBranch,
    title: 'Ingest the repository',
    body: 'Connect a GitHub repo via OAuth. The engine fetches every source file and records a content hash so it can tell later what changed.',
  },
  {
    icon: Code2,
    title: 'Parse into code units',
    body: 'Each file is parsed into an Abstract Syntax Tree. Functions, classes, methods, and interfaces are extracted along with their parameters, return types, and async/export flags.',
  },
  {
    icon: Sparkles,
    title: 'Generate documentation',
    body: 'An LLM writes Markdown docs for every code unit — purpose, parameters, return values, side effects, usage examples, and edge cases. Each doc is versioned.',
  },
  {
    icon: Database,
    title: 'Embed for search',
    body: 'Every doc is turned into a 768-dimension embedding and stored in PostgreSQL with pgvector, enabling semantic similarity search.',
  },
  {
    icon: AlertTriangle,
    title: 'Detect change & flag staleness',
    body: 'On a GitHub push — or a re-analysis — the engine compares AST signatures against the stored versions and flags affected docs as BROKEN, OUTDATED, or REVIEW_REQUIRED.',
  },
  {
    icon: FileEdit,
    title: 'Draft updates for review',
    body: 'For each flagged doc, an updated version is drafted and shown as a side-by-side diff. A human approves or rejects; every decision is recorded in the version history.',
  },
  {
    icon: MessageSquare,
    title: 'Ask the codebase',
    body: 'The chat assistant retrieves the most relevant docs via vector search and answers questions grounded in them, citing its sources — no hallucinated behavior.',
  },
  {
    icon: Activity,
    title: 'Track documentation health',
    body: 'The Insights page summarizes coverage and staleness for a repo and generates an AI briefing on what to prioritize next.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0e0c0a' }}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* ── Header ── */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-7 py-4"
          style={{ background: 'rgba(14,12,10,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2e2b26' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(218,119,86,0.1)', border: '1px solid rgba(218,119,86,0.2)' }}
          >
            <Search className="w-4 h-4" style={{ color: '#DA7756' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: '#F5ECD7' }}>
              How It Works
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#5a5248' }}>
              The documentation pipeline, end to end
            </p>
          </div>
        </div>

        <div className="px-7 py-6 max-w-3xl">
          {/* Intro */}
          <div
            className="rounded-lg p-5 mb-6 font-mono text-sm"
            style={{ background: '#141210', border: '1px solid #2e2b26', color: '#9a8f82' }}
          >
            <span style={{ color: '#DA7756' }}>// </span>
            DevDocs AI keeps documentation in sync with code. Here is the path a repository
            takes from first connection to a fully documented, continuously reviewed codebase.
          </div>

          {/* Pipeline steps */}
          <ol className="space-y-3">
            {PIPELINE.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="rounded-lg p-5 flex gap-4"
                  style={{ background: '#141210', border: '1px solid #2e2b26' }}
                >
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(218,119,86,0.1)', border: '1px solid rgba(218,119,86,0.2)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: '#DA7756' }} />
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div className="flex-1 w-px mt-2" style={{ background: '#2e2b26', minHeight: 12 }} />
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono" style={{ color: '#5a5248' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-semibold text-sm" style={{ color: '#F5ECD7' }}>
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#9a8f82' }}>
                      {step.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Footer note */}
          <div
            className="flex justify-between items-center text-xs font-mono px-4 py-2.5 rounded-md mt-6"
            style={{ background: '#141210', border: '1px solid #201e1b', color: '#5a5248' }}
          >
            <span>stages: <span style={{ color: '#DA7756' }}>{PIPELINE.length}</span></span>
            <span>pipeline: <span style={{ color: '#4ade80' }}>continuous</span></span>
            <span>review: <span style={{ color: '#67e8f9' }}>human-in-the-loop</span></span>
          </div>
        </div>
      </main>
    </div>
  );
}
