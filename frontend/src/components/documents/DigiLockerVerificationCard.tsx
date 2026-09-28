'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { digilockerApi } from '@/lib/api';
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Layers,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Info,
  Lock,
  UserCheck,
  Check,
} from 'lucide-react';
import Link from 'next/link';

interface DigiLockerVerificationCardProps {
  projectId?: string;
  onVerifiedSuccess?: () => void;
  className?: string;
}

const DEFAULT_PROJECT_ID = 'proj-abc-foods-001';

export function DigiLockerVerificationCard({
  projectId = DEFAULT_PROJECT_ID,
  onVerifiedSuccess,
  className = '',
}: DigiLockerVerificationCardProps) {
  const qc = useQueryClient();

  // Local simulated loading state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'company' | 'user' | 'reuse'>('company');

  // Fetch status
  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ['digilocker-status', projectId],
    queryFn: () => digilockerApi.getStatus(projectId),
    staleTime: 30_000,
  });

  // Simulation connect mutation
  const simulateMutation = useMutation({
    mutationFn: () => digilockerApi.simulate(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['digilocker-status', projectId] });
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      qc.invalidateQueries({ queryKey: ['project-document-checklist', projectId] });
      qc.invalidateQueries({ queryKey: ['project-profile', projectId] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });

      if (onVerifiedSuccess) {
        onVerifiedSuccess();
      }
    },
  });

  // Simulation reset mutation
  const resetMutation = useMutation({
    mutationFn: () => digilockerApi.reset(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['digilocker-status', projectId] });
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      qc.invalidateQueries({ queryKey: ['project-document-checklist', projectId] });
    },
  });

  const handleConnectDigiLocker = () => {
    setIsSimulating(true);
    setSimulationStep(1);

    // Step 1: 0 - 1000ms: Consent validation
    const timer1 = setTimeout(() => {
      setSimulationStep(2);
    }, 1000);

    // Step 2: 1000 - 2000ms: Querying MCA & Income Tax
    const timer2 = setTimeout(() => {
      setSimulationStep(3);
    }, 2000);

    // Step 3: 2000 - 3000ms: Ingesting into vault & finalize
    const timer3 = setTimeout(async () => {
      try {
        await simulateMutation.mutateAsync();
      } finally {
        setIsSimulating(false);
        setSimulationStep(1);
      }
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  const handleResetSimulation = async () => {
    await resetMutation.mutateAsync();
  };

  const isConnected = statusData?.is_connected ?? false;
  const companyDocs = statusData?.available_documents?.company_documents ?? [];
  const userDocs = statusData?.available_documents?.user_documents ?? [];
  const reusableFields = statusData?.reusable_form_fields ?? [];

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
        isConnected
          ? 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border-emerald-200'
          : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border-blue-200/80'
      } ${className}`}
    >
      {/* Top Header Strip */}
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0 ${
              isConnected ? 'bg-emerald-600 text-white' : 'bg-primary-700 text-white'
            }`}
          >
            {isConnected ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5 text-amber-300" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">DigiLocker Verification</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                PROTOTYPE SIMULATION
              </span>
              {isConnected && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected & Verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Demonstrate how consent-based DigiLocker credentials could be verified and reused across applications.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              type="button"
              onClick={handleResetSimulation}
              disabled={resetMutation.isPending}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-xs"
              title="Reset demonstration state back to unconnected"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>Reset Simulation</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* State 1: 3-Second Loading Simulation */}
        {isSimulating ? (
          <div className="py-8 px-6 bg-white/90 rounded-2xl border border-blue-200 flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-200 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-primary-700" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-gray-900">Connecting to DigiLocker…</p>
              <p className="text-xs text-gray-500 max-w-md">
                Verifying user consent and retrieving authorized enterprise documents via simulated gateway…
              </p>
            </div>

            {/* 3-Step Milestone Indicator */}
            <div className="w-full max-w-md space-y-2 pt-1 text-left">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
                <span>Simulation Progress</span>
                <span className="text-primary-700 font-bold">{simulationStep * 33}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${simulationStep * 33.33}%` }}
                />
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping" />
                <span className="font-medium">
                  {simulationStep === 1 && 'Step 1 of 3: Requesting citizen authentication & e-consent…'}
                  {simulationStep === 2 && 'Step 2 of 3: Querying MCA21 & Income Tax Department digital registers…'}
                  {simulationStep === 3 && 'Step 3 of 3: Ingesting verified documents into Document Vault…'}
                </span>
              </div>
            </div>
          </div>
        ) : isConnected ? (
          /* State 2: Connected / Verified State */
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3 p-3.5 bg-emerald-100/70 border border-emerald-300 rounded-xl text-emerald-950">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Verification Simulation Complete</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Demonstration credentials and company documents have been verified and are ready for reuse across all
                  single-window clearance applications.
                </p>
              </div>
            </div>

            {/* View Mode Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('company')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'company'
                    ? 'bg-primary-700 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Company Documents ({companyDocs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'user'
                    ? 'bg-primary-700 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Signatory & KYC ({userDocs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reuse')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'reuse'
                    ? 'bg-primary-700 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Form Reuse Showcase ({reusableFields.length})</span>
              </button>
            </div>

            {/* Tab 1: Company Documents in DigiLocker */}
            {activeTab === 'company' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {companyDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-white rounded-xl border border-emerald-200/90 shadow-xs space-y-2 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">{doc.name}</h5>
                        <p className="text-[11px] text-gray-500 mt-0.5">{doc.issuer}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                        <Check className="w-3 h-3" />
                        DigiLocker Verified
                      </span>
                    </div>

                    <div className="p-2 bg-gray-50 rounded-lg text-[11px] font-mono text-gray-700 flex items-center justify-between">
                      <span className="text-gray-400 font-sans">Identifier:</span>
                      <span className="font-bold text-gray-900">{doc.certificate_number}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        In Document Vault
                      </span>
                      <span className="text-gray-400">Issued: {doc.issued_on}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: User & Signatory Documents in DigiLocker */}
            {activeTab === 'user' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-white rounded-xl border border-emerald-200/90 shadow-xs space-y-2 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">{doc.name}</h5>
                        <p className="text-[11px] text-gray-500 mt-0.5">{doc.issuer}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                        <Check className="w-3 h-3" />
                        e-KYC Verified
                      </span>
                    </div>

                    <div className="p-2 bg-gray-50 rounded-lg text-[11px] font-mono text-gray-700 flex items-center justify-between">
                      <span className="text-gray-400 font-sans">Credential ID:</span>
                      <span className="font-bold text-gray-900">{doc.certificate_number}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                      <span className="text-primary-700 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Auto-attached to Applications
                      </span>
                      <span className="text-gray-400">Consent Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Reusable Details in Forms */}
            {activeTab === 'reuse' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {reusableFields.map((field) => (
                    <div key={field.field_key} className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        {field.label}
                      </span>
                      <p className="font-bold text-gray-900 truncate">{field.value}</p>
                      <p className="text-[10px] text-emerald-700 font-medium">Prefilled in: {field.target_form}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
                  <p>
                    Because credentials were authenticated through DigiLocker, department scrutiny officers will see verified
                    provenance tags, bypassing manual physical document verification delays.
                  </p>
                </div>
              </div>
            )}

            {/* How It Connects to Product: Verified Pipeline Ribbon */}
            <div className="p-3 bg-white/90 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Verified Pipeline:</span>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium flex-wrap">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-800 font-semibold">DigiLocker</span>
                  <span>→</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-semibold">
                    Verified Documents
                  </span>
                  <span>→</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 font-semibold">
                    Document Vault
                  </span>
                  <span>→</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200 font-semibold">
                    CAF Prefill
                  </span>
                  <span>→</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200 font-semibold">
                    Multi-Clearance Reuse
                  </span>
                </div>
              </div>

              <Link
                href="/app/documents"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-900 hover:underline"
              >
                <span>Inspect in Document Vault</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          /* State 3: Initial Unconnected State */
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-blue-950">DigiLocker Connection Panel</p>
                <p className="text-blue-800 mt-1 leading-relaxed">
                  Connect your industrial undertaking with DigiLocker to demonstrate instant, consent-based retrieval of
                  government-issued documents (PAN, Incorporation Certificate, Land Lease Deed, and Signatory e-KYC).
                  All retrieved documents will automatically be stored in your Document Vault and prefilled across Common Application Forms.
                </p>
              </div>
            </div>

            {/* Quick Preview of What Will Be Retrieved */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Company Document</span>
                <p className="font-bold text-gray-800 mt-0.5 truncate">Company PAN Card</p>
                <span className="text-[10px] text-gray-500">Income Tax Dept</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Corporate Record</span>
                <p className="font-bold text-gray-800 mt-0.5 truncate">Incorporation & MoA</p>
                <span className="text-[10px] text-gray-500">MCA21 Portal</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Industrial Land</span>
                <p className="font-bold text-gray-800 mt-0.5 truncate">MIDC Lease Deed</p>
                <span className="text-[10px] text-gray-500">MIDC Land Records</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Signatory Proof</span>
                <p className="font-bold text-gray-800 mt-0.5 truncate">Aadhaar e-KYC</p>
                <span className="text-[10px] text-gray-500">UIDAI Demo Token</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Simulated retrieval · Takes 3 seconds to complete</span>
              </div>

              <button
                type="button"
                onClick={handleConnectDigiLocker}
                disabled={isStatusLoading || isSimulating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>Connect DigiLocker</span>
              </button>
            </div>
          </div>
        )}

        {/* Prototype Disclosure Notice (with requested API Setu line) */}
        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span>Honest Prototype Disclosure</span>
          </div>
          <p className="text-amber-800">
            Prototype Notice: This is a simulated integration using demonstration data. No live DigiLocker or API Setu
            connection is active. Production integration would require authorized partner onboarding, explicit user
            consent, API credentials, security validation and approved DigiLocker integration.
          </p>
          <p className="text-amber-950 font-semibold border-t border-amber-200/80 pt-1">
            DigiLocker connection using API Setu is future integration.
          </p>
        </div>
      </div>
    </div>
  );
}
