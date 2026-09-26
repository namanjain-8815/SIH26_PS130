'use client';

import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import type { ComplianceItem } from '@/types/api';
import { Calendar, AlertTriangle, CheckCircle2, Clock, Bell } from 'lucide-react';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

const URGENCY_COLORS = {
  critical: 'border-l-red-500 bg-red-50',
  high:     'border-l-orange-500 bg-orange-50',
  medium:   'border-l-amber-400 bg-amber-50',
  low:      'border-l-gray-300 bg-white',
};

const URGENCY_ICON = {
  critical: <AlertTriangle className="w-4 h-4 text-red-500" />,
  high:     <Clock className="w-4 h-4 text-orange-500" />,
  medium:   <Calendar className="w-4 h-4 text-amber-500" />,
  low:      <Calendar className="w-4 h-4 text-gray-400" />,
};

export default function CompliancePage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['compliance', DEMO_PROJECT_ID],
    queryFn: () => projectsApi.getCompliance(DEMO_PROJECT_ID),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Compliance & Renewals</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Renewal dates and periodic post-approval compliance obligations for your industrial undertaking
          </p>
        </div>
        <button className="btn-secondary text-xs py-1.5">
          <Bell className="w-3.5 h-3.5" /> Set Reminders
        </button>
      </div>

      {/* Urgency stats */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: 'Critical', key: 'critical', color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'High (30d)', key: 'high', color: 'text-orange-600 bg-orange-50 border-orange-200' },
          { label: 'Medium (90d)', key: 'medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Low priority', key: 'low', color: 'text-gray-600 bg-gray-50 border-gray-200' },
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
          description="Renewal reminders will appear here as you complete approvals."
        />
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`card p-4 border-l-4 ${URGENCY_COLORS[item.urgency]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{URGENCY_ICON[item.urgency]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{item.authority} · {item.frequency}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${item.urgency === 'critical' || item.urgency === 'high' ? 'text-red-600' : 'text-gray-700'}`}>
                  {item.days_until_due < 0 ? `${Math.abs(item.days_until_due)}d overdue` : `${item.days_until_due}d left`}
                </p>
                <p className="text-xs text-gray-400">{formatDate(item.next_due_date)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
