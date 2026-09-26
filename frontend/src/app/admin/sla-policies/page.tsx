'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { Clock } from 'lucide-react';

export default function SLAPoliciesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-sla-policies'],
    queryFn: () => api.get<unknown[]>('/admin/sla-policies'),
  });

  const policies = (data ?? []) as Array<{
    id: string;
    duration_days: number;
    start_event: string;
    escalation_level: string;
    approval_type?: { name: string; authority: string };
  }>;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900">Specified Time Limit Policies</h1>
          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
            PROTOTYPE
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Configured service timelines and statutory specified time limits under MAITRI Rules · Demonstration Policies
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Permission / Approval Type', 'Specified Limit', 'Starts from', 'Escalation Entity'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={4} />)}
            {error && <tr><td colSpan={4}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></td></tr>}
            {!isLoading && policies.length === 0 && (
              <tr><td colSpan={4}><EmptyState icon={<Clock className="w-8 h-8" />} title="No SLA policies" /></td></tr>
            )}
            {policies.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{p.approval_type?.name}</p>
                  <p className="text-xs text-gray-400">{p.approval_type?.authority}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <Clock className="w-4 h-4 text-blue-500" />
                    {p.duration_days} days
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{p.start_event?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    p.escalation_level === 'SECRETARY'
                      ? 'bg-red-50 text-red-700'
                      : p.escalation_level === 'DIRECTOR'
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    {p.escalation_level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
