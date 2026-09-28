'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ExternalLink,
  X,
  ShieldCheck,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import type { ParallelOrchestrationResult } from '@/types/api';

interface ParallelOrchestrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ParallelOrchestrationResult | null;
  projectName?: string;
}

export function ParallelOrchestrationModal({
  isOpen,
  onClose,
  result,
  projectName,
}: ParallelOrchestrationModalProps) {
  if (!isOpen || !result) return null;

  const { started, already_active, blocked_by_prerequisites, summary } = result;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orchestration-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                  Parallel Orchestration Engine
                </span>
                {projectName && (
                  <span className="text-xs text-emerald-200/80 hidden sm:inline">• {projectName}</span>
                )}
              </div>
              <h2 id="orchestration-modal-title" className="text-lg font-bold text-white mt-0.5">
                Statutory Clearances Orchestration Result
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-700">
          {/* Statutory Safety Assurance Notice */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <p className="font-semibold text-emerald-950">
                Safe Parallel Orchestration Guarantee
              </p>
              <p className="mt-0.5 text-emerald-800">
                Eligible clearance workspaces are initialized in <strong className="font-semibold text-emerald-950">IN_PREPARATION</strong> status with verified master profile data. They are <strong className="font-semibold text-emerald-950">never automatically submitted</strong> without your explicit review of department parameters, document attachments, and signed statutory declaration.
              </p>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Started Now</p>
              <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                {summary.started_count}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Eligible workflows</p>
            </div>
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-center">
              <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Already Active</p>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">
                {summary.already_active_count}
              </p>
              <p className="text-[10px] text-blue-700 mt-0.5">In preparation/review</p>
            </div>
            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-center">
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Prerequisite Blocked</p>
              <p className="text-2xl font-extrabold text-amber-900 mt-1">
                {summary.blocked_count}
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">Awaiting prior grants</p>
            </div>
          </div>

          {/* 1. Newly Started Workspaces */}
          {started.length > 0 ? (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Newly Initiated Clearances ({started.length})
              </h3>
              <div className="space-y-2">
                {started.map((item) => (
                  <div
                    key={item.application_id}
                    className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-950 text-sm">{item.approval_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                          IN PREPARATION
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">
                        Authority: <span className="font-semibold text-gray-700">{item.authority}</span> • Application No:{' '}
                        <span className="font-mono text-gray-800 font-medium">{item.application_number}</span>
                      </p>
                    </div>
                    <Link
                      href={`/app/applications/${item.application_id}`}
                      onClick={onClose}
                      className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 self-start sm:self-auto bg-emerald-600 hover:bg-emerald-700"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" /> Fill Form (CAF) <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 flex items-center justify-between">
              <span>No new clearances required initiation. All eligible clearances are already active or waiting on statutory prerequisites.</span>
            </div>
          )}

          {/* 2. Blocked by Prerequisites */}
          {blocked_by_prerequisites.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Protected Upstream Prerequisite Chains ({blocked_by_prerequisites.length})
              </h3>
              <p className="text-xs text-gray-500">
                These clearances cannot start yet according to statutory regulatory rules until prior approvals are officially granted:
              </p>
              <div className="space-y-2">
                {blocked_by_prerequisites.map((b) => (
                  <div
                    key={b.project_approval_id}
                    className="p-3 bg-amber-50/40 border border-amber-200/70 rounded-xl text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-gray-900">{b.approval_name}</p>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                        Awaiting Upstream Grant
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-start gap-1.5 text-amber-900">
                      <span className="font-semibold text-[11px]">Required prior approvals:</span>
                      <span className="text-[11px]">{b.missing_prerequisites.join(' • ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Already Active Workflows */}
          {already_active.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="w-4 h-4 text-blue-600" />
                Already Active Clearances ({already_active.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {already_active.map((a) => (
                  <div
                    key={a.application_id}
                    className="p-2.5 bg-blue-50/30 border border-blue-100 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-gray-900">{a.approval_name}</span>
                      <span className="ml-2 text-[11px] text-gray-500">Ref #{a.application_number}</span>
                    </div>
                    <Link
                      href={`/app/applications/${a.application_id}`}
                      onClick={onClose}
                      className="text-primary-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Open Workspace <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Workspaces are automatically mapped with verified investor profile attributes.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs py-2 px-4"
          >
            Continue to Clearances
          </button>
        </div>
      </div>
    </div>
  );
}
