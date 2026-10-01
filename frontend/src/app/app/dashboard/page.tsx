'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Zap,
  Bell,
  ChevronRight,
  TrendingUp,
  Gift,
  Calendar,
  FileQuestion,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6"><CardSkeleton lines={4} /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') || DEMO_PROJECT_ID;

  const { data: cc, isLoading, error, refetch } = useQuery({
    queryKey: ['control-centre', projectId],
    queryFn: () => projectsApi.getControlCentre(projectId),
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] ?? 'Entrepreneur'} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLoading ? 'Loading your investment proposal status…' : cc
              ? `Here's the status of your permissions, approvals and next steps.`
              : 'Welcome to the Industrial Approvals Platform.'}
          </p>
        </div>
        {cc && (
          <div className="text-right bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-card">
            <p className="text-xs text-gray-500 font-medium">{cc.project.organization.legal_name}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{cc.project.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cc.project.sector} · {cc.project.district}</p>
          </div>
        )}
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} lines={2} />)}
        </div>
      )}

      {cc && (
        <>
          {/* Approval stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Permissions & Approvals"
              value={cc.approvals.total}
              sub="View all clearances →"
              href="/app/approvals?filter=ALL"
              color="blue"
              icon={<Circle className="w-5 h-5" />}
            />
            <StatCard
              label="In Progress"
              value={cc.approvals.in_progress}
              sub="View in progress →"
              href="/app/approvals?filter=IN_PROGRESS"
              color="amber"
              icon={<Clock className="w-5 h-5" />}
            />
            <StatCard
              label="Completed"
              value={cc.approvals.completed}
              sub="Granted clearances →"
              href="/app/approvals?filter=COMPLETED"
              color="green"
              icon={<CheckCircle2 className="w-5 h-5" />}
            />
            <StatCard
              label="Pending Action"
              value={cc.approvals.blocked + cc.pending_queries.length}
              sub="Take action on blockers →"
              href="/app/approvals?filter=BLOCKED"
              color="red"
              icon={<AlertCircle className="w-5 h-5" />}
            />
          </div>

          {/* Readiness progress */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Your Setup Progress</h2>
                <p className="text-xs text-gray-500 mt-0.5">{cc.readiness.label}</p>
              </div>
              <span className="text-2xl font-bold text-primary-600">{cc.readiness.percent}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-700"
                style={{ width: `${cc.readiness.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>{cc.approvals.completed} of {cc.approvals.total} permissions & approvals obtained</span>
              <Link href={`/app/projects/${projectId}?tab=dependency-graph`} className="text-primary-600 hover:underline font-medium">
                View permission dependency map →
              </Link>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent / pending applications */}
            <div className="card">
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Recent Permission Applications</h2>
                <Link href="/app/approvals" className="text-xs text-primary-600 hover:underline">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {cc.sla_alerts.length === 0 && cc.pending_queries.length === 0 ? (
                  <EmptyState title="No active applications" description="Run regulatory analysis to identify required permissions & approvals." />
                ) : (
                  <>
                    {cc.sla_alerts.slice(0, 3).map((a) => (
                      <Link
                        key={a.application_number}
                        href={a.application_id ? `/app/applications/${a.application_id}` : '/app/approvals'}
                        className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.approval_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">App #{a.application_number} • Open workspace →</p>
                        </div>
                        <StatusBadge status={a.sla_status ?? 'AT_RISK'} />
                      </Link>
                    ))}
                    {cc.pending_queries.slice(0, 2).map((q) => (
                      <Link
                        key={q.query_id}
                        href={q.application_id ? `/app/applications/${q.application_id}?tab=queries` : '/app/approvals'}
                        className="px-5 py-3.5 flex items-center gap-3 hover:bg-red-50/40 transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <FileQuestion className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{q.approval_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Query: {q.subject} • Respond →</p>
                        </div>
                        <StatusBadge status="QUERY_RAISED" />
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Upcoming deadlines */}
            <div className="card">
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Upcoming Deadlines</h2>
                <Link href={`/app/compliance`} className="text-xs text-primary-600 hover:underline">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {cc.upcoming_renewals.length === 0 ? (
                  <EmptyState title="No upcoming renewals" description="Your compliance & renewal schedule is clear for now." />
                ) : (
                  cc.upcoming_renewals.slice(0, 4).map((r) => {
                    const daysLeft = Math.ceil((new Date(r.next_due_date).getTime() - Date.now()) / 86_400_000);
                    return (
                      <div key={r.id} className="px-5 py-3.5 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          daysLeft <= 30 ? 'bg-red-50' : daysLeft <= 60 ? 'bg-orange-50' : 'bg-blue-50'
                        }`}>
                          <Calendar className={`w-4 h-4 ${daysLeft <= 30 ? 'text-red-500' : daysLeft <= 60 ? 'text-orange-500' : 'text-blue-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.authority}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-semibold ${daysLeft <= 30 ? 'text-red-600' : 'text-gray-700'}`}>
                            {daysLeft}d left
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(r.next_due_date)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Next best action + Incentives */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Next best action */}
            {cc.next_best_action && (
              <div className="card p-5 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-primary-100 font-medium uppercase tracking-wide">Next Best Action</p>
                    <p className="text-white font-semibold text-sm mt-1">{cc.next_best_action}</p>
                    <Link
                      href={cc.next_best_action_link ?? '/app/approvals'}
                      className="inline-flex items-center gap-1 mt-3 text-xs text-primary-100 hover:text-white font-medium"
                    >
                      Take action <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Incentives */}
            {cc.incentive_matches.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Potentially Applicable Incentives</h2>
                  </div>
                  <span className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {cc.incentive_matches.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cc.incentive_matches.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex items-start gap-2 p-2.5 bg-purple-50/50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{m.scheme_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{m.authority}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-3 italic">{cc.incentive_matches[0]?.label}</p>
              </div>
            )}
          </div>

          {/* Blocked approvals alert */}
          {cc.blocked_approvals.length > 0 && (
            <div className="card p-4 border-l-4 border-red-500 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm font-semibold text-red-700">
                  {cc.blocked_approvals.length} approval{cc.blocked_approvals.length > 1 ? 's' : ''} blocked
                </p>
              </div>
              <div className="space-y-1.5">
                {cc.blocked_approvals.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <span className="text-xs text-red-700 font-medium">{b.approval_name}:</span>
                    <span className="text-xs text-red-600">{b.blocked_reason ?? 'Prerequisites not met'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project info footer */}
          <div className="card p-4 bg-gray-50/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-400">Sector</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{cc.project.sector}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Investment</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatCurrency(cc.project.investment_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Employees</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{cc.project.employee_count}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">District</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{cc.project.district}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, href, color, icon,
}: {
  label: string; value: number; sub: string; href: string;
  color: 'blue' | 'amber' | 'green' | 'red'; icon: React.ReactNode;
}) {
  const cls = {
    blue:  { bg: 'bg-blue-50',  text: 'text-blue-600',  val: 'text-blue-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', val: 'text-amber-700' },
    green: { bg: 'bg-green-50', text: 'text-green-600', val: 'text-green-700' },
    red:   { bg: 'bg-red-50',   text: 'text-red-600',   val: 'text-red-700' },
  }[color];

  return (
    <Link href={href} className="card p-4 hover:shadow-card-hover transition-shadow group">
      <div className={`w-9 h-9 rounded-xl ${cls.bg} flex items-center justify-center ${cls.text} mb-3`}>
        {icon}
      </div>
      <p className={`text-3xl font-bold ${cls.val}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
      <p className={`text-xs mt-2 ${cls.text} group-hover:underline`}>{sub}</p>
    </Link>
  );
}
