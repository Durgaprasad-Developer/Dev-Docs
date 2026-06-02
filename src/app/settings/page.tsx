'use client';

import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Key, Bell, Database, Webhook, Copy, Check } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useState } from 'react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyToClipboard(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/github`
    : '/api/webhooks/github';

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-[#2d2d4a] px-8 py-4">
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-[#a8a8c8]">Manage your account and integrations</p>
        </div>

        <div className="px-8 py-6 space-y-6 max-w-2xl">
          {/* Profile */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Account</h2>
            </div>
            <div className="flex items-center gap-4">
              {session?.user?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name ?? ''}
                  className="w-12 h-12 rounded-full border border-[#2d2d4a]"
                />
              )}
              <div>
                <p className="font-medium text-white">{session?.user?.name ?? '—'}</p>
                <p className="text-sm text-[#a8a8c8]">{session?.user?.email ?? '—'}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#2d2d4a]">
              <button
                id="sign-out-btn"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-lg text-red-400 text-sm transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* GitHub Webhook */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Webhook className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">GitHub Webhook</h2>
            </div>
            <p className="text-sm text-[#a8a8c8] mb-4">
              Add this webhook URL to your GitHub repositories to enable automatic change detection and staleness monitoring.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#6666a0] mb-1">Webhook URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-[#111118] border border-[#2d2d4a] rounded-lg px-3 py-2 text-xs text-[#a5b4fc] font-mono overflow-x-auto">
                    {webhookUrl}
                  </code>
                  <button
                    id="copy-webhook"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                    className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all"
                  >
                    {copiedKey === 'webhook' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#6666a0] mb-1">Content Type</label>
                <code className="text-xs text-[#a8a8c8] font-mono">application/json</code>
              </div>
              <div>
                <label className="block text-xs text-[#6666a0] mb-1">Events</label>
                <code className="text-xs text-[#a8a8c8] font-mono">push</code>
              </div>
              <div>
                <label className="block text-xs text-[#6666a0] mb-1">Secret (GITHUB_WEBHOOK_SECRET in .env.local)</label>
                <p className="text-xs text-[#6666a0]">Set the same secret in your .env.local for signature verification.</p>
              </div>
            </div>
          </div>

          {/* Environment Info */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Required Environment Variables</h2>
            </div>
            <div className="space-y-2">
              {[
                { key: 'GEMINI_API_KEY', status: 'set', description: 'Google Gemini AI' },
                { key: 'DATABASE_URL', status: 'required', description: 'PostgreSQL + pgvector' },
                { key: 'GITHUB_CLIENT_ID', status: 'required', description: 'GitHub OAuth' },
                { key: 'GITHUB_CLIENT_SECRET', status: 'required', description: 'GitHub OAuth' },
                { key: 'NEXTAUTH_SECRET', status: 'required', description: 'Session encryption' },
                { key: 'GITHUB_WEBHOOK_SECRET', status: 'optional', description: 'Webhook security' },
              ].map((env) => (
                <div key={env.key} className="flex items-center justify-between py-2 border-b border-[#2d2d4a] last:border-0">
                  <div>
                    <code className="text-xs text-[#a5b4fc] font-mono">{env.key}</code>
                    <p className="text-xs text-[#6666a0]">{env.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    env.status === 'set'
                      ? 'badge-current'
                      : env.status === 'optional'
                      ? 'badge-review'
                      : 'badge-outdated'
                  }`}>
                    {env.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Database */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Database Setup</h2>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-[#a8a8c8]">Run these commands to set up your database:</p>
              {[
                'npx prisma migrate dev --name init',
                'npx prisma generate',
              ].map((cmd) => (
                <div key={cmd} className="flex gap-2">
                  <code className="flex-1 bg-[#111118] border border-[#2d2d4a] rounded-lg px-3 py-2 text-xs text-[#a5b4fc] font-mono">
                    {cmd}
                  </code>
                  <button
                    onClick={() => copyToClipboard(cmd, cmd)}
                    className="p-2 hover:bg-white/5 rounded-lg text-[#a8a8c8] hover:text-white transition-all"
                  >
                    {copiedKey === cmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
