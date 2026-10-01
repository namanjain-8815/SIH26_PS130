'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complianceApi, projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, CardSkeleton } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import type {
  RenewalWorkspaceItem,
  RenewalCategory,
  RenewalsWorkspaceResponse,
  PrepareRenewalResponse,
} from '@/types/api';
import Link from 'next/link';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell,
  CheckCheck,
  Building2,
  RefreshCw,
  FileText,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
  CheckSquare,
  FileCheck2,
  Layers,
} from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

const CATEGORY_CONFIG: Record<
  RenewalCategory,
  {
    label: string;
    border: string;
    bg: string;
    badge: string;
    badgeText: string;
    icon: React.ReactNode;
  }
> = {
  ACTION_REQUIRED: {
    label: 'Action Required',
    border: 'border-l-red-500',
    bg: 'bg-red-50/30',
    badge: 'bg-red-100 text-red-800 border border-red-200',
    badgeText: 'Action Required',
    icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
  },
  OVERDUE: {
    label: 'Overdue',
    border: 'border-l-red-600',
    bg: 'bg-red-50/40',
    badge: 'bg-red-100 text-red-800 border border-red-300',
    badgeText: 'Statutory Renewal Overdue',
    icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
  },
  DUE_SOON: {
    label: 'Due Soon',
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/30',
    badge: 'bg-amber-100 text-amber-800 border border-amber-200',
    badgeText: 'Due within 60 Days',
    icon: <Clock className="w-4 h-4 text-amber-500" />,
  },
  HEALTHY: {
    label: 'Healthy / On Track',
    border: 'border-l-emerald-500',
    bg: 'bg-white',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    badgeText: 'On Track / Compliant',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  },
};

