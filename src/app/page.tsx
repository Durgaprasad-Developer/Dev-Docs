'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { GitBranch, Zap, MessageSquare, RefreshCw, Shield, Search, ArrowRight, BookOpen, Code2, Sparkles } from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const features = [
  { icon: Code2, title: 'AST Code Analysis', desc: 'Deep parsing of JS & TS using Babel AST to extract functions, classes, interfaces and all metadata.', color: '#67e8f9', tag: '01' },
  { icon: Sparkles, title: 'AI Doc Generation', desc: 'Gemini 2.5 Flash generates Markdown docs: purpose, parameters, examples, and edge cases.', color: '#DA7756', tag: '02' },
  { icon: RefreshCw, title: 'Change Detection', desc: 'GitHub webhooks trigger staleness detection — classifies docs as BROKEN, OUTDATED, or REVIEW_REQUIRED.', color: '#4ade80', tag: '03' },
  { icon: MessageSquare, title: 'RAG Chat Assistant', desc: 'Ask natural language questions about your codebase, grounded via pgvector semantic search.', color: '#c084fc', tag: '04' },
  { icon: Search, title: 'Documentation Portal', desc: 'Searchable, browsable portal with file tree, module explorer, and full version history.', color: '#fbbf24', tag: '05' },
  { icon: Shield, title: 'Human Review Workflow', desc: 'All AI-drafted updates require approval. Side-by-side diff viewer shows exactly what changed.', color: '#f87171', tag: '06' },
];

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'authenticated') router.push('/dashboard'); }, [status, router]);

  return (
    <main className="min-h-screen overflow-hidden relative" style={{ background: '#0e0c0a' }}>
      {/* Warm ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px]" style={{ background: 'radial-gradient(ellipse, rgba(218,119,86,0.07) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96" style={{ background: 'radial-gradient(ellipse, rgba(103,232,249,0.04) 0%, transparent 70%)' }} />
      </div>

      {/* ── NAV ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid #2e2b26', background: 'rgba(14,12,10,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(218,119,86,0.15)', border: '1px solid rgba(218,119,86,0.3)' }}>
            <BookOpen className="w-4 h-4" style={{ color: '#DA7756' }} />
          </div>
          <div>
            <span className="font-semibold text-base" style={{ color: '#F5ECD7' }}>DevDocs AI</span>
            <span className="ml-2 text-xs font-mono" style={{ color: '#5a5248' }}>v1.0</span>
          </div>
        </div>

        {/* Code snippet in nav — developer touch */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs" style={{ background: '#141210', border: '1px solid #2e2b26', color: '#5a5248' }}>
          <span style={{ color: '#DA7756' }}>const</span>
          <span style={{ color: '#67e8f9' }}> docs</span>
          <span> = </span>
          <span style={{ color: '#4ade80' }}>autoGenerate</span>
          <span style={{ color: '#9a8f82' }}>(repo)</span>
          <div className="term-cursor" />
        </div>

        <button
          id="nav-sign-in"
          onClick={() => signIn('github')}
          className="btn-secondary text-sm"
        >
          <GithubIcon className="w-4 h-4" />
          Sign in with GitHub
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 text-center pt-24 pb-20 px-8 max-w-4xl mx-auto">

        {/* Tiny pixel accent badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded font-mono text-xs" style={{ background: 'rgba(218,119,86,0.1)', border: '1px solid rgba(218,119,86,0.25)', color: '#DA7756' }}>
          <Zap className="w-3 h-3" />
          Powered by Gemini 2.5 Flash + pgvector RAG
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight tracking-tight" style={{ color: '#F5ECD7', letterSpacing: '-0.02em' }}>
          Documentation that{' '}
          <span className="gradient-text">writes itself</span>
        </h1>

        <p className="text-lg mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: '#9a8f82' }}>
          Connect a GitHub repository and watch AI analyze your codebase, generate
          comprehensive documentation, detect when it goes stale, and keep it
          synchronized — automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button id="hero-cta" onClick={() => signIn('github')} className="btn-primary text-base px-8 py-3.5 group">
            <GithubIcon className="w-5 h-5" />
            Connect GitHub Repository
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button id="demo-cta" onClick={() => signIn('credentials', { callbackUrl: '/dashboard' })} className="btn-secondary text-base px-8 py-3.5">
            <Sparkles className="w-4 h-4" style={{ color: '#DA7756' }} />
            Explore Demo
          </button>
        </div>
      </section>

      {/* ── PIXEL GRASS DIVIDER (tasteful accent) ── */}
      <div className="px-8 max-w-4xl mx-auto"><div className="px-div" /></div>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 px-8 pb-16 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-16">
          {[
            { step: '01', label: 'Connect Repo', icon: GitBranch },
            { step: '02', label: 'AI Analyzes Code', icon: Code2 },
            { step: '03', label: 'Docs Generated', icon: Sparkles },
            { step: '04', label: 'Ask Anything', icon: MessageSquare },
          ].map(({ step, label, icon: Icon }, i) => (
            <div key={i} className="glass-card p-5 text-center">
              <div className="font-mono text-xs mb-3" style={{ color: '#DA7756' }}>{step}</div>
              <Icon className="w-5 h-5 mx-auto mb-2.5" style={{ color: '#9a8f82' }} />
              <div className="text-sm font-medium" style={{ color: '#F5ECD7' }}>{label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-center mb-3" style={{ color: '#F5ECD7' }}>
          Everything you need, <span className="gradient-text">built in</span>
        </h2>
        <p className="text-center text-sm mb-10" style={{ color: '#5a5248' }}>
          From raw source code to searchable, always-current documentation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f, i) => (
            <div key={i} className="glass-card glass-card-hover p-5 group cursor-default">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                  <f.icon className="w-4 h-4" style={{ color: f.color }} />
                </div>
                <div>
                  <div className="font-mono text-xs mb-0.5" style={{ color: '#5a5248' }}>{f.tag}</div>
                  <div className="font-semibold text-sm" style={{ color: '#F5ECD7' }}>{f.title}</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#9a8f82' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="relative z-10 text-center py-20 px-8">
        <div className="max-w-xl mx-auto glass-card p-10" style={{ borderColor: 'rgba(218,119,86,0.25)', boxShadow: '0 0 60px rgba(218,119,86,0.06)' }}>
          <div className="font-mono text-xs mb-4" style={{ color: '#5a5248' }}>// zero documentation debt</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#F5ECD7' }}>Never write docs by hand again.</h2>
          <p className="text-sm mb-7" style={{ color: '#9a8f82' }}>Join developers who ship faster because their docs keep up automatically.</p>
          <button id="footer-cta" onClick={() => signIn('github')} className="btn-primary">
            <GithubIcon className="w-4 h-4" />
            Get Started Free
          </button>
        </div>
      </section>
    </main>
  );
}
