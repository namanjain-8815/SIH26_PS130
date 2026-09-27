'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { formatRole } from '@/lib/terminology';
import {
  ListTodo, BarChart3, Clock, LogOut,
  Building2, ChevronRight, AlertTriangle, Bell,
  ShieldCheck, Landmark, CheckCircle2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { AuthLoadingState, PermissionDeniedState } from '@/components/ui/States';
import { BhashiniSeamButton } from '@/components/ui/BhashiniSeam';

const NAV = [
  { href: '/government/work-queue',  label: 'Competent Authority Queue', icon: ListTodo },
  { href: '/government/sla-monitor', label: 'Specified Time Limits',    icon: Clock },
  { href: '/government/bottlenecks', label: 'Bottlenecks & Delays',     icon: AlertTriangle },
  { href: '/government/analytics',   label: 'Scrutiny Analytics',       icon: BarChart3 },
  { href: '/app/notifications',      label: 'Notifications',            icon: Bell, badge: true },
];

export default function GovernmentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const { data: unread } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
    enabled: !!user,
  });

  function handleLogout() {
    logout();
    router.push('/login');
  }

  if (loading) {
    return <AuthLoadingState message="Verifying Competent Authority credentials..." />;
  }

  if (!user) {
    return (
      <PermissionDeniedState
        title="Authentication Required"
        description="Please sign in with an authorized officer or administrator account to access the Competent Authority Single Window Portal."
        returnHref="/login"
        returnLabel="Go to Login"
      />
    );
  }

  const isGovAuthorized = ['OFFICER', 'NODAL', 'ADMIN', 'INSPECTOR'].includes(user.role);
  if (!isGovAuthorized) {
    return (
      <PermissionDeniedState
        title="Access Restricted · Government Officers Only"
        description={`This portal is restricted to Competent Authority Officers, MAITRI Nodal Officers, and Designated Inspection Officers. Your current session is authenticated as ${formatRole(user.role)}.`}
        returnHref="/app/dashboard"
        returnLabel="Go to Applicant Portal"
      />
    );
  }

  // Render official authority context label
  const authorityContext =
    user.role === 'OFFICER'
      ? {
          title: user.department?.name ?? 'State Competent Authority',
          sub: 'Concerned Department / Authority Scrutiny Desk',
          icon: Landmark,
          color: 'bg-blue-600',
        }
      : user.role === 'NODAL'
      ? {
          title: 'MAITRI Nodal Agency Desk',
          sub: 'Single Window Coordination & Investor Facilitation',
          icon: Building2,
          color: 'bg-emerald-600',
        }
      : user.role === 'INSPECTOR'
      ? {
          title: 'Designated Inspection Desk',
          sub: 'Joint Site Verification & Findings',
          icon: CheckCircle2,
          color: 'bg-purple-600',
        }
      : {
          title: 'Platform Governance & Catalogue Admin',
          sub: 'System Administrator Control',
          icon: ShieldCheck,
          color: 'bg-gray-800',
        };

  const ContextIcon = authorityContext.icon;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <aside className="w-60 flex-shrink-0 bg-sidebar flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/30">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white", authorityContext.color)}>
            <ContextIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-sm font-semibold leading-none truncate">Single Window</p>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1 py-0.5 rounded border border-blue-500/30">
                PROTOTYPE
              </span>
            </div>
            <p className="text-gray-400 text-[11px] mt-1 truncate">
              {user.department?.name ?? 'Govt of Maharashtra'}
            </p>
          </div>
        </div>

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

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top Context Header Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200/80 rounded-xl text-blue-900">
              <ContextIcon className="w-4 h-4 text-blue-700 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-gray-900">Concerned Department / Authority: </span>
                <span className="text-blue-800 font-bold">{authorityContext.title}</span>
                <span className="text-gray-400 mx-1.5">|</span>
                <span className="text-gray-600 font-medium">{formatRole(user.role)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <BhashiniSeamButton />
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-800">
              <span>PROTOTYPE / DEMO DATA</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
