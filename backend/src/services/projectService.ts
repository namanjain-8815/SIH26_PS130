import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export interface CreateProjectInput {
  org_id: string;
  name: string;
  type?: string;
  sector: string;
  investment_amount: number;
  employee_count: number;
  stage: string;
  district: string;
  industrial_area?: string;
  address?: string;
  target_start_date?: Date;
}

export async function listProjects(orgId?: string) {
  return prisma.project.findMany({
    where: orgId ? { org_id: orgId } : undefined,
    include: { project_approvals: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { attributes: true, project_approvals: true },
  });
  if (!project) throw new NotFoundError('Project not found');
  return project;
}

export async function createProject(input: CreateProjectInput) {
  return prisma.project.create({ data: input });
}

export async function updateProject(id: string, input: Partial<CreateProjectInput>) {
  return prisma.project.update({ where: { id }, data: input });
}

export async function saveProjectAttributes(projectId: string, attributes: Record<string, string>) {
  const ops = Object.entries(attributes).map(([key, value]) =>
    prisma.projectAttribute.upsert({
      where: { project_id_key: { project_id: projectId, key } },
      update: { value },
      create: { project_id: projectId, key, value },
    })
  );
  return prisma.$transaction(ops);
}

/**
 * GET /api/projects/:id/control-centre
 *
 * Aggregated dashboard payload for the Project Control Centre.
 * Every number here derives from real DB rows — no hardcoding.
 * (IMPLEMENTATION_PLAN.md §8)
 */
export async function getControlCentre(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: true,
      attributes: true,
      project_approvals: {
        include: {
          approval_type: true,
          application: {
            include: {
              queries: { where: { status: { in: ['OPEN', 'RESPONDED'] } } },
              inspections: { where: { status: 'SCHEDULED' } },
              sla_instance: true,
            },
          },
        },
      },
      compliance_requirements: { orderBy: { next_due_date: 'asc' } },
      incentive_matches: {
        include: { incentive_scheme: true },
        where: { status: 'POTENTIALLY_ELIGIBLE' },
      },
    },
  });

  if (!project) throw new NotFoundError('Project not found');

  const approvals = project.project_approvals;
  const totalApprovals = approvals.length;
  const completedApprovals = approvals.filter((a) => a.status === 'COMPLETED').length;
  const inProgressApprovals = approvals.filter((a) => a.status === 'IN_PROGRESS').length;
  const blockedApprovals = approvals.filter((a) => a.status === 'BLOCKED');
  const notStartedApprovals = approvals.filter((a) => a.status === 'NOT_STARTED').length;

  const readinessPercent =
    totalApprovals > 0 ? Math.round((completedApprovals / totalApprovals) * 100) : 0;

  // SLA alerts: applications with AT_RISK or BREACHED SLA instances
  const slaAlerts = approvals
    .filter((a) => a.application?.sla_instance?.status === 'AT_RISK' || a.application?.sla_instance?.status === 'BREACHED')
    .map((a) => ({
      approval_name: a.approval_type.name,
      application_number: a.application?.application_number,
      sla_status: a.application?.sla_instance?.status,
      due_date: a.application?.sla_instance?.due_date,
    }));

  // Pending queries across all applications
  const pendingQueries = approvals.flatMap((a) =>
    (a.application?.queries ?? []).map((q) => ({
      query_id: q.id,
      subject: q.subject,
      priority: q.priority,
      status: q.status,
      deadline: q.deadline,
      application_number: a.application?.application_number,
      approval_name: a.approval_type.name,
    }))
  );

  // Upcoming inspections
  const upcomingInspections = approvals.flatMap((a) =>
    (a.application?.inspections ?? []).map((i) => ({
      inspection_id: i.id,
      scheduled_date: i.scheduled_date,
      location: i.location,
      purpose: i.purpose,
      approval_name: a.approval_type.name,
      application_number: a.application?.application_number,
    }))
  );

  // Upcoming renewals (next 90 days)
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86_400_000);
  const upcomingRenewals = project.compliance_requirements
    .filter((c) => c.next_due_date <= in90Days && c.status !== 'COMPLETED')
    .map((c) => ({
      id: c.id,
      name: c.name,
      authority: c.authority,
      frequency: c.frequency,
      next_due_date: c.next_due_date,
      status: c.status,
    }));

  // Bottleneck: the approval with the most at-risk signals
  const bottleneck = blockedApprovals[0]
    ? {
        approval_name: blockedApprovals[0].approval_type.name,
        reason: blockedApprovals[0].blocked_reason,
        status: 'BLOCKED',
      }
    : slaAlerts[0]
    ? {
        approval_name: slaAlerts[0].approval_name,
        reason: `SLA is ${slaAlerts[0].sla_status?.toLowerCase().replace('_', ' ')}`,
        status: slaAlerts[0].sla_status,
      }
    : null;

  // Next best action
  let nextBestAction: string | null = null;
  if (pendingQueries.length > 0) {
    const q = pendingQueries.find((q) => q.status === 'OPEN');
    if (q) nextBestAction = `Respond to open query: "${q.subject}" on ${q.approval_name}`;
  }
  if (!nextBestAction && blockedApprovals.length > 0) {
    nextBestAction = `Unblock ${blockedApprovals[0].approval_type.name}: resolve prerequisites to proceed`;
  }
  if (!nextBestAction && slaAlerts.length > 0) {
    nextBestAction = `Follow up on ${slaAlerts[0].approval_name} — configured SLA is ${slaAlerts[0].sla_status?.toLowerCase().replace('_', ' ')}`;
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      sector: project.sector,
      district: project.district,
      industrial_area: project.industrial_area,
      investment_amount: project.investment_amount,
      employee_count: project.employee_count,
      stage: project.stage,
      organization: {
        id: project.organization.id,
        legal_name: project.organization.legal_name,
        entity_type: project.organization.entity_type,
      },
    },
    readiness: {
      percent: readinessPercent,
      label:
        readinessPercent === 100
          ? 'All approvals obtained'
          : readinessPercent >= 60
          ? 'Making good progress'
          : readinessPercent >= 30
          ? 'In progress — action required'
          : 'Early stage',
    },
    approvals: {
      total: totalApprovals,
      completed: completedApprovals,
      in_progress: inProgressApprovals,
      blocked: blockedApprovals.length,
      not_started: notStartedApprovals,
    },
    blocked_approvals: blockedApprovals.map((a) => ({
      id: a.id,
      approval_name: a.approval_type.name,
      blocked_reason: a.blocked_reason,
      priority: a.priority,
    })),
    sla_alerts: slaAlerts,
    pending_queries: pendingQueries,
    upcoming_inspections: upcomingInspections,
    upcoming_renewals: upcomingRenewals,
    incentive_matches: project.incentive_matches.map((m) => ({
      id: m.id,
      scheme_name: m.incentive_scheme.name,
      authority: m.incentive_scheme.authority,
      benefit_description: m.incentive_scheme.benefit_description,
      status: m.status,
      label: 'Potentially applicable based on current project information',
    })),
    bottleneck,
    next_best_action: nextBestAction,
  };
}
