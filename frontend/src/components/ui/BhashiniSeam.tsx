'use client';

import { useState } from 'react';
import { Globe, X, CheckCircle2, Info } from 'lucide-react';

export function BhashiniSeamButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        aria-label="BHASHINI language technology integration seam information"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-colors"
      >
        <Globe className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
        <span>EN · BHASHINI Seam</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bhashini-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Globe className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="bhashini-title" className="text-sm font-bold text-gray-900 leading-snug">
                    BHASHINI Language Seam
                  </h3>
                  <p className="text-[11px] text-gray-500">Government of India Language Mission</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                type="button"
                aria-label="Close dialog"
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5 text-xs text-blue-950">
              <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Future Integration Architecture Seam</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-900/90">
                Per project specification, BHASHINI translation services remain an architectural seam in the current build.
                No simulated or fake machine translations are performed.
              </p>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <p className="font-semibold text-gray-800 text-[11px] uppercase tracking-wider">
                Planned Language Pipelines
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 border border-gray-200 rounded-lg flex items-center justify-between bg-gray-50/50">
                  <span className="font-medium text-gray-800">English (Current)</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="p-2 border border-dashed border-gray-300 rounded-lg flex items-center justify-between text-gray-500">
                  <span>Marathi (मराठी)</span>
                  <span className="text-[10px] text-gray-400 font-semibold">Seam Ready</span>
                </div>
                <div className="p-2 border border-dashed border-gray-300 rounded-lg flex items-center justify-between text-gray-500">
                  <span>Hindi (हिंदी)</span>
                  <span className="text-[10px] text-gray-400 font-semibold">Seam Ready</span>
                </div>
                <div className="p-2 border border-dashed border-gray-300 rounded-lg flex items-center justify-between text-gray-500">
                  <span>Gujarati (ગુજરાતી)</span>
                  <span className="text-[10px] text-gray-400 font-semibold">Seam Ready</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
