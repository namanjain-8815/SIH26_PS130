'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { formatRole } from '@/lib/terminology';
import {
  LayoutDashboard, ListTodo, BarChart3, Clock, LogOut,
  Building2, ChevronRight, AlertTriangle,
} from 'lucide-react';

const NAV = [
  { href: '/government/work-queue',  label: 'Competent Authority Queue', icon: ListTodo },
  { href: '/government/sla-monitor', label: 'Specified Time Limits',    icon: Clock },
  { href: '/government/bottlenecks', label: 'Bottlenecks & Delays',     icon: AlertTriangle },
  { href: '/government/analytics',   label: 'Scrutiny Analytics',       icon: BarChart3 },
];

export default function GovernmentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() { logout(); router.push('/login'); }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <aside className="w-60 flex-shrink-0 bg-sidebar flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/30">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-sm font-semibold leading-none truncate">Single Window</p>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1 py-0.5 rounded border border-blue-500/30">
                PROTOTYPE
              </span>
            </div>
            <p className="text-gray-400 text-[11px] mt-1 truncate">
              {user?.department?.name ?? 'Concerned Authority Portal'}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} className={cn('sidebar-link', isActive && 'active')}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-sidebar-border/30">
            <button onClick={handleLogout} className="sidebar-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-900/20">
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        {user && (
          <div className="px-3 py-4 border-t border-sidebar-border/30">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-active cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">{user.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.name}</p>
                <p className="text-blue-300 text-[11px] truncate font-medium">
                  {formatRole(user.role)}
                </p>
                {user.department && (
                  <p className="text-gray-400 text-[10px] truncate">{user.department.name}</p>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