function ComplianceContent() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || DEMO_PROJECT_ID;
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | RenewalCategory>('ALL');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Modals state
  const [selectedRenewalForDetail, setSelectedRenewalForDetail] = useState<RenewalWorkspaceItem | null>(null);
  const [preparedRenewalOutcome, setPreparedRenewalOutcome] = useState<PrepareRenewalResponse | null>(null);

  // List of all projects for the investor
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const activeProjectId = selectedProjectId || DEMO_PROJECT_ID;

  // Selected project details
  const { data: currentProject } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => projectsApi.get(activeProjectId),
    enabled: !!activeProjectId,
  });

  // Statutory renewals workspace query
  const {
    data: renewalsData,
    isLoading,
    error,
    refetch,
  } = useQuery<RenewalsWorkspaceResponse>({
    queryKey: ['renewals-workspace', activeProjectId],
    queryFn: () => complianceApi.getWorkspace(activeProjectId),
    enabled: !!activeProjectId,
  });

  // Complete mutation (Record Compliance)
  const completeMutation = useMutation({
    mutationFn: (id: string) => complianceApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['renewals-workspace', activeProjectId] });
      qc.invalidateQueries({ queryKey: ['compliance', activeProjectId] });
      qc.invalidateQueries({ queryKey: ['control-centre', activeProjectId] });
      setFeedbackNotice(
        'Compliance recorded successfully! The subsequent periodic renewal has been automatically scheduled in your statutory calendar.'
      );
      setTimeout(() => setFeedbackNotice(null), 6000);
    },
  });

  // Send reminders mutation
  const remindMutation = useMutation({
    mutationFn: () => complianceApi.remind(activeProjectId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      setFeedbackNotice(
        `Dispatched ${res.reminders_sent} statutory renewal & compliance alerts to your notification inbox.`
      );
      setTimeout(() => setFeedbackNotice(null), 6000);
    },
  });

  // Prepare Renewal mutation
  const prepareRenewalMutation = useMutation({
    mutationFn: (complianceId: string) => complianceApi.prepareRenewal(complianceId),
    onSuccess: (outcome) => {
      qc.invalidateQueries({ queryKey: ['renewals-workspace', activeProjectId] });
      qc.invalidateQueries({ queryKey: ['applications', activeProjectId] });
      setPreparedRenewalOutcome(outcome);
    },
  });

  const summary = renewalsData?.summary || {
    total: 0,
    action_required: 0,
    due_soon: 0,
    healthy: 0,
    overdue: 0,
    completed: 0,
  };

  const allRenewals = renewalsData?.renewals || [];

  const filteredRenewals = allRenewals.filter((item) => {
    if (activeCategoryFilter === 'ALL') return true;
    return item.category === activeCategoryFilter;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold">
              PS 26130 Statutory Renewals Management
            </span>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              Configured Statutory Periods
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Statutory Clearances & Compliance Renewals
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Post-establishment statutory renewals, periodic returns & environmental consent cycles with verified project profile reuse.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {projects && projects.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={activeProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setActiveCategoryFilter('ALL');
                }}
                className="bg-transparent text-gray-800 font-medium focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => remindMutation.mutate()}
            disabled={remindMutation.isPending}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5 shadow-xs"
            title="Dispatch statutory renewal alerts to inbox"
          >
            <Bell className="w-3.5 h-3.5" />
            {remindMutation.isPending ? 'Sending Alerts…' : 'Send Renewal Alerts'}
          </button>
        </div>
      </div>

      {feedbackNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{feedbackNotice}</span>
        </div>
      )}

      {/* 4-Bucket Dashboard KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Bucket 1: Action Required */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'ACTION_REQUIRED' ? 'ALL' : 'ACTION_REQUIRED')}
          className={`card p-4 text-left border-l-4 border-l-red-500 transition-all cursor-pointer hover:shadow-md ${
            activeCategoryFilter === 'ACTION_REQUIRED' ? 'ring-2 ring-red-500 bg-red-50/40' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-semibold">Action Required</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.action_required}</p>
          <p className="text-[11px] text-red-700 mt-0.5">Due within 30 days or pending</p>
        </button>

        {/* Bucket 2: Due Soon */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'DUE_SOON' ? 'ALL' : 'DUE_SOON')}
          className={`card p-4 text-left border-l-4 border-l-amber-500 transition-all cursor-pointer hover:shadow-md ${
            activeCategoryFilter === 'DUE_SOON' ? 'ring-2 ring-amber-500 bg-amber-50/40' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-semibold">Due Soon</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary.due_soon}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Due within 31-90 days</p>
        </button>

        {/* Bucket 3: Healthy / On Track */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'HEALTHY' ? 'ALL' : 'HEALTHY')}
          className={`card p-4 text-left border-l-4 border-l-emerald-500 transition-all cursor-pointer hover:shadow-md ${
            activeCategoryFilter === 'HEALTHY' ? 'ring-2 ring-emerald-500 bg-emerald-50/30' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-semibold">Healthy / On Track</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.healthy}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">&gt; 90 days or completed</p>
        </button>

        {/* Bucket 4: Overdue */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`card p-4 text-left border-l-4 border-l-red-600 transition-all cursor-pointer hover:shadow-md ${
            activeCategoryFilter === 'OVERDUE' ? 'ring-2 ring-red-600 bg-red-50/50' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-semibold">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-700 mt-1">{summary.overdue}</p>
          <p className="text-[11px] text-red-800 mt-0.5">Statutory deadline breached</p>
        </button>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeCategoryFilter === 'ALL'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-100 font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Renewals ({allRenewals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('ACTION_REQUIRED')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeCategoryFilter === 'ACTION_REQUIRED'
                ? 'bg-red-50 text-red-800 border border-red-200 font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Action Required ({summary.action_required})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('DUE_SOON')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeCategoryFilter === 'DUE_SOON'
                ? 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Due Soon ({summary.due_soon})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('HEALTHY')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeCategoryFilter === 'HEALTHY'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Healthy ({summary.healthy})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('OVERDUE')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeCategoryFilter === 'OVERDUE'
                ? 'bg-red-100 text-red-900 border border-red-300 font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Overdue ({summary.overdue})
          </button>
        </div>

        <span className="text-xs text-gray-500 font-medium">
          Showing {filteredRenewals.length} statutory renewal{filteredRenewals.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Main Renewals List */}
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} lines={3} />
            ))}
          </div>
        )}

        {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

        {!isLoading && filteredRenewals.length === 0 && (
          <EmptyState
            title="No renewals in this category"
            description={
              activeCategoryFilter === 'ALL'
                ? 'No statutory renewals derived yet for this project. Check your applicable clearances.'
                : `No renewals matching the "${activeCategoryFilter.replace(/_/g, ' ')}" status.`
            }
          />
        )}

        {filteredRenewals.map((item) => {
          const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.HEALTHY;
          const vaultReadyCount = item.required_renewal_documents.filter((d) => d.available_in_vault).length;
          const totalDocsCount = item.required_renewal_documents.length;

          return (
            <div
              key={item.id}
              className={`card p-5 border border-gray-200 border-l-4 ${cfg.border} ${cfg.bg} transition-all space-y-3 hover:shadow-xs`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cfg.icon}
                    <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.badgeText}
                    </span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Authority: <strong className="text-gray-800">{item.authority}</strong> &bull; Frequency:{' '}
                    <strong className="text-gray-800">{item.frequency}</strong>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-bold ${
                      item.days_remaining < 0
                        ? 'text-red-700'
                        : item.days_remaining <= 30
                        ? 'text-red-600'
                        : item.days_remaining <= 90
                        ? 'text-amber-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {item.days_remaining < 0
                      ? `${Math.abs(item.days_remaining)}d overdue`
                      : `${item.days_remaining}d remaining`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-end gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {formatDate(item.next_due_date)}
                  </p>
                </div>
              </div>

              {/* Source Clearance & Documents Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-xs">
                {/* Source Application */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-gray-400 text-[11px] block">Linked Source Clearance</span>
                    {item.source_application ? (
                      <Link
                        href={`/app/applications/${item.source_application.id}`}
                        className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {item.source_application.application_number}
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </Link>
                    ) : (
                      <span className="text-gray-500 font-medium">Initial Grant Recorded</span>
                    )}
                  </div>
                </div>

                {/* Vault Documents Status */}
                <div className="flex items-center gap-2 text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-gray-400 text-[11px] block">Required Renewal Documents</span>
                    {totalDocsCount > 0 ? (
                      <span className="font-semibold text-gray-800">
                        {vaultReadyCount}/{totalDocsCount} available in Vault (1-click reuse ready)
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Prescribed renewal submission</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                  <span>Configured statutory period: <strong>{item.frequency}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => setSelectedRenewalForDetail(item)}
                    className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Renewal Details
                  </button>

                  {/* Prepare Renewal Button */}
                  <button
                    type="button"
                    onClick={() => prepareRenewalMutation.mutate(item.id)}
                    disabled={prepareRenewalMutation.isPending}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-xs"
                    title="Prepare renewal application with reused project data"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    {prepareRenewalMutation.isPending ? 'Preparing…' : 'Prepare Renewal'}
                  </button>

                  {/* Record Compliance / Mark Completed */}
                  {item.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => completeMutation.mutate(item.id)}
                      disabled={completeMutation.isPending}
                      className="btn-secondary text-xs py-1.5 px-2.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-semibold"
                      title="Mark compliance verified and schedule next cycle"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mr-1" />
                      Record Compliance
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: PREPARE RENEWAL OUTCOME MODAL                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {preparedRenewalOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-200 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Statutory Renewal Application Prepared
                </h3>
              </div>
              <button
                onClick={() => setPreparedRenewalOutcome(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-purple-900">Clearance Approval:</span>
                <span className="font-bold text-gray-900">{preparedRenewalOutcome.approval_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-purple-900">Application Number:</span>
                <span className="font-mono font-bold text-blue-600">
                  {preparedRenewalOutcome.application_number}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-purple-900">Competent Authority:</span>
                <span className="font-medium text-gray-800">{preparedRenewalOutcome.authority}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-purple-200/60">
                <span className="font-semibold text-purple-900">Auto-Attached Vault Documents:</span>
                <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {preparedRenewalOutcome.attached_documents_count} Verified Documents Attached
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Your statutory renewal application workspace has been initialized in{' '}
              <strong className="text-gray-900">IN PREPARATION</strong> status. All master enterprise attributes
              and verified documents from your Document Vault were automatically linked.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Statutory Guard:</strong> Per Maharashtra Single Window rules, renewal applications are
                never automatically submitted without applicant review. Please inspect the prefilled application
                and click submit when ready.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPreparedRenewalOutcome(null)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Close
              </button>
              <Link
                href={preparedRenewalOutcome.target_url}
                className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                Open Application Form & Review
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: RENEWAL DETAILED SPECIFICATION MODAL                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {selectedRenewalForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-xl w-full p-6 space-y-4 shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Statutory Renewal Dossier</h3>
              </div>
              <button
                onClick={() => setSelectedRenewalForDetail(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div>
                <h4 className="font-bold text-sm text-gray-900">{selectedRenewalForDetail.name}</h4>
                <p className="text-gray-500 mt-0.5">
                  Authority: <strong className="text-gray-800">{selectedRenewalForDetail.authority}</strong>
                </p>
              </div>

              {/* Statutory Specifications */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[11px]">Renewal Frequency</span>
                  <span className="font-bold text-gray-800">{selectedRenewalForDetail.frequency}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Next Due Date</span>
                  <span className="font-bold text-gray-800">{formatDate(selectedRenewalForDetail.next_due_date)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Category</span>
                  <span className="font-bold text-purple-700">{selectedRenewalForDetail.category}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Timeline Countdown</span>
                  <span
                    className={`font-bold ${
                      selectedRenewalForDetail.days_remaining < 0 ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {selectedRenewalForDetail.days_remaining < 0
                      ? `${Math.abs(selectedRenewalForDetail.days_remaining)} days overdue`
                      : `${selectedRenewalForDetail.days_remaining} days remaining`}
                  </span>
                </div>
              </div>

              {/* Linked Source Application */}
              <div>
                <h5 className="font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Source Clearance Application
                </h5>
                {selectedRenewalForDetail.source_application ? (
                  <div className="p-3 rounded-lg border border-gray-200 bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Application Number:</span>
                      <span className="font-mono font-bold text-blue-600">
                        {selectedRenewalForDetail.source_application.application_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Application Status:</span>
                      <StatusBadge status={selectedRenewalForDetail.source_application.status} size="sm" />
                    </div>
                    {selectedRenewalForDetail.source_application.granted_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Original Grant Date:</span>
                        <span className="text-gray-800 font-medium">
                          {formatDate(selectedRenewalForDetail.source_application.granted_at)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    No active application linked. Use "Prepare Renewal" to initialize the renewal workspace.
                  </p>
                )}
              </div>

              {/* Required Renewal Documents & Vault Status */}
              <div>
                <h5 className="font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Required Renewal Documents & Vault Status
                </h5>
                {selectedRenewalForDetail.required_renewal_documents.length === 0 ? (
                  <p className="text-gray-500 italic bg-gray-50 p-2.5 rounded-lg">
                    Standard prescribed statutory renewal declaration required.
                  </p>
                ) : (
                  <div className="space-y-2 border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                    {selectedRenewalForDetail.required_renewal_documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-lg border border-gray-200 flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{doc.document_type.replace(/_/g, ' ')}</p>
                          {doc.condition && <p className="text-[11px] text-gray-500 mt-0.5">{doc.condition}</p>}
                        </div>
                        <div>
                          {doc.available_in_vault ? (
                            <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Available in Vault
                            </span>
                          ) : (
                            <span className="badge bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                              Upload Required
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedRenewalForDetail(null)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = selectedRenewalForDetail.id;
                  setSelectedRenewalForDetail(null);
                  prepareRenewalMutation.mutate(id);
                }}
                disabled={prepareRenewalMutation.isPending}
                className="btn-primary text-xs py-1.5 px-4 bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Prepare Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Disclaimer */}
      <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500 italic">
          Statutory compliance obligations and periodic returns under Government of Maharashtra Single Window Act dynamically derived from applicable clearances schedule.
        </p>
      </div>
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense fallback={<CardSkeleton lines={4} />}>
      <ComplianceContent />
    </Suspense>
  );
}
