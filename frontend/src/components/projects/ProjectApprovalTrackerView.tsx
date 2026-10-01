'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ErrorState, CardSkeleton } from '@/components/ui/States';
import type {
  ProjectApprovalTrackerResponse,
  ProjectApprovalTrackerItem,
  ConsolidatedTimelineEvent,
  ProjectStageStep,
} from '@/types/api';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  ShieldAlert,
  Send,
  Calendar,
  ChevronRight,
  Filter,
  Search,
  Building2,
  ExternalLink,
  FileText,
  Layers,
  Activity,
  Award,
  Sparkles,
  Timer,
  Check,
  Milestone,
  FileCheck2,
  UserCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function ProjectApprovalTrackerView({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [activeTab, setActiveTab] = useState<'CLEARANCES' | 'TIMELINE' | 'STAGES'>('CLEARANCES');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'BLOCKED' | 'NOT_STARTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: tracker,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['project-approval-tracker', projectId],
    queryFn: () => projectsApi.getApprovalTracker(projectId),
    enabled: !!projectId,
  });

  // Filtered clearances
  const filteredApprovals = useMemo(() => {
    if (!tracker) return [];
    return tracker.approval_items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.approval_name.toLowerCase().includes(q);
        const matchAuth = item.concerned_authority.toLowerCase().includes(q);
        const matchRef = item.application_number?.toLowerCase().includes(q);
        if (!matchName && !matchAuth && !matchRef) return false;
      }
      return true;
    });
  }, [tracker, statusFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-6 w-48 skeleton rounded" />
        <div className="h-32 skeleton rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!tracker) return null;

  const { project, summary, journey_metrics, stages, consolidated_timeline } = tracker;

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/app/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Control Centre
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/projects/${projectId}/submission-centre`}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-1.5"
          >
            <Send className="w-3.5 h-3.5 text-primary-600" /> Submission Centre
          </Link>
          <Link
            href={`/app/projects/${projectId}/dependency-graph`}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-primary-600" /> Dependency Graph
          </Link>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-1.5"
            title="Refresh clearance milestones and timeline events"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 tracking-wide uppercase">
              <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                Statutory Clearance Tracker
              </span>
              <span>•</span>
              <span className="font-mono text-blue-300">{project.id}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{project.stage} Stage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {project.name}
            </h1>
            <p className="text-blue-100/80 text-xs sm:text-sm leading-relaxed">
              Consolidated single-window journey tracking statutory permissions, parallel workflows, time-limit status, and immutable departmental scrutiny milestones.
            </p>

            {/* Next Milestone & Upcoming Action Alert */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-xs flex items-center gap-2">
                <Milestone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-blue-200 text-[10px] uppercase font-bold block">Next Milestone</span>
                  <span className="text-white font-semibold">{journey_metrics.next_milestone}</span>
                </div>
              </div>

              {journey_metrics.upcoming_action && (
                <div className="bg-emerald-500/20 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-400/30 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                  <div>
                    <span className="text-emerald-200 text-[10px] uppercase font-bold block">Upcoming Action</span>
                    {journey_metrics.upcoming_action_link ? (
                      <Link
                        href={journey_metrics.upcoming_action_link}
                        className="text-white font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        {journey_metrics.upcoming_action} <ChevronRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-white font-semibold">{journey_metrics.upcoming_action}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex flex-col gap-3 min-w-[220px] text-right flex-shrink-0">
            <div>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Overall Progress</p>
              <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                <span className="text-3xl font-black text-white">{summary.overall_completion_pct}%</span>
                <span className="text-xs text-blue-200">completed</span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.overall_completion_pct}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-blue-200/80">Elapsed Time:</span>
              <span className="font-semibold text-white">{journey_metrics.elapsed_days} days</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-200/80">SLA Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  journey_metrics.overall_sla_status === 'ON_TRACK'
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                    : journey_metrics.overall_sla_status === 'AT_RISK'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                    : 'bg-red-500/30 text-red-200 border border-red-400/30'
                }`}
              >
                {journey_metrics.overall_sla_status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Decorative backdrop glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 6-Stage Visual Journey Tracker (Project Setup → Permissions → Parallel Processing → Inspection → Decisions → Compliance) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Statutory Lifecycle Stage Progression
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            6 Sequential Statutory Milestones
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map((st, idx) => {
            const isCompleted = st.status === 'COMPLETED';
            const isInProgress = st.status === 'IN_PROGRESS';
            const isUpcoming = st.status === 'UPCOMING';

            return (
              <div
                key={st.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : isInProgress
                    ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 text-blue-950 shadow-xs'
                    : 'bg-gray-50/70 border-gray-200 text-gray-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isInProgress
                          ? 'bg-blue-600 text-white animate-pulse'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : st.order}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isCompleted
                          ? 'bg-emerald-200/60 text-emerald-800'
                          : isInProgress
                          ? 'bg-blue-200/60 text-blue-800'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {st.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold leading-snug">{st.label}</h3>
                  <p className="text-[11px] mt-1 text-gray-600 line-clamp-2 leading-relaxed">
                    {st.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-gray-500">Stage {st.order}</span>
                  {st.completion_pct !== undefined && (
                    <span className="font-bold">{st.completion_pct}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-3.5 bg-white border border-gray-200/80 text-center">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Required</p>
          <p className="text-2xl font-black text-gray-900 mt-0.5">{summary.total_permissions}</p>
          <span className="text-[10px] text-gray-400">Clearances identified</span>
        </div>
        <div className="card p-3.5 bg-emerald-50/50 border border-emerald-200/80 text-center">
          <p className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider">Completed / Granted</p>
          <p className="text-2xl font-black text-emerald-900 mt-0.5">{summary.completed}</p>
          <span className="text-[10px] text-emerald-700">Official NOCs issued</span>
        </div>
        <div className="card p-3.5 bg-blue-50/50 border border-blue-200/80 text-center">
          <p className="text-[11px] text-blue-800 font-semibold uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-black text-blue-900 mt-0.5">{summary.in_progress}</p>
          <span className="text-[10px] text-blue-700">Under preparation/review</span>
        </div>
        <div className="card p-3.5 bg-amber-50/50 border border-amber-200/80 text-center">
          <p className="text-[11px] text-amber-800 font-semibold uppercase tracking-wider">Prerequisite Blocked</p>
          <p className="text-2xl font-black text-amber-900 mt-0.5">{summary.blocked}</p>
          <span className="text-[10px] text-amber-700">Pending prior grants</span>
        </div>
        <div className="card p-3.5 bg-purple-50/50 border border-purple-200/80 text-center">
          <p className="text-[11px] text-purple-800 font-semibold uppercase tracking-wider">Ready to Start</p>
          <p className="text-2xl font-black text-purple-900 mt-0.5">{summary.ready_to_start}</p>
          <span className="text-[10px] text-purple-700">Eligible parallel starts</span>
        </div>
      </div>

      {/* Main View Tabs (Clearances Grid vs Consolidated Event Timeline vs Stage Roadmap) */}
      <div className="border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('CLEARANCES')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'CLEARANCES'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Clearances & SLA Status ({tracker.approval_items.length})
          </button>
          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'TIMELINE'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Consolidated Event Timeline ({consolidated_timeline.length})
          </button>
        </div>

        {activeTab === 'CLEARANCES' && (
          <div className="flex items-center gap-2 pb-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clearances or authority..."
                className="pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 w-48 sm:w-60"
              />
            </div>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="NOT_STARTED">Not Started</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Clearances & SLA Tracking Cards */}
      {activeTab === 'CLEARANCES' && (
        <div className="space-y-3">
          {filteredApprovals.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-500 text-xs">
              No clearances matched your filter criteria.
            </div>
          ) : (
            filteredApprovals.map((item) => (
              <ApprovalTrackerCard key={item.project_approval_id} item={item} />
            ))
          )}
        </div>
      )}

      {/* Tab 2: Consolidated Immutable Event Timeline */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Audit-Grade Application Event Trail
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Synthesized from immutable ApplicationEvent database records. Every statutory action, submission, query notice, and inspection finding is timestamped.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 border-l-2 border-gray-200">
            {consolidated_timeline.map((ev, idx) => {
              const isInit = ev.event_type === 'PROJECT_ONBOARDED';
              const isStatusChange = ev.event_type.includes('STATUS');
              const isQuery = ev.event_type.includes('QUERY');
              const isInspection = ev.event_type.includes('INSPECTION');

              return (
                <div key={ev.event_id || idx} className="relative group">
                  {/* Timeline bullet */}
                  <div
                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      isInit
                        ? 'bg-blue-600'
                        : isQuery
                        ? 'bg-amber-500'
                        : isInspection
                        ? 'bg-indigo-600'
                        : isStatusChange
                        ? 'bg-emerald-600'
                        : 'bg-primary-600'
                    }`}
                  />

                  <div className="p-4 bg-gray-50/70 hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">
                          {ev.approval_name ? `${ev.approval_name} • ` : ''}
                          {ev.event_type.replace(/_/g, ' ')}
                        </span>
                        {ev.application_number && (
                          <span className="font-mono text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            #{ev.application_number}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-semibold">
                          {ev.stage}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" /> {formatDate(ev.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 mt-2 leading-relaxed font-medium">
                      {ev.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-gray-400" />
                        <span>Actor: <strong className="font-semibold text-gray-700">{ev.actor_name}</strong></span>
                        <span className="text-[10px] bg-white border px-1 rounded text-gray-600">{ev.actor_role}</span>
                      </span>

                      {ev.application_id && (
                        <Link
                          href={`/app/applications/${ev.application_id}`}
                          className="text-primary-600 hover:text-primary-800 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          Workspace <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalTrackerCard({ item }: { item: ProjectApprovalTrackerItem }) {
  const isCompleted = item.status === 'COMPLETED';
  const isBlocked = item.status === 'BLOCKED' || item.missing_prerequisites.length > 0;
  const isInProgress = item.status === 'IN_PROGRESS';

  const statusBadgeCls = {
    COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-800 border-blue-200',
    BLOCKED: 'bg-amber-50 text-amber-800 border-amber-200',
    NOT_STARTED: 'bg-gray-50 text-gray-700 border-gray-200',
  }[item.status] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-xs hover:border-gray-300 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {item.concerned_authority}
            </span>
            <span>•</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeCls}`}>
              {item.status.replace(/_/g, ' ')}
            </span>
            {item.application_number && (
              <span className="text-[10px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                Ref: {item.application_number}
              </span>
            )}
            {item.sla_status && item.sla_status !== 'NOT_STARTED' && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  item.sla_status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : item.sla_status === 'ON_TRACK'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : item.sla_status === 'AT_RISK'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                SLA: {item.sla_status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-gray-900 leading-snug">{item.approval_name}</h4>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          {item.application_id ? (
            <Link
              href={`/app/applications/${item.application_id}`}
              className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              <FileCheck2 className="w-3.5 h-3.5" /> Open Workspace <ExternalLink className="w-3 h-3" />
            </Link>
          ) : item.can_start_now ? (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
              <Zap className="w-3 h-3" /> Eligible to Start in Parallel
            </span>
          ) : isBlocked ? (
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Prerequisite Blocked
            </span>
          ) : null}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
        <div>
          <span className="text-[10px] text-gray-400 block">Configured SLA Time Limit</span>
          <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
            <Timer className="w-3 h-3 text-primary-600" />
            {item.sla_days} calendar days
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block">Elapsed Processing Time</span>
          <span className="font-semibold text-gray-800 mt-0.5 block">
            {item.days_elapsed} days
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block">SLA Days Remaining</span>
          <span
            className={`font-semibold mt-0.5 block ${
              item.days_remaining === null
                ? 'text-gray-400'
                : item.days_remaining === 0 && !isCompleted
                ? 'text-red-600 font-bold'
                : 'text-gray-800'
            }`}
          >
            {item.days_remaining !== null ? `${item.days_remaining} days` : '—'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block">Pending Regulatory Notices</span>
          <span className="font-semibold text-gray-800 mt-0.5 block">
            {item.open_queries_count > 0 ? (
              <span className="text-amber-700 font-bold">{item.open_queries_count} Clarification Query</span>
            ) : (
              'None pending'
            )}
          </span>
        </div>
      </div>

      {/* Missing Prerequisites Warning */}
      {item.missing_prerequisites.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Statutory Prerequisite Rule:</span> Cannot commence review until prior clearance of{' '}
            <strong className="font-semibold underline">{item.missing_prerequisites.join(', ')}</strong> is granted.
          </div>
        </div>
      )}
    </div>
  );
}
