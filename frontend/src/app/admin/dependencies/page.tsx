'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { GitMerge, ArrowRight } from 'lucide-react';

export default function DependenciesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dependencies'],
    queryFn: () => api.get<unknown[]>('/admin/dependencies'),
  });

  const deps = (data ?? []) as Array<{
    id: string;
    dependency_type: string;
    prerequisite_approval_type: { name: string; authority: string };
    dependent_approval_type: { name: string; authority: string };
  }>;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Approval Dependencies</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Prerequisite chains between approval types — defines the dependency graph
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Prerequisite Approval', 'Type', 'Dependent Approval'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(5)].map((_, i) => <TableRowSkeleton key={i} cols={3} />)}
            {error && <tr><td colSpan={3}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></td></tr>}
            {!isLoading && deps.length === 0 && (
              <tr><td colSpan={3}><EmptyState icon={<GitMerge className="w-8 h-8" />} title="No dependencies configured" /></td></tr>
            )}
            {deps.map((dep) => (
              <tr key={dep.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{dep.prerequisite_approval_type?.name}</p>
                  <p className="text-xs text-gray-400">{dep.prerequisite_approval_type?.authority}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      {dep.dependency_type}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{dep.dependent_approval_type?.name}</p>
                  <p className="text-xs text-gray-400">{dep.dependent_approval_type?.authority}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
