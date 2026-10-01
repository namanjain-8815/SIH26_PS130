'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { formatRole } from '@/lib/terminology';
import { navigateHierarchicalBack, canNavigateBack } from '@/lib/navigation';
import {
  ListTodo, BarChart3, Clock, LogOut,
  Building2, ChevronRight, ChevronLeft, AlertTriangle, Bell,
  ShieldCheck, Landmark, CheckCircle2, LifeBuoy,
  CalendarDays, Menu, ArrowLeft, Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { AuthLoadingState, PermissionDeniedState } from '@/components/ui/States';
import { BhashiniSeamButton } from '@/components/ui/BhashiniSeam';
import { QuickDemoDock } from '@/components/ui/QuickDemoDock';
import { SiteTourGuide } from '@/components/ui/SiteTourGuide';

const FULL_NAV = [
  { href: '/government/work-queue',   label: 'Competent Authority Queue', icon: ListTodo },
  { href: '/government/inspections',  label: 'Inspection Planner',        icon: CalendarDays },
  { href: '/government/facilitation', label: 'Facilitation Requests',     icon: LifeBuoy },
  { href: '/government/sla-monitor',  label: 'Specified Time Limits',     icon: Clock },
  { href: '/government/bottlenecks',  label: 'Bottlenecks & Delays',      icon: AlertTriangle },
  { href: '/government/analytics',    label: 'Scrutiny Analytics',        icon: BarChart3 },
  { href: '/government/notifications',label: 'Notifications',             icon: Bell, badge: true },
];

const INSPECTOR_NAV = [
  { href: '/government/inspections',  label: 'Inspection Planner',        icon: CalendarDays },
  { href: '/government/sla-monitor',  label: 'Specified Time Limits',     icon: Clock },
  { href: '/government/notifications',label: 'Notifications',             icon: Bell, badge: true },
];

export default function GovernmentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gov_sidebar_collapsed');
      if (saved !== null) {
        setCollapsed(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gov_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return <AuthLoadingState message="Verifying Competent Authority credentials..." />;
  }

  if (!user) {
    return <AuthLoadingState message="Redirecting to Single Window login..." />;
  }

  const isGovAuthorized = ['OFFICER', 'NODAL', 'ADMIN', 'INSPECTOR'].includes(user.role);
  if (!isGovAuthorized) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700" />
            <span className="font-bold text-gray-900 text-sm">Udyog Setu · Portal Boundary</span>
          </div>
          <QuickDemoDock />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <PermissionDeniedState
            title="Access Restricted · Government Officers Only"
            description={`This portal is restricted to Competent Authority Officers, MAITRI Nodal Officers, and Designated Inspection Officers. Your current session is authenticated as ${formatRole(user.role)}.`}
            returnHref="/app/dashboard"
            returnLabel="Go to Applicant Portal"
          />
        </div>
        <SiteTourGuide />
      </div>
    );
  }

  // Strict role boundaries within government portal
  if (user.role === 'INSPECTOR') {
    const isAllowedForInspector =
      pathname.startsWith('/government/inspections') ||
      pathname.startsWith('/government/sla-monitor') ||
      pathname.startsWith('/government/notifications');

    if (!isAllowedForInspector) {
      return (
        <div className="min-h-screen bg-surface flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-700" />
              <span className="font-bold text-gray-900 text-sm">Udyog Setu · Inspector Role Boundary</span>
            </div>
            <QuickDemoDock />
          </header>
          <div className="flex-1 flex items-center justify-center p-6">
            <PermissionDeniedState
              title="Designated Joint Inspector Session Active"
              description="Your account is configured for physical joint site verifications and findings documentation. Scrutiny desks, facilitation queues, and bottleneck analytics are reserved for Reviewing Officers and MAITRI Nodal Officers."
              returnHref="/government/inspections"
              returnLabel="Go to Joint Inspection Planner"
            />
          </div>
          <SiteTourGuide />
        </div>
      );
    }
  }

  if (user.role === 'OFFICER' && pathname.startsWith('/government/facilitation')) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-700" />
            <span className="font-bold text-gray-900 text-sm">Udyog Setu · Authority Desk</span>
          </div>
          <QuickDemoDock />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <PermissionDeniedState
            title="MAITRI Nodal Desk Restricted"
            description="Investor facilitation requests and dispute coordination are handled exclusively by MAITRI Single Window Nodal Officers. Please proceed to your Departmental Scrutiny Queue."
            returnHref="/government/work-queue"
            returnLabel="Go to Departmental Scrutiny Queue"
          />
        </div>
        <SiteTourGuide />
      </div>
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
  const navItems = user.role === 'INSPECTOR' ? INSPECTOR_NAV : FULL_NAV;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <aside
        className={cn(
          'flex-shrink-0 bg-sidebar flex flex-col h-full transition-all duration-200 ease-in-out border-r border-sidebar-border/40 select-none',
          collapsed ? 'w-18' : 'w-60'
        )}
      >
        {/* Header with toggle */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-sidebar-border/30">
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'flex items-center gap-2.5 min-w-0 text-left cursor-pointer group focus:outline-hidden',
              collapsed && 'justify-center w-full'
            )}
            title={collapsed ? 'Click to expand sidebar' : 'Click to collapse sidebar'}
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm transition-transform group-hover:scale-105", authorityContext.color)}>
              <ContextIcon className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-bold leading-none truncate group-hover:text-blue-200 transition-colors">
                    Single Window
                  </p>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-500/30">
                    GoM
                  </span>
                </div>
                <p className="text-gray-400 text-[10px] mt-1 truncate">
                  {user.department?.name ?? 'Govt of Maharashtra'}
                </p>
              </div>
            )}
          </button>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {collapsed && (
          <div className="px-3 pt-2 pb-1 flex justify-center">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors w-full flex items-center justify-center"
              title="Expand sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'sidebar-link flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all group relative',
                  isActive ? 'bg-blue-600/30 text-white border-l-2 border-blue-500' : 'text-gray-300 hover:text-white hover:bg-white/5',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105', isActive && 'text-blue-400')} />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
                {badge && (unread?.count ?? 0) > 0 && (
                  <span
                    className={cn(
                      'bg-red-500 text-white font-bold rounded-full flex items-center justify-center',
                      collapsed ? 'absolute top-1 right-1 w-2.5 h-2.5 p-0' : 'text-[10px] min-w-[18px] h-[18px] px-1'
                    )}
                  >
                    {!collapsed && (unread!.count > 9 ? '9+' : unread!.count)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2.5 pt-2 pb-1 border-t border-sidebar-border/30">
          <button
            onClick={handleLogout}
            className={cn(
              'sidebar-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg px-2.5 py-2 text-xs flex items-center gap-3 transition-colors',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="px-2.5 py-2.5 border-t border-sidebar-border/30 bg-black/10">
            <div
              className={cn(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-active cursor-pointer transition-colors',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? `${user.name} (${formatRole(user.role)})` : undefined}
            >
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0 ring-1 ring-blue-500/40">
                <span className="text-white text-xs font-semibold">{user.name.charAt(0)}</span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{user.name}</p>
                  <p className="text-blue-300 text-[11px] truncate font-medium">
                    {formatRole(user.role)}
                  </p>
                  {user.department && (
                    <p className="text-gray-400 text-[10px] truncate">{user.department.name}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Top Context Header Bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center justify-between flex-shrink-0 z-40 sticky top-0 shadow-xs gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              disabled={!canNavigateBack(pathname)}
              onClick={() => navigateHierarchicalBack(pathname, router)}
              className={cn(
                'p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold border flex-shrink-0',
                canNavigateBack(pathname)
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-200 cursor-pointer shadow-xs active:scale-95'
                  : 'text-gray-300 border-gray-100 cursor-not-allowed opacity-40 bg-gray-50/50'
              )}
              title={canNavigateBack(pathname) ? 'Go to parent page' : 'Already at root desk'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200/80 rounded-xl text-blue-900 shadow-xs min-w-0 max-w-full">
              <ContextIcon className="w-4 h-4 text-blue-700 flex-shrink-0" />
              <div className="text-xs truncate">
                <span className="font-semibold text-gray-700 hidden lg:inline">Concerned </span>
                <span className="font-semibold text-gray-700 hidden md:inline">Authority: </span>
                <span className="text-blue-900 font-bold">{authorityContext.title}</span>
                <span className="text-gray-400 mx-1.5">|</span>
                <span className="text-gray-600 font-medium">{formatRole(user.role)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <QuickDemoDock />
            <BhashiniSeamButton />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-site-tour'))}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 group cursor-pointer"
              title="Launch Interactive Platform Tour"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Interactive Tour</span>
              <span className="sm:hidden">Tour</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-6">{children}</div>
      </main>

      <SiteTourGuide />
    </div>
  );
}
