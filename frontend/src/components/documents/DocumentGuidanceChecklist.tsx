'use client';

import React, { useState } from 'react';
import type {
  DocumentGuidanceItem,
  ApplicationDocumentGuidanceResponse,
} from '@/types/api';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Building2,
  FileCheck2,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Info,
  ShieldCheck,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getAbsoluteDownloadUrl } from '@/lib/api';

interface Props {
  checklist: ApplicationDocumentGuidanceResponse;
  isLoading?: boolean;
  onAttachFromVault?: (vaultDocId: string) => Promise<void> | void;
  onUpload?: (documentType: string) => void;
  onReplace?: (attachedDocId: string) => void;
  onDetach?: (attachedDocId: string) => void;
  onRefresh?: () => void;
}

type FilterTab = 'all' | 'mandatory' | 'optional' | 'reusable' | 'missing';

export function DocumentGuidanceChecklist({
  checklist,
  isLoading = false,
  onAttachFromVault,
  onUpload,
  onReplace,
  onDetach,
  onRefresh,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const { metrics, approval_type } = checklist;

  const handle1ClickAttach = async (doc: DocumentGuidanceItem) => {
    if (!doc.vault_reuse.vault_document_id || !onAttachFromVault) return;
    setAttachingId(doc.id);
    try {
      await onAttachFromVault(doc.vault_reuse.vault_document_id);
    } finally {
      setAttachingId(null);
    }
  };

  const filteredDocs = checklist.all_documents.filter((doc) => {
    if (activeFilter === 'mandatory') return doc.mandatory;
    if (activeFilter === 'optional') return !doc.mandatory;
    if (activeFilter === 'reusable') return doc.vault_reuse.can_one_click_reuse;
    if (activeFilter === 'missing') return doc.mandatory && !doc.is_attached;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Metrics Banner */}
      <div className="card p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                {approval_type.authority} · Statutory Checklist
              </span>
              <span className="text-[10px] font-mono text-slate-300">
                SLA: {approval_type.default_sla_days} Days
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              Document Guidance & Requirements Checklist
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5 leading-relaxed">
              Prescribed statutory documents for {approval_type.name}. Documents already uploaded
              to your Master Document Vault can be attached in one click without re-uploading.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
            <div className="text-right bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">
                Document Readiness
              </p>
              <p className="text-xl font-extrabold text-white">
                {metrics.readiness_percentage}%
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] mb-1.5 text-slate-300">
            <span>
              {metrics.attached_mandatory_count} of {metrics.mandatory_count} Mandatory Documents Attached
            </span>
            <span>
              {metrics.missing_mandatory_count === 0 ? (
                <span className="text-green-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All Mandatory Complete
                </span>
              ) : (
                <span className="text-amber-300 font-semibold">
                  {metrics.missing_mandatory_count} Mandatory Remaining
                </span>
              )}
            </span>
          </div>
          <div className="w-full bg-white/15 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 transition-all duration-500 rounded-full ${
                metrics.readiness_percentage === 100
                  ? 'bg-green-400'
                  : metrics.readiness_percentage >= 50
                  ? 'bg-blue-400'
                  : 'bg-amber-400'
              }`}
              style={{ width: `${metrics.readiness_percentage}%` }}
            />
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
          <div className="bg-black/20 rounded-lg p-2">
            <p className="text-xs font-bold text-white">{metrics.total_requirements}</p>
            <p className="text-[10px] text-slate-300">Total Prescribed</p>
          </div>
          <div className="bg-black/20 rounded-lg p-2">
            <p className="text-xs font-bold text-rose-300">{metrics.mandatory_count}</p>
            <p className="text-[10px] text-slate-300">Mandatory</p>
          </div>
          <div className="bg-black/20 rounded-lg p-2">
            <p className="text-xs font-bold text-emerald-300">{metrics.attached_count}</p>
            <p className="text-[10px] text-slate-300">Attached</p>
          </div>
          <div className="bg-black/20 rounded-lg p-2">
            <p className="text-xs font-bold text-cyan-300">{metrics.reusable_from_vault_count}</p>
            <p className="text-[10px] text-slate-300">Reusable from Vault</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'all', label: `All Documents (${checklist.all_documents.length})` },
          { key: 'mandatory', label: `Mandatory (${metrics.mandatory_count})` },
          { key: 'optional', label: `Optional / Conditional (${metrics.optional_count})` },
          {
            key: 'reusable',
            label: `Reusable in 1-Click (${metrics.reusable_from_vault_count})`,
            highlight: metrics.reusable_from_vault_count > 0,
          },
          { key: 'missing', label: `Missing Mandatory (${metrics.missing_mandatory_count})` },
        ].map(({ key, label, highlight }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key as FilterTab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === key
                ? 'bg-blue-600 text-white shadow-sm'
                : highlight
                ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-semibold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Document Items List */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="card p-8 text-center bg-gray-50 border-dashed border-gray-200">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-700">No documents match the active filter</p>
            <button
              onClick={() => setActiveFilter('all')}
              className="text-xs text-blue-600 font-medium hover:underline mt-1"
            >
              Reset to view all documents
            </button>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isExpanded = expandedDocId === doc.id;
            const isAttaching = attachingId === doc.id;

            return (
              <div
                key={doc.id}
                className={`card p-4 transition-all duration-200 border ${
                  doc.is_attached
                    ? 'border-green-200 bg-green-50/15'
                    : doc.mandatory
                    ? 'border-rose-200 bg-white'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Main Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900">
                        {doc.document_type}
                      </h3>
                      {doc.mandatory ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded">
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Optional / Conditional
                        </span>
                      )}
                      {doc.condition && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                          Condition: {doc.condition}
                        </span>
                      )}
                    </div>

                    {/* Purpose */}
                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                      {doc.purpose}
                    </p>
                  </div>

                  {/* Attachment Status & Main CTA */}
                  <div className="flex items-center gap-2">
                    {doc.is_attached ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 border border-green-200 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Attached
                        </span>
                        {onReplace && doc.attached_document_id && (
                          <button
                            onClick={() => onReplace(doc.attached_document_id!)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                          >
                            Replace
                          </button>
                        )}
                        {onDetach && doc.attached_document_id && (
                          <button
                            onClick={() => onDetach(doc.attached_document_id!)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50"
                          >
                            Detach
                          </button>
                        )}
                      </div>
                    ) : doc.vault_reuse.can_one_click_reuse ? (
                      <button
                        onClick={() => handle1ClickAttach(doc)}
                        disabled={isAttaching}
                        className="btn-primary text-xs py-1.5 px-3 bg-cyan-700 hover:bg-cyan-800 flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isAttaching ? 'animate-spin' : ''}`} />
                        {isAttaching ? 'Attaching...' : '1-Click Reuse from Vault'}
                      </button>
                    ) : (
                      onUpload && (
                        <button
                          onClick={() => onUpload(doc.document_type)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload & Attach
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Statutory Specifications Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50/80 p-2 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block font-semibold">Format & Size</span>
                      <span className="font-medium text-gray-800">{doc.format} (Max {doc.max_size_mb}MB)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50/80 p-2 rounded-lg">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block font-semibold">Issuing Authority</span>
                      <span className="font-medium text-gray-800 line-clamp-1" title={doc.issuing_authority}>
                        {doc.issuing_authority}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50/80 p-2 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block font-semibold">Validity / Expiry</span>
                      <span className="font-medium text-gray-800 line-clamp-1" title={doc.validity_rule}>
                        {doc.validity_rule}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attached Document File Info or Vault Match Callout */}
                {doc.is_attached && doc.attached_file_name && (
                  <div className="mt-3 p-2.5 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-green-700" />
                      <span className="font-mono font-medium text-green-900">{doc.attached_file_name}</span>
                      {doc.attached_status && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-green-800 border border-green-300">
                          {doc.attached_status}
                        </span>
                      )}
                    </div>
                    {doc.attached_expiry_date && (
                      <span className="text-[11px] text-green-800">
                        Expires: {formatDate(doc.attached_expiry_date)}
                      </span>
                    )}
                  </div>
                )}

                {/* 1-Click Vault Match Banner (When unattached) */}
                {!doc.is_attached && doc.vault_reuse.available_in_vault && (
                  <div className="mt-3 p-3 rounded-lg bg-cyan-50/70 border border-cyan-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-700 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-cyan-950">
                          Existing Verified Copy Available in Vault:
                          <span className="font-mono font-normal ml-1 text-cyan-900">
                            {doc.vault_reuse.vault_file_name}
                          </span>
                        </p>
                        <p className="text-[11px] text-cyan-700">
                          Status: {doc.vault_reuse.vault_verification_status || 'VERIFIED'} · Reused by {doc.vault_reuse.reuse_count} applications
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handle1ClickAttach(doc)}
                      disabled={isAttaching}
                      className="text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-semibold px-3 py-1 rounded-lg transition-colors shadow-sm"
                    >
                      {isAttaching ? 'Attaching...' : 'Attach Now (1-Click)'}
                    </button>
                  </div>
                )}

                {/* Prescribed Form / Statutory Template Section (If configured) */}
                {doc.prescribed_form && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50/60 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
                          {doc.prescribed_form.category}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-900">
                          {doc.prescribed_form.form_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Source: {doc.prescribed_form.source_label}
                      </p>
                    </div>

                    <a
                      href={getAbsoluteDownloadUrl(doc.prescribed_form.download_url)}
                      download={doc.prescribed_form.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Official Format
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
