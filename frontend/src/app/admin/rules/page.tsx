'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { GitMerge, CheckCircle2, Circle, Plus, X, ShieldCheck } from 'lucide-react';

export default function RulesPage() {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [approvalTypeId, setApprovalTypeId] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [sector, setSector] = useState('');
  const [conditionsJson, setConditionsJson] = useState('{\n  "operator": "and",\n  "conditions": []\n}');

  const { data: rulesData, isLoading: loadingRules, error: rulesError, refetch: refetchRules } = useQuery({
    queryKey: ['admin-rules'],
    queryFn: () => adminApi.rules.list(),
  });

  const { data: approvalTypes } = useQuery({
    queryKey: ['admin-approval-types'],
    queryFn: () => adminApi.approvalTypes.list(),
  });

  const rules = (rulesData ?? []);

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await adminApi.rules.update(id, { active: !currentActive });
      setFeedback(`Rule status updated to ${!currentActive ? 'Active' : 'Inactive'}.`);
      refetchRules();
    } catch (err) {
      setFeedback(`Error toggling rule: ${(err as Error).message}`);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!approvalTypeId) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      let conditions = {};
      try {
        conditions = JSON.parse(conditionsJson);
      } catch {
        throw new Error('Conditions must be a valid JSON object.');
      }

      await adminApi.rules.create({
        approval_type_id: approvalTypeId,
        jurisdiction: jurisdiction.trim() || null,
        sector: sector.trim() || null,
        active: true,
        conditions,
      });

      setShowModal(false);
      setApprovalTypeId('');
      setJurisdiction('');
      setSector('');
      setConditionsJson('{\n  "operator": "and",\n  "conditions": []\n}');
      setFeedback('Applicability rule added to regulatory engine.');
      refetchRules();
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
          <span className="font-bold">Regulatory Engine Rules (Demonstration Data):</span>{' '}
          Rules evaluate business attributes (investment, sector, jurisdiction, workforce) against statutory requirements to generate the personalized permissions roadmap.
          Disabling or modifying a rule changes the roadmap immediately without requiring code deployment.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Applicability & Eligibility Rules</h1>
            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Data-driven JSON rule conditions determining applicable statutory permissions for an investment proposal · Demonstration Rules
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Applicability Rule</span>
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
              {['Permission / Approval Type', 'Jurisdiction', 'Sector', 'Status', 'Effective Window', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loadingRules && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
            {rulesError && <tr><td colSpan={6}><ErrorState message={(rulesError as Error).message} onRetry={() => refetchRules()} /></td></tr>}
            {!loadingRules && rules.length === 0 && (
              <tr><td colSpan={6}><EmptyState icon={<GitMerge className="w-8 h-8" />} title="No rules configured" /></td></tr>
            )}
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {rule.approval_type?.name ?? rule.approval_type_id}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{rule.jurisdiction ?? 'Any'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{rule.sector ?? 'Any'}</td>
                <td className="px-4 py-3">
                  {rule.active
                    ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium"><Circle className="w-3.5 h-3.5" /> Inactive</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {rule.effective_from || rule.effective_to ? `${rule.effective_from ?? 'Inception'} → ${rule.effective_to ?? 'Open'}` : 'Indefinite'}
                </td>
                <td className="px-4 py-3 text-xs">
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.active)}
                    className="text-purple-600 hover:text-purple-800 font-medium hover:underline"
                  >
                    {rule.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Regulatory Applicability Rule</h2>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jurisdiction (optional)</label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="e.g. MIDC or leave blank for Any"
                    className="input-base w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sector (optional)</label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="e.g. food_processing or Any"
                    className="input-base w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">JSON Rule Conditions</label>
                <textarea
                  rows={5}
                  value={conditionsJson}
                  onChange={(e) => setConditionsJson(e.target.value)}
                  className="input-base w-full font-mono text-xs"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Conditions define criteria such as investment thresholds, employee count, or power load requirements.
                </p>
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
                  {submitting ? 'Saving…' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

