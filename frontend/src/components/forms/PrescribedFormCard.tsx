'use client';

import React from 'react';
import type { PrescribedForm } from '@/types/api';
import {
  FileDown,
  UploadCloud,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  Globe,
  Info,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';

interface Props {
  form: PrescribedForm;
  onUploadCompletedForm?: (documentType: string) => void;
}

export function PrescribedFormCard({ form, onUploadCompletedForm }: Props) {
  const isDemo = form.category === 'Demonstration / Configurable Form';
  const isVerifiedDoc = form.provenance_status === 'VERIFIED_OFFICIAL_DOCUMENT';
  const isOnlinePortal = form.is_online_application || form.provenance_status === 'OFFICIAL_ONLINE_PORTAL';

  const handleDownload = () => {
    const downloadUrl = `/api/prescribed-forms/${form.id}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = form.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 p-4 space-y-3.5 shadow-xs hover:border-gray-300 transition-colors">
      {/* Header and Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                Prescribed Format
              </span>

              {/* Provenance Badge */}
              {isVerifiedDoc ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Official Document
                </span>
              ) : isOnlinePortal ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200/70">
                  <Globe className="w-3 h-3 text-blue-600" /> Official Online Portal
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/70">
                  <Info className="w-3 h-3 text-amber-600" /> Demonstration / Configurable Form
                </span>
              )}

              {form.authority && (
                <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  {form.authority}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-gray-900 mt-1 leading-snug">{form.form_name}</h4>
          </div>
        </div>

        <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 flex-shrink-0">
          {form.version}
        </span>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">{form.description}</p>

      {/* Provenance & Target Requirement Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
        <div>
          <span className="text-gray-400 block text-[11px]">Associated Clearance Document:</span>
          <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
            <FileCheck2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            {form.document_type}
          </span>
        </div>
        <div>
          <span className="text-gray-400 block text-[11px]">Authoritative Source / Citation:</span>
          <span className="font-medium text-gray-700 block truncate mt-0.5" title={form.source_label}>
            {form.source_label}
          </span>
        </div>
      </div>

      {/* Online Portal / Gazette Link Callout */}
      {(form.source_url || form.official_online_url) && (
        <div className="text-[11px] text-gray-500 flex items-center gap-3 flex-wrap bg-blue-50/30 px-2.5 py-1.5 rounded-lg border border-blue-100/60">
          {form.source_url && (
            <a
              href={form.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-700 hover:text-primary-900 font-medium inline-flex items-center gap-1 hover:underline"
              title="Open authoritative government source / gazette reference"
            >
              <span>Statutory Gazette / Official PDF Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {form.official_online_url && (
            <a
              href={form.official_online_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 hover:underline"
              title={`Open official online application on ${form.online_portal_name || 'Department Portal'}`}
            >
              <Globe className="w-3 h-3 text-emerald-600" />
              <span>Open {form.online_portal_name || 'Official Portal'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Actions: Download Form, Open Online Application, and Guided Upload */}
      <div className="pt-1 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] text-gray-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Effective: {form.effective_date}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {form.is_online_application && form.official_online_url ? (
            <a
              href={form.official_online_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Online Application</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={handleDownload}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Download the official prescribed form template"
          >
            <FileDown className="w-3.5 h-3.5 text-gray-600" />
            <span>Download Form (PDF)</span>
          </button>

          {onUploadCompletedForm && (
            <button
              type="button"
              onClick={() => onUploadCompletedForm(form.document_type)}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              title="Upload filled document and run automated pre-validation"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Completed Form</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
