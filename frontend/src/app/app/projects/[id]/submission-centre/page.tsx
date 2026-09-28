'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { ScrutinyPriorityBadge } from '@/components/scrutiny/ScrutinyPriorityBadge';
import Link from 'next/link';
import {
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  FileCheck2,
  FileText,
  Building2,
  ArrowLeft,
  Network,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { SubmissionCentreItem, ParallelOrchestrationResult } from '@/types/api';
import { ParallelOrchestrationModal } from '@/components/orchestration/ParallelOrchestrationModal';

type CategoryFilter = 'ALL' | 'READY_TO_SUBMIT' | 'BLOCKED_BY_PREREQUISITES' | 'IN_PREPARATION' | 'SUBMITTED' | 'APPROVED';

export default function ProjectSubmissionCentrePage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const qc = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForSubmit, setSelectedForSubmit] = useState<SubmissionCentreItem | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState<ParallelOrchestrationResult | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    applicationNumber: string;
    approvalName: string;
    authority: string;
    submittedAt: string;
  } | null>(null);

  // Fetch project submission centre data
  const {
    data: sc,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['submission-centre', projectId],
    queryFn: () => projectsApi.getSubmissionCentre(projectId),
    enabled: !!projectId,
  });

  // Start eligible applications mutation
  const startEligible = useMutation({
    mutationFn: () => projectsApi.startEligibleApplications(projectId),
    onSuccess: (res) => {
      setOrchestrationResult(res);
      qc.invalidateQueries({ queryKey: ['submission-centre', projectId] });
      qc.invalidateQueries({ queryKey: ['control-centre', projectId] });
      qc.invalidateQueries({ queryKey: ['project-approvals'] });
    },
  });

  // Statutory submit mutation
  const submitApplication = useMutation({
    mutationFn: ({ appId, notes }: { appId: string; notes?: string }) =>
      projectsApi.submitApplication(projectId, appId, notes),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['submission-centre', projectId] });
      qc.invalidateQueries({ queryKey: ['control-centre', projectId] });
      qc.invalidateQueries({ queryKey: ['project-approvals'] });
      setSubmissionSuccess({
        applicationNumber: res.application_number,
        approvalName: res.approval_name,
        authority: res.authority,
        submittedAt: res.submitted_at,
      });
      setSelectedForSubmit(null);
      setSubmissionNotes('');
      setDeclarationConfirmed(false);
    },
  });

  // Filtered clearances
  const filteredClearances = useMemo(() => {
    if (!sc) return [];
    return sc.clearances.filter((item) => {
      // Category match
      if (activeCategory !== 'ALL' && item.category !== activeCategory) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.approval_name.toLowerCase().includes(q);
        const matchAuth = item.concerned_authority.toLowerCase().includes(q);
        const matchRef = item.application_number?.toLowerCase().includes(q);
        const matchDept = item.department_name?.toLowerCase().includes(q);
        if (!matchName && !matchAuth && !matchRef && !matchDept) return false;
      }
      return true;
    });
  }, [sc, activeCategory, searchQuery]);

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/app/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Control Centre
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/projects/${projectId}/dependency-graph`}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-1.5"
          >
            <Network className="w-3.5 h-3.5 text-primary-600" /> Dependency Map
          </Link>
          <button
            onClick={() => startEligible.mutate()}
            disabled={startEligible.isPending}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-1.5 text-primary-700 bg-primary-50/60 hover:bg-primary-100/60 border-primary-200"
          >
            <Zap className={`w-3.5 h-3.5 text-primary-600 ${startEligible.isPending ? 'animate-spin' : ''}`} />
            {startEligible.isPending ? 'Orchestrating...' : 'Start Eligible Clearances'}
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-gradient-to-r from-blue-900 via-primary-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 tracking-wide uppercase">
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
              Project Submission Centre
            </span>
            <span>•</span>
            <span className="font-mono text-blue-300">{projectId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {sc?.project.name ?? 'Statutory Submission Command Centre'}
          </h1>
          <p className="text-blue-100/80 text-xs sm:text-sm leading-relaxed">
            Centralized orchestration hub for statutory permissions, document readiness checklists, prerequisite blockers, and explicit departmental review submissions.
          </p>
        </div>

        {sc && (
          <div className="relative z-10 text-right bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-white">
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              <span>{sc.project.organization.legal_name}</span>
            </div>
            <p className="text-[11px] text-blue-200/80 mt-1">
              {sc.project.sector} · {sc.project.district} District
            </p>
            <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
              Stage: {sc.project.stage}
            </span>
          </div>
        )}

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} lines={2} />
          ))}
        </div>
      )}

      {sc && (
        <>
          {/* Submission Readiness KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="card p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Total Clearances
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-gray-900">{sc.metrics.total_clearances}</span>
                <span className="text-xs text-gray-400">required</span>
              </div>
            </div>

            <div className="card p-4 border border-green-200 bg-green-50/30 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-green-800 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Ready to Submit
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-green-700">{sc.metrics.ready_to_submit}</span>
                <span className="text-xs text-green-600 font-medium">actionable</span>
              </div>
            </div>

            <div className="card p-4 border border-orange-200 bg-orange-50/30 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-orange-800 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> Prereq Blocked
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-orange-700">
                  {sc.metrics.blocked_by_prerequisites}
                </span>
                <span className="text-xs text-orange-600 font-medium">upstream</span>
              </div>
            </div>

            <div className="card p-4 border border-amber-200 bg-amber-50/20 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-600" /> In Preparation
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-amber-700">{sc.metrics.in_preparation}</span>
                <span className="text-xs text-amber-600 font-medium">missing docs</span>
              </div>
            </div>

            <div className="card p-4 border border-blue-200 bg-blue-50/30 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> In Scrutiny
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-blue-700">{sc.metrics.submitted}</span>
                <span className="text-xs text-blue-600 font-medium">under review</span>
              </div>
            </div>

            <div className="card p-4 border border-emerald-200 bg-emerald-50/30 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Granted
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-emerald-700">{sc.metrics.approved}</span>
                <span className="text-xs text-emerald-600 font-medium">completed</span>
              </div>
            </div>
          </div>

          {/* Submission Readiness Progress Bar */}
          <div className="card p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Proposal Submission Readiness</h3>
                <p className="text-xs text-gray-500">
                  {sc.metrics.ready_to_submit + sc.metrics.submitted + sc.metrics.approved} of{' '}
                  {sc.metrics.total_clearances} clearances ready, in processing, or officially granted
                </p>
              </div>
              <span className="text-xl font-extrabold text-primary-600">
                {sc.metrics.overall_readiness_percent}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{
                  width: `${(sc.metrics.approved / sc.metrics.total_clearances) * 100}%`,
                }}
                title={`Approved: ${sc.metrics.approved}`}
              />
              <div
                className="h-full bg-blue-500 transition-all duration-700"
                style={{
                  width: `${(sc.metrics.submitted / sc.metrics.total_clearances) * 100}%`,
                }}
                title={`Submitted: ${sc.metrics.submitted}`}
              />
              <div
                className="h-full bg-green-500 transition-all duration-700"
                style={{
                  width: `${(sc.metrics.ready_to_submit / sc.metrics.total_clearances) * 100}%`,
                }}
                title={`Ready to Submit: ${sc.metrics.ready_to_submit}`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2.5">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Approved ({sc.metrics.approved})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Scrutiny ({sc.metrics.submitted})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Ready to Submit ({sc.metrics.ready_to_submit})
                </span>
              </div>
              <span className="text-gray-400">Zero auto-submission policy strictly enforced</span>
            </div>
          </div>

          {/* Success Banner if application just submitted */}
          {submissionSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start justify-between gap-3 text-green-900 animate-fade-in shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Statutory Submission Confirmed</h4>
                  <p className="text-xs text-green-800 mt-0.5 leading-relaxed">
                    Application <span className="font-mono font-bold">{submissionSuccess.applicationNumber}</span> for{' '}
                    <strong>{submissionSuccess.approvalName}</strong> has been officially lodged with{' '}
                    <strong>{submissionSuccess.authority}</strong>. The configured SLA scrutiny clock is now active.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubmissionSuccess(null)}
                className="text-green-700 hover:text-green-900 text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Controls: Category Filter Tabs & Search */}
          <div className="card p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveCategory('ALL')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    activeCategory === 'ALL'
                      ? 'bg-primary-600 text-white font-bold shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Clearances ({sc.metrics.total_clearances})
                </button>
                <button
                  onClick={() => setActiveCategory('READY_TO_SUBMIT')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeCategory === 'READY_TO_SUBMIT'
                      ? 'bg-green-700 text-white font-bold shadow-sm'
                      : 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to Submit ({sc.metrics.ready_to_submit})
                </button>
                <button
                  onClick={() => setActiveCategory('BLOCKED_BY_PREREQUISITES')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeCategory === 'BLOCKED_BY_PREREQUISITES'
                      ? 'bg-orange-700 text-white font-bold shadow-sm'
                      : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Blocked ({sc.metrics.blocked_by_prerequisites})
                </button>
                <button
                  onClick={() => setActiveCategory('IN_PREPARATION')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeCategory === 'IN_PREPARATION'
                      ? 'bg-amber-700 text-white font-bold shadow-sm'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  In Preparation ({sc.metrics.in_preparation})
                </button>
                <button
                  onClick={() => setActiveCategory('SUBMITTED')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeCategory === 'SUBMITTED'
                      ? 'bg-blue-700 text-white font-bold shadow-sm'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  In Scrutiny ({sc.metrics.submitted})
                </button>
                <button
                  onClick={() => setActiveCategory('APPROVED')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeCategory === 'APPROVED'
                      ? 'bg-emerald-700 text-white font-bold shadow-sm'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Granted ({sc.metrics.approved})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by clearance, authority, ref..."
                  className="input-base text-xs pl-9 pr-3 py-1.5"
                />
              </div>
            </div>
          </div>

          {/* Clearance List Section */}
          <div className="space-y-4">
            {filteredClearances.length === 0 ? (
              <EmptyState
                title="No clearances match the current filter"
                description="Try selecting a different filter category or clearing your search term."
              />
            ) : (
              filteredClearances.map((item) => (
                <div
                  key={item.project_approval_id}
                  className={`card p-5 border transition-all duration-200 ${
                    item.category === 'READY_TO_SUBMIT'
                      ? 'border-green-300 ring-2 ring-green-500/10 bg-white'
                      : item.category === 'BLOCKED_BY_PREREQUISITES'
                      ? 'border-orange-200 bg-white'
                      : item.category === 'SUBMITTED'
                      ? 'border-blue-200 bg-white'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left: Clearance Title & Status Details */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Category Badge */}
                        {item.category === 'READY_TO_SUBMIT' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-800 bg-green-100 px-2.5 py-0.5 rounded-full border border-green-300">
                            <CheckCircle2 className="w-3 h-3 text-green-600" /> Ready to Submit
                          </span>
                        )}
                        {item.category === 'BLOCKED_BY_PREREQUISITES' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300">
                            <AlertCircle className="w-3 h-3 text-orange-600" /> Prerequisite Blocked
                          </span>
                        )}
                        {item.category === 'IN_PREPARATION' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                            <FileText className="w-3 h-3 text-amber-600" /> In Preparation
                          </span>
                        )}
                        {item.category === 'SUBMITTED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-300">
                            <Clock className="w-3 h-3 text-blue-600" /> In Scrutiny
                          </span>
                        )}
                        {item.category === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Granted
                          </span>
                        )}

                        {/* Authority & Category pills */}
                        <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                          {item.concerned_authority}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {item.approval_category}
                        </span>

                        {/* Application ref if present */}
                        {item.application_number && (
                          <span className="text-[11px] font-mono text-primary-700 bg-primary-50 px-2 py-0.5 rounded font-semibold border border-primary-200">
                            {item.application_number}
                          </span>
                        )}

                        {/* Scrutiny Priority Badge if available */}
                        {item.scrutiny_priority && (
                          <ScrutinyPriorityBadge priority={item.scrutiny_priority as any} size="sm" />
                        )}
                      </div>

                      {/* Clearance Name */}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 leading-snug">
                          {item.approval_name}
                        </h3>
                        {item.department_name && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Competent Authority: <span className="font-medium text-gray-700">{item.department_name}</span>
                          </p>
                        )}
                      </div>

                      {/* Blocker Alert Banner */}
                      {item.has_unmet_prerequisites && (
                        <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-lg text-xs text-orange-900 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-orange-800">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            <span>Upstream Prerequisites Incomplete</span>
                          </div>
                          <p className="text-[11px] text-orange-700">
                            Under Maharashtra single-window regulations, this application cannot be submitted until the following clearances are granted:
                          </p>
                          <ul className="list-disc list-inside text-[11px] text-orange-800 font-medium pl-1 space-y-0.5">
                            {item.prerequisites
                              .filter((p) => !p.is_satisfied)
                              .map((p) => (
                                <li key={p.approval_type_id}>
                                  <strong>{p.approval_name}</strong> (Status: {p.status})
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {/* Document Breakdown & Verified Vault Reuse */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                        {/* Mandatory Documents */}
                        <div className="p-3 bg-gray-50/70 border border-gray-100 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700 flex items-center gap-1">
                              <FileCheck2 className="w-3.5 h-3.5 text-gray-500" /> Mandatory Documents
                            </span>
                            <span
                              className={`font-bold ${
                                item.document_checklist.missing_mandatory.length === 0
                                  ? 'text-green-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {item.document_checklist.mandatory_count -
                                item.document_checklist.missing_mandatory.length}{' '}
                              of {item.document_checklist.mandatory_count} complete
                            </span>
                          </div>

                          {item.document_checklist.missing_mandatory.length > 0 ? (
                            <div className="space-y-1 pt-1">
                              <p className="text-[11px] text-amber-800 font-medium">Missing mandatory files:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.document_checklist.missing_mandatory.map((m, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-medium"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-green-700 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-600" /> All mandatory files attached and verified
                            </p>
                          )}
                        </div>

                        {/* Reused Documents from Project Vault */}
                        <div className="p-3 bg-gray-50/70 border border-gray-100 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-blue-600" /> Reused Verified Data
                            </span>
                            <span className="font-bold text-blue-700 font-mono">
                              {item.document_checklist.reused_count} document{item.document_checklist.reused_count !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {item.document_checklist.reused_count > 0 ? (
                            <div className="space-y-1 pt-1">
                              <div className="flex flex-wrap gap-1">
                                {item.document_checklist.reused_documents.map((d) => (
                                  <span
                                    key={d.document_id}
                                    className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium flex items-center gap-1"
                                    title={`Reused from corporate vault across ${d.reuse_count} applications`}
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                    {d.document_type}
                                    <span className="text-blue-500 font-normal">({d.reuse_count}x)</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-500">
                              Directly uploaded application-specific technical files.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Configured Service Timeline */}
                      <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          Statutory Timeline: <strong>{item.service_timeline.label}</strong>
                        </span>
                        {item.service_timeline.sla_status && (
                          <span className="flex items-center gap-1">
                            Status: <StatusBadge status={item.service_timeline.sla_status as any} size="sm" />
                          </span>
                        )}
                        {item.submitted_at && (
                          <span className="text-gray-400">
                            Submitted: {formatDate(item.submitted_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Explicit Review & Submit Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2 min-w-[200px] border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-5">
                      {item.category === 'READY_TO_SUBMIT' && (
                        <>
                          <button
                            onClick={() => setSelectedForSubmit(item)}
                            className="btn-primary text-xs py-2.5 px-4 bg-green-700 hover:bg-green-800 text-white font-bold shadow-md shadow-green-700/20 flex items-center justify-center gap-2 w-full"
                          >
                            <Send className="w-4 h-4" />
                            Review & Submit
                          </button>
                          {item.application_id && (
                            <Link
                              href={`/app/applications/${item.application_id}`}
                              className="btn-secondary text-xs py-2 px-3 text-center flex items-center justify-center gap-1 text-gray-700 w-full"
                            >
                              <span>Open Workspace</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </>
                      )}

                      {item.category === 'BLOCKED_BY_PREREQUISITES' && (
                        <>
                          <button
                            disabled
                            className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed border border-gray-200 flex items-center justify-center gap-2 w-full"
                            title="Complete upstream prerequisite clearances to unlock submission"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                            Submission Blocked
                          </button>
                          <Link
                            href={`/app/projects/${projectId}/dependency-graph`}
                            className="btn-secondary text-xs py-1.5 px-3 text-center text-primary-700 bg-primary-50/50 hover:bg-primary-100/50 border-primary-200 flex items-center justify-center gap-1 w-full"
                          >
                            <Network className="w-3.5 h-3.5" />
                            View Dependencies
                          </Link>
                        </>
                      )}

                      {item.category === 'IN_PREPARATION' && (
                        <>
                          {item.application_id ? (
                            <Link
                              href={`/app/applications/${item.application_id}?tab=documents`}
                              className="btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 w-full bg-amber-700 hover:bg-amber-800 text-white font-bold"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Complete Documents</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <button
                              onClick={() => startEligible.mutate()}
                              disabled={startEligible.isPending}
                              className="btn-secondary text-xs py-2 px-3 text-center flex items-center justify-center gap-1 text-primary-700 bg-primary-50/60 hover:bg-primary-100/60 border-primary-200 w-full"
                            >
                              <Zap className="w-3.5 h-3.5 text-primary-600" />
                              Initialize Workspace
                            </button>
                          )}
                        </>
                      )}

                      {item.category === 'SUBMITTED' && (
                        <>
                          <Link
                            href={`/app/applications/${item.application_id}`}
                            className="btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 w-full bg-blue-700 hover:bg-blue-800 font-bold"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Track Scrutiny</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </>
                      )}

                      {item.category === 'APPROVED' && (
                        <>
                          <Link
                            href={`/app/applications/${item.application_id}`}
                            className="btn-secondary text-xs py-2 px-4 flex items-center justify-center gap-1.5 w-full text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-bold"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>View Clearance</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* STATUTORY REVIEW & SUBMIT CONFIRMATION MODAL */}
      {selectedForSubmit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5 text-green-700">
                <div className="p-2 bg-green-50 rounded-xl border border-green-200">
                  <Send className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Review & Submit Clearance</h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Ref: {selectedForSubmit.application_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedForSubmit(null);
                  setDeclarationConfirmed(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Clearance Summary Details */}
            <div className="space-y-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Statutory Permission:</span>
                <span className="font-bold text-gray-900 text-right">{selectedForSubmit.approval_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Competent Authority:</span>
                <span className="font-bold text-gray-900">
                  {selectedForSubmit.department_name || selectedForSubmit.concerned_authority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Statutory SLA Duration:</span>
                <span className="font-semibold text-primary-700">{selectedForSubmit.service_timeline.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verified Attached Documents:</span>
                <span className="font-semibold text-green-700">
                  {selectedForSubmit.document_checklist.uploaded_count} Documents Verified
                </span>
              </div>
            </div>

            {/* Statutory Checkpoints */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">
                Pre-Submission Verification Matrix
              </p>
              <div className="space-y-1.5 p-3 rounded-xl bg-green-50/50 border border-green-200 text-green-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>All upstream prerequisite clearances are satisfied</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>All mandatory statutory documents uploaded and pre-validated</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Corporate entity dossier and proposal parameters synchronized</span>
                </div>
              </div>
            </div>

            {/* Submission Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Statutory Submission Notes (Optional)
              </label>
              <input
                type="text"
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="e.g. All structural drawings and NOC requirements attached."
                className="input-base text-xs"
              />
            </div>

            {/* Statutory Declaration Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/40 cursor-pointer">
              <input
                type="checkbox"
                checked={declarationConfirmed}
                onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <span className="text-[11px] text-blue-900 leading-relaxed font-medium">
                I solemnly confirm and declare that all particulars, drawings, and supporting documents attached to this application are true, authentic, and compliant with Section 9 of the Maharashtra Industry Facilitation Act.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedForSubmit(null);
                  setDeclarationConfirmed(false);
                }}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!declarationConfirmed || submitApplication.isPending || !selectedForSubmit.application_id}
                onClick={() => {
                  if (selectedForSubmit.application_id) {
                    submitApplication.mutate({
                      appId: selectedForSubmit.application_id,
                      notes: submissionNotes || 'Statutory submission verified via Project Submission Centre',
                    });
                  }
                }}
                className="btn-primary text-xs py-2 px-5 bg-green-700 hover:bg-green-800 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                <Send className={`w-3.5 h-3.5 ${submitApplication.isPending ? 'animate-spin' : ''}`} />
                {submitApplication.isPending ? 'Submitting to Authority...' : 'Confirm Statutory Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parallel Orchestration Feedback Modal */}
      <ParallelOrchestrationModal
        isOpen={!!orchestrationResult}
        onClose={() => setOrchestrationResult(null)}
        result={orchestrationResult}
        projectName={sc?.project.name}
      />
    </div>
  );
}
