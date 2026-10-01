'use client';

import React, { useState } from 'react';
import type { ProjectDocumentGuidanceResponse, ClearanceDocumentGuidanceGroup } from '@/types/api';
import {
  FileText,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Download,
  Upload,
  ChevronRight,
  ShieldCheck,
  Layers,
  Search,
} from 'lucide-react';
import { getAbsoluteDownloadUrl } from '@/lib/api';

interface Props {
  data?: ProjectDocumentGuidanceResponse | null;
  isLoading?: boolean;
  onUpload?: (documentType: string) => void;
  onRefresh?: () => void;
}

export function ClearanceDocumentGuidanceView({
  data,
  isLoading = false,
  onUpload,
  onRefresh,
}: Props) {
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div className="card p-6 bg-white space-y-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/4" />
        <div className="h-10 bg-gray-100 rounded w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-gray-100 rounded" />
          <div className="h-40 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.clearances.length === 0) {
    return null;
  }

  const activeClearance =
    data.clearances.find((c) => c.approval_id === selectedApprovalId) ||
    data.clearances[0];

  const filteredClearances = data.clearances.filter(
    (c) =>
      c.approval_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Banner */}
      <div className="card p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Statutory Document Guidance by Clearance
              </h2>
            </div>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Browse prescribed statutory documents, issuing authorities, format specifications, and
              validity rules organized by competent authority clearance.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-blue-200 block">Vault Fulfillment</span>
            <span className="text-lg font-extrabold text-white">
              {data.verified_vault_documents} / {data.total_vault_documents} Verified Docs
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Clearances List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clearances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {filteredClearances.map((c) => {
              const isSelected = c.approval_id === activeClearance?.approval_id;
              return (
                <button
                  key={c.approval_id}
                  onClick={() => setSelectedApprovalId(c.approval_id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                        {c.authority}
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-1 line-clamp-1">
                        {c.approval_name}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                      {c.completion_rate}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                    <span>
                      {c.mandatory_count} Mandatory · {c.total_requirements - c.mandatory_count} Optional
                    </span>
                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                      View <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Document Guidance for Selected Clearance */}
        {activeClearance && (
          <div className="lg:col-span-8 card p-5 space-y-4 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                  {activeClearance.authority} · {activeClearance.category}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {activeClearance.approval_name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-gray-700 block">
                  Statutory SLA: {activeClearance.sla_days} Days
                </span>
                <span className="text-[11px] text-gray-500">
                  {activeClearance.satisfied_count} of {activeClearance.mandatory_count} mandatory documents satisfied in vault
                </span>
              </div>
            </div>

            {/* Document Checklist Items */}
            <div className="space-y-3">
              {[...activeClearance.required_documents, ...activeClearance.optional_documents].map(
                (doc) => {
                  const hasVaultCopy = doc.vault_reuse.available_in_vault;

                  return (
                    <div
                      key={doc.id}
                      className={`p-3.5 rounded-xl border text-xs transition-all ${
                        hasVaultCopy
                          ? 'border-green-200 bg-green-50/20'
                          : doc.mandatory
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-100 bg-gray-50/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{doc.document_type}</span>
                            {doc.mandatory ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded">
                                Mandatory
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                Optional
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mt-1 leading-relaxed">{doc.purpose}</p>
                        </div>

                        {/* Status */}
                        <div>
                          {hasVaultCopy ? (
                            <span className="inline-flex items-center gap-1 font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-lg text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              In Vault ({doc.vault_reuse.vault_verification_status})
                            </span>
                          ) : (
                            onUpload && (
                              <button
                                onClick={() => onUpload(doc.document_type)}
                                className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3" />
                                Upload to Vault
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Specs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                        <div>
                          <span className="text-gray-400 block font-semibold text-[9px] uppercase">Format</span>
                          <span className="text-gray-700 font-medium">{doc.format}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-semibold text-[9px] uppercase">Issuing Authority</span>
                          <span className="text-gray-700 font-medium line-clamp-1">{doc.issuing_authority}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-semibold text-[9px] uppercase">Validity Rule</span>
                          <span className="text-gray-700 font-medium line-clamp-1">{doc.validity_rule}</span>
                        </div>
                      </div>

                      {/* Prescribed form button if available */}
                      {doc.prescribed_form && (
                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                          <span className="text-amber-800 font-medium">
                            Official Statutory Template: {doc.prescribed_form.form_name}
                          </span>
                          <a
                            href={getAbsoluteDownloadUrl(doc.prescribed_form.download_url)}
                            download={doc.prescribed_form.file_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 hover:underline"
                          >
                            <Download className="w-3 h-3" /> Download Form
                          </a>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
