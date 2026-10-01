'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
  Briefcase,
  Landmark,
  ListTodo,
  CalendarDays,
  Gift,
  LifeBuoy,
  Settings,
  GitMerge,
  Users,
  ScrollText,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

interface TourStep {
  title: string;
  badge: string;
  description: string;
  icon: any;
  color: string;
  features: string[];
  actionLabel?: string;
  actionHref?: string;
}

interface RoleTourConfig {
  roleTitle: string;
  roleBadge: string;
  steps: TourStep[];
}

const ROLE_TOURS: Record<string, RoleTourConfig> = {
  ENTREPRENEUR: {
    roleTitle: 'Principal Investor / Business Owner',
    roleBadge: 'Applicant Tour',
    steps: [
      {
        title: 'Single Window Investor Dashboard',
        badge: 'Executive Command',
        description:
          'Track your end-to-end statutory clearance roadmap, overall proposal readiness score, deemed approvals, and upcoming compliance renewals in real time.',
        icon: Building2,
        color: 'bg-emerald-600 text-white',
        features: [
          'Live statutory readiness score and blocker analysis',
          'Instant overview of active, approved, and pending clearances',
          'Countdown timers for RTS Act specified time limits',
        ],
        actionLabel: 'Open Dashboard',
        actionHref: '/app/dashboard',
      },
      {
        title: 'Investment Proposals & Master Profile (CAF)',
        badge: 'Single Submission',
        description:
          'Your Common Application Form (CAF) synchronizes master business attributes across MIDC, MPCB, DISH, and Fire Services without repeated data entry.',
        icon: Briefcase,
        color: 'bg-teal-600 text-white',
        features: [
          'Unified enterprise data model synced across all departments',
          'Automatic applicability engine derives required clearances',
          'Interactive statutory dependency and parallel processing graph',
        ],
        actionLabel: 'View Proposal Control Centre',
        actionHref: '/app/projects/proj-abc-foods-001',
      },
      {
        title: 'Statutory Permissions & Parallel Clearances',
        badge: 'Fast-Track Engine',
        description:
          'Calculates statutory prerequisites in real time. Concurrently unlocks independent clearances to reduce approval turnaround by up to 60%.',
        icon: Zap,
        color: 'bg-blue-600 text-white',
        features: [
          '1-Click "Start Parallel Clearances" orchestration',
          'Live tracking across Land, Power, Water, CTE, and Building approvals',
          'Departmental query response interface directly attached to clearance files',
        ],
        actionLabel: 'View Clearances Roadmap',
        actionHref: '/app/approvals',
      },
      {
        title: 'Document Vault & 1-Click Multi-Clearance Reuse',
        badge: 'Paperless Automation',
        description:
          'Upload enterprise exhibits once (Incorporation Certificate, PAN, MIDC Allotment Letter, Scaled Factory Drawings) and attach them across dozens of departmental clearances with a single click.',
        icon: Files,
        color: 'bg-indigo-600 text-white',
        features: [
          'Automated PDF OCR and structured attribute extraction',
          'Deterministic cross-document consistency audit (detects plot area and power mismatches)',
          'Statutory retention lock preventing accidental modification of submitted files',
        ],
        actionLabel: 'Explore Document Vault',
        actionHref: '/app/documents',
      },
      {
        title: 'Synchronized Joint Site Inspections',
        badge: 'Single Site Visit',
        description:
          'Inspectors from MIDC, MPCB, and Labour synchronize on a single joint visit date, completely eliminating disruptive, repetitive site inspections.',
        icon: CalendarCheck2,
        color: 'bg-purple-600 text-white',
        features: [
          'Single coordinated site visit date agreed across reviewing authorities',
          'Transparent site readiness checklist before inspector arrival',
          'Direct access to geo-tagged verification findings and remarks',
        ],
        actionLabel: 'Inspect Site Visits',
        actionHref: '/app/inspections',
      },
      {
        title: 'Incentive Schemes & Investor Assistance',
        badge: 'Promotion & Support',
        description:
          'Automated matching with the Maharashtra Package Scheme of Incentives (PSI 2019) plus direct escalation to MAITRI Nodal Officers.',
        icon: Gift,
        color: 'bg-amber-600 text-white',
        features: [
          'Capital subsidies, electricity duty exemptions, and stamp duty waivers',
          'Direct liaison with MAITRI Single Window Facilitation Officers',
          'Deterministic guidance chatbot available 24/7 for statutory questions',
        ],
        actionLabel: 'Check Matched Incentives',
        actionHref: '/app/incentives',
      },
    ],
  },

  MANAGER: {
    roleTitle: 'Authorized Corporate Representative',
    roleBadge: 'Representative Tour',
    steps: [
      {
        title: 'Authorized Agent Command Dashboard',
        badge: 'Corporate Representation',
        description:
          'Operate as the designated corporate agent under Board Resolution for your enterprise with full filing and coordination authority.',
        icon: UserCheck,
        color: 'bg-amber-600 text-white',
        features: [
          'Verified Board Resolution authorization badge in header',
          'Unified tracking across all departmental applications and queries',
          'Real-time RTS statutory countdown clocks holding officers accountable',
        ],
        actionLabel: 'Open Agent Dashboard',
        actionHref: '/app/dashboard',
      },
      {
        title: 'Permissions Execution & Application Submissions',
        badge: 'Filing Gateway',
        description:
          'Review pre-validated applications, answer departmental clarifications, and file clearances on behalf of the company.',
        icon: Zap,
        color: 'bg-blue-600 text-white',
        features: [
          'Start independent parallel tracks with 1-click orchestration',
          'Review pre-submission checklists before formal departmental intake',
          'Respond to officer clarification queries to resume paused SLA timers',
        ],
        actionLabel: 'Review Permissions',
        actionHref: '/app/approvals',
      },
      {
        title: 'Corporate Document Vault & Tamper-Proof Exhibits',
        badge: 'Document Security',
        description:
          'Centralized repository for corporate identity, land titles, factory layout blueprints, and statutory licenses.',
        icon: Files,
        color: 'bg-indigo-600 text-white',
        features: [
          'Re-use company exhibits across applications without repeated uploads',
          'Automated pre-validation checks file size, format, and certificate validity',
          'Cross-document consistency engine catches contradictory declarations',
        ],
        actionLabel: 'Open Document Vault',
        actionHref: '/app/documents',
      },
      {
        title: 'Statutory Compliance Calendar & Periodic Renewals',
        badge: 'Regulatory Safety',
        description:
          'Never miss a statutory renewal! Tracks periodic obligations derived automatically from your issued clearance certificates.',
        icon: CalendarDays,
        color: 'bg-teal-600 text-white',
        features: [
          'Scheduled renewals for Consent to Operate, Factory License, and Fire NOC',
          '30-day and 7-day proactive reminders before expiration',
          'Log renewal compliance tasks with permanent audit records',
        ],
        actionLabel: 'View Compliance Calendar',
        actionHref: '/app/compliance',
      },
      {
        title: 'MAITRI Investor Assistance Desk',
        badge: 'Facilitation Desk',
        description:
          'Submit technical and procedural queries directly to designated MAITRI Nodal Officers for swift inter-departmental resolution.',
        icon: LifeBuoy,
        color: 'bg-emerald-600 text-white',
        features: [
          'Raise assistance tickets for approval guidance, fees, and documentation',
          'Track nodal officer review notes and departmental liaison progress',
          'Live statutory guidance assistant available on every page',
        ],
        actionLabel: 'Open Assistance Desk',
        actionHref: '/app/assistance',
      },
    ],
  },

  OFFICER: {
    roleTitle: 'Competent Authority Reviewing Officer',
    roleBadge: 'Authority Scrutiny Tour',
    steps: [
      {
        title: 'Departmental Scrutiny Queue',
        badge: 'Core Officer Desk',
        description:
          'Your dedicated departmental workbench. Scoped to your competent authority (MIDC, MPCB, DISH, Fire Services) to review applications and exhibits.',
        icon: ListTodo,
        color: 'bg-blue-600 text-white',
        features: [
          'Strict department scoping prevents inter-departmental data leaks',
          'Scrutiny priority badges highlighting high-investment and urgent cases',
          'Pre-validated exhibits with cross-document consistency warnings',
        ],
        actionLabel: 'Open Scrutiny Queue',
        actionHref: '/government/work-queue',
      },
      {
        title: 'Official Statutory Actions & Queries',
        badge: 'Decision Engine',
        description:
          'Take formal administrative decisions with complete audit trail accountability.',
        icon: ShieldCheck,
        color: 'bg-indigo-600 text-white',
        features: [
          'Raise formal clarification queries (automatically pauses the RTS SLA clock)',
          'Schedule coordinated joint inspections with sister authorities',
          'Grant official statutory approval with reference numbers or record rejections',
        ],
        actionLabel: 'Review Pending Applications',
        actionHref: '/government/work-queue',
      },
      {
        title: 'Joint Site Inspection Coordination',
        badge: 'Inter-Agency Inspection',
        description:
          'Collaborate with inspection officers across MIDC, MPCB, and Labour to synchronize on a single joint visit date.',
        icon: CalendarCheck2,
        color: 'bg-purple-600 text-white',
        features: [
          'Synchronized single-date scheduling to avoid multiple factory visits',
          'Review geo-tagged site photographs and physical verification findings',
          'View applicant readiness confirmations prior to site inspection',
        ],
        actionLabel: 'Inspection Planner',
        actionHref: '/government/inspections',
      },
      {
        title: 'Maharashtra RTS Statutory SLA Countdown Clock',
        badge: 'Time Limits & Accountability',
        description:
          'Live countdown clocks enforced under the Maharashtra Right to Public Services Act (RTS). Protects against deemed approval triggers.',
        icon: Clock,
        color: 'bg-red-600 text-white',
        features: [
          'Amber / Red alerts for applications approaching statutory time limits',
          'Automated pause tracking when queries are pending applicant reply',
          'Escalation alerts before deemed approvals trigger at the Empowered Committee',
        ],
        actionLabel: 'Check Time Limits Monitor',
        actionHref: '/government/sla-monitor',
      },
      {
        title: 'Departmental Scrutiny Analytics',
        badge: 'Performance Insights',
        description:
          'Monitor processing efficiency, disposal velocity, and query resolution metrics across your authority.',
        icon: BarChart3,
        color: 'bg-cyan-600 text-white',
        features: [
          'Track average clearance turnaround against statutory SLA targets',
          'Application volume, approval rates, and rejection trends',
          'Identify procedural bottlenecks and common clarification patterns',
        ],
        actionLabel: 'View Analytics',
        actionHref: '/government/analytics',
      },
    ],
  },

  NODAL: {
    roleTitle: 'MAITRI Nodal Facilitation Officer',
    roleBadge: 'Single Window Coordination Tour',
    steps: [
      {
        title: 'Cross-Departmental Oversight Queue',
        badge: 'State Single Window Desk',
        description:
          'State-wide single window coordination queue spanning all competent authorities (MIDC, MPCB, DISH, Labour, Fire Services).',
        icon: Building2,
        color: 'bg-purple-600 text-white',
        features: [
          'Cross-departmental application visibility across Maharashtra',
          'Track inter-agency dependencies and unresolved bottlenecks',
          'Add internal coordination notes to expedite multi-department clearances',
        ],
        actionLabel: 'Open Coordination Queue',
        actionHref: '/government/work-queue',
      },
      {
        title: 'Investor Facilitation Desk',
        badge: 'Direct Resolution',
        description:
          'Claim and resolve investor assistance tickets. Coordinate between entrepreneurs and reviewing authorities to eliminate procedural delays.',
        icon: LifeBuoy,
        color: 'bg-emerald-600 text-white',
        features: [
          '1-Click ticket claiming and official desk assignment',
          'Publish official guidance notes visible to applicants',
          'Log confidential inter-departmental liaison notes',
        ],
        actionLabel: 'Open Facilitation Requests',
        actionHref: '/government/facilitation',
      },
      {
        title: 'State-Wide RTS SLA & Deemed Approvals Monitor',
        badge: 'Statutory Accountability',
        description:
          'Monitor Maharashtra Right to Public Services Act compliance across all departments. Intervene before deemed approval breaches occur.',
        icon: Clock,
        color: 'bg-red-600 text-white',
        features: [
          'State-wide countdown clock for all pending statutory applications',
          'Automatic escalation pipeline to the District Collector and Empowered Committee',
          'Dispute resolution and delay tracking',
        ],
        actionLabel: 'View SLA Monitor',
        actionHref: '/government/sla-monitor',
      },
      {
        title: 'Inter-Departmental Bottlenecks & Delays Analysis',
        badge: 'Systemic Diagnostics',
        description:
          'Pinpoint regulatory bottlenecks, sluggish approval stages, and inter-departmental dependency delays.',
        icon: AlertTriangle,
        color: 'bg-amber-600 text-white',
        features: [
          'Detect approvals held up by upstream prerequisite delays',
          'Compare median processing turnaround across authorities',
          'Identify departments with high query rates or overdue SLA instances',
        ],
        actionLabel: 'View Bottlenecks Analysis',
        actionHref: '/government/bottlenecks',
      },
      {
        title: 'State Investment Scrutiny Analytics',
        badge: 'Macro Intelligence',
        description:
          'Comprehensive state-wide metrics on industrial proposals, capital investments facilitated, and operational clearance velocity.',
        icon: BarChart3,
        color: 'bg-blue-600 text-white',
        features: [
          'Total industrial investment capital flowing through the Single Window',
          'District-level and sector-level performance breakdown',
          'Historical RTS compliance trends for state government reporting',
        ],
        actionLabel: 'Explore Analytics',
        actionHref: '/government/analytics',
      },
    ],
  },

  INSPECTOR: {
    roleTitle: 'Designated Joint Site Inspector',
    roleBadge: 'Inspector Desk Tour',
    steps: [
      {
        title: 'Joint Inspection Planner',
        badge: 'Field Command Desk',
        description:
          'Your dedicated inspection operations workbench. Coordinate single joint visits with MIDC, MPCB, and Labour authorities.',
        icon: CalendarDays,
        color: 'bg-purple-600 text-white',
        features: [
          'Single joint inspection itinerary coordinated across state departments',
          'Inspect applicant factory location, proposed layout, and machinery details',
          'Verify applicant readiness confirmation prior to physical visit',
        ],
        actionLabel: 'Open Inspection Planner',
        actionHref: '/government/inspections',
      },
      {
        title: 'Physical Verification & Findings Logger',
        badge: 'On-Site Evidence',
        description:
          'Record site observations, compliance findings, and corrective requirements directly into the platform.',
        icon: CheckCircle2,
        color: 'bg-emerald-600 text-white',
        features: [
          'Categorize findings by severity (Critical, High, Medium, Minor)',
          'Specify required corrective actions with compliance deadlines',
          'Digital submission produces an official Joint Inspection Report',
        ],
        actionLabel: 'View Scheduled Inspections',
        actionHref: '/government/inspections',
      },
      {
        title: 'Statutory Inspection Time Limits (RTS SLA)',
        badge: 'Report Timelines',
        description:
          'Under the Maharashtra RTS Act, joint inspection reports must be uploaded within 48 hours of physical site verification.',
        icon: Clock,
        color: 'bg-blue-600 text-white',
        features: [
          'Real-time statutory countdown for inspection report submission',
          'Prevents inspection delays from stalling the main approval decision',
          'Transparent tracking visible to the applicant and competent authorities',
        ],
        actionLabel: 'Inspect SLA Deadlines',
        actionHref: '/government/sla-monitor',
      },
      {
        title: 'Inspection Alerts & Notifications',
        badge: 'Real-Time Schedule Updates',
        description:
          'Receive instant notifications when new joint inspections are scheduled, rescheduled, or acknowledged by applicants.',
        icon: CalendarCheck2,
        color: 'bg-amber-600 text-white',
        features: [
          'Instant itinerary updates and date confirmations',
          'Applicant remarks and site contact point notifications',
          'Seamless coordination across participating inspection authorities',
        ],
        actionLabel: 'View Notifications',
        actionHref: '/government/notifications',
      },
    ],
  },

  ADMIN: {
    roleTitle: 'System Administrator',
    roleBadge: 'Governance Console Tour',
    steps: [
      {
        title: 'Statutory Permissions Catalogue',
        badge: 'Platform Catalogue',
        description:
          'Configure the master catalogue of state approvals, responsible departments, fees, standard validity periods, and required exhibits.',
        icon: Files,
        color: 'bg-purple-600 text-white',
        features: [
          '45+ state clearances pre-configured across 12 departments',
          'Toggle online submission workflows and statutory categories',
          'Define required document templates and prescribed application forms',
        ],
        actionLabel: 'Open Permissions Catalogue',
        actionHref: '/admin/approval-types',
      },
      {
        title: 'Applicability & Eligibility Rules Engine',
        badge: 'Deterministic Rules',
        description:
          'Configure the rule engine that evaluates which clearances apply to an investment proposal based on sector, scale, land type, and power requirements.',
        icon: GitMerge,
        color: 'bg-indigo-600 text-white',
        features: [
          'Deterministic boolean logic with zero hallucinations',
          'Configurable conditions (e.g. investment tier, hazardous chemicals, power > 100kW)',
          'Instant rule testing against active proposal attributes',
        ],
        actionLabel: 'Manage Applicability Rules',
        actionHref: '/admin/rules',
      },
      {
        title: 'Statutory Dependencies & Parallel Engine Rules',
        badge: 'Workflow Graph',
        description:
          'Define prerequisite relationships determining which permissions must precede others and which can run in parallel.',
        icon: Zap,
        color: 'bg-blue-600 text-white',
        features: [
          'Directed acyclic graph (DAG) dependency mapping',
          'Configures parallel acceleration paths to eliminate sequential waiting',
          'Enforces legal prerequisites (e.g. CTE before CTO, Allotment before Building Plan)',
        ],
        actionLabel: 'Manage Dependencies',
        actionHref: '/admin/dependencies',
      },
      {
        title: 'Maharashtra RTS Statutory SLA Policies',
        badge: 'Statutory Time Limits',
        description:
          'Configure processing time limits under the Maharashtra Right to Public Services Act for every competent authority.',
        icon: Clock,
        color: 'bg-red-600 text-white',
        features: [
          'Configurable statutory time limits (e.g. 15 to 45 business days)',
          'Deemed approval triggers and automated escalation thresholds',
          'Clock pause rules during active applicant query windows',
        ],
        actionLabel: 'Configure SLA Policies',
        actionHref: '/admin/sla-policies',
      },
      {
        title: 'Officer & User Access Management',
        badge: 'Identity & Access',
        description:
          'Provision competent authority officers, MAITRI nodal coordinators, joint inspectors, and enterprise accounts.',
        icon: Users,
        color: 'bg-emerald-600 text-white',
        features: [
          'Department-level scoping ensuring strict data boundary isolation',
          'Role-based permissions (OFFICER, NODAL, INSPECTOR, ENTREPRENEUR, ADMIN)',
          'Session security and credential management',
        ],
        actionLabel: 'Manage Users',
        actionHref: '/admin/users',
      },
      {
        title: 'Immutable Regulatory Audit Trail',
        badge: 'Compliance & Integrity',
        description:
          'Audit log recording every single submission, scrutiny note, query, inspection finding, and statutory decision across Maharashtra.',
        icon: ScrollText,
        color: 'bg-slate-800 text-white',
        features: [
          'Permanent chronological event log with user IDs and timestamps',
          'Tamper-evident regulatory oversight for state government transparency',
          'Filter by entity, event type, and reviewing authority',
        ],
        actionLabel: 'Inspect Audit Trail',
        actionHref: '/admin/audit-log',
      },
    ],
  },

  DEFAULT: {
    roleTitle: 'Single Window Clearance Platform',
    roleBadge: 'Platform Overview Tour',
    steps: [
      {
        title: 'Udyog Setu · Single Window Clearance System',
        badge: 'Core Architecture',
        description:
          'Consolidates all industrial approvals across Maharashtra into one unified project roadmap, replacing fragmented departmental portals.',
        icon: Building2,
        color: 'bg-blue-600 text-white',
        features: [
          'Unified Common Application Form (CAF) synced across all state departments',
          'Grounded in the Maharashtra Industry & Investment Facilitation Act 2023',
          'Zero duplicate submissions or manual office visits',
        ],
        actionLabel: 'Sign In to Portal',
        actionHref: '/login',
      },
      {
        title: 'Document Vault & 1-Click Multi-Clearance Reuse',
        badge: 'Paperless Automation',
        description:
          'Upload enterprise exhibits once and attach them across dozens of departmental clearances with automated pre-validation.',
        icon: Files,
        color: 'bg-emerald-600 text-white',
        features: [
          'Automated PDF OCR and structured attribute extraction',
          'Deterministic cross-document consistency audit',
          'Strict statutory retention lock preventing accidental deletion',
        ],
        actionLabel: 'Go to Sign In',
        actionHref: '/login',
      },
      {
        title: 'Parallel Clearance Orchestration',
        badge: 'Turnaround Optimization',
        description:
          'Calculates prerequisite graphs in real time to unlock independent clearances concurrently, reducing approval turnaround by up to 60%.',
        icon: Zap,
        color: 'bg-amber-600 text-white',
        features: [
          'Visual interactive dependency map for investors and officers',
          '1-Click "Start Parallel Clearances" button',
          'Prevents illegal downstream processing without upstream clearance',
        ],
        actionLabel: 'Go to Sign In',
        actionHref: '/login',
      },
      {
        title: 'Maharashtra RTS Statutory SLA Countdown Clock',
        badge: 'Accountability & Speed',
        description:
          'Strict adherence to the Maharashtra Right to Public Services Act (RTS). Deemed approvals hold reviewing authorities legally accountable.',
        icon: Clock,
        color: 'bg-red-600 text-white',
        features: [
          'Real-time SLA countdown with Amber/Red escalation warnings',
          'Automatic clock pause when a query is raised, resuming on response',
          'Instant escalation to Empowered Committee under the District Collector',
        ],
        actionLabel: 'Go to Sign In',
        actionHref: '/login',
      },
      {
        title: 'Designated Joint Site Inspection Scheduler',
        badge: 'Coordinated Verification',
        description:
          'Designated Inspection Officers from MIDC, MPCB, and Labour synchronize on a single joint inspection date, eliminating repetitive factory visits.',
        icon: CalendarCheck2,
        color: 'bg-purple-600 text-white',
        features: [
          'Single joint site inspection date coordinated across authorities',
          'Dedicated Inspector Desk for logging geo-tagged exhibits and findings',
          'Strict 48-hour statutory report upload enforcement',
        ],
        actionLabel: 'Go to Sign In',
        actionHref: '/login',
      },
    ],
  },
};

export function SiteTourGuide() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Select active role tour suite
  const activeRole = user?.role || 'DEFAULT';
  const tourConfig = ROLE_TOURS[activeRole] || ROLE_TOURS.DEFAULT;
  const tourSteps = tourConfig.steps;

  useEffect(() => {
    const handleOpen = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener('open-site-tour', handleOpen);
    return () => window.removeEventListener('open-site-tour', handleOpen);
  }, []);

  // Reset step if role changes
  useEffect(() => {
    setCurrentStep(0);
  }, [user?.role]);

  const step = tourSteps[currentStep] || tourSteps[0];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
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

  const handleActionClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Tour Modal Overlay (Triggered via Header Interactive Tour Button) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                    <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      {tourConfig.roleBadge}
                    </span>
                    <span className="text-xs text-slate-400">
                      {currentStep + 1} / {tourSteps.length}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1 leading-snug">{step.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close Tour"
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
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleActionClick(step.actionHref!)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100/70 border border-primary-200 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{step.actionLabel || 'Navigate to this Page'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-gray-400 italic">
                    Tailored for {tourConfig.roleTitle}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {tourSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
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
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <span>{currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next'}</span>
                  {currentStep < tourSteps.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
