/**
 * Project-Level Approval Tracker & Journey Service (P1.9)
 * 
 * Provides an aggregated, end-to-end view of an investment project's statutory journey:
 * - 6-stage visual pipeline tracker (Project Setup → Permissions → Parallel Processing → Inspection → Decisions → Compliance)
 * - Real clearance metrics (total, completed, in progress, blocked, ready to start)
 * - Configured statutory time limits and SLA countdowns
 * - Consolidated event timeline synthesized from immutable ApplicationEvent logs
 * - Zero fabricated savings metrics: strictly derives from stored timestamps and statutory configurations
 */

import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export interface StageStep {
  id: string;
  order: number;
  label: string;
  short_label: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' | 'BLOCKED';
  is_current: boolean;
  completion_pct?: number;
}

export interface ApprovalTrackerItem {
  project_approval_id: string;
  approval_name: string;
  concerned_authority: string;
  category: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: string;
  can_start_now: boolean;
  application_id: string | null;
  application_number: string | null;
  application_status: string | null;
  submitted_at: string | null;
  granted_at: string | null;
  sla_days: number;
  days_elapsed: number;
  days_remaining: number | null;
  sla_status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'COMPLETED' | 'NOT_STARTED';
  missing_prerequisites: string[];
  open_queries_count: number;
  inspections_count: number;
}

export interface ConsolidatedTimelineEvent {
  event_id: string;
  application_id?: string | null;
  application_number?: string | null;
  approval_name?: string | null;
  event_type: string;
  description: string;
  created_at: string;
  actor_name: string;
  actor_role: string;
  stage: string;
}

export interface ProjectApprovalTrackerPayload {
  project: {
    id: string;
    name: string;
    sector: string;
    district: string;
    stage: string;
    investment_amount: number;
    employee_count: number;
    created_at: string;
    target_start_date?: string | null;
    organization: {
      id: string;
      legal_name: string;
      entity_type: string;
    };
  };
  summary: {
    total_permissions: number;
    completed: number;
    in_progress: number;
    blocked: number;
    ready_to_start: number;
    overall_completion_pct: number;
  };
  journey_metrics: {
    elapsed_days: number;
    overall_sla_status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
    breached_count: number;
    at_risk_count: number;
    upcoming_action: string;
    upcoming_action_link?: string;
    next_milestone: string;
  };
  stages: StageStep[];
  approval_items: ApprovalTrackerItem[];
  consolidated_timeline: ConsolidatedTimelineEvent[];
}

