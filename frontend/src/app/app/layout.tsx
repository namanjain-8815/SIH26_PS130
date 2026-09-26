'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatRole } from '@/lib/terminology';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Files,
  ClipboardCheck,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const NAV = [
  { href: '/app/dashboard',   label: 'Dashboard',                 icon: LayoutDashboard },
  { href: '/app/projects',    label: 'Investment Proposals',      icon: FolderKanban },
  { href: '/app/approvals',   label: 'Permissions & Approvals',   icon: FileText },
  { href: '/app/documents',   label: 'Document Vault',            icon: Files },
  { href: '/app/inspections', label: 'Site Inspections',          icon: ClipboardCheck },
  { href: '/app/compliance',  label: 'Compliance & Renewals',     icon: Calendar },
  { href: '/app/notifications',label: 'Notifications',            icon: Bell, badge: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const { data: unread } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
  });

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-sidebar flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/30">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-sm font-semibold leading-none truncate">Udyog Setu</p>
              <span className="text-[9px] bg-primary-500/20 text-primary-300 font-bold px-1 py-0.5 rounded border border-primary-500/30">
                PROTOTYPE
              </span>
            </div>
            <p className="text-gray-400 text-[11px] mt-1 truncate">Single Window System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} className={cn('sidebar-link', isActive && 'active')}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge && (unread?.count ?? 0) > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unread!.count > 9 ? '9+' : unread!.count}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Support */}
          <div className="pt-3 mt-3 border-t border-sidebar-border/30">
            <div className="sidebar-link cursor-pointer">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">Support</span>
            </div>
            <Link href="/app/settings" className={cn('sidebar-link', pathname === '/app/settings' && 'active')}>
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span>Settings</span>
            </Link>
            <button onClick={handleLogout} className="sidebar-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-900/20">
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        {/* User */}
        {user && (
          <div className="px-3 py-4 border-t border-sidebar-border/30">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-active transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.name}</p>
                <p className="text-primary-300 text-[11px] truncate font-medium">{formatRole(user.role)}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
