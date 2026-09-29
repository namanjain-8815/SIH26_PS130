'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incentivesApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, CardSkeleton } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import {
  Gift,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  Check,
  ArrowRight,
  ExternalLink,
  Landmark,
  BadgeCheck,
  Tag,
  Briefcase,
  MapPin,
  Coins,
} from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

// Helper to resolve official portal links
function getOfficialPortalUrl(schemeName: string, authority: string): { url: string; label: string } {
  const text = `${schemeName} ${authority}`.toLowerCase();
  if (text.includes('psi') || text.includes('package scheme') || text.includes('industries department')) {
    return { url: 'https://industries.maharashtra.gov.in', label: 'Industries Dept (GoM)' };
  }
  if (text.includes('msme')) {
    return { url: 'https://msme.gov.in', label: 'Ministry of MSME' };
  }
  if (text.includes('sampada') || text.includes('food processing') || text.includes('mofpi') || text.includes('food park')) {
    return { url: 'https://mofpi.gov.in', label: 'MoFPI Official Portal' };
  }
  if (text.includes('employment') || text.includes('skill')) {
    return { url: 'https://maharashtraskill.gov.in', label: 'MSSDS Portal' };
  }
  return { url: 'https://maitri.mahaonline.gov.in', label: 'Udyog Setu Single Window' };
}

export default function ApplicantIncentivesPage() {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [jurisdictionFilter, setJurisdictionFilter] = useState<'ALL' | 'MAHARASHTRA' | 'CENTRAL'>('ALL');

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

  const filteredMatches = matches.filter((item) => {
    if (jurisdictionFilter === 'ALL') return true;
    const authLower = item.scheme.authority.toLowerCase();
    if (jurisdictionFilter === 'MAHARASHTRA') {
      return authLower.includes('maharashtra') || authLower.includes('gom');
    }
    if (jurisdictionFilter === 'CENTRAL') {
      return authLower.includes('government of india') || authLower.includes('ministry of');
    }
    return true;
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Potentially Applicable Incentives & Subsidies</h1>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              MATCH ENGINE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Discover Government of Maharashtra and Central Government promotional packages matched to your proposal parameters
          </p>
        </div>

        {/* Official Portals Quick Links */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://maitri.mahaonline.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary-400 text-gray-700 text-xs font-medium rounded-lg shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Landmark className="w-3.5 h-3.5 text-primary-600" />
            <span>MAITRI Portal</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
          <a
            href="https://industries.maharashtra.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary-400 text-gray-700 text-xs font-medium rounded-lg shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Industries Dept</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
          <a
            href="https://msme.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary-400 text-gray-700 text-xs font-medium rounded-lg shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-purple-600" />
            <span>MSME India</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        </div>
      </div>

      {feedback && (
        <div className="bg-purple-50 border border-purple-200 text-purple-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {/* Proposal Context Summary Banner */}
      <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-blue-50/60 border border-purple-200/80 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Project Profiling Rules Active</p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                Deterministic matching based on verified Common Application Form (CAF) parameters
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/90 text-purple-800 border border-purple-200/70 px-2.5 py-1 rounded-lg">
              <Briefcase className="w-3 h-3 text-purple-600" />
              Food Processing
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/90 text-blue-800 border border-blue-200/70 px-2.5 py-1 rounded-lg">
              <MapPin className="w-3 h-3 text-blue-600" />
              Pune (MIDC Zone)
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/90 text-emerald-800 border border-emerald-200/70 px-2.5 py-1 rounded-lg">
              <Coins className="w-3 h-3 text-emerald-600" />
              ₹25.00 Cr Outlay
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setJurisdictionFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              jurisdictionFilter === 'ALL'
                ? 'bg-primary-700 text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Matching Schemes ({matches.length})
          </button>
          <button
            onClick={() => setJurisdictionFilter('MAHARASHTRA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              jurisdictionFilter === 'MAHARASHTRA'
                ? 'bg-primary-700 text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Government of Maharashtra
          </button>
          <button
            onClick={() => setJurisdictionFilter('CENTRAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              jurisdictionFilter === 'CENTRAL'
                ? 'bg-primary-700 text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Central Government
          </button>
        </div>
      </div>

      {/* Statutory / Policy Disclaimer */}
      <div className="card p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Statutory Advisory:</span> Scheme suggestions are computed automatically based on your undertaking's sector, capital outlay, and location. Sanction is strictly governed by the issuing Department's scrutiny upon formal application filing.
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

      {!isLoading && filteredMatches.length === 0 && (
        <EmptyState
          icon={<Gift className="w-10 h-10" />}
          title="No schemes match the selected filter"
          description="Switch filters or update your proposal parameters to view matching schemes."
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredMatches.map((item) => {
          const portal = getOfficialPortalUrl(item.scheme.name, item.scheme.authority);
          return (
            <div key={item.id} className="card p-5 flex flex-col justify-between hover:shadow-card transition-all border border-gray-200/90">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0 shadow-2xs">
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

                {/* Relevance Badges */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-semibold text-gray-700">Why your proposal qualifies:</p>
                  <div className="space-y-1">
                    {item.matching_reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-700">
                        <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Policy Reference */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800 hover:underline"
                  >
                    <span>Official Portal: {portal.label}</span>
                    <ExternalLink className="w-3 h-3 text-primary-600" />
                  </a>
                  <div className="text-[11px] text-gray-400">
                    {item.scheme.deadline ? `Application deadline: ${formatDate(item.scheme.deadline)}` : 'Ongoing promotional scheme'}
                  </div>
                </div>

                <div className="flex-shrink-0">
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
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Mark as Applied</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {matches.length > 0 && (
        <p className="text-xs text-gray-400 italic text-center pt-2">
          {matches[0]?.label}
        </p>
      )}
    </div>
  );
}
