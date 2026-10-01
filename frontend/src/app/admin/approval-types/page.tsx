'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { FileText, CheckCircle2, Clock, Plus, X, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ApprovalTypesPage() {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [authority, setAuthority] = useState('Maharashtra Pollution Control Board (MPCB)');
  const [category, setCategory] = useState('PRE_ESTABLISHMENT');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [defaultSlaDays, setDefaultSlaDays] = useState(30);
  const [renewalPeriodDays, setRenewalPeriodDays] = useState<number | ''>('');
  const [requiresInspection, setRequiresInspection] = useState(false);
  const [sourceReference, setSourceReference] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-approval-types'],
    queryFn: () => adminApi.approvalTypes.list(),
  });

  const types = (data ?? []) as Array<{
    id: string;
    name: string;
    authority: string;
    category: string;
    description: string;
    purpose: string;
    default_sla_days: number;
    renewal_period_days: number | null;
    requires_inspection: boolean;
    source_reference: string | null;
  }>;

  const categories = [...new Set(types.map(t => t.category))];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await adminApi.approvalTypes.create({
        name: name.trim(),
        authority: authority.trim(),
        category,
        description: description.trim() || undefined,
        purpose: purpose.trim() || undefined,
        default_sla_days: Number(defaultSlaDays) || 30,
        renewal_period_days: renewalPeriodDays === '' ? null : Number(renewalPeriodDays),
        requires_inspection: requiresInspection,
        source_reference: sourceReference.trim() || 'Maharashtra Industry, Trade and Investment Facilitation Rules, 2025',
      });
      setShowModal(false);
      setName('');
      setDescription('');
      setPurpose('');
      setRenewalPeriodDays('');
      setSourceReference('');
      setFeedback('Statutory permission added to master catalogue successfully.');
      refetch();
    } catch (err) {
      setFeedback(`Error: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Prototype & Legal Notice Banner */}
      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <span className="font-bold">System Administrator Master Catalogue (Demonstration Data):</span>{' '}
          Configured permissions, competent authorities, and specified time limits represent statutory permissions under the
          Maharashtra Single Window System (MAITRI Act 2023 & Rules 2025). Modifications directly update live rule evaluation and dashboard workflows.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Permissions / Approvals Catalogue</h1>
            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {types.length} statutory permissions & approvals configured · {categories.length} categories · Master Data
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Permission / Approval</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-purple-600 hover:text-purple-800 font-bold ml-2">×</button>
        </div>
      )}

      {/* Category summary */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <span key={cat} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {cat} ({types.filter(t => t.category === cat).length})
            </span>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              {['Permission / Approval Name', 'Concerned Authority', 'Category', 'Specified Limit', 'Renewal', 'Inspection', 'Statutory Basis'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
            {error && (
              <tr><td colSpan={7}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></td></tr>
            )}
            {!isLoading && types.length === 0 && (
              <tr><td colSpan={7}>
                <EmptyState icon={<FileText className="w-8 h-8" />} title="No approval types" />
              </td></tr>
            )}
            {types.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{t.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 font-medium">{t.authority}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">{t.category}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {t.default_sla_days}d
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {t.renewal_period_days ? `${t.renewal_period_days}d` : '—'}
                </td>
                <td className="px-4 py-3">
                  {t.requires_inspection ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate" title={t.source_reference ?? ''}>
                  {t.source_reference ?? 'MAITRI Rules 2025'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Permission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Statutory Permission / Approval</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Permission / Approval Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Consent to Establish (CTE)"
                  className="input-base w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Concerned Department / Authority *</label>
                <input
                  type="text"
                  required
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  placeholder="e.g. Maharashtra Pollution Control Board (MPCB)"
                  className="input-base w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-base w-full text-xs"
                  >
                    <option value="PRE_ESTABLISHMENT">PRE_ESTABLISHMENT</option>
                    <option value="PRE_COMMISSIONING">PRE_COMMISSIONING</option>
                    <option value="POST_COMMISSIONING">POST_COMMISSIONING</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Specified Time Limit (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={defaultSlaDays}
                    onChange={(e) => setDefaultSlaDays(Number(e.target.value))}
                    className="input-base w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Renewal Period (Days, optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={renewalPeriodDays}
                    onChange={(e) => setRenewalPeriodDays(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 365"
                    className="input-base w-full text-xs"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={requiresInspection}
                      onChange={(e) => setRequiresInspection(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    Requires Site Inspection
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Statutory objective or scope of approval"
                  className="input-base w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Statutory Act / Legal Reference</label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. Water (Prevention & Control of Pollution) Act, 1974"
                  className="input-base w-full text-xs"
                />
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
                  {submitting ? 'Saving…' : 'Save to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

