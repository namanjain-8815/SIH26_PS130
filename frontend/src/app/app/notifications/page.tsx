'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { relativeTime } from '@/lib/utils';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import type { Notification } from '@/types/api';

const TYPE_COLOR: Record<string, string> = {
  info:    'bg-blue-50 border-blue-100',
  warning: 'bg-amber-50 border-amber-100',
  alert:   'bg-orange-50 border-orange-100',
  success: 'bg-green-50 border-green-100',
  error:   'bg-red-50 border-red-100',
};

const TYPE_DOT: Record<string, string> = {
  info:    'bg-blue-500',
  warning: 'bg-amber-500',
  alert:   'bg-orange-500',
  success: 'bg-green-500',
  error:   'bg-red-500',
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const notifications = (data ?? []) as Notification[];
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {unread > 0 ? `${unread} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="btn-secondary text-xs py-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {error && <ErrorState message={(error as Error).message} />}
      {!isLoading && notifications.length === 0 && (
        <EmptyState
          icon={<BellOff className="w-10 h-10" />}
          title="No notifications"
          description="You'll see updates here about queries, inspections, SLA alerts, and approval status changes."
        />
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`card p-4 border transition-all ${TYPE_COLOR[n.type] ?? 'bg-white border-gray-100'} ${n.read ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1.5">
                <span className={`w-2 h-2 rounded-full block ${n.read ? 'bg-gray-300' : (TYPE_DOT[n.type] ?? 'bg-gray-400')}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${n.read ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1.5">{relativeTime(n.created_at)}</p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markOne.mutate(n.id)}
                  className="btn-ghost p-1.5 text-xs flex-shrink-0"
                  title="Mark as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
