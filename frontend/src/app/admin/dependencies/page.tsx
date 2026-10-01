'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { GitMerge, ArrowRight, Plus, X, Trash2, ShieldCheck } from 'lucide-react';

export default function DependenciesPage() {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [prereqId, setPrereqId] = useState('');
  const [dependentId, setDependentId] = useState('');
  const [depType, setDepType] = useState('PREREQUISITE');

  const { data: depsData, isLoading: loadingDeps, error: depsError, refetch: refetchDeps } = useQuery({
    queryKey: ['admin-dependencies'],
    queryFn: () => adminApi.dependencies.list(),
  });

  const { data: approvalTypes } = useQuery({
    queryKey: ['admin-approval-types'],
    queryFn: () => adminApi.approvalTypes.list(),
  });

  const deps = (depsData ?? []) as Array<any>;

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this permission dependency?')) return;
    try {
      await adminApi.dependencies.delete(id);
      setFeedback('Dependency link removed.');
      refetchDeps();
    } catch (err) {
      setFeedback(`Error removing dependency: ${(err as Error).message}`);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!prereqId || !dependentId) return;
    if (prereqId === dependentId) {
      setFeedback('A permission cannot be dependent on itself.');
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await adminApi.dependencies.create({
        prerequisite_approval_type_id: prereqId,
        dependent_approval_type_id: dependentId,
        dependency_type: depType,
      });

      setShowModal(false);
      setPrereqId('');
      setDependentId('');
      setFeedback('Statutory permission dependency configured.');
      refetchDeps();
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
          <span className="font-bold">Permission Dependencies Master Data (Demonstration Data):</span>{' '}
          Configures prerequisite relationships between permissions (e.g. MPCB Consent to Establish preceding Factory Building Plan Approval).
          These dependencies power the interactive DAG roadmap and "can start now" parallel execution calculations for applicants.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Permission Dependencies</h1>
            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Prerequisite chains between statutory permission types — defines the dependency graph · Master Data
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Dependency</span>
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
              {['Prerequisite Permission', 'Dependency Type', 'Dependent Permission', 'Action'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loadingDeps && [...Array(5)].map((_, i) => <TableRowSkeleton key={i} cols={4} />)}
            {depsError && <tr><td colSpan={4}><ErrorState message={(depsError as Error).message} onRetry={() => refetchDeps()} /></td></tr>}
            {!loadingDeps && deps.length === 0 && (
              <tr><td colSpan={4}><EmptyState icon={<GitMerge className="w-8 h-8" />} title="No dependencies configured" /></td></tr>
            )}
            {deps.map((dep) => {
              const prereq = dep.prerequisite_approval_type ?? dep.prerequisite_approval;
              const dependent = dep.dependent_approval_type ?? dep.dependent_approval;
              return (
                <tr key={dep.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{prereq?.name ?? dep.prerequisite_approval_type_id}</p>
                    <p className="text-xs text-gray-400">{prereq?.authority ?? 'Concerned Department'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-4 h-4 text-purple-500" />
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded">
                        {dep.dependency_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{dependent?.name ?? dep.dependent_approval_type_id}</p>
                    <p className="text-xs text-gray-400">{dependent?.authority ?? 'Concerned Department'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(dep.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                      title="Remove dependency"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Dependency Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Permission Dependency Link</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prerequisite Permission (Must complete first) *</label>
                <select
                  required
                  value={prereqId}
                  onChange={(e) => setPrereqId(e.target.value)}
                  className="input-base w-full text-xs"
                >
                  <option value="">Select prerequisite permission…</option>
                  {(approvalTypes ?? []).map((at) => (
                    <option key={at.id} value={at.id}>{at.name} ({at.authority})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dependent Permission (Unlocks after prerequisite) *</label>
                <select
                  required
                  value={dependentId}
                  onChange={(e) => setDependentId(e.target.value)}
                  className="input-base w-full text-xs"
                >
                  <option value="">Select dependent permission…</option>
                  {(approvalTypes ?? []).map((at) => (
                    <option key={at.id} value={at.id}>{at.name} ({at.authority})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dependency Relationship Type</label>
                <select
                  value={depType}
                  onChange={(e) => setDepType(e.target.value)}
                  className="input-base w-full text-xs"
                >
                  <option value="PREREQUISITE">PREREQUISITE (Strict prerequisite clearance)</option>
                  <option value="PARALLEL">PARALLEL (Can proceed concurrently with conditional milestone)</option>
                  <option value="INFORMATIONAL">INFORMATIONAL (Advisory sequence)</option>
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
                  {submitting ? 'Saving…' : 'Save Dependency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

