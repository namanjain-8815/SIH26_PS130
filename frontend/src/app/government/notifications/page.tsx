'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { relativeTime } from '@/lib/utils';
import { Bell, BellOff, CheckCheck, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Notification } from '@/types/api';

const TYPE_COLOR: Record<string, string> = {
  info:    'bg-blue-50/50 border-blue-100',
  warning: 'bg-amber-50/50 border-amber-100',
  alert:   'bg-orange-50/50 border-orange-100',
  success: 'bg-green-50/50 border-green-100',
  error:   'bg-red-50/50 border-red-100',
};

const TYPE_DOT: Record<string, string> = {
  info:    'bg-blue-500',
  warning: 'bg-amber-500',
  alert:   'bg-orange-500',
  success: 'bg-green-500',
  error:   'bg-red-500',
};

// Helper to extract application reference from text (e.g. APP-PCB-2024-003, APP-ENV-2024-001)
function extractAppRef(text: string): string | null {
  const match = text.match(/APP-[A-Z0-9-]+/i);
  return match ? match[0] : null;
}

export default function GovernmentNotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const notifications = (data ?? []) as Notification[];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6 space-y-4 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Government Notifications & Alerts</h1>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Single Window scrutiny updates, statutory specified time limit alerts, and inter-department coordination notices
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read ({unread})
          </button>
        )}
      </div>

      {error && <ErrorState message={(error as Error).message} />}
      {!isLoading && notifications.length === 0 && (
        <EmptyState
          icon={<BellOff className="w-10 h-10 text-gray-400" />}
          title="No government notifications"
          description="Operational notices, inspection assignments, and statutory timeline alerts will appear here."
        />
      )}

      <div className="space-y-2.5">
        {notifications.map((n) => {
          const appRef = extractAppRef(n.message) || extractAppRef(n.title);

          return (
            <div
              key={n.id}
              className={`card p-4 border transition-all ${
                TYPE_COLOR[n.type] ?? 'bg-white border-gray-100'
              } ${n.read ? 'opacity-70 bg-white' : 'shadow-sm'}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full block ${
                      n.read ? 'bg-gray-300' : TYPE_DOT[n.type] ?? 'bg-blue-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">
                      {relativeTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>

                  {/* Government Action Links — Never navigate outside /government/* */}
                  {appRef && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100/80 flex items-center gap-3">
                      <Link
                        href={`/government/work-queue?application_id=${encodeURIComponent(appRef)}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200"
                      >
                        <span>Open {appRef} in Work Queue</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {!n.read && (
                  <button
                    onClick={() => markOne.mutate(n.id)}
                    className="btn-ghost p-1.5 text-xs flex-shrink-0 text-gray-400 hover:text-gray-700"
                    title="Mark as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
