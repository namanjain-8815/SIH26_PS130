'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { formatRole } from '@/lib/terminology';
import { navigateHierarchicalBack, canNavigateBack } from '@/lib/navigation';
import {
  FileText, GitMerge, Clock, Gift, ScrollText, LogOut,
  ShieldCheck, Settings, Users, ChevronLeft, Menu, ArrowLeft, Sparkles
} from 'lucide-react';
import { AuthLoadingState, PermissionDeniedState } from '@/components/ui/States';
import { BhashiniSeamButton } from '@/components/ui/BhashiniSeam';
import { QuickDemoDock } from '@/components/ui/QuickDemoDock';
import { SiteTourGuide } from '@/components/ui/SiteTourGuide';

const NAV = [
  { href: '/admin/approval-types',  label: 'Permissions Catalogue',      icon: FileText },
  { href: '/admin/rules',           label: 'Applicability & Eligibility',icon: GitMerge },
  { href: '/admin/dependencies',    label: 'Permission Dependencies',    icon: GitMerge },
  { href: '/admin/sla-policies',    label: 'Specified Time Policies',   icon: Clock },
  { href: '/admin/incentive-schemes',label: 'Incentive Schemes',         icon: Gift },
  { href: '/admin/users',           label: 'Officer & User Management',  icon: Users },
  { href: '/admin/audit-log',       label: 'Audit Trail & Logs',         icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_collapsed');
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
        localStorage.setItem('admin_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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
    return <AuthLoadingState message="Verifying System Administrator credentials..." />;
  }

  if (!user) {
    return <AuthLoadingState message="Redirecting to Single Window login..." />;
  }

  if (user.role !== 'ADMIN') {
    const dest =
      user.role === 'INSPECTOR'
        ? '/government/inspections'
        : user.role === 'OFFICER' || user.role === 'NODAL'
        ? '/government/work-queue'
        : '/app/dashboard';

    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-700" />
            <span className="font-bold text-gray-900 text-sm">Udyog Setu · Portal Boundary</span>
          </div>
          <QuickDemoDock />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <PermissionDeniedState
            title="Access Restricted · System Administrators Only"
            description={`This console is strictly restricted to System Administrators. Your current session is authenticated as ${formatRole(user.role)}.`}
            returnHref={dest}
            returnLabel="Go to My Portal"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <aside
        className={cn(
          'flex-shrink-0 bg-sidebar flex flex-col h-full transition-all duration-200 ease-in-out border-r border-sidebar-border/40 select-none',
          collapsed ? 'w-18' : 'w-60'
        )}
      >
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
            <div className="w-8 h-8 rounded-lg bg-purple-600 group-hover:bg-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm transition-colors">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-bold leading-none truncate group-hover:text-purple-200 transition-colors">
                    System Admin
                  </p>
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded border border-purple-500/30">
                    GoM
                  </span>
                </div>
                <p className="text-gray-400 text-[10px] mt-1 truncate">Platform Configuration</p>
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

        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'sidebar-link flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all group relative',
                  isActive ? 'bg-purple-600/30 text-white border-l-2 border-purple-500' : 'text-gray-300 hover:text-white hover:bg-white/5',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105', isActive && 'text-purple-400')} />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
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

        {user && (
          <div className="px-2.5 py-2.5 border-t border-sidebar-border/30 bg-black/10">
            <div
              className={cn(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? `${user.name} (${formatRole(user.role)})` : undefined}
            >
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center flex-shrink-0 ring-1 ring-purple-500/40">
                <span className="text-white text-xs font-semibold">{user.name.charAt(0)}</span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{user.name}</p>
                  <p className="text-purple-300 text-[11px] font-medium">{formatRole(user.role)}</p>
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
              title={canNavigateBack(pathname) ? 'Go to parent page' : 'Already at root governance console'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-200/80 rounded-xl text-purple-900 shadow-xs min-w-0 max-w-full">
              <Settings className="w-4 h-4 text-purple-700 flex-shrink-0" />
              <div className="text-xs truncate">
                <span className="font-semibold text-gray-700 hidden md:inline">Admin: </span>
                <span className="text-purple-900 font-bold">System Governance</span>
                <span className="text-gray-400 mx-1.5">|</span>
                <span className="text-gray-600 font-medium">Catalogues & Policies</span>
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
