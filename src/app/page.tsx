'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  GitBranch,
  Zap,
  MessageSquare,
  RefreshCw,
  Shield,
  Search,
  GitFork,
  ArrowRight,
  BookOpen,
  Code2,
  Sparkles,
} from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const features = [
    {
      icon: Code2,
      title: 'AST Code Analysis',
      description:
        'Deep parsing of JavaScript & TypeScript using Babel AST to extract functions, classes, interfaces, and all their metadata.',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    {
      icon: Sparkles,
      title: 'AI Doc Generation',
      description:
        'Gemini 2.5 Flash generates comprehensive Markdown documentation including purpose, parameters, examples, and edge cases.',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      icon: RefreshCw,
      title: 'Change Detection',
      description:
        'GitHub webhooks trigger automatic staleness detection when code is pushed, classifying docs as BROKEN, OUTDATED, or REVIEW_REQUIRED.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: MessageSquare,
      title: 'RAG Chat Assistant',
      description:
        'Ask natural language questions about your codebase. Answers are grounded in your actual documentation via pgvector semantic search.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: Search,
      title: 'Documentation Portal',
      description:
        'Searchable, browsable documentation portal with module explorer, file tree, and version history for every code unit.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Shield,
      title: 'Human Review Workflow',
      description:
        'All AI-drafted updates require developer approval. Side-by-side diff viewer shows exactly what changed before you accept.',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">DevDocs AI</span>
        </div>
        <button
          id="nav-sign-in"
          onClick={() => signIn('github')}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 hover:text-white transition-all duration-200"
        >
          <GithubIcon className="w-4 h-4" />
          Sign in with GitHub
        </button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center pt-24 pb-20 px-8 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium mb-8">
          <Zap className="w-3 h-3" />
          Powered by Gemini 2.5 Flash + pgvector
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight">
          Documentation that{' '}
          <span className="gradient-text">writes itself</span>
        </h1>

        <p className="text-lg text-[#a8a8c8] max-w-2xl mx-auto mb-10 leading-relaxed">
          Connect a GitHub repository and watch AI analyze your codebase, generate comprehensive
          documentation, detect when it goes stale, and keep it synchronized — automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="hero-cta"
            onClick={() => signIn('github')}
            className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-semibold text-lg shadow-xl shadow-indigo-900/30 hover:shadow-indigo-900/50 transition-all duration-300 hover:-translate-y-0.5"
          >
            <GithubIcon className="w-5 h-5" />
            Connect GitHub Repository
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            id="demo-cta"
            onClick={() => signIn('credentials', { callbackUrl: '/dashboard' })}
            className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white font-semibold text-lg transition-all duration-300 hover:-translate-y-0.5"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
            Bypass & Explore Demo
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-8 pb-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-20">
          {[
            { step: '01', label: 'Connect Repo', icon: GitBranch },
            { step: '02', label: 'AI Analyzes Code', icon: Code2 },
            { step: '03', label: 'Docs Generated', icon: Sparkles },
            { step: '04', label: 'Ask Anything', icon: MessageSquare },
          ].map(({ step, label, icon: Icon }, i) => (
            <div key={i} className="glass-card p-5 text-center">
              <div className="text-xs font-mono text-indigo-500 mb-2">{step}</div>
              <Icon className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-white">{label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything you need, <span className="gradient-text">nothing you don't</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <div key={i} className="glass-card glass-card-hover p-6">
              <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-[#a8a8c8] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="relative z-10 text-center py-20 px-8">
        <div className="glass-card gradient-border max-w-2xl mx-auto p-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Zero documentation debt, forever.
          </h2>
          <p className="text-[#a8a8c8] mb-8">
            Join developers who never write documentation by hand again.
          </p>
          <button
            id="footer-cta"
            onClick={() => signIn('github')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-xl shadow-indigo-900/30"
          >
            <GithubIcon className="w-5 h-5" />
            Get Started Free
          </button>
        </div>
      </section>
    </main>
  );
}
