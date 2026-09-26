'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { governmentApi, applicationsApi } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import type { WorkQueueItem } from '@/types/api';
import { Clock, AlertCircle, Filter, ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = ['', 'SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED', 'INSPECTION_SCHEDULED', 'AWAITING_APPLICANT'];
const PRIORITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function WorkQueuePage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [selected, setSelected] = useState<WorkQueueItem | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['work-queue', { status, priority }],
    queryFn: () => governmentApi.workQueue({ status: status || undefined, priority: priority || undefined }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      applicationsApi.updateStatus(id, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-queue'] });
      setSelected(null);
    },
  });

  const items = data ?? [];

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className={`flex flex-col ${selected ? 'w-[55%]' : 'flex-1'} border-r border-gray-100`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Work Queue</h1>
            <span className="text-sm text-gray-500">{items.length} applications</span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-base py-1.5 w-auto text-xs"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="input-base py-1.5 w-auto text-xs"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.filter(Boolean).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
          {!isLoading && items.length === 0 && (
            <EmptyState title="Work queue is empty" description="No applications match the current filters." />
          )}
          <table className="w-full">
            {items.length > 0 && (
              <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                <tr>
                  {['Application', 'Approval', 'Organisation', 'Status', 'SLA', 'Queries'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-gray-50">
              {isLoading && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === item.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono font-medium text-gray-900">{item.application_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.district}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-800 max-w-[140px] truncate">{item.approval_name}</p>
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-700 max-w-[120px] truncate">{item.org_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    {item.sla_status ? (
                      <StatusBadge status={item.sla_status} size="sm" />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {item.sla_due_date && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(item.sla_due_date)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.open_queries > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> {item.open_queries}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action panel */}
      {selected && (
        <div className="flex-1 p-5 overflow-y-auto animate-fade-in">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">{selected.approval_name}</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{selected.application_number}</p>
            </div>

            <div className="card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Organisation', value: selected.org_name },
                  { label: 'Project', value: selected.project_name },
                  { label: 'District', value: selected.district },
                  { label: 'Department', value: selected.department_name },
                  { label: 'Priority', value: <PriorityBadge priority={selected.priority} /> },
                  { label: 'Status', value: <StatusBadge status={selected.status} /> },
                  { label: 'Submitted', value: formatDate(selected.submitted_at) },
                  { label: 'SLA Status', value: selected.sla_status ? <StatusBadge status={selected.sla_status} /> : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-gray-400 mb-0.5">{label}</p>
                    <div className="text-gray-800 font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Update status */}
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">Update Application Status</p>
              <p className="text-xs text-gray-500 mb-3">
                Current: <StatusBadge status={selected.status} size="sm" />
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { status: 'UNDER_REVIEW', label: 'Start Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { status: 'QUERY_RAISED', label: 'Raise Query', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                  { status: 'INSPECTION_SCHEDULED', label: 'Schedule Inspection', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { status: 'APPROVED', label: 'Approve', color: 'bg-green-50 text-green-700 border-green-200' },
                  { status: 'REJECTED', label: 'Reject', color: 'bg-red-50 text-red-700 border-red-200' },
                  { status: 'AWAITING_APPLICANT', label: 'Send Back', color: 'bg-gray-50 text-gray-700 border-gray-200' },
                ].map(({ status, label, color }) => (
                  <button
                    key={status}
                    disabled={selected.status === status || updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selected.id, newStatus: status })}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all disabled:opacity-40 hover:opacity-90 ${color}`}
                  >
                    {updateStatus.isPending && updateStatus.variables?.newStatus === status ? (
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Updating…
                      </span>
                    ) : label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
