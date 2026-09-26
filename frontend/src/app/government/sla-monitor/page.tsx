'use client';

import { useQuery } from '@tanstack/react-query';
import { governmentApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { Clock, AlertCircle } from 'lucide-react';

export default function SLAMonitorPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sla-monitor'],
    queryFn: () => governmentApi.slaMonitor(),
  });

  const items = (data ?? []) as Array<{
    id: string;
    application_number: string;
    approval_name: string;
    org_name: string;
    department_name: string;
    sla_status: string;
    due_date: string | null;
    breached: boolean;
    breach_duration_days: number | null;
    application_status: string;
    label: string;
  }>;

  const breached = items.filter(i => i.breached).length;
  const atRisk = items.filter(i => i.sla_status === 'AT_RISK').length;
  const onTrack = items.filter(i => i.sla_status === 'ON_TRACK').length;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-gray-900">SLA Monitor</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configured service timeline tracking — not legally guaranteed commitments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center border-l-4 border-l-red-500">
          <p className="text-3xl font-bold text-red-600">{breached}</p>
          <p className="text-xs text-gray-500 mt-1">SLA Breached</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-orange-400">
          <p className="text-3xl font-bold text-orange-600">{atRisk}</p>
          <p className="text-xs text-gray-500 mt-1">At Risk</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-green-500">
          <p className="text-3xl font-bold text-green-600">{onTrack}</p>
          <p className="text-xs text-gray-500 mt-1">On Track</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Application', 'Approval', 'Organisation', 'Dept', 'SLA Status', 'Due Date', 'Overdue'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(5)].map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState title="No SLA instances found" description="Applications appear here once submitted." />
                </td>
              </tr>
            )}
            {error && (
              <tr><td colSpan={7}>
                <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
              </td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50 ${item.breached ? 'bg-red-50/40' : item.sla_status === 'AT_RISK' ? 'bg-orange-50/40' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-900">{item.application_number}</td>
                <td className="px-4 py-3 text-xs text-gray-700 max-w-[160px] truncate">{item.approval_name}</td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">{item.org_name}</td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-[100px] truncate">{item.department_name}</td>
                <td className="px-4 py-3"><StatusBadge status={item.sla_status} size="sm" /></td>
                <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.due_date)}</td>
                <td className="px-4 py-3">
                  {item.breach_duration_days ? (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {item.breach_duration_days}d
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

      {items.length > 0 && (
        <p className="text-xs text-gray-400 italic text-center">{items[0].label}</p>
      )}
    </div>
  );
}
