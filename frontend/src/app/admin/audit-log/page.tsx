'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDateTime, relativeTime } from '@/lib/utils';
import { formatRole } from '@/lib/terminology';
import { ScrollText, Search, Eye, X, ShieldCheck } from 'lucide-react';

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

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
      {/* Prototype Notice Banner */}
      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <span className="font-bold">System Audit Trail & Access Logs (Demonstration Data):</span>{' '}
          Captures immutable chronological entries of all platform actions, configuration mutations, and application state transitions.
          Maintains accountability across Applicants, Competent Authority Officers, MAITRI Nodal Officers, and System Administrators.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Audit Trail & System Logs</h1>
            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">All platform actions — immutable record with actor identity and payload diffs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="Filter by entity type (e.g. rules, approval-types)…"
            className="input-base pl-9 w-64 py-1.5 text-xs"
          />
        </div>
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action (e.g. create, update, delete)…"
          className="input-base w-48 py-1.5 text-xs"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Timestamp', 'Actor / Official Role', 'Action', 'Entity Type', 'Entity ID', 'Data Diff'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
            {error && (
              <tr><td colSpan={6}>
                <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
              </td></tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr><td colSpan={6}>
                <EmptyState icon={<ScrollText className="w-8 h-8" />} title="No audit entries" />
              </td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-700 font-medium">{relativeTime(log.timestamp)}</p>
                  <p className="text-[10px] text-gray-400">{formatDateTime(log.timestamp)}</p>
                </td>
                <td className="px-4 py-3">
                  {log.actor ? (
                    <>
                      <p className="text-xs font-semibold text-gray-800">{log.actor.name}</p>
                      <p className="text-[10px] text-purple-600 font-medium">{formatRole(log.actor.role)}</p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 font-mono">System Engine</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLOR[log.action] ?? 'bg-gray-50 text-gray-600'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 font-medium">{log.entity_type}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500 truncate max-w-[120px]">{log.entity_id}</td>
                <td className="px-4 py-3 text-xs">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Audit Log Event Inspection</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedLog.id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Actor</span>
                  <span className="font-semibold text-gray-800">{selectedLog.actor?.name ?? 'System'}</span>
                  <span className="text-gray-500 block text-[10px]">{selectedLog.actor ? formatRole(selectedLog.actor.role) : ''}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Action & Target</span>
                  <span className="font-semibold text-gray-800">{selectedLog.action} on {selectedLog.entity_type}</span>
                  <span className="text-gray-400 block font-mono text-[10px]">{selectedLog.entity_id}</span>
                </div>
              </div>

              {selectedLog.before_data && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">State Before Change</h3>
                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-xl overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.before_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_data && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">State After Change / Payload</h3>
                  <pre className="p-3 bg-gray-900 text-green-300 rounded-xl overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.after_data, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedLog.before_data && !selectedLog.after_data && (
                <p className="text-gray-400 italic">No payload diff captured for this action event.</p>
              )}

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

