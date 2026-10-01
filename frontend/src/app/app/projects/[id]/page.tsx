'use client';

import { Suspense, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Zap,
  ChevronRight,
  Gift,
  Calendar,
  FileQuestion,
  ArrowLeft,
  Network,
  Building2,
  Send,
  ShieldCheck,
  Database,
  Activity,
  Layers,
  FileText,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ParallelOrchestrationModal } from '@/components/orchestration/ParallelOrchestrationModal';
import type { ParallelOrchestrationResult } from '@/types/api';

import ProjectApprovalTrackerView from '@/components/projects/ProjectApprovalTrackerView';
import MasterProjectProfileView from '@/components/projects/MasterProjectProfileView';
import DependencyGraphView from '@/components/projects/DependencyGraphView';
import ProjectSubmissionCentreView from '@/components/projects/ProjectSubmissionCentreView';

type Tab = 'overview' | 'tracker' | 'profile' | 'dependency-graph' | 'submission-centre';

const TABS: Array<{ id: Tab; label: string; icon: any }> = [
  { id: 'overview', label: 'Command Overview', icon: Activity },
  { id: 'tracker', label: 'Statutory Clearance Tracker', icon: Clock },
  { id: 'profile', label: 'Master Business Profile', icon: ShieldCheck },
  { id: 'dependency-graph', label: 'Dependency & Parallel Map', icon: Network },
  { id: 'submission-centre', label: 'Project Submission Centre', icon: Send },
];

export default function ProjectControlCentrePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="p-6"><CardSkeleton lines={6} /></div>}>
      <ProjectControlCentreContent params={params} />
    </Suspense>
  );
}

