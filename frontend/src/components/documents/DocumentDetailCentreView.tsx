'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Layers,
  ArrowRight,
  Database,
  FileText,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  X,
  Info,
} from 'lucide-react';

interface Props {
  projectId: string;
}

export function DocumentDetailCentreView({ projectId }: Props) {
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFieldKey, setExpandedFieldKey] = useState<string | null>(null);

  // Edit Modal State
  const [editField, setEditField] = useState<{
    field_key: string;
    label: string;
    current_value: any;
    provenance: string;
    downstream_targets: string[];
    occurrences: any[];
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editError, setEditError] = useState<string>('');

  const {
    data: detailCentre,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['document-detail-centre', projectId],
    queryFn: () => documentsApi.getDetailCentre(projectId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ fieldKey, masterValue }: { fieldKey: string; masterValue: any }) =>
      documentsApi.updateMasterField(projectId, fieldKey, {
        value: masterValue,
        master_value: masterValue,
        confirmed: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-detail-centre', projectId] });
      qc.invalidateQueries({ queryKey: ['project-document-consistency', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setEditField(null);
    },
    onError: (err: any) => {
      setEditError(err.message || 'Failed to update master attribute value');
    },
  });

  const handleOpenEdit = (field: any) => {
    setEditField(field);
    setEditValue(field.master_value !== null && field.master_value !== undefined ? String(field.master_value) : '');
    setEditError('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editField) return;
    setEditError('');

    let parsedVal: any = editValue.trim();
    if (['plot_area_sqm', 'built_up_area_sqm', 'power_demand_kva', 'water_demand_kld', 'worker_count'].includes(editField.field_key)) {
      const num = parseFloat(parsedVal);
      if (isNaN(num)) {
        setEditError('Please enter a valid numeric value.');
        return;
      }
      parsedVal = num;
    }

    updateMutation.mutate({
      fieldKey: editField.field_key,
      masterValue: parsedVal,
    });
  };

  if (isLoading) {
    return (
      <div className="card p-8 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-primary-600 animate-spin mx-auto" />
        <p className="text-xs text-gray-500">Aggregating cross-document fields and analyzing discrepancies...</p>
      </div>
    );
  }

  if (!detailCentre) {
    return (
      <div className="card p-8 text-center text-xs text-gray-500">
        No document detail centre information available for this project proposal.
      </div>
    );
  }

  function normalizeField(f: any) {
    const rawOccurrences = f.original_extracted_values || f.occurrences || [];
    return {
      ...f,
      field_key: f.key || f.field_key,
      label: f.label || f.key || f.field_key,
      category: f.category,
      master_value: f.master_value ?? null,
      occurrences: rawOccurrences.map((o: any) => ({
        ...o,
        document_type: o.document_type || 'Document Exhibit',
        file_name: o.document_name || o.file_name || 'Exhibit',
        raw_value: o.extracted_value !== undefined ? o.extracted_value : (o.raw_value !== undefined ? o.raw_value : ''),
        extracted_at: o.extracted_at,
        confidence: o.confidence ?? 0.95,
      })),
      has_conflict: Boolean(f.has_conflict),
      conflict_details: f.conflict_details || (f.conflict_summary ? { message: f.conflict_summary } : undefined),
      is_manual_override: Boolean(f.is_overridden || f.is_manual_override),
      provenance: f.provenance || 'Not Available',
      downstream_targets: f.downstream_targets || [],
    };
  }

  const rawCategories = detailCentre.categories || {};
  const categories: Array<{
    category_id: string;
    category_name: string;
    description: string;
    fields: any[];
  }> = Array.isArray(rawCategories)
    ? rawCategories.map((c: any) => ({
        category_id: c.category_id || String(c.category_name || '').toLowerCase(),
        category_name: c.category_name || c.name || 'General',
        description: c.description || `Aggregated attributes for ${c.category_name}`,
        fields: (c.fields || []).map(normalizeField),
      }))
    : Object.entries(rawCategories).map(([catName, fields]) => ({
        category_id: catName.toLowerCase(),
        category_name: catName,
        description: `Aggregated attributes for ${catName}`,
        fields: Array.isArray(fields) ? fields.map(normalizeField) : [],
      }));

  const allFields = categories.flatMap((c) =>
    c.fields.map((f) => ({ ...f, category_name: c.category_name }))
  );
  const displayedCategories = selectedCategory === 'all'
    ? categories
    : categories.filter((c) => c.category_id === selectedCategory);

  const exhibitsCount = detailCentre.summary?.total_documents ?? detailCentre.total_documents_analyzed ?? 0;
  const masterAttributesCount = detailCentre.summary?.total_fields_extracted ?? allFields.length;
  const conflictsCount = detailCentre.summary?.conflicts_detected ?? detailCentre.conflicts_detected ?? 0;
  const reuseCount = allFields.reduce((acc: number, f: any) => acc + (f.downstream_targets?.length || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Overview Banner */}
      <div className="card p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Document Detail Centre & Downstream Reuse</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  SINGLE SOURCE OF TRUTH
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                Extracted data across all uploaded documents is aggregated here. Setting or editing a Master Value
                automatically cascades downstream to your Common Application Form (CAF), Project Profile, and Department Clearance Submissions.
              </p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="btn-secondary text-xs py-1.5 px-3 self-start md:self-auto flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-aggregate
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-blue-200/50">
          <div className="p-2.5 bg-white/80 rounded-xl border border-gray-200/80">
            <p className="text-[11px] text-gray-500 font-medium">Exhibits Analyzed</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{exhibitsCount}</p>
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-gray-200/80">
            <p className="text-[11px] text-gray-500 font-medium">Master Attributes</p>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{masterAttributesCount}</p>
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-gray-200/80">
            <p className="text-[11px] text-gray-500 font-medium">Conflict Detections</p>
            <p className={`text-xl font-bold mt-0.5 ${conflictsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {conflictsCount}
            </p>
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-gray-200/80">
            <p className="text-[11px] text-gray-500 font-medium">Downstream Reuses</p>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">
              {reuseCount}
            </p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Categories ({allFields.length})
        </button>
        {categories.map((c: any) => (
          <button
            key={c.category_id}
            onClick={() => setSelectedCategory(c.category_id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
              selectedCategory === c.category_id
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.category_name} ({c.fields.length})
          </button>
        ))}
      </div>

      {/* Categories & Fields List */}
      <div className="space-y-6">
        {displayedCategories.map((cat: any) => (
          <div key={cat.category_id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{cat.category_name}</h3>
                <p className="text-[11px] text-gray-500">{cat.description}</p>
              </div>
              <span className="text-[11px] text-gray-400 font-medium">
                {cat.fields.length} attribute{cat.fields.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {cat.fields.map((field: any) => {
                const isExpanded = expandedFieldKey === field.field_key;
                return (
                  <div
                    key={field.field_key}
                    className={`card p-4 transition-all border ${
                      field.has_conflict
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">{field.label}</span>
                          <span className="text-[10px] text-gray-400 font-mono">({field.field_key})</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Extracted across {field.occurrences.length} source exhibit{field.occurrences.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenEdit(field)}
                        className="btn-ghost p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="Edit / Confirm Master Value"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Master Value Display */}
                    <div className="mt-3 p-3 bg-gray-50/90 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          Authoritative Master Value
                        </span>
                        <div className="text-sm font-extrabold text-gray-950 mt-0.5 break-all">
                          {field.master_value !== null && field.master_value !== undefined
                            ? String(field.master_value)
                            : <span className="text-gray-400 font-normal italic">Pending extraction / manual confirmation</span>}
                        </div>
                      </div>

                      {/* Provenance Badge */}
                      <div className="text-right">
                        {field.is_manual_override ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            User Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            Auto-Extracted
                          </span>
                        )}
                        <p className="text-[9px] text-gray-400 mt-0.5 max-w-[140px] truncate" title={field.provenance}>
                          {field.provenance}
                        </p>
                      </div>
                    </div>

                    {/* Conflict Alert Banner */}
                    {field.has_conflict && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-300/80 text-amber-900 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[11px] text-amber-950">
                            {field.conflict_details?.message || 'Conflicting values detected across exhibits'}
                          </p>
                          <p className="text-[10px] text-amber-800 mt-0.5">
                            Exhibits disagree beyond tolerance. Please review source values below and confirm the authoritative value.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Downstream Targets Chips */}
                    {field.downstream_targets?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          Downstream Auto-Reuse:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {field.downstream_targets.map((target: string) => (
                            <span
                              key={target}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-150"
                            >
                              {target}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expand Exhibits Toggle */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => setExpandedFieldKey(isExpanded ? null : field.field_key)}
                        className="text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1"
                      >
                        {isExpanded ? 'Hide Source Exhibits' : `View ${field.occurrences.length} Source Exhibits`}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(field)}
                        className="text-gray-500 hover:text-gray-900 font-medium"
                      >
                        Edit Value →
                      </button>
                    </div>

                    {/* Expanded Exhibits Drawer */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-1.5 animate-fade-in">
                        {field.occurrences.map((occ: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-gray-50 border border-gray-200/80 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-gray-900 truncate">{occ.document_type}</p>
                              <p className="text-[10px] text-gray-500 font-mono truncate">{occ.file_name}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="font-mono font-bold text-gray-900 text-xs">
                                {String(occ.raw_value)}
                              </span>
                              <div className="flex items-center gap-1 justify-end mt-0.5">
                                <span className="text-[9px] text-gray-400">
                                  {Math.round(occ.confidence * 100)}% match
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEdit({
                                      ...field,
                                      current_value: occ.raw_value,
                                    });
                                    setEditValue(String(occ.raw_value));
                                  }}
                                  className="text-[10px] text-primary-600 hover:underline font-medium ml-1"
                                >
                                  Use This
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Edit / Confirm Master Value (B0.3) */}
      {editField && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Confirm Master Value</h3>
                  <p className="text-[11px] text-gray-500">{editField.label} ({editField.field_key})</p>
                </div>
              </div>
              <button
                onClick={() => setEditField(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Authoritative Master Value *
                </label>
                <input
                  type="text"
                  required
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="input-base text-sm font-semibold py-2"
                  placeholder="Enter confirmed value"
                />
              </div>

              {/* Source Exhibit Quick-Picks */}
              {editField.occurrences?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-gray-500 font-medium">Or select from source document exhibits:</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {editField.occurrences.map((occ: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditValue(String(occ.raw_value))}
                        className={`w-full p-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                          editValue === String(occ.raw_value)
                            ? 'border-primary-500 bg-primary-50/60 font-bold text-primary-900'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="truncate pr-2">{occ.document_type}</span>
                        <span className="font-mono text-xs">{String(occ.raw_value)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Downstream propagation note */}
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Automatic Downstream Propagation
                </p>
                <p className="text-[11px] leading-relaxed text-blue-800">
                  Confirming this value will update your project attributes and cascade to:
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {editField.downstream_targets?.map((t: string) => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white text-blue-800 border border-blue-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {editError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditField(null)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary text-xs py-2 px-4 shadow-sm"
                >
                  {updateMutation.isPending ? 'Propagating Value...' : 'Confirm & Save Master Value'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
