'use client';

import { useState } from 'react';
import type { DocumentPreValidationResult } from '@/types/api';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSearch,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  result: DocumentPreValidationResult | null;
  isValidating: boolean;
  onResetFile: () => void;
}

export function DocumentPreValidationCard({ result, isValidating, onResetFile }: Props) {
  const [showAllChecks, setShowAllChecks] = useState(false);

  if (isValidating) {
    return (
      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-3 animate-pulse">
        <FileSearch className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-900">Pre-Validating Document...</p>
          <p className="text-[11px] text-blue-700">
            Inspecting statutory format, file integrity, expiry date, and semantic markers.
          </p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // 1. REJECTED STATE
  if (result.status === 'REJECTED' || !result.accepted) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-fade-in text-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900 text-sm">Document not accepted</h4>
              <p className="text-red-700 mt-0.5">
                The selected file failed statutory pre-validation and cannot be attached to the application.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResetFile}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors shadow-sm flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Choose another file
          </button>
        </div>

        {/* Mismatch detection callout */}
        {result.detected_type && (
          <div className="p-2.5 bg-white/80 rounded-lg border border-red-200 font-mono text-[11px] space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Expected:</span>
              <span className="font-bold text-gray-900">{result.document_type}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-semibold">Detected:</span>
              <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                {result.detected_type}
              </span>
            </div>
          </div>
        )}

        {/* Specific reasons bullet list */}
        <div className="space-y-1.5">
          <p className="font-semibold text-red-900">Exact Reasons for Rejection:</p>
          <ul className="list-disc pl-5 space-y-1 text-red-800">
            {result.errors.map((err, idx) => (
              <li key={idx} className="leading-relaxed">
                {err}
              </li>
            ))}
          </ul>
        </div>

        {/* Expandable checklist */}
        {result.checks && result.checks.length > 0 && (
          <div className="pt-2 border-t border-red-200/60">
            <button
              type="button"
              onClick={() => setShowAllChecks(!showAllChecks)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-red-700 hover:text-red-900"
            >
              <span>{showAllChecks ? 'Hide Detailed Pre-Validation Checklist' : 'Show Detailed Pre-Validation Checklist'}</span>
              {showAllChecks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAllChecks && (
              <div className="mt-2 space-y-1.5">
                {result.checks.map((chk, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-white/70 border border-red-100 flex items-center justify-between text-[11px]"
                  >
                    <span className="font-medium text-gray-800">{chk.name}</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        chk.status === 'pass'
                          ? 'bg-green-100 text-green-800'
                          : chk.status === 'warn'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {chk.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. MANUAL VERIFICATION REQUIRED (Scanned document safety rule)
  if (result.status === 'MANUAL_VERIFICATION_REQUIRED') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 animate-fade-in text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-900 text-sm">Manual Verification Required</h4>
              <span className="text-[10px] uppercase font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                Eligible for Submission
              </span>
            </div>
            <p className="text-amber-800 mt-1 leading-relaxed">
              Technical checks (file format, size limits, headers) passed. Scanned or image-only PDF detected without plain
              text stream. Per statutory rules, this file will be queued for manual officer verification upon departmental submission.
            </p>
            {result.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-4 text-amber-700 space-y-0.5 text-[11px]">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. ACCEPTED STATE
  return (
    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="font-bold text-emerald-900 text-xs">Statutory Pre-Validation Passed</p>
          <p className="text-[11px] text-emerald-700">
            Format, file integrity, statutory markers, and validity verified. Ready for upload.
          </p>
        </div>
      </div>
      <span className="font-bold text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
        ACCEPTED
      </span>
    </div>
  );
}
