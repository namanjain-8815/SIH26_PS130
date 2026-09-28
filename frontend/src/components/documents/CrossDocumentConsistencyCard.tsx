'use client';

import React from 'react';
import type { CrossDocumentConsistencyResult, CrossDocumentDiscrepancyItem } from '@/types/api';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  FileX2,
  FileQuestion,
  RefreshCw,
  Info,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface Props {
  result?: CrossDocumentConsistencyResult | null;
  isLoading?: boolean;
  onRecheck?: () => void;
  title?: string;
  isCompact?: boolean;
}

export function CrossDocumentConsistencyCard({
  result,
  isLoading,
  onRecheck,
  title = 'Cross-Document Consistency & Discrepancy Audit',
  isCompact = false,
}: Props) {
  if (isLoading) {
    return (
      <div className="card p-5 space-y-3 bg-white animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-10 bg-gray-100 rounded w-full" />
        <div className="h-20 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  if (!result) return null;

  const hasDiscrepancies = result.discrepancies_found > 0;
  const hasManualReviews = result.manual_review_required > 0;

  return (
    <div className="card p-5 space-y-4 bg-white border border-gray-200/90 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              hasDiscrepancies
                ? 'bg-red-50 text-red-700 border border-red-200'
                : hasManualReviews
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {hasDiscrepancies ? (
              <FileX2 className="w-5 h-5" />
            ) : hasManualReviews ? (
              <FileQuestion className="w-5 h-5" />
            ) : (
              <FileCheck2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                Milestone P0.5 · Local Deterministic Audit
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  result.overall_status === 'PASS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : result.overall_status === 'DISCREPANCY_DETECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {result.overall_status === 'PASS'
                  ? 'All Documents Concordant'
                  : result.overall_status === 'DISCREPANCY_DETECTED'
                  ? `${result.discrepancies_found} Discrepancy Detected`
                  : 'Manual Verification Required'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mt-0.5">{title}</h3>
          </div>
        </div>

        {onRecheck && (
          <button
            type="button"
            onClick={onRecheck}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Re-run cross-document audit"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span>Re-Audit</span>
          </button>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-[10px] text-gray-400 block font-semibold">Analyzed Files</span>
          <span className="font-bold text-gray-900 text-sm mt-0.5 block">
            {result.total_documents_analyzed} Documents
          </span>
          <span className="text-[10px] text-gray-500">
            {result.readable_documents_count} parsed · {result.unreadable_documents_count} scanned
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-[10px] text-gray-400 block font-semibold">Cross-Checks</span>
          <span className="font-bold text-gray-900 text-sm mt-0.5 block">
            {result.checks_evaluated} Evaluated
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {result.passed_checks} passed
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-[10px] text-gray-400 block font-semibold">Discrepancies</span>
          <span
            className={`font-bold text-sm mt-0.5 block ${
              hasDiscrepancies ? 'text-red-700' : 'text-gray-900'
            }`}
          >
            {result.discrepancies_found} Detected
          </span>
          <span className="text-[10px] text-gray-500">
            {hasDiscrepancies ? 'Blocking submission' : 'None detected'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-[10px] text-gray-400 block font-semibold">Submission Status</span>
          <span
            className={`font-bold text-xs mt-1 block ${
              result.can_submit ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {result.can_submit ? 'Clearance Eligible' : 'Blocked on Discrepancy'}
          </span>
          <span className="text-[10px] text-gray-500">
            {result.can_submit ? 'No blocking conflicts' : 'Review sources'}
          </span>
        </div>
      </div>

      {/* Summary Note */}
      <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/50 border border-blue-100/80 p-3 rounded-lg">
        {result.summary_notes}
      </p>

      {/* Discrepancies and Checks List */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center justify-between">
          <span>Cross-Document Evaluated Fields ({result.checks.length})</span>
          <span className="text-[11px] text-gray-400 font-normal">Tolerance-Aware Comparison</span>
        </h4>

        {result.checks.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
            No cross-comparable document pairs detected. Upload additional statutory proofs to evaluate cross-document consistency.
          </div>
        ) : (
          <div className="space-y-3">
            {result.checks.map((check) => {
              const isDiscrepant = check.status === 'DISCREPANCY';
              const isManual = check.status === 'MANUAL_REVIEW';

              return (
                <div
                  key={check.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                    isDiscrepant
                      ? 'border-red-300 bg-red-50/30'
                      : isManual
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-gray-200/80 bg-white hover:bg-gray-50/50'
                  }`}
                >
                  {/* Field Name & Status Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{check.field_name}</span>
                      {check.tolerance_pct !== undefined && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                          <Sliders className="w-3 h-3 text-gray-400" />
                          Tolerance: {check.tolerance_pct}%
                        </span>
                      )}
                      {check.difference_pct !== undefined && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            isDiscrepant ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Diff: {check.difference_pct}%
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isDiscrepant
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : isManual
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {check.status === 'PASS'
                        ? 'PASS · Consistent'
                        : check.status === 'DISCREPANCY'
                        ? 'DISCREPANCY'
                        : 'MANUAL REVIEW'}
                    </span>
                  </div>

                  {/* Document Comparison Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-2.5 rounded-lg border border-gray-100">
                    {/* Document A */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Document A:</span>
                        <span className="font-mono text-gray-500 text-[10px] truncate max-w-[180px]">
                          {check.document_a.file_name}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800">{check.document_a.document_type}</p>
                      <div className="bg-gray-50 px-2 py-1 rounded text-xs font-mono font-bold text-gray-900 border border-gray-100">
                        Extracted: {String(check.document_a.extracted_value)}
                      </div>
                    </div>

                    {/* Document B */}
                    <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-3 border-gray-100 pt-2 sm:pt-0">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Document B:</span>
                        <span className="font-mono text-gray-500 text-[10px] truncate max-w-[180px]">
                          {check.document_b.file_name}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800">{check.document_b.document_type}</p>
                      <div className="bg-gray-50 px-2 py-1 rounded text-xs font-mono font-bold text-gray-900 border border-gray-100">
                        Extracted: {String(check.document_b.extracted_value)}
                      </div>
                    </div>
                  </div>

                  {/* Explanation & Recommended Action */}
                  <div className="space-y-1 text-[11px]">
                    {check.difference_summary && (
                      <p className="text-gray-600 font-medium">
                        <span className="text-gray-400">Analysis:</span> {check.difference_summary}
                      </p>
                    )}
                    <p className={`font-semibold ${isDiscrepant ? 'text-red-700' : 'text-gray-700'}`}>
                      <span className="text-gray-400 font-normal">Action:</span> {check.recommended_action}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statutory Disclaimer */}
      <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-lg flex items-start gap-2 text-[11px] text-gray-500">
        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p>
          Deterministic Consistency Checker: Analyzes concordant textual fields across uploaded statutory exhibits
          against single-window business registry data and configured tolerance margins. Unreadable or scanned
          artifacts are marked for manual desk scrutiny without legal prejudice.
        </p>
      </div>
    </div>
  );
}
