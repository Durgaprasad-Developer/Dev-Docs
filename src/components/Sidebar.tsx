'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BookOpen,
  LayoutDashboard,
  GitBranch,
  MessageSquare,
  Settings,
  Zap,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/repositories', icon: GitBranch, label: 'Repositories' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-[#111118] border-r border-[#2d2d4a] h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2d2d4a]">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/30">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">DevDocs AI</span>
            <div className="flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-indigo-400" />
              <span className="text-xs text-indigo-400">Gemini</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              id={`nav-${item.label.toLowerCase()}`}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-600/20'
                  : 'text-[#a8a8c8] hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon
                className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-[#6666a0] group-hover:text-[#a8a8c8]'}`}
              />
              {item.label}
              {active && (
                <ChevronRight className="w-3 h-3 ml-auto text-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {session?.user && (
        <div className="px-3 py-4 border-t border-[#2d2d4a]">
          <div className="flex items-center gap-2.5 px-2 py-2">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="w-7 h-7 rounded-full border border-[#2d2d4a]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center">
                <span className="text-xs text-indigo-400 font-medium">
                  {session.user.name?.[0] ?? '?'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-[#6666a0] truncate">{session.user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
