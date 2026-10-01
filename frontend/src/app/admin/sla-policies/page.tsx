'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { Clock, Plus, X, Edit2, ShieldCheck, Check } from 'lucide-react';

export default function SLAPoliciesPage() {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState<number>(30);

  // Form state
  const [approvalTypeId, setApprovalTypeId] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [startEvent, setStartEvent] = useState('APPLICATION_SUBMITTED');
  const [escalationLevel, setEscalationLevel] = useState('EMPOWERED_COMMITTEE');

  const { data: policiesData, isLoading: loadingPolicies, error: policiesError, refetch: refetchPolicies } = useQuery({
    queryKey: ['admin-sla-policies'],
    queryFn: () => adminApi.slaPolicies.list(),
  });

  const { data: approvalTypes } = useQuery({
    queryKey: ['admin-approval-types'],
    queryFn: () => adminApi.approvalTypes.list(),
  });

  const policies = (policiesData ?? []);

  async function handleSaveEdit(id: string) {
    try {
      await adminApi.slaPolicies.update(id, { duration_days: editDuration });
      setFeedback('Specified time limit updated successfully.');
      setEditingId(null);
      refetchPolicies();
    } catch (err) {
      setFeedback(`Error updating timeline: ${(err as Error).message}`);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!approvalTypeId) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await adminApi.slaPolicies.create({
        approval_type_id: approvalTypeId,
        duration_days: Number(durationDays) || 30,
        start_event: startEvent,
        escalation_level: escalationLevel,
      });

      setShowModal(false);
      setApprovalTypeId('');
      setDurationDays(30);
      setFeedback('Statutory specified time limit policy created.');
      refetchPolicies();
    } catch (err) {
      setFeedback(`Error: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Prototype Notice Banner */}
      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <span className="font-bold">Specified Time Limit Policies (Demonstration Data):</span>{' '}
          Governs statutory processing duration and escalation paths under Maharashtra Industry, Trade and Investment Facilitation Rules, 2025.
          Eligible delayed applications escalate through the Nodal Agency to the Empowered Committee under Section 10 of the MAITRI Act 2023.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Specified Time Limit Policies</h1>
            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Configured service timelines and statutory specified time limits under MAITRI Rules · Demonstration Policies
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Time Limit Policy</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-purple-600 hover:text-purple-800 font-bold ml-2">×</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Permission / Approval Type', 'Specified Limit', 'Starts from', 'Statutory Escalation Entity', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loadingPolicies && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={5} />)}
            {policiesError && <tr><td colSpan={5}><ErrorState message={(policiesError as Error).message} onRetry={() => refetchPolicies()} /></td></tr>}
            {!loadingPolicies && policies.length === 0 && (
              <tr><td colSpan={5}><EmptyState icon={<Clock className="w-8 h-8" />} title="No SLA policies" /></td></tr>
            )}
            {policies.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.approval_type?.name ?? p.approval_type_id}</p>
                    <p className="text-xs text-gray-400">{p.approval_type?.authority ?? 'Concerned Department'}</p>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={editDuration}
                          onChange={(e) => setEditDuration(Number(e.target.value))}
                          className="input-base w-20 py-1 text-xs"
                        />
                        <button
                          onClick={() => handleSaveEdit(p.id)}
                          className="p-1 bg-green-600 hover:bg-green-700 text-white rounded"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <Clock className="w-4 h-4 text-purple-600" />
                        {p.duration_days} days
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{p.start_event?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
                      {p.escalation_level === 'EMPOWERED_COMMITTEE'
                        ? 'Empowered Committee (Sec 10)'
                        : p.escalation_level === 'NODAL_AGENCY'
                        ? 'MAITRI Nodal Agency'
                        : p.escalation_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setEditDuration(p.duration_days);
                        }}
                        className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium hover:underline"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Specified Time Limit Policy</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Permission / Approval Type *</label>
                <select
                  required
                  value={approvalTypeId}
                  onChange={(e) => setApprovalTypeId(e.target.value)}
                  className="input-base w-full text-xs"
                >
                  <option value="">Select permission type…</option>
                  {(approvalTypes ?? []).map((at) => (
                    <option key={at.id} value={at.id}>{at.name} ({at.authority})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Specified Time Limit (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Timeline Trigger / Start Event</label>
                  <select
                    value={startEvent}
                    onChange={(e) => setStartEvent(e.target.value)}
                    className="input-base w-full text-xs"
                  >
                    <option value="APPLICATION_SUBMITTED">APPLICATION_SUBMITTED</option>
                    <option value="SCRUTINY_COMMENCED">SCRUTINY_COMMENCED</option>
                    <option value="QUERY_RESOLVED">QUERY_RESOLVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Statutory Escalation Entity</label>
                <select
                  value={escalationLevel}
                  onChange={(e) => setEscalationLevel(e.target.value)}
                  className="input-base w-full text-xs"
                >
                  <option value="EMPOWERED_COMMITTEE">Empowered Committee (Section 10, MAITRI Act 2023)</option>
                  <option value="NODAL_AGENCY">MAITRI Nodal Agency Coordination</option>
                  <option value="SUPERVISORY_COMMITTEE">Supervisory Committee (Section 12, MAITRI Act 2023)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {submitting ? 'Saving…' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

