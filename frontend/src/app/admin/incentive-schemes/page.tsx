'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { Gift, CheckCircle2 } from 'lucide-react';

export default function IncentiveSchemesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-incentive-schemes'],
    queryFn: () => api.get<unknown[]>('/admin/incentive-schemes'),
  });

  const schemes = (data ?? []) as Array<{
    id: string;
    name: string;
    authority: string;
    description: string;
    benefit_description: string;
    deadline: string | null;
    source_reference: string | null;
  }>;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Incentive Schemes</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {schemes.length} schemes configured — matched to projects via the rule engine
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="h-40 skeleton rounded-xl" />
        ))}
        {error && <div className="col-span-2"><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></div>}
        {!isLoading && schemes.length === 0 && (
          <div className="col-span-2">
            <EmptyState icon={<Gift className="w-8 h-8" />} title="No incentive schemes configured" />
          </div>
        )}
        {schemes.map((scheme) => (
          <div key={scheme.id} className="card p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">{scheme.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{scheme.authority}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{scheme.description}</p>
            <div className="flex items-start gap-2 p-2.5 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-green-700">{scheme.benefit_description}</p>
            </div>
            {scheme.deadline && (
              <p className="text-xs text-gray-400 mt-2">Deadline: {formatDate(scheme.deadline)}</p>
            )}
            {scheme.source_reference && (
              <p className="text-[10px] text-gray-300 mt-1 truncate">{scheme.source_reference}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
