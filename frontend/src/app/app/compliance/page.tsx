'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complianceApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import type { ComplianceItem } from '@/types/api';
import { Calendar, AlertTriangle, CheckCircle2, Clock, Bell, CheckCheck, Sparkles } from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

const URGENCY_COLORS = {
  critical: 'border-l-red-500 bg-red-50/40',
  high:     'border-l-orange-500 bg-orange-50/40',
  medium:   'border-l-amber-400 bg-amber-50/40',
  low:      'border-l-gray-300 bg-white',
};

const URGENCY_ICON = {
  critical: <AlertTriangle className="w-4 h-4 text-red-500" />,
  high:     <Clock className="w-4 h-4 text-orange-500" />,
  medium:   <Calendar className="w-4 h-4 text-amber-500" />,
  low:      <Calendar className="w-4 h-4 text-gray-400" />,
};

export default function CompliancePage() {
  const qc = useQueryClient();
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['compliance', DEMO_PROJECT_ID],
    queryFn: () => complianceApi.list(DEMO_PROJECT_ID),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => complianceApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance', DEMO_PROJECT_ID] });
      qc.invalidateQueries({ queryKey: ['control-centre', DEMO_PROJECT_ID] });
      setFeedbackNotice('Compliance recorded successfully! If periodic, the subsequent renewal date has been auto-scheduled in your calendar.');
      setTimeout(() => setFeedbackNotice(null), 6000);
    },
  });

  const remindMutation = useMutation({
    mutationFn: () => complianceApi.remind(DEMO_PROJECT_ID),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      setFeedbackNotice(`Dispatched ${res.reminders_sent} renewal & compliance reminders to your notification inbox.`);
      setTimeout(() => setFeedbackNotice(null), 6000);
    },
  });

  const items = (data ?? []) as ComplianceItem[];

  const stats = {
    critical: items.filter(i => i.urgency === 'critical').length,
    high:     items.filter(i => i.urgency === 'high').length,
    medium:   items.filter(i => i.urgency === 'medium').length,
    low:      items.filter(i => i.urgency === 'low').length,
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Compliance & Renewals</h1>
            <span className="text-[10px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded border border-primary-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Post-approval compliance calendar, statutory returns & renewal obligations for your industrial undertaking
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        {([
          { label: 'Critical / Overdue', key: 'critical', color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'High Priority (≤ 30d)', key: 'high', color: 'text-orange-600 bg-orange-50 border-orange-200' },
          { label: 'Medium Priority (≤ 90d)', key: 'medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Within Schedule', key: 'low', color: 'text-gray-600 bg-gray-50 border-gray-200' },
        ] as const).map(({ label, key, color }) => (
          <div key={key} className={`card p-3 border text-center ${color.split(' ').slice(1).join(' ')}`}>
            <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{stats[key]}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      )}
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={<Calendar className="w-10 h-10" />}
          title="No compliance requirements"
          description="Renewal reminders and periodic compliance requirements will appear here as approvals are granted."
        />
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`card p-4 border-l-4 transition-all hover:shadow-card ${URGENCY_COLORS[item.urgency]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">{URGENCY_ICON[item.urgency]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} size="sm" />
                    {item.status !== 'COMPLETED' && (
                      <button
                        onClick={() => completeMutation.mutate(item.id)}
                        disabled={completeMutation.isPending}
                        className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1"
                        title="Mark obligation as complied and schedule next period"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Record Compliance / Renew
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">{item.authority}</span> · Frequency: {item.frequency}
                </p>
              </div>
              <div className="text-right flex-shrink-0 pl-3">
                <p className={`text-sm font-bold ${item.urgency === 'critical' || item.urgency === 'high' ? 'text-red-600' : 'text-gray-700'}`}>
                  {item.days_until_due < 0 ? `${Math.abs(item.days_until_due)}d overdue` : `${item.days_until_due}d left`}
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
          Statutory compliance obligations and periodic returns under Government of Maharashtra regulations (Demonstration / Configurable Schedule).
        </p>
      </div>
    </div>
  );
}