function ProjectControlCentreContent({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const projectId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const urlTab = (searchParams.get('tab') as Tab) || 'overview';
  const [activeTab, setActiveTab] = useState<Tab>(urlTab);
  const [orchestrationResult, setOrchestrationResult] = useState<ParallelOrchestrationResult | null>(null);

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    router.replace(`/app/projects/${projectId}?tab=${newTab}`, { scroll: false });
  };

  const { data: cc, isLoading, error, refetch } = useQuery({
    queryKey: ['control-centre', projectId],
    queryFn: () => projectsApi.getControlCentre(projectId),
    enabled: !!projectId && activeTab === 'overview',
  });

  const startEligible = useMutation({
    mutationFn: () => projectsApi.startEligibleApplications(projectId),
    onSuccess: (res) => {
      setOrchestrationResult(res);
      qc.invalidateQueries({ queryKey: ['control-centre', projectId] });
      qc.invalidateQueries({ queryKey: ['project-approvals'] });
      qc.invalidateQueries({ queryKey: ['dependency-graph', projectId] });
      qc.invalidateQueries({ queryKey: ['submission-centre', projectId] });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Investment Proposals
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startEligible.mutate()}
            disabled={startEligible.isPending}
            className="btn-primary text-xs inline-flex items-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            title="Start parallel application workspaces for clearances with completed prerequisites"
          >
            <Zap className={`w-3.5 h-3.5 ${startEligible.isPending ? 'animate-spin' : ''}`} />
            {startEligible.isPending ? 'Orchestrating...' : 'Start Parallel Clearances'}
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-700 tracking-wide uppercase">
            <span>Project Command Centre</span>
            <span>•</span>
            <span className="text-gray-400 font-mono">ID: {projectId}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {cc?.project.name ?? 'Investment Proposal Workspace'}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Consolidated command centre for statutory roadmap, master business ledger, prerequisite dependencies, and submission orchestration.
          </p>
        </div>

        {cc && (
          <div className="text-right bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 shadow-xs flex-shrink-0">
            <p className="text-xs text-gray-500 font-medium">{cc.project.organization.legal_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cc.project.sector} · {cc.project.district}</p>
          </div>
        )}
      </div>

      {/* Consolidated Tab Switcher Navigation */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 pb-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary-600 text-white shadow-xs font-bold'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

          {isLoading && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <CardSkeleton key={i} lines={2} />)}
            </div>
          )}

          {cc && (
            <>
              {/* Approval stats cards with URL filtered links */}
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
                    <h2 className="text-sm font-semibold text-gray-900">Clearance Readiness Progress</h2>
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
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500 flex-wrap gap-2">
                  <span>{cc.approvals.completed} of {cc.approvals.total} permissions & clearances obtained</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTabChange('submission-centre')}
                      className="text-green-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Submission Centre →
                    </button>
                    <button
                      onClick={() => handleTabChange('dependency-graph')}
                      className="text-primary-600 hover:underline font-medium cursor-pointer"
                    >
                      Dependency map →
                    </button>
                  </div>
                </div>
              </div>

              {/* Main grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Recent / pending applications */}
                <div className="card">
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
                    <h2 className="text-sm font-semibold text-gray-900">Recent Applications & Alerts</h2>
                    <Link href="/app/approvals" className="text-xs text-primary-600 hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {cc.sla_alerts.length === 0 && cc.pending_queries.length === 0 ? (
                      <EmptyState title="No active applications" description="All permissions are currently on track or pending initiation." />
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
                    <h2 className="text-sm font-semibold text-gray-900">Upcoming Deadlines & Renewals</h2>
                    <Link href="/app/compliance" className="text-xs text-primary-600 hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {cc.upcoming_renewals.length === 0 ? (
                      <EmptyState title="No upcoming renewals" description="Your compliance schedule is clear for now." />
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
                      {cc.blocked_approvals.length} clearance{cc.blocked_approvals.length > 1 ? 's' : ''} blocked
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

              {/* Master Business Profile Quick Preview Card */}
              <div className="card p-5 bg-white border border-gray-200/90 shadow-sm rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified Master Profile
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-emerald-700 font-medium">Automatic Single-Window Pre-Population</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mt-1">Master Business & Investment Dossier</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Reusable baseline parameters certified and shared across all department clearance workflows.
                    </p>
                  </div>

                  <button
                    onClick={() => handleTabChange('profile')}
                    className="btn-secondary text-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-primary-600" /> Open Full Profile & Ledger
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block font-medium">Legal Entity Name</span>
                    <p className="font-bold text-gray-900 mt-0.5 truncate">
                      {cc.project.organization.legal_name}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-1">✓ Verified MCA</span>
                  </div>

                  <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block font-medium">Entity Type & PAN</span>
                    <p className="font-bold text-gray-900 mt-0.5 truncate">
                      {cc.project.organization.entity_type}
                    </p>
                    <span className="text-[10px] text-gray-500 font-mono block mt-1">
                      PAN: {cc.project.organization.pan || 'AAACB1234F'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block font-medium">District & Industrial Area</span>
                    <p className="font-bold text-gray-900 mt-0.5 truncate">
                      {cc.project.district} {cc.project.industrial_area ? `· ${cc.project.industrial_area}` : ''}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-1">✓ Verified MIDC</span>
                  </div>

                  <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block font-medium">Capital & Direct Jobs</span>
                    <p className="font-bold text-primary-700 mt-0.5 truncate">
                      {formatCurrency(cc.project.investment_amount)}
                    </p>
                    <span className="text-[10px] text-gray-500 block mt-1">
                      {cc.project.employee_count} Personnel · {cc.project.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: STATUTORY CLEARANCE TRACKER */}
      {activeTab === 'tracker' && (
        <div className="space-y-4">
          <ProjectApprovalTrackerView params={{ id: projectId }} />
        </div>
      )}

      {/* TAB CONTENT: MASTER BUSINESS PROFILE */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <MasterProjectProfileView />
        </div>
      )}

      {/* TAB CONTENT: DEPENDENCY & PARALLEL MAP */}
      {activeTab === 'dependency-graph' && (
        <div className="space-y-4 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <DependencyGraphView params={{ id: projectId }} />
        </div>
      )}

      {/* TAB CONTENT: PROJECT SUBMISSION CENTRE */}
      {activeTab === 'submission-centre' && (
        <div className="space-y-4">
          <ProjectSubmissionCentreView params={{ id: projectId }} />
        </div>
      )}

      {/* Parallel Orchestration Modal */}
      <ParallelOrchestrationModal
        isOpen={!!orchestrationResult}
        onClose={() => setOrchestrationResult(null)}
        result={orchestrationResult}
        projectName={cc?.project?.name}
      />
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
