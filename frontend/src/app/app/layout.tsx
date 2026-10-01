'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatRole } from '@/lib/terminology';
import { navigateHierarchicalBack, canNavigateBack } from '@/lib/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Files,
  ClipboardCheck,
  Calendar,
  Gift,
  LifeBuoy,
  Bell,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  ChevronLeft,
  Compass,
  Menu,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

import { AuthLoadingState, PermissionDeniedState } from '@/components/ui/States';
import { BhashiniSeamButton } from '@/components/ui/BhashiniSeam';
import { ApplicationGuidanceAssistant } from '@/components/guidance/ApplicationGuidanceAssistant';
import { QuickDemoDock } from '@/components/ui/QuickDemoDock';
import { SiteTourGuide } from '@/components/ui/SiteTourGuide';

const NAV = [
  { href: '/app/dashboard',          label: 'Dashboard',                 icon: LayoutDashboard },
  { href: '/app/projects',           label: 'Investment Proposals',      icon: FolderKanban },
  { href: '/app/approvals',          label: 'Permissions & Approvals',   icon: FileText },
  { href: '/app/approval-directory', label: 'Approval Directory',        icon: Compass },
  { href: '/app/documents',          label: 'Document Vault',            icon: Files },
  { href: '/app/inspections',        label: 'Site Inspections',          icon: ClipboardCheck },
  { href: '/app/compliance',         label: 'Compliance & Renewals',     icon: Calendar },
  { href: '/app/incentives',         label: 'Incentives & Schemes',      icon: Gift },
  { href: '/app/assistance',         label: 'Investor Assistance',       icon: LifeBuoy },
  { href: '/app/notifications',      label: 'Notifications',            icon: Bell, badge: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Restore sidebar state from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) {
        setCollapsed(saved === 'true');
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
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
    return <AuthLoadingState message="Verifying Single Window credentials..." />;
  }

  if (!user) {
    return <AuthLoadingState message="Redirecting to Single Window login..." />;
  }

  // Strict role isolation: Competent authority officers and admins belong in their respective consoles
  if (['OFFICER', 'NODAL', 'INSPECTOR'].includes(user.role)) {
    const dest = user.role === 'INSPECTOR' ? '/government/inspections' : '/government/work-queue';
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
            title="Competent Authority Session Active"
            description={`You are currently signed in as ${formatRole(user.role)}. The Applicant Portal is designated for investors and entrepreneurs. Please proceed to your departmental scrutiny desk or switch roles using the Judge Demo Dock.`}
            returnHref={dest}
            returnLabel="Go to Department Desk"
          />
        </div>
      </div>
    );
  }

  if (user.role === 'ADMIN') {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-700" />
            <span className="font-bold text-gray-900 text-sm">Udyog Setu · System Governance</span>
          </div>
          <QuickDemoDock />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <PermissionDeniedState
            title="System Administrator Session Active"
            description="You are currently signed in with platform governance privileges. Please proceed to the System Admin Configuration Console or switch roles using the Judge Demo Dock."
            returnHref="/admin/approval-types"
            returnLabel="Go to Admin Console"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex-shrink-0 bg-sidebar flex flex-col h-full transition-all duration-200 ease-in-out border-r border-sidebar-border/40 select-none',
          collapsed ? 'w-18' : 'w-60'
        )}
      >
        {/* Brand & Toggle Header */}
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
            <div className="w-8 h-8 rounded-lg bg-primary-600 group-hover:bg-primary-500 flex items-center justify-center flex-shrink-0 shadow-sm transition-colors">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-bold leading-none truncate group-hover:text-primary-200 transition-colors">
                    Udyog Setu
                  </p>
                  <span className="text-[9px] bg-primary-500/20 text-primary-300 font-bold px-1.5 py-0.5 rounded border border-primary-500/30">
                    GoM
                  </span>
                </div>
                <p className="text-gray-400 text-[10px] mt-1 truncate">Single Window System</p>
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

        {/* Navigation Links */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'sidebar-link flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all group relative',
                  isActive ? 'bg-primary-600/30 text-white border-l-2 border-primary-500' : 'text-gray-300 hover:text-white hover:bg-white/5',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105', isActive && 'text-primary-400')} />
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

          {/* Settings link */}
          <div className="pt-2 mt-2 border-t border-sidebar-border/30">
            <Link
              href="/app/settings"
              className={cn(
                'sidebar-link flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all',
                pathname === '/app/settings' ? 'bg-primary-600/30 text-white border-l-2 border-primary-500' : 'text-gray-300 hover:text-white hover:bg-white/5',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Settings</span>}
            </Link>
          </div>
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
                'flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-active transition-colors cursor-pointer',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? `${user.name} (${formatRole(user.role)})` : undefined}
            >
              <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0 ring-1 ring-primary-500/40">
                <span className="text-white text-xs font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{user.name}</p>
                  <p className="text-primary-300 text-[11px] truncate font-medium">{formatRole(user.role)}</p>
                  {user.role === 'MANAGER' && (
                    <p className="text-amber-300/80 text-[10px] truncate">Rep: {user.organization?.legal_name || 'ABC Foods Pvt Ltd'}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
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
              title={canNavigateBack(pathname) ? 'Go to parent page' : 'Already at root dashboard'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            {user.role === 'MANAGER' ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 shadow-xs min-w-0 max-w-full">
                <Building2 className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <div className="text-xs truncate">
                  <span className="font-bold text-amber-900">Authorized Rep</span>
                  <span className="text-amber-400 mx-1.5">·</span>
                  <span className="text-gray-600 hidden md:inline">Representing: </span>
                  <span className="font-bold text-gray-950">{user.organization?.legal_name || 'ABC Foods Pvt Ltd'}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary-50 border border-primary-200/80 rounded-xl text-primary-900 shadow-xs min-w-0 max-w-full">
                <Building2 className="w-4 h-4 text-primary-700 flex-shrink-0" />
                <div className="text-xs truncate">
                  <span className="font-semibold text-gray-700 hidden md:inline">Enterprise: </span>
                  <span className="text-primary-900 font-bold">{user.organization?.legal_name || 'ABC Foods Pvt Ltd'}</span>
                  <span className="text-gray-400 mx-1.5">|</span>
                  <span className="text-gray-600 font-medium">{formatRole(user.role)}</span>
                </div>
              </div>
            )}
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

      {/* Contextual Application Guidance Assistant & Interactive Platform Tour */}
      <ApplicationGuidanceAssistant />
      <SiteTourGuide />
    </div>
  );
}
