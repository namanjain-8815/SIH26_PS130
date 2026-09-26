'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { GitMerge, CheckCircle2, Circle } from 'lucide-react';

export default function RulesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-rules'],
    queryFn: () => api.get<unknown[]>('/admin/rules'),
  });

  const rules = (data ?? []) as Array<{
    id: string;
    approval_type_id: string;
    jurisdiction: string | null;
    sector: string | null;
    active: boolean;
    effective_from: string | null;
    effective_to: string | null;
    approval_type?: { name: string };
    conditions: unknown;
  }>;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900">Applicability & Eligibility Rules</h1>
          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
            PROTOTYPE
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Data-driven JSON rule conditions determining applicable statutory permissions for an investment proposal · Demonstration Rules
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Permission / Approval Type', 'Jurisdiction', 'Sector', 'Status', 'Effective From', 'Effective To'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
            {error && <tr><td colSpan={6}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></td></tr>}
            {!isLoading && rules.length === 0 && (
              <tr><td colSpan={6}><EmptyState icon={<GitMerge className="w-8 h-8" />} title="No rules configured" /></td></tr>
            )}
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {rule.approval_type?.name ?? rule.approval_type_id}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{rule.jurisdiction ?? 'Any'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{rule.sector ?? 'Any'}</td>
                <td className="px-4 py-3">
                  {rule.active
                    ? <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                    : <span className="flex items-center gap-1 text-xs text-gray-400"><Circle className="w-3.5 h-3.5" /> Inactive</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{rule.effective_from ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{rule.effective_to ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
