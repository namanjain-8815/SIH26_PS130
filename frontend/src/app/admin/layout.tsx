'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { FileText, GitMerge, Clock, Gift, ScrollText, LogOut, Building2, ShieldCheck } from 'lucide-react';

const NAV = [
  { href: '/admin/approval-types',  label: 'Approval Types',   icon: FileText },
  { href: '/admin/rules',           label: 'Applicability Rules',icon: GitMerge },
  { href: '/admin/dependencies',    label: 'Dependencies',      icon: GitMerge },
  { href: '/admin/sla-policies',    label: 'SLA Policies',      icon: Clock },
  { href: '/admin/incentive-schemes',label: 'Incentive Schemes',icon: Gift },
  { href: '/admin/audit-log',       label: 'Audit Log',         icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() { logout(); router.push('/login'); }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <aside className="w-60 flex-shrink-0 bg-sidebar flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/30">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold leading-none truncate">Admin Panel</p>
            <p className="text-gray-500 text-xs mt-0.5">Platform Configuration</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
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
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">{user.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.name}</p>
                <p className="text-gray-400 text-[11px]">ADMIN</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
