'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complianceApi, projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, CardSkeleton } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import type { ComplianceItem } from '@/types/api';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell,
  CheckCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

const URGENCY_COLORS = {
  critical: 'border-l-red-500 bg-red-50/40',
  high: 'border-l-orange-500 bg-orange-50/40',
  medium: 'border-l-amber-400 bg-amber-50/40',
  low: 'border-l-gray-300 bg-white',
};

const URGENCY_ICON = {
  critical: <AlertTriangle className="w-4 h-4 text-red-500" />,
  high: <Clock className="w-4 h-4 text-orange-500" />,
  medium: <Calendar className="w-4 h-4 text-amber-500" />,
  low: <Calendar className="w-4 h-4 text-gray-400" />,
};

function ComplianceContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || DEMO_PROJECT_ID;
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // List of all projects for the investor
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const activeProjectId = selectedProjectId || DEMO_PROJECT_ID;

  // Selected project details
  const { data: currentProject } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => projectsApi.get(activeProjectId),
    enabled: !!activeProjectId,
  });

  // Compliance obligations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['compliance', activeProjectId],
    queryFn: () => complianceApi.list(activeProjectId),
    enabled: !!activeProjectId,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => complianceApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance', activeProjectId] });
      qc.invalidateQueries({ queryKey: ['control-centre', activeProjectId] });
      setFeedbackNotice(
        'Compliance recorded successfully! The subsequent periodic renewal has been auto-scheduled in your calendar.'
      );
      setTimeout(() => setFeedbackNotice(null), 6000);
    },
  });

  const remindMutation = useMutation({
    mutationFn: () => complianceApi.remind(activeProjectId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      setFeedbackNotice(
        `Dispatched ${res.reminders_sent} renewal & compliance reminders to your notification inbox.`
      );
      setTimeout(() => setFeedbackNotice(null), 6000);
    },
  });

  const items = (data ?? []) as ComplianceItem[];

  const stats = {
    critical: items.filter((i) => i.urgency === 'critical').length,
    high: items.filter((i) => i.urgency === 'high').length,
    medium: items.filter((i) => i.urgency === 'medium').length,
    low: items.filter((i) => i.urgency === 'low').length,
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Compliance & Renewals Calendar</h1>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              DYNAMIC OBLIGATIONS
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Post-approval statutory returns, periodic inspections & license renewal obligations dynamically derived from applicable clearances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projects && projects.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={activeProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent text-gray-800 font-medium focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => remindMutation.mutate()}
            disabled={remindMutation.isPending}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            title="Dispatch renewal alerts to notification inbox"
          >
            <Bell className="w-3.5 h-3.5" />
            {remindMutation.isPending ? 'Sending Reminders…' : 'Send Renewal Reminders'}
          </button>
        </div>
      </div>

      {feedbackNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{feedbackNotice}</span>
        </div>
      )}

      {/* Urgency stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Critical / Overdue', count: stats.critical, color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'Due within 30 days', count: stats.high, color: 'text-orange-600 bg-orange-50 border-orange-200' },
          { label: 'Due within 90 days', count: stats.medium, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Upcoming (> 90 days)', count: stats.low, color: 'text-gray-600 bg-gray-50 border-gray-200' },
        ].map((s) => (
          <div key={s.label} className={`p-3 rounded-xl border ${s.color}`}>
            <p className="text-xl font-bold">{s.count}</p>
            <p className="text-xs font-medium opacity-90 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Compliance List */}
      <div className="space-y-2.5">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} lines={2} />
            ))}
          </div>
        )}

        {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

        {!isLoading && items.length === 0 && (
          <EmptyState
            title="No compliance requirements derived yet"
            description="Run regulatory analysis for this project to automatically derive periodic renewal obligations and statutory returns."
          />
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border border-gray-200 border-l-4 ${
              URGENCY_COLORS[item.urgency]
            } transition-all`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {URGENCY_ICON[item.urgency]}
                  <p className="text-xs font-bold text-gray-900">{item.name}</p>
                  <StatusBadge status={item.status} size="sm" />
                  {item.status !== 'COMPLETED' && (
                    <button
                      onClick={() => completeMutation.mutate(item.id)}
                      disabled={completeMutation.isPending}
                      className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 ml-auto"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Record Compliance / Renew
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">{item.authority}</span> · Frequency:{' '}
                  <span className="font-semibold text-gray-800">{item.frequency}</span>
                </p>
              </div>

              <div className="text-right flex-shrink-0 pl-3">
                <p
                  className={`text-sm font-bold ${
                    item.urgency === 'critical' || item.urgency === 'high'
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  {item.days_until_due < 0
                    ? `${Math.abs(item.days_until_due)}d overdue`
                    : `${item.days_until_due}d left`}
                </p>
                <p className="text-xs text-gray-400">{formatDate(item.next_due_date)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Statutory Disclaimer */}
      <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500 italic">
          Statutory compliance obligations and periodic returns under Government of Maharashtra regulations dynamically derived from applicable permissions schedule.
        </p>
      </div>
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense fallback={<CardSkeleton lines={4} />}>
      <ComplianceContent />
    </Suspense>
  );
}