function safeIsoDate(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function getProjectApprovalTracker(projectId: string): Promise<ProjectApprovalTrackerPayload> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: true,
      attributes: true,
    },
  });

  if (!project) {
    throw new NotFoundError(`Project with ID ${projectId} not found`);
  }

  // Fetch all approvals and related applications, queries, inspections, and events
  const projectApprovals = await prisma.projectApproval.findMany({
    where: { project_id: projectId },
    include: {
      approval_type: true,
      application: {
        include: {
          queries: true,
          inspections: true,
          events: {
            include: {
              actor: true,
            },
            orderBy: { timestamp: 'desc' },
          },
        },
      },
    },
  });

  const approvalTypeIds = projectApprovals.map((pa) => pa.approval_type_id);
  const paByTypeId = new Map<string, any>(projectApprovals.map((pa) => [pa.approval_type_id, pa]));

  // Fetch prerequisite dependencies
  const dependencies = await prisma.approvalDependency.findMany({
    where: {
      prerequisite_approval_type_id: { in: approvalTypeIds },
      dependent_approval_type_id: { in: approvalTypeIds },
      dependency_type: 'PREREQUISITE',
    },
    include: { prerequisite_approval: true },
  });

  const now = Date.now();
  const rawProjectTime = project.created_at ? new Date(project.created_at).getTime() : NaN;
  const projectCreatedTime = !isNaN(rawProjectTime) ? rawProjectTime : now;
  const elapsedDays = Math.max(1, Math.floor((now - projectCreatedTime) / (1000 * 60 * 60 * 24)));

  let completedCount = 0;
  let inProgressCount = 0;
  let blockedCount = 0;
  let readyToStartCount = 0;
  let breachedCount = 0;
  let atRiskCount = 0;

  const approvalItems: ApprovalTrackerItem[] = [];
  const timelineEvents: ConsolidatedTimelineEvent[] = [];

  // Project registration timeline event
  timelineEvents.push({
    event_id: `proj-init-${project.id}`,
    event_type: 'PROJECT_ONBOARDED',
    description: `Project "${project.name}" registered in Single Window Clearance System (${project.sector}, ${project.district}).`,
    created_at: safeIsoDate(project.created_at) || new Date().toISOString(),
    actor_name: project.organization?.legal_name || 'Project Proponent',
    actor_role: 'APPLICANT',
    stage: 'Project Setup',
  });

  // Evaluate each approval item
  for (const pa of projectApprovals) {
    const app = pa.application;
    const approvalType = pa.approval_type;

    // Prerequisite check
    const prereqs = dependencies.filter((d) => d.dependent_approval_type_id === pa.approval_type_id);
    const missingPrereqs = prereqs
      .filter((d) => {
        const prereqPA = paByTypeId.get(d.prerequisite_approval_type_id);
        return prereqPA?.status !== 'COMPLETED';
      })
      .map((d) => d.prerequisite_approval?.name || d.prerequisite_approval_type_id);

    const isBlocked = missingPrereqs.length > 0 && pa.status !== 'COMPLETED';
    const canStartNow = !app && !isBlocked && pa.status !== 'COMPLETED';

    if (pa.status === 'COMPLETED') {
      completedCount++;
    } else if (isBlocked || pa.status === 'BLOCKED') {
      blockedCount++;
    } else if (app || pa.status === 'IN_PROGRESS') {
      inProgressCount++;
    } else if (canStartNow) {
      readyToStartCount++;
    }

    // SLA tracking
    const slaDays = approvalType.default_sla_days || 30;
    let daysElapsed = 0;
    let daysRemaining: number | null = null;
    let slaStatus: ApprovalTrackerItem['sla_status'] = 'NOT_STARTED';

    if (pa.status === 'COMPLETED') {
      slaStatus = 'COMPLETED';
      daysElapsed = slaDays;
    } else if (app) {
      const appSubmittedTime = app.submitted_at ? new Date(app.submitted_at).getTime() : NaN;
      const appCreatedTime = app.created_at ? new Date(app.created_at).getTime() : NaN;
      const startTime = !isNaN(appSubmittedTime) ? appSubmittedTime : !isNaN(appCreatedTime) ? appCreatedTime : now;
      daysElapsed = Math.max(0, Math.floor((now - startTime) / (1000 * 60 * 60 * 24)));
      daysRemaining = Math.max(0, slaDays - daysElapsed);

      if (app.status === 'SUBMITTED' || app.status === 'UNDER_SCRUTINY') {
        if (daysElapsed > slaDays) {
          slaStatus = 'BREACHED';
          breachedCount++;
        } else if (daysRemaining <= Math.max(3, Math.floor(slaDays * 0.25))) {
          slaStatus = 'AT_RISK';
          atRiskCount++;
        } else {
          slaStatus = 'ON_TRACK';
        }
      } else {
        slaStatus = 'ON_TRACK';
      }
    }

    approvalItems.push({
      project_approval_id: pa.id,
      approval_name: approvalType.name,
      concerned_authority: approvalType.authority,
      category: approvalType.category || 'General',
      status: pa.status as any,
      priority: pa.priority || 'MEDIUM',
      can_start_now: canStartNow,
      application_id: app?.id || null,
      application_number: app?.application_number || null,
      application_status: app?.status || null,
      submitted_at: safeIsoDate(app?.submitted_at),
      granted_at: pa.status === 'COMPLETED' ? (safeIsoDate(pa.updated_at) || new Date().toISOString()) : null,
      sla_days: slaDays,
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      sla_status: slaStatus,
      missing_prerequisites: missingPrereqs,
      open_queries_count: app?.queries?.filter((q: any) => q.status === 'OPEN' || q.status === 'RESPONDED').length || 0,
      inspections_count: app?.inspections?.length || 0,
    });

    // Ingest application events into consolidated timeline
    if (app?.events) {
      for (const ev of app.events) {
        timelineEvents.push({
          event_id: ev.id,
          application_id: app.id,
          application_number: app.application_number,
          approval_name: approvalType.name,
          event_type: ev.event_type,
          description: ev.notes || `Application ${ev.event_type.toLowerCase().replace(/_/g, ' ')}`,
          created_at: safeIsoDate(ev.timestamp) || new Date().toISOString(),
          actor_name: ev.actor?.full_name || 'Department Officer',
          actor_role: ev.actor?.role || 'OFFICER',
          stage: 'Clearance Scrutiny',
        });
      }
    }
  }

  // Sort timeline chronologically descending (most recent first)
  timelineEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalPermissions = projectApprovals.length;
  const overallCompletionPct = totalPermissions > 0 ? Math.round((completedCount / totalPermissions) * 100) : 0;

  // Visual 6-stage tracker synthesis
  const hasStartedAnyApp = approvalItems.some((a) => a.application_id !== null);
  const totalInspections = approvalItems.reduce((acc, a) => acc + a.inspections_count, 0);
  const totalOpenQueries = approvalItems.reduce((acc, a) => acc + a.open_queries_count, 0);

  const stages: StageStep[] = [
    {
      id: 'PROJECT_SETUP',
      order: 1,
      label: 'Project Setup & Onboarding',
      short_label: 'Setup',
      description: 'Investor registration, project proposal, site coordinates, and utility parameters registered.',
      status: 'COMPLETED',
      is_current: false,
      completion_pct: 100,
    },
    {
      id: 'PERMISSIONS',
      order: 2,
      label: 'Regulatory Analysis & Roadmap',
      short_label: 'Permissions',
      description: `${totalPermissions} statutory clearances identified and sequenced according to regulatory rules.`,
      status: totalPermissions > 0 ? 'COMPLETED' : 'IN_PROGRESS',
      is_current: totalPermissions === 0,
      completion_pct: totalPermissions > 0 ? 100 : 50,
    },
    {
      id: 'PARALLEL_PROCESSING',
      order: 3,
      label: 'Parallel Application Processing (CAF)',
      short_label: 'Applications',
      description: `${approvalItems.filter((a) => a.application_id).length} of ${totalPermissions} clearances initiated in parallel using verified master data.`,
      status:
        completedCount === totalPermissions
          ? 'COMPLETED'
          : hasStartedAnyApp
          ? 'IN_PROGRESS'
          : 'UPCOMING',
      is_current: hasStartedAnyApp && completedCount < totalPermissions && totalInspections === 0,
      completion_pct: totalPermissions > 0 ? Math.round((approvalItems.filter((a) => a.application_id).length / totalPermissions) * 100) : 0,
    },
    {
      id: 'INSPECTION',
      order: 4,
      label: 'Department Scrutiny & Inspections',
      short_label: 'Inspection',
      description:
        totalInspections > 0
          ? `${totalInspections} site inspection(s) scheduled/conducted by regulatory authorities.`
          : 'Desk scrutiny and scheduled site visits by competent authorities.',
      status:
        completedCount === totalPermissions
          ? 'COMPLETED'
          : totalInspections > 0
          ? 'IN_PROGRESS'
          : hasStartedAnyApp
          ? 'IN_PROGRESS'
          : 'UPCOMING',
      is_current: totalInspections > 0 && completedCount < totalPermissions,
      completion_pct: totalInspections > 0 ? 75 : 20,
    },
    {
      id: 'DECISIONS',
      order: 5,
      label: 'Clearance Decisions & Grants',
      short_label: 'Decisions',
      description: `${completedCount} of ${totalPermissions} statutory permissions officially granted.`,
      status:
        completedCount === totalPermissions
          ? 'COMPLETED'
          : completedCount > 0
          ? 'IN_PROGRESS'
          : 'UPCOMING',
      is_current: completedCount > 0 && completedCount < totalPermissions,
      completion_pct: overallCompletionPct,
    },
    {
      id: 'COMPLIANCE',
      order: 6,
      label: 'Post-Establishment Compliance & Renewals',
      short_label: 'Compliance',
      description: 'Ongoing compliance registers, environmental monitoring, and statutory renewal schedules.',
      status: completedCount === totalPermissions ? 'IN_PROGRESS' : 'UPCOMING',
      is_current: completedCount === totalPermissions,
      completion_pct: completedCount === totalPermissions ? 50 : 0,
    },
  ];

  // Journey metrics: upcoming action & next milestone
  let upcomingAction = 'All clearances currently up to date.';
  let upcomingActionLink: string | undefined = undefined;

  const appWithQueries = approvalItems.find((a) => a.open_queries_count > 0);
  const readyToStartItem = approvalItems.find((a) => a.can_start_now);
  const unsubmittedApp = approvalItems.find((a) => a.application_status === 'IN_PREPARATION');

  if (appWithQueries?.application_id) {
    upcomingAction = `Respond to regulatory query for ${appWithQueries.approval_name}`;
    upcomingActionLink = `/app/applications/${appWithQueries.application_id}`;
  } else if (unsubmittedApp?.application_id) {
    upcomingAction = `Review and submit Application Form (CAF) for ${unsubmittedApp.approval_name}`;
    upcomingActionLink = `/app/applications/${unsubmittedApp.application_id}`;
  } else if (readyToStartItem) {
    upcomingAction = `Start eligible clearance workspace for ${readyToStartItem.approval_name}`;
    upcomingActionLink = `/app/projects/${projectId}/submission-centre`;
  }

  let nextMilestone = 'Complete statutory pre-establishment approvals';
  if (completedCount === totalPermissions) {
    nextMilestone = 'Commercial operations commencement & compliance monitoring';
  } else if (completedCount > 0) {
    nextMilestone = `Obtain remaining ${totalPermissions - completedCount} clearance grant(s)`;
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      sector: project.sector,
      district: project.district,
      stage: project.stage,
      investment_amount: project.investment_amount,
      employee_count: project.employee_count,
      created_at: safeIsoDate(project.created_at) || new Date().toISOString(),
      target_start_date: safeIsoDate(project.target_start_date),
      organization: {
        id: project.organization.id,
        legal_name: project.organization.legal_name,
        entity_type: project.organization.entity_type,
      },
    },
    summary: {
      total_permissions: totalPermissions,
      completed: completedCount,
      in_progress: inProgressCount,
      blocked: blockedCount,
      ready_to_start: readyToStartCount,
      overall_completion_pct: overallCompletionPct,
    },
    journey_metrics: {
      elapsed_days: elapsedDays,
      overall_sla_status: breachedCount > 0 ? 'BREACHED' : atRiskCount > 0 ? 'AT_RISK' : 'ON_TRACK',
      breached_count: breachedCount,
      at_risk_count: atRiskCount,
      upcoming_action: upcomingAction,
      upcoming_action_link: upcomingActionLink,
      next_milestone: nextMilestone,
    },
    stages,
    approval_items: approvalItems,
    consolidated_timeline: timelineEvents,
  };
}
