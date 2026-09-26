'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDateTime, relativeTime } from '@/lib/utils';
import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-log', { entityType, action }],
    queryFn: () => adminApi.auditLog({
      entity_type: entityType || undefined,
      action: action || undefined,
    }),
  });

  const logs = (data ?? []) as Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    timestamp: string;
    before_data: unknown;
    after_data: unknown;
    actor: { id: string; name: string; role: string } | null;
  }>;

  const ACTION_COLOR: Record<string, string> = {
    create: 'bg-green-50 text-green-700',
    update: 'bg-blue-50 text-blue-700',
    delete: 'bg-red-50 text-red-700',
    application_status_changed: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Audit Log</h1>
          <p className="text-xs text-gray-500 mt-0.5">All platform actions — immutable record</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="Filter by entity type…"
            className="input-base pl-9 w-56 py-1.5 text-xs"
          />
        </div>
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action…"
          className="input-base w-48 py-1.5 text-xs"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Time', 'Actor', 'Action', 'Entity Type', 'Entity ID'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={5} />)}
            {error && (
              <tr><td colSpan={5}>
                <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
              </td></tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr><td colSpan={5}>
                <EmptyState icon={<ScrollText className="w-8 h-8" />} title="No audit entries" />
              </td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-700">{relativeTime(log.timestamp)}</p>
                  <p className="text-[10px] text-gray-400">{formatDateTime(log.timestamp)}</p>
                </td>
                <td className="px-4 py-3">
                  {log.actor ? (
                    <>
                      <p className="text-xs font-medium text-gray-800">{log.actor.name}</p>
                      <p className="text-[10px] text-gray-400">{log.actor.role}</p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">System</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLOR[log.action] ?? 'bg-gray-50 text-gray-600'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{log.entity_type}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500 truncate max-w-[120px]">{log.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
