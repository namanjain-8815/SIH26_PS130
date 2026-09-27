'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { governmentApi, applicationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { Clock, AlertCircle, ShieldAlert, ArrowUpRight, CheckCircle2, RefreshCw, Send, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface SLAMonitorItem {
  id: string;
  application_id: string;
  application_number: string;
  approval_name: string;
  org_name: string;
  department_name: string;
  department_id?: string;
  sla_status: string;
  specified_time_limit_days?: number;
  due_date: string | null;
  breached: boolean;
  breach_duration_days: number | null;
  application_status: string;
  is_escalated?: boolean;
  can_escalate?: boolean;
  label: string;
}

export default function SLAMonitorPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isOfficer = user?.role === 'OFFICER';
  const officerDeptId = user?.department?.id;

  const [selectedDeptId, setSelectedDeptId] = useState<string>(isOfficer && officerDeptId ? officerDeptId : 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BREACHED' | 'AT_RISK' | 'ON_TRACK'>('ALL');
  const [escalateTarget, setEscalateTarget] = useState<SLAMonitorItem | null>(null);
  const [escalateReason, setEscalateReason] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Departments for filter
  const { data: departments } = useQuery({
    queryKey: ['government-departments'],
    queryFn: () => governmentApi.departments(),
  });

  // Query SLA instances
  const effectiveDeptParam = selectedDeptId === 'ALL' ? undefined : selectedDeptId;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sla-monitor', effectiveDeptParam],
    queryFn: () => governmentApi.slaMonitor(effectiveDeptParam),
  });

  // Evaluate SLA timeline mutation
  const evaluateMutation = useMutation({
    mutationFn: () => governmentApi.evaluateSla(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sla-monitor'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      setActionNotice(`Timeline evaluation completed: ${res.evaluated_count} active applications assessed.`);
      setTimeout(() => setActionNotice(null), 6000);
    },
  });

  // Escalate application mutation
  const escalateMutation = useMutation({
    mutationFn: ({ appId, reason }: { appId: string; reason: string }) =>
      applicationsApi.escalate(appId, reason),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sla-monitor'] });
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      setEscalateTarget(null);
      setEscalateReason('');
      setActionNotice(res.message || 'Application successfully transferred to the Empowered Committee.');
      setTimeout(() => setActionNotice(null), 6000);
    },
  });

  const allItems = (data ?? []) as SLAMonitorItem[];

  // Filter items by status
  const filteredItems = allItems.filter((item) => {
    if (statusFilter === 'BREACHED') return item.breached;
    if (statusFilter === 'AT_RISK') return item.sla_status === 'AT_RISK';
    if (statusFilter === 'ON_TRACK') return item.sla_status === 'ON_TRACK';
    return true;
  });

  const breachedCount = allItems.filter(i => i.breached).length;
  const atRiskCount = allItems.filter(i => i.sla_status === 'AT_RISK').length;
  const onTrackCount = allItems.filter(i => i.sla_status === 'ON_TRACK').length;

  function openEscalateModal(item: SLAMonitorItem) {
    setEscalateTarget(item);
    setEscalateReason(
      `Statutory specified time limit exceeded by ${item.breach_duration_days || 0} days without final disposal. Transferred / Escalated to the Empowered Committee under Section 10 of the Maharashtra Industry, Trade and Investment Facilitation Act, 2023.`
    );
  }

  function handleConfirmEscalate() {
    if (!escalateTarget) return;
    escalateMutation.mutate({
      appId: escalateTarget.application_id,
      reason: escalateReason.trim(),
    });
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Specified Time Limit Monitor</h1>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Configured service timeline tracking & statutory specified time limits under Maharashtra Single Window framework (MAITRI Rules, 2025)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => evaluateMutation.mutate()}
            disabled={evaluateMutation.isPending}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            title="Scan active applications and dispatch warnings for approaching timelines"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluateMutation.isPending ? 'animate-spin' : ''}`} />
            {evaluateMutation.isPending ? 'Evaluating…' : 'Evaluate Time Limits'}
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{actionNotice}</span>
        </div>
      )}

      {/* Authority Scope & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-card">
        {/* Department Scope Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">Concerned Authority:</span>
          {isOfficer && officerDeptId ? (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              {user?.department?.name ?? 'Assigned Department'}
            </span>
          ) : (
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Concerned Authorities (State Overview)</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({allItems.length})
          </button>
          <button
            onClick={() => setStatusFilter('BREACHED')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              statusFilter === 'BREACHED' ? 'bg-red-50 text-red-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-red-700'
            }`}
          >
            Breached ({breachedCount})
          </button>
          <button
            onClick={() => setStatusFilter('AT_RISK')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              statusFilter === 'AT_RISK' ? 'bg-orange-50 text-orange-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-orange-700'
            }`}
          >
            At Risk ({atRiskCount})
          </button>
          <button
            onClick={() => setStatusFilter('ON_TRACK')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              statusFilter === 'ON_TRACK' ? 'bg-green-50 text-green-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-green-700'
            }`}
          >
            Within Limit ({onTrackCount})
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center border-l-4 border-l-red-500 bg-red-50/20">
          <p className="text-3xl font-bold text-red-600">{breachedCount}</p>
          <p className="text-xs text-gray-600 font-medium mt-1">Specified Limit Breached</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Eligible for Empowered Committee Escalation</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-orange-400 bg-orange-50/20">
          <p className="text-3xl font-bold text-orange-600">{atRiskCount}</p>
          <p className="text-xs text-gray-600 font-medium mt-1">At Risk (&lt; 25% Time Remaining)</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Scrutiny Expedited under MAITRI Rules</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-green-500 bg-green-50/20">
          <p className="text-3xl font-bold text-green-600">{onTrackCount}</p>
          <p className="text-xs text-gray-600 font-medium mt-1">Within Specified Limit</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Normal Department Processing</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50/60">
            <tr>
              {['Application Ref', 'Permission / Approval', 'Applicant Entity', 'Concerned Authority', 'Specified Limit Status', 'Due Date', 'Overdue / Delay', 'Statutory Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(5)].map((_, i) => <TableRowSkeleton key={i} cols={8} />)}
            {!isLoading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState title="No applications match criteria" description="Applications will appear here once submitted for statutory scrutiny." />
                </td>
              </tr>
            )}
            {error && (
              <tr><td colSpan={8}>
                <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
              </td></tr>
            )}
            {filteredItems.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50/80 transition-colors ${item.breached ? 'bg-red-50/30' : item.sla_status === 'AT_RISK' ? 'bg-orange-50/30' : ''}`}>
                <td className="px-4 py-3">
                  <Link
                    href={`/app/applications/${item.application_id}`}
                    className="font-mono text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                  >
                    {item.application_number}
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-800 max-w-[160px] truncate font-medium">
                  {item.approval_name}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">
                  {item.org_name}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">
                  {item.department_name}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <StatusBadge status={item.sla_status} size="sm" />
                    {item.is_escalated && (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block w-fit">
                        Escalated to Committee
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {formatDate(item.due_date)}
                </td>
                <td className="px-4 py-3">
                  {item.breach_duration_days ? (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" /> +{item.breach_duration_days} days
                    </span>
                  ) : item.sla_status === 'AT_RISK' ? (
                    <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> &lt;25% left
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-600 font-medium">On schedule</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.is_escalated ? (
                    <span className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> In Committee Review
                    </span>
                  ) : item.can_escalate ? (
                    <button
                      onClick={() => openEscalateModal(item)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Escalate to Committee
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Demonstration Disclaimer */}
      <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500 italic">
          Configured service timelines reflect demonstration timeframes aligned to the Maharashtra Industry, Trade and Investment Facilitation Rules, 2025. All statutory decisions remain vested with the Concerned Competent Authority.
        </p>
      </div>

      {/* Statutory Escalation Modal */}
      {escalateTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Transfer to Empowered Committee</h3>
                  <p className="text-xs text-gray-500">Statutory delay escalation under MAITRI Rules, 2025</p>
                </div>
              </div>
              <button
                onClick={() => setEscalateTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">Statutory Basis (Section 10, MAITRI Act 2023):</p>
              When a Competent Authority fails to take a decision within the specified time limit, the application may be transferred to the Empowered Committee for time-bound resolution and direction.
            </div>

            <div className="space-y-1.5 text-xs text-gray-600">
              <p><span className="font-semibold text-gray-700">Application:</span> {escalateTarget.application_number} ({escalateTarget.approval_name})</p>
              <p><span className="font-semibold text-gray-700">Applicant Entity:</span> {escalateTarget.org_name}</p>
              <p><span className="font-semibold text-gray-700">Concerned Authority:</span> {escalateTarget.department_name}</p>
              <p><span className="font-semibold text-gray-700">Overdue Duration:</span> {escalateTarget.breach_duration_days ? `${escalateTarget.breach_duration_days} days` : 'Timeline at critical threshold'}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Grounds for Escalation / Committee Reference Note:
              </label>
              <textarea
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                rows={4}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEscalateTarget(null)}
                className="btn-ghost text-xs py-2 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEscalate}
                disabled={escalateMutation.isPending || !escalateReason.trim()}
                className="btn-danger text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {escalateMutation.isPending ? 'Transferring…' : 'Confirm Committee Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
