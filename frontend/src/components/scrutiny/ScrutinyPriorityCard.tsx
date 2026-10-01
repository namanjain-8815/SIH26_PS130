'use client';

import React from 'react';
import type { ScrutinyPriorityResult, ScrutinyPriorityLevel } from '@/types/api';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  FileText,
  Clock,
  HelpCircle,
  Building2,
  Eye,
} from 'lucide-react';

interface ScrutinyPriorityCardProps {
  priority?: ScrutinyPriorityResult | null;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export function ScrutinyPriorityCard({
  priority,
  onNavigateTab,
  className = '',
}: ScrutinyPriorityCardProps) {
  if (!priority) return null;

  const level = priority.level;

  const styleMap: Record<
    ScrutinyPriorityLevel,
    {
      cardBorder: string;
      headerBg: string;
      headerText: string;
      badgeBg: string;
      badgeText: string;
      badgeBorder: string;
      icon: React.ReactNode;
      label: string;
      accentBg: string;
    }
  > = {
    HIGH: {
      cardBorder: 'border-rose-200',
      headerBg: 'bg-rose-50/70',
      headerText: 'text-rose-950',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-300',
      icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
      label: 'High Review Complexity',
      accentBg: 'bg-rose-50/40',
    },
    MEDIUM: {
      cardBorder: 'border-amber-200',
      headerBg: 'bg-amber-50/70',
      headerText: 'text-amber-950',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      label: 'Medium Review Complexity',
      accentBg: 'bg-amber-50/40',
    },
    LOW: {
      cardBorder: 'border-emerald-200',
      headerBg: 'bg-emerald-50/70',
      headerText: 'text-emerald-950',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-300',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      label: 'Standard Procedural Scrutiny',
      accentBg: 'bg-emerald-50/40',
    },
  };

  const style = styleMap[level] || styleMap.LOW;

  return (
    <div className={`card overflow-hidden border ${style.cardBorder} shadow-sm ${className}`}>
      {/* Header Banner */}
      <div className={`px-4 py-3 border-b ${style.cardBorder} ${style.headerBg} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          {style.icon}
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-bold ${style.headerText}`}>Scrutiny Priority</h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}
              >
                {style.label}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Procedural appraisal complexity evaluated from statutory workflow signals
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-gray-400 block font-medium">Complexity Weight</span>
          <span className="text-xs font-bold text-gray-800">{priority.score} pts</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4">
        {/* Narrative Reason */}
        <div className={`p-3 rounded-xl border border-gray-100 ${style.accentBg}`}>
          <p className="text-xs font-semibold text-gray-900 leading-relaxed">
            <span className="font-bold text-gray-700 mr-1.5">Why this priority:</span>
            {priority.why}
          </p>
        </div>

        {/* Contributing Factors */}
        <div>
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Contributing Procedural Factors ({priority.factors?.length ?? 0}):
          </h4>
          <div className="space-y-2">
            {priority.factors?.map((factor, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs text-gray-700 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span className="leading-relaxed flex-1">{factor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Metrics Grid */}
        {priority.metrics && (
          <div>
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-gray-600" />
              Underlying Workflow Metrics:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div
                className={`p-2.5 rounded-lg border text-center ${
                  priority.metrics.missing_documents > 0
                    ? 'bg-rose-50/50 border-rose-100 text-rose-900'
                    : 'bg-gray-50 border-gray-100 text-gray-700'
                }`}
              >
                <span className="text-[10px] text-gray-400 block mb-0.5">Missing Required Documents</span>
                <span className="text-sm font-bold">{priority.metrics.missing_documents}</span>
                {priority.metrics.missing_documents > 0 && onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('documents')}
                    className="block mx-auto mt-1 text-[10px] text-blue-600 hover:underline font-semibold"
                  >
                    View Documents →
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-700 text-center">
                <span className="text-[10px] text-gray-400 block mb-0.5">Prerequisite Dependencies</span>
                <span className="text-sm font-bold">
                  {priority.metrics.pending_prerequisites > 0
                    ? `${priority.metrics.pending_prerequisites} Pending`
                    : `${priority.metrics.prerequisite_count} Total`}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-700 text-center">
                <span className="text-[10px] text-gray-400 block mb-0.5">Concerned Authorities</span>
                <span className="text-sm font-bold">{priority.metrics.concerned_authorities} Agencies</span>
              </div>

              <div
                className={`p-2.5 rounded-lg border text-center ${
                  priority.metrics.open_queries > 0
                    ? 'bg-amber-50/50 border-amber-100 text-amber-900'
                    : 'bg-gray-50 border-gray-100 text-gray-700'
                }`}
              >
                <span className="text-[10px] text-gray-400 block mb-0.5">Open Clarifications</span>
                <span className="text-sm font-bold">{priority.metrics.open_queries}</span>
                {priority.metrics.open_queries > 0 && onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('queries')}
                    className="block mx-auto mt-1 text-[10px] text-blue-600 hover:underline font-semibold"
                  >
                    View Queries →
                  </button>
                )}
              </div>

              <div
                className={`p-2.5 rounded-lg border text-center ${
                  priority.metrics.sla_status === 'BREACHED'
                    ? 'bg-rose-50/50 border-rose-100 text-rose-900'
                    : priority.metrics.sla_status === 'AT_RISK'
                    ? 'bg-amber-50/50 border-amber-100 text-amber-900'
                    : 'bg-gray-50 border-gray-100 text-gray-700'
                }`}
              >
                <span className="text-[10px] text-gray-400 block mb-0.5">Time Limit (SLA)</span>
                <span className="text-sm font-bold">{priority.metrics.sla_status || 'ON_TRACK'}</span>
              </div>

              <div className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-700 text-center">
                <span className="text-[10px] text-gray-400 block mb-0.5">Physical Inspection</span>
                <span className="text-sm font-bold">
                  {priority.metrics.requires_inspection ? 'Mandatory' : 'Exempt'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Legal / Non-Statutory Disclaimer */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-2 text-[11px] text-gray-500">
          <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-gray-700">Statutory Notice:</span> {priority.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
