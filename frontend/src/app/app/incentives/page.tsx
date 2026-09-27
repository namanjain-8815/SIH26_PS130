'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incentivesApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, CardSkeleton } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { Gift, CheckCircle2, AlertCircle, Sparkles, Building2, Check, ArrowRight } from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

export default function ApplicantIncentivesPage() {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['applicant-incentives', DEMO_PROJECT_ID],
    queryFn: () => incentivesApi.list(DEMO_PROJECT_ID),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      incentivesApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-incentives', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['control-centre', DEMO_PROJECT_ID] });
      setFeedback(`Scheme status updated to ${vars.status === 'APPLIED' ? 'Applied' : 'Potentially Eligible'}.`);
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const matches = data ?? [];

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Potentially Applicable Incentives & Schemes</h1>
            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Discover Government of Maharashtra and central promotional schemes matched to your industrial undertaking
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-purple-50 border border-purple-200 text-purple-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {/* Warning/Disclaimer Card */}
      <div className="card p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Statutory / Policy Notice:</span> Scheme matches are calculated based on your industrial undertaking's sector, investment threshold, and location. Entitlement is subject to verification by the Concerned Department / Authority upon formal filing. Benefits are never legally guaranteed until sanctioned by the Competent Authority.
          </div>
        </div>
      </div>

      {/* Grid of matched schemes */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </div>
      )}

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {!isLoading && matches.length === 0 && (
        <EmptyState
          icon={<Gift className="w-10 h-10" />}
          title="No matching incentive schemes found"
          description="Update your investment proposal attributes to explore potentially applicable promotional schemes."
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {matches.map((item) => (
          <div key={item.id} className="card p-5 flex flex-col justify-between hover:shadow-card transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 leading-snug">{item.scheme.name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {item.scheme.authority}
                    </p>
                  </div>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{item.scheme.description}</p>

              {/* Fiscal Benefit Box */}
              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl space-y-1">
                <p className="text-[11px] font-bold text-purple-900 uppercase tracking-wide">Key Fiscal Benefits & Subsidies</p>
                <p className="text-xs text-purple-800 leading-relaxed font-medium">{item.scheme.benefit_description}</p>
              </div>

              {/* Matching reasons */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-gray-700">Why your project matched:</p>
                <div className="space-y-1">
                  {item.matching_reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions & Policy Reference */}
            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="text-[11px] text-gray-400 truncate">
                {item.scheme.deadline ? `Application deadline: ${formatDate(item.scheme.deadline)}` : 'Ongoing promotional scheme'}
              </div>
              <div>
                {item.status === 'APPLIED' ? (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'POTENTIALLY_ELIGIBLE' })}
                    disabled={updateStatusMutation.isPending}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Reset Status
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'APPLIED' })}
                    disabled={updateStatusMutation.isPending}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm"
                  >
                    Mark as Applied
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {matches.length > 0 && (
        <p className="text-xs text-gray-400 italic text-center pt-2">
          {matches[0]?.label}
        </p>
      )}
    </div>
  );
}
