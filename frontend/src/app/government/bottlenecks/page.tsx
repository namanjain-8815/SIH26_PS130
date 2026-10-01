'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { governmentApi } from '@/lib/api';
import { ErrorState } from '@/components/ui/States';
import { AlertTriangle, TrendingDown, Filter, ShieldCheck, Clock, UserCheck } from 'lucide-react';

export default function BottlenecksPage() {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const { data: deptData } = useQuery({
    queryKey: ['government-departments'],
    queryFn: () => governmentApi.departments(),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bottlenecks', selectedDept],
    queryFn: () => governmentApi.bottlenecks(selectedDept === 'ALL' ? undefined : selectedDept),
  });

  const departments = deptData ?? [];
  const bn = data as {
    bottlenecks: Array<{
      category: string;
      count: number;
      description: string;
      event_type: string | null;
      status_contributing: string | null;
      delay_party?: string;
    }>;
    computed_from: string;
    label: string;
  } | undefined;

  const DELAY_PARTY_CONFIG: Record<string, { label: string; badge: string }> = {
    APPLICANT: { label: 'Applicant Clarification Pending', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
    DEPARTMENT: { label: 'Competent Authority Scrutiny', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    INSPECTION_OFFICER: { label: 'Designated Inspection Officer', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    EMPOWERED_COMMITTEE: { label: 'Empowered Committee Review', badge: 'bg-red-50 text-red-700 border-red-200' },
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Prototype Notice Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Bottleneck & Delay Intelligence (Demonstration Data):</span>{' '}
          Analyzes historical event timelines, query turnaround, and inspection backlogs to isolate structural delays across single-window processing.
          Distinguishes applicant-caused waiting periods from Competent Authority scrutiny delays.
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        {/* Authority Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">Filter by Authority:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="input-base text-xs py-1.5 min-w-[200px]"
          >
            <option value="ALL">All Concerned Authorities</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
      )}

      {bn?.bottlenecks?.length === 0 && (
        <div className="card p-10 text-center">
          <TrendingDown className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No active process bottlenecks detected</p>
          <p className="text-xs text-gray-400 mt-1">All applications under this authority are progressing within statutory timelines.</p>
        </div>
      )}

      <div className="space-y-3">
        {bn?.bottlenecks?.map((b, i) => {
          const party = b.delay_party ? DELAY_PARTY_CONFIG[b.delay_party] : null;
          return (
            <div key={b.category} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  i === 0 ? 'bg-red-50' : i === 1 ? 'bg-orange-50' : 'bg-amber-50'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${i === 0 ? 'text-red-500' : i === 1 ? 'text-orange-500' : 'text-amber-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900">{b.category}</h2>
                    <span className={`text-2xl font-bold ${i === 0 ? 'text-red-600' : i === 1 ? 'text-orange-600' : 'text-amber-600'}`}>
                      {b.count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{b.description}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                    {party && (
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${party.badge}`}>
                        {party.label}
                      </span>
                    )}
                    {b.status_contributing && (
                      <span className="text-[11px] text-gray-500">
                        Workflow Status: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700 font-mono text-[10px]">{b.status_contributing}</code>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {bn && (
        <p className="text-xs text-gray-400 italic text-center pt-2">Data source: {bn.computed_from}</p>
      )}
    </div>
  );
}

