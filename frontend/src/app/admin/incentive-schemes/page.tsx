'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ErrorState, TableRowSkeleton, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { Gift, CheckCircle2, Plus, X, Trash2, ShieldCheck } from 'lucide-react';

export default function IncentiveSchemesPage() {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [authority, setAuthority] = useState('Industries, Energy & Labour Department, Govt. of Maharashtra');
  const [description, setDescription] = useState('');
  const [benefitDescription, setBenefitDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [sourceReference, setSourceReference] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-incentive-schemes'],
    queryFn: () => adminApi.incentiveSchemes.list(),
  });

  const schemes = (data ?? []) as Array<{
    id: string;
    name: string;
    authority: string;
    description: string;
    benefit_description: string;
    deadline: string | null;
    source_reference: string | null;
  }>;

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this incentive scheme?')) return;
    try {
      await adminApi.incentiveSchemes.delete(id);
      setFeedback('Incentive scheme removed from catalogue.');
      refetch();
    } catch (err) {
      setFeedback(`Error deleting scheme: ${(err as Error).message}`);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await adminApi.incentiveSchemes.create({
        name: name.trim(),
        authority: authority.trim(),
        description: description.trim(),
        benefit_description: benefitDescription.trim(),
        deadline: deadline || null,
        source_reference: sourceReference.trim() || 'Package Scheme of Incentives (PSI) 2019, Govt. of Maharashtra',
      });

      setShowModal(false);
      setName('');
      setDescription('');
      setBenefitDescription('');
      setDeadline('');
      setSourceReference('');
      setFeedback('Government incentive scheme added to master catalogue.');
      refetch();
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
          <span className="font-bold">Government Incentive Schemes Master Catalogue (Demonstration Data):</span>{' '}
          Configured fiscal schemes (e.g. Package Scheme of Incentives PSI 2019, Food Processing Policy) matched to investment proposals based on sector, investment scale, and taluka/district classification.
          Incentive discovery indicates *potential applicability* subject to formal departmental sanction.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Incentive Schemes Master Data</h1>
            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {schemes.length} schemes configured — matched to projects via the regulatory rule engine · Master Data
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Incentive Scheme</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-purple-600 hover:text-purple-800 font-bold ml-2">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="h-40 skeleton rounded-xl" />
        ))}
        {error && <div className="col-span-2"><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></div>}
        {!isLoading && schemes.length === 0 && (
          <div className="col-span-2">
            <EmptyState icon={<Gift className="w-8 h-8" />} title="No incentive schemes configured" />
          </div>
        )}
        {schemes.map((scheme) => (
          <div key={scheme.id} className="card p-5 relative group">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900">{scheme.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{scheme.authority}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(scheme.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                title="Delete scheme"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{scheme.description}</p>
            <div className="flex items-start gap-2 p-2.5 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-green-800 font-medium">{scheme.benefit_description}</p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
              <span>{scheme.deadline ? `Deadline: ${formatDate(scheme.deadline)}` : 'Rolling Scheme'}</span>
              <span className="truncate max-w-[200px]" title={scheme.source_reference ?? ''}>{scheme.source_reference ?? 'Govt. Resolution'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Scheme Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Government Incentive Scheme</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Scheme Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Package Scheme of Incentives (PSI) 2019"
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
                  placeholder="e.g. Directorate of Industries, Govt. of Maharashtra"
                  className="input-base w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Benefit Description *</label>
                <input
                  type="text"
                  required
                  value={benefitDescription}
                  onChange={(e) => setBenefitDescription(e.target.value)}
                  placeholder="e.g. Capital subsidy up to 50% on eligible fixed capital investments"
                  className="input-base w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Eligibility criteria, taluka classification, and disbursement mechanism"
                  className="input-base w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Application Deadline (optional)</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Government Resolution (GR) Ref</label>
                  <input
                    type="text"
                    value={sourceReference}
                    onChange={(e) => setSourceReference(e.target.value)}
                    placeholder="e.g. GR No. PSI-2019/CR-45/IND-8"
                    className="input-base w-full text-xs"
                  />
                </div>
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
                  {submitting ? 'Saving…' : 'Save Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

