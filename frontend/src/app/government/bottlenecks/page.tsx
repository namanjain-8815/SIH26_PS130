'use client';

import { useQuery } from '@tanstack/react-query';
import { governmentApi } from '@/lib/api';
import { ErrorState } from '@/components/ui/States';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import type { AnalyticsSummary } from '@/types/api';

export default function BottlenecksPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bottlenecks'],
    queryFn: () => governmentApi.bottlenecks(),
  });

  const bn = data as { bottlenecks: Array<{ category: string; count: number; description: string; event_type: string | null; status_contributing: string | null }>; computed_from: string; label: string } | undefined;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900">Process Bottlenecks & Delay Intelligence</h1>
          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
            PROTOTYPE
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {bn?.label ?? 'Derived from stored application events and status transitions · Demonstration Analytics'}
        </p>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
      )}

      {bn?.bottlenecks?.length === 0 && (
        <div className="card p-10 text-center">
          <TrendingDown className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No bottlenecks detected</p>
          <p className="text-xs text-gray-400 mt-1">All applications are flowing without major delays.</p>
        </div>
      )}

      <div className="space-y-3">
        {bn?.bottlenecks?.map((b, i) => (
          <div key={b.category} className="card p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                i === 0 ? 'bg-red-50' : i === 1 ? 'bg-orange-50' : 'bg-amber-50'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${i === 0 ? 'text-red-500' : i === 1 ? 'text-orange-500' : 'text-amber-500'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">{b.category}</h2>
                  <span className={`text-2xl font-bold ${i === 0 ? 'text-red-600' : i === 1 ? 'text-orange-600' : 'text-amber-600'}`}>
                    {b.count}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{b.description}</p>
                {b.status_contributing && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Contributing status: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{b.status_contributing}</code>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {bn && (
        <p className="text-xs text-gray-400 italic text-center">Data source: {bn.computed_from}</p>
      )}
    </div>
  );
}
