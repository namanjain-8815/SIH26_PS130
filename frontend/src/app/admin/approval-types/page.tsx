'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { FileText, CheckCircle2, Clock, ClipboardList } from 'lucide-react';

export default function ApprovalTypesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-approval-types'],
    queryFn: () => adminApi.approvalTypes.list(),
  });

  const types = (data ?? []) as Array<{
    id: string;
    name: string;
    authority: string;
    category: string;
    description: string;
    purpose: string;
    default_sla_days: number;
    renewal_period_days: number | null;
    requires_inspection: boolean;
    source_reference: string | null;
  }>;

  const categories = [...new Set(types.map(t => t.category))];

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Permissions / Approvals Catalogue</h1>
            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {types.length} statutory permissions & approvals configured · {categories.length} categories · Master Data
          </p>
        </div>
      </div>

      {/* Category summary */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <span key={cat} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {cat} ({types.filter(t => t.category === cat).length})
            </span>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Permission / Approval Name', 'Concerned Authority', 'Category', 'Timeline', 'Renewal', 'Inspection'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
            {error && (
              <tr><td colSpan={6}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></td></tr>
            )}
            {!isLoading && types.length === 0 && (
              <tr><td colSpan={6}>
                <EmptyState icon={<FileText className="w-8 h-8" />} title="No approval types" />
              </td></tr>
            )}
            {types.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{t.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{t.authority}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">{t.category}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {t.default_sla_days}d
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {t.renewal_period_days ? `${t.renewal_period_days}d` : '—'}
                </td>
                <td className="px-4 py-3">
                  {t.requires_inspection ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
