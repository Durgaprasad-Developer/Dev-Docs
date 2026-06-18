'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { BookOpen, LayoutDashboard, GitBranch, MessageSquare, Activity, Settings, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/repositories', icon: GitBranch,        label: 'Repositories' },
  { href: '/chat',         icon: MessageSquare,    label: 'Chat' },
  { href: '/insights',     icon: Activity,         label: 'Insights' },
  { href: '/settings',     icon: Settings,         label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-full"
      style={{ background: '#0e0c0a', borderRight: '1px solid #2e2b26' }}
    >
      {/* ── Logo ── */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid #2e2b26' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(218,119,86,0.15)', border: '1px solid rgba(218,119,86,0.3)' }}
        >
          <BookOpen className="w-4 h-4" style={{ color: '#DA7756' }} />
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: '#F5ECD7' }}>DevDocs AI</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="pulse-dot" style={{ width: 6, height: 6 }} />
            <span className="font-mono text-xs" style={{ color: '#5a5248' }}>Gemini 2.5</span>
          </div>
        </div>
      </Link>

      {/* ── Pixel grass divider (tasteful accent) ── */}
      <div className="px-div" style={{ margin: 0, borderRadius: 0, height: 2, opacity: 0.35 }} />

      {/* ── Nav items ── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              id={`nav-${item.label.toLowerCase()}`}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all duration-100 group"
              style={{
                color: active ? '#DA7756' : '#9a8f82',
                background: active ? 'rgba(218,119,86,0.08)' : 'transparent',
                border: `1px solid ${active ? 'rgba(218,119,86,0.2)' : 'transparent'}`,
              }}
              onMouseEnter={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = '#F5ECD7';
                  el.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = '#9a8f82';
                  el.style.background = 'transparent';
                }
              }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#DA7756' }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User section ── */}
      {session?.user && (
        <div style={{ borderTop: '1px solid #2e2b26', padding: 12 }}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-md" style={{ background: '#141210' }}>
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="w-7 h-7 rounded-full flex-shrink-0"
                style={{ border: '1px solid #2e2b26' }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                style={{ background: 'rgba(218,119,86,0.2)', color: '#DA7756' }}
              >
                {session.user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: '#F5ECD7' }}>{session.user.name}</p>
              <p className="text-xs truncate font-mono" style={{ color: '#5a5248' }}>{session.user.email}</p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm transition-all"
            style={{ color: '#5a5248', border: '1px solid transparent' }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = '#f87171';
              el.style.borderColor = 'rgba(248,113,113,0.2)';
              el.style.background = 'rgba(248,113,113,0.06)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = '#5a5248';
              el.style.borderColor = 'transparent';
              el.style.background = 'transparent';
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
