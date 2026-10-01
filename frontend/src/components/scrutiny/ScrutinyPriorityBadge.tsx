'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ScrutinyPriorityResult, ScrutinyPriorityLevel } from '@/types/api';
import { ShieldCheck, AlertTriangle, AlertCircle, Info, ChevronDown, CheckCircle2 } from 'lucide-react';

interface ScrutinyPriorityBadgeProps {
  priority?: ScrutinyPriorityResult | null;
  size?: 'sm' | 'md' | 'lg';
  showWhyButton?: boolean;
}

export function ScrutinyPriorityBadge({
  priority,
  size = 'sm',
  showWhyButton = true,
}: ScrutinyPriorityBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!priority) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">
        Standard
      </span>
    );
  }

  const level = priority.level;

  const styleMap: Record<
    ScrutinyPriorityLevel,
    { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
  > = {
    HIGH: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
      label: 'High Scrutiny',
    },
    MEDIUM: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
      label: 'Medium Scrutiny',
    },
    LOW: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
      label: 'Low Scrutiny',
    },
  };

  const currentStyle = styleMap[level] || styleMap.LOW;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <div className="inline-flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded border ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border} ${
            size === 'sm' ? 'px-2 py-0.5 text-[11px]' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-1 text-xs'
          }`}
        >
          {currentStyle.icon}
          {currentStyle.label}
        </span>

        {showWhyButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
            title="View procedural factors contributing to this scrutiny priority"
            aria-expanded={isOpen}
          >
            Why?
            <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Popover explaining Why? */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 mt-1.5 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-gray-200 p-4 text-left animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {currentStyle.icon}
              <div>
                <h4 className="text-xs font-bold text-gray-900">{priority.label}</h4>
                <p className="text-[10px] text-gray-400">Complexity Score: {priority.score} pts</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-semibold px-1"
            >
              ✕
            </button>
          </div>

          {/* Narrative Why */}
          <p className="text-xs text-gray-700 font-medium mt-2 leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-100">
            {priority.why}
          </p>

          {/* Contributing Factors */}
          <div className="mt-3">
            <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-1.5">
              Contributing Procedural Factors ({priority.factors?.length ?? 0}):
            </p>
            <ul className="space-y-1.5 text-xs text-gray-600">
              {priority.factors?.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                  <span className="leading-snug">{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Metrics Strip */}
          {priority.metrics && (
            <div className="mt-3 pt-2 border-t border-gray-100 grid grid-cols-3 gap-1.5 text-[10px]">
              <div className="bg-gray-50 p-1.5 rounded border border-gray-100 text-center">
                <span className="text-gray-400 block">Missing Docs</span>
                <span className="font-bold text-gray-900">{priority.metrics.missing_documents}</span>
              </div>
              <div className="bg-gray-50 p-1.5 rounded border border-gray-100 text-center">
                <span className="text-gray-400 block">Open Queries</span>
                <span className="font-bold text-gray-900">{priority.metrics.open_queries}</span>
              </div>
              <div className="bg-gray-50 p-1.5 rounded border border-gray-100 text-center">
                <span className="text-gray-400 block">SLA State</span>
                <span className="font-bold text-gray-900">{priority.metrics.sla_status || 'ON_TRACK'}</span>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-start gap-1.5 text-[10px] text-gray-400 leading-tight">
            <Info className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
            <p>{priority.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
