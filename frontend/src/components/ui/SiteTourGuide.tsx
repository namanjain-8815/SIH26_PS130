'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Building2,
  Files,
  ShieldCheck,
  Zap,
  Clock,
  CalendarCheck2,
  UserCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface TourStep {
  title: string;
  badge: string;
  description: string;
  icon: typeof Building2;
  color: string;
  features: string[];
  actionLabel?: string;
  actionHref?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Consolidated Single Window Clearance (Udyog Setu)',
    badge: 'Core Architecture',
    description:
      'Replaces scattered departmental portals with a unified, state-wide orchestrator. Single submission gateway across MIDC, MPCB, DISH, Fire Services, and Labour Department.',
    icon: Building2,
    color: 'bg-blue-600 text-white',
    features: [
      'Eliminates duplicate applications and manual office visits',
      'Unified Common Application Form (CAF) with master enterprise sync',
      'Full compliance with Maharashtra Industry & Investment Facilitation Act 2023',
    ],
    actionLabel: 'View Permissions Roadmap',
    actionHref: '/app/approvals',
  },
  {
    title: 'Document Vault & 1-Click Multi-Clearance Reuse',
    badge: 'Paperless Automation',
    description:
      'Upload enterprise exhibits once (Incorporation Certificate, PAN, MIDC Allotment Letter, Scaled Factory Drawings) and attach them across dozens of departmental clearances with a single click.',
    icon: Files,
    color: 'bg-emerald-600 text-white',
    features: [
      'Automated PDF OCR and structured attribute extraction',
      'Shared enterprise storage syncing across authorized accounts',
      'Strict statutory retention lock preventing accidental deletion of submitted exhibits',
    ],
    actionLabel: 'Explore Document Vault',
    actionHref: '/app/documents',
  },
  {
    title: 'Deterministic Cross-Document Consistency Audit',
    badge: 'Proactive Error Prevention',
    description:
      'Catches contradictory data before officers review it! Audits plot area, power load, and water requirements across lease agreements, factory layouts, and applications.',
    icon: ShieldCheck,
    color: 'bg-indigo-600 text-white',
    features: [
      'Zero hallucinations: 100% deterministic local rule evaluation',
      'Flags blocking discrepancies before submission',
      'Pre-submission readiness checklist prevents departmental rejection',
    ],
    actionLabel: 'View Document Detail Centre',
    actionHref: '/app/documents',
  },
  {
    title: 'Parallel Clearance Orchestration & Dependency Engine',
    badge: 'Turnaround Optimization',
    description:
      'Calculates statutory prerequisite graphs in real-time. Automatically unlocks independent clearances so they proceed concurrently, reducing approval turnaround by up to 60%.',
    icon: Zap,
    color: 'bg-amber-600 text-white',
    features: [
      'Interactive visual dependency graph for investors and officers',
      '1-Click "Start Parallel Clearances" button',
      'Prevents illegal downstream processing without upstream clearance',
    ],
    actionLabel: 'View Investment Proposal',
    actionHref: '/app/projects/proj-abc-foods-001',
  },
  {
    title: 'Maharashtra RTS Statutory SLA Countdown Clock',
    badge: 'Accountability & Speed',
    description:
      'Strict adherence to the Maharashtra Right to Public Services Act (RTS). Deemed approvals and escalation countdown clocks hold reviewing authorities legally accountable.',
    icon: Clock,
    color: 'bg-red-600 text-white',
    features: [
      'Real-time SLA countdown with Amber/Red escalation warnings',
      'Automatic clock pause when a query is raised, resuming on response',
      'Instant escalation to Empowered Committee under the District Collector',
    ],
    actionLabel: 'Check Time Limits Monitor',
    actionHref: '/government/sla-monitor',
  },
  {
    title: 'Designated Joint Site Inspection Scheduler',
    badge: 'Coordinated Verification',
    description:
      'Designated Inspection Officers from MIDC, MPCB, and Labour synchronize on a single joint inspection date, eliminating disruptive repetitive factory visits.',
    icon: CalendarCheck2,
    color: 'bg-purple-600 text-white',
    features: [
      'Single joint site inspection date coordinated across authorities',
      'Dedicated Inspector Desk for logging geo-tagged exhibits and findings',
      'Zero generic scrutiny controls: purely inspection & verification focused',
    ],
    actionLabel: 'Inspection Planner',
    actionHref: '/government/inspections',
  },
  {
    title: '1-Click Quick Demo Role Switcher',
    badge: 'Hackathon Judge Demo',
    description:
      'Effortlessly test every perspective of the platform without typing passwords or logging out. Full session and data isolation between Applicant, Officers, Inspector, and Admin.',
    icon: UserCheck,
    color: 'bg-sky-600 text-white',
    features: [
      'Instant 1-click switching in the header dock',
      'Strict role isolation preventing role or department leaks',
      'Designed for self-guided hackathon judge exploration',
    ],
  },
];

export function SiteTourGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const handleOpen = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener('open-site-tour', handleOpen);
    return () => window.removeEventListener('open-site-tour', handleOpen);
  }, []);

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsOpen(false);
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <>
      {/* Floating Trigger Chip */}
      <button
        type="button"
        onClick={() => {
          setCurrentStep(0);
          setIsOpen(true);
        }}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-700/80 backdrop-blur-sm group active:scale-95"
        title="Start Interactive Platform Tour for Judges"
      >
        <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
          <Sparkles className="w-3 h-3" />
        </div>
        <span className="text-xs font-semibold tracking-wide">Interactive Tour</span>
        <span className="text-[10px] bg-primary-600 px-1.5 py-0.5 rounded-full font-bold">
          SIH Demo
        </span>
      </button>

      {/* Tour Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-gray-200 overflow-hidden flex flex-col animate-scale-in">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${step.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
                      {step.badge}
                    </span>
                    <span className="text-xs text-slate-400">
                      Step {currentStep + 1} of {TOUR_STEPS.length}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1 leading-snug">{step.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>

              {/* Highlight bullet points */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Key Capabilities:</p>
                <ul className="space-y-1.5">
                  {step.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Try this feature button */}
              {step.actionHref && (
                <div className="pt-1">
                  <Link
                    href={step.actionHref}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100/70 border border-primary-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>{step.actionLabel || 'Inspect this feature'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentStep ? 'w-6 bg-primary-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                    title={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1 shadow-sm"
                >
                  <span>{currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next'}</span>
                  {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
