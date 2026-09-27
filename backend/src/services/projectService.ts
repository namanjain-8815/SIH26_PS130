import { prisma } from '../lib/prisma';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { updateApplicationStatus, runReadinessCheck } from './applicationService';
import { calculateScrutinyPriority } from './scrutinyPriorityService';

export interface CreateProjectInput {
  org_id?: string;
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
  entity_name?: string;
  entity_type?: string;
}

export async function listProjects(orgId?: string) {
  return prisma.project.findMany({
    where: orgId ? { org_id: orgId } : undefined,
    include: { project_approvals: true, organization: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { attributes: true, project_approvals: true, organization: true },
  });
  if (!project) throw new NotFoundError('Project not found');
  return project;
}

export async function createProject(input: CreateProjectInput) {
  let orgId = input.org_id;
  if (!orgId && input.entity_name) {
    const org = await prisma.organization.create({
      data: {
        legal_name: input.entity_name,
        entity_type: input.entity_type || 'Private Limited Company',
        sector: input.sector || 'Food Processing',
      },
    });
    orgId = org.id;
  }
  if (!orgId) {
    const firstOrg = await prisma.organization.findFirst();
    if (firstOrg) orgId = firstOrg.id;
  }
  if (!orgId) throw new NotFoundError('Organization not found');

  const { entity_name: _, entity_type: __, ...projectData } = input;
  return prisma.project.create({
    data: {
      ...projectData,
      org_id: orgId,
    },
  });
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
      application_id: a.application?.id ?? null,
      application_number: a.application?.application_number ?? null,
      sla_status: a.application?.sla_instance?.status ?? null,
      due_date: a.application?.sla_instance?.due_date ?? null,
    }));

  // Pending queries across all applications
  const pendingQueries = approvals.flatMap((a) =>
    (a.application?.queries ?? []).map((q) => ({
      query_id: q.id,
      application_id: a.application?.id ?? null,
      subject: q.subject,
      priority: q.priority,
      status: q.status,
      deadline: q.deadline,
      application_number: a.application?.application_number ?? null,
      approval_name: a.approval_type.name,
    }))
  );

  // Upcoming inspections
  const upcomingInspections = approvals.flatMap((a) =>
    (a.application?.inspections ?? []).map((i) => ({
      inspection_id: i.id,
      application_id: a.application?.id ?? null,
      scheduled_date: i.scheduled_date,
      location: i.location,
      purpose: i.purpose,
      approval_name: a.approval_type.name,
      application_number: a.application?.application_number ?? null,
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

  // Next best action & direct workflow link
  let nextBestAction: string | null = null;
  let nextBestActionLink: string | null = null;
  if (pendingQueries.length > 0) {
    const q = pendingQueries.find((q) => q.status === 'OPEN');
    if (q) {
      nextBestAction = `Respond to open query: "${q.subject}" on ${q.approval_name}`;
      nextBestActionLink = q.application_id ? `/app/applications/${q.application_id}?tab=queries` : `/app/approvals`;
    }
  }
  if (!nextBestAction && blockedApprovals.length > 0) {
    nextBestAction = `Unblock ${blockedApprovals[0].approval_type.name}: resolve prerequisites to proceed`;
    nextBestActionLink = `/app/approvals`;
  }
  if (!nextBestAction && slaAlerts.length > 0) {
    nextBestAction = `Follow up on ${slaAlerts[0].approval_name} — configured SLA is ${slaAlerts[0].sla_status?.toLowerCase().replace('_', ' ')}`;
    nextBestActionLink = slaAlerts[0].application_id ? `/app/applications/${slaAlerts[0].application_id}` : `/app/approvals`;
  }
  if (!nextBestAction) {
    const readyToStart = approvals.find((a) => a.status === 'NOT_STARTED');
    if (readyToStart) {
      nextBestAction = `Start application for ${readyToStart.approval_type.name}`;
      nextBestActionLink = `/app/approvals`;
    }
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

export interface SubmissionCentreItem {
  project_approval_id: string;
  approval_name: string;
  approval_category: string;
  concerned_authority: string;
  department_name?: string;
  priority: string;
  category: 'READY_TO_SUBMIT' | 'BLOCKED_BY_PREREQUISITES' | 'IN_PREPARATION' | 'SUBMITTED' | 'APPROVED';
  application_id: string | null;
  application_number: string | null;
  application_status: string | null;
  submitted_at: Date | string | null;
  prerequisites: Array<{
    approval_type_id: string;
    approval_name: string;
    status: string;
    is_satisfied: boolean;
  }>;
  has_unmet_prerequisites: boolean;
  document_checklist: {
    total_required: number;
    mandatory_count: number;
    uploaded_count: number;
    reused_count: number;
    missing_mandatory: string[];
    reused_documents: Array<{
      document_id: string;
      document_type: string;
      file_name: string;
      verification_status: string;
      reuse_count: number;
    }>;
    uploaded_documents: Array<{
      document_id: string;
      document_type: string;
      file_name: string;
      verification_status: string;
      is_reused: boolean;
    }>;
  };
  readiness: {
    is_ready: boolean;
    issues: string[];
    warnings: string[];
    can_submit: boolean;
    blocker_reason?: string;
  };
  service_timeline: {
    default_sla_days: number;
    sla_status?: string | null;
    due_date?: Date | string | null;
    label: string;
  };
  scrutiny_priority?: {
    level: string;
    label: string;
    why: string;
  } | null;
}

export interface ProjectSubmissionCentreData {
  project: {
    id: string;
    name: string;
    sector: string;
    district: string;
    stage: string;
    organization: {
      id: string;
      legal_name: string;
      entity_type: string;
    };
  };
  metrics: {
    total_clearances: number;
    ready_to_submit: number;
    blocked_by_prerequisites: number;
    in_preparation: number;
    submitted: number;
    approved: number;
    overall_readiness_percent: number;
  };
  clearances: SubmissionCentreItem[];
}

/**
 * GET /api/projects/:id/submission-centre
 *
 * Proposal-wide submission command centre.
 * Aggregates all clearances with:
 * - Ready to submit / Blocked / In Preparation / Submitted statuses
 * - Unmet prerequisite analysis
 * - Document checklist distinguishing mandatory, uploaded, and reused documents
 * - Concerned authority & configured service timeline
 * - Explainable scrutiny complexity
 */
export async function getProjectSubmissionCentre(projectId: string): Promise<ProjectSubmissionCentreData> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: true,
      project_approvals: {
        include: {
          approval_type: {
            include: { document_requirements: true },
          },
          application: {
            include: {
              department: true,
              application_documents: {
                include: { document: true },
              },
              queries: {
                where: { status: { in: ['OPEN', 'RESPONDED'] } },
              },
              inspections: true,
              sla_instance: true,
            },
          },
        },
      },
    },
  });

  if (!project) throw new NotFoundError('Project not found');

  const approvalTypeIds = project.project_approvals.map((pa) => pa.approval_type_id);
  const paByTypeId = new Map(project.project_approvals.map((pa) => [pa.approval_type_id, pa]));

  const dependencies = await prisma.approvalDependency.findMany({
    where: {
      dependent_approval_type_id: { in: approvalTypeIds },
      dependency_type: 'PREREQUISITE',
    },
    include: { prerequisite_approval: true },
  });

  // Project documents for calculating reuse
  const vaultDocs = await prisma.document.findMany({
    where: { project_id: projectId },
  });
  const vaultDocIds = vaultDocs.map((d) => d.id);
  const reuseCountsRaw = await prisma.applicationDocument.groupBy({
    by: ['document_id'],
    _count: { document_id: true },
    where: { document_id: { in: vaultDocIds } },
  });
  const reuseMap = new Map(reuseCountsRaw.map((r) => [r.document_id, r._count.document_id]));

  const clearances: SubmissionCentreItem[] = [];

  for (const pa of project.project_approvals) {
    const approvalType = pa.approval_type;
    const app = pa.application;

    // Prerequisite evaluation
    const prereqDeps = dependencies.filter((d) => d.dependent_approval_type_id === pa.approval_type_id);
    const prereqList = prereqDeps.map((d) => {
      const prereqPA = paByTypeId.get(d.prerequisite_approval_type_id);
      const isSatisfied = prereqPA?.status === 'COMPLETED';
      return {
        approval_type_id: d.prerequisite_approval_type_id,
        approval_name: d.prerequisite_approval?.name || d.prerequisite_approval_type_id,
        status: prereqPA?.status || 'NOT_STARTED',
        is_satisfied: isSatisfied,
      };
    });
    const hasUnmetPrerequisites = prereqList.some((p) => !p.is_satisfied);

    // Document analysis
    const docReqs = approvalType.document_requirements || [];
    const mandatoryReqs = docReqs.filter((dr) => dr.mandatory);
    const appDocs = app?.application_documents || [];
    const attachedTypes = new Set(appDocs.map((ad) => ad.document.document_type));

    const missingMandatory = mandatoryReqs
      .filter((dr) => !attachedTypes.has(dr.document_type))
      .map((dr) => dr.document_type);

    const uploadedDocuments = appDocs.map((ad) => {
      const count = reuseMap.get(ad.document_id) ?? 1;
      return {
        document_id: ad.document_id,
        document_type: ad.document.document_type,
        file_name: ad.document.file_name,
        verification_status: ad.document.verification_status,
        is_reused: count > 1,
      };
    });

    const reusedDocuments = uploadedDocuments
      .filter((d) => d.is_reused)
      .map((d) => ({
        document_id: d.document_id,
        document_type: d.document_type,
        file_name: d.file_name,
        verification_status: d.verification_status,
        reuse_count: reuseMap.get(d.document_id) ?? 2,
      }));

    const hasInvalidDocs = appDocs.some(
      (ad) =>
        ad.document.verification_status === 'REJECTED' ||
        (ad.document.expiry_date && new Date(ad.document.expiry_date) < new Date())
    );

    // Determine category
    let category: 'READY_TO_SUBMIT' | 'BLOCKED_BY_PREREQUISITES' | 'IN_PREPARATION' | 'SUBMITTED' | 'APPROVED';
    const appStatus = app?.status;

    if (appStatus === 'APPROVED' || pa.status === 'COMPLETED') {
      category = 'APPROVED';
    } else if (
      appStatus &&
      ['SUBMITTED', 'UNDER_REVIEW', 'INSPECTION_SCHEDULED', 'QUERY_RAISED', 'AWAITING_DEPARTMENT'].includes(appStatus)
    ) {
      category = 'SUBMITTED';
    } else if (hasUnmetPrerequisites) {
      category = 'BLOCKED_BY_PREREQUISITES';
    } else if (
      app &&
      ['IN_PREPARATION', 'AWAITING_APPLICANT', 'READY_TO_START'].includes(appStatus || '') &&
      missingMandatory.length === 0 &&
      !hasInvalidDocs
    ) {
      category = 'READY_TO_SUBMIT';
    } else {
      category = 'IN_PREPARATION';
    }

    // Readiness issues & blocker reasons
    const issues: string[] = [];
    const warnings: string[] = [];

    if (hasUnmetPrerequisites) {
      const unmet = prereqList.filter((p) => !p.is_satisfied).map((p) => p.approval_name);
      issues.push(`Prerequisite clearances pending completion: ${unmet.join(', ')}`);
    }
    for (const m of missingMandatory) {
      issues.push(`Mandatory statutory document missing: "${m}"`);
    }
    if (hasInvalidDocs) {
      issues.push('One or more attached documents are rejected or have expired.');
    }
    if (!app) {
      issues.push('Application workspace has not been initialized.');
    }

    const isReady = issues.length === 0 && category === 'READY_TO_SUBMIT';
    const canSubmit = isReady && !!app && ['IN_PREPARATION', 'AWAITING_APPLICANT'].includes(app.status);

    let blockerReason: string | undefined;
    if (hasUnmetPrerequisites) {
      const unmet = prereqList.filter((p) => !p.is_satisfied).map((p) => p.approval_name);
      blockerReason = `Blocked by upstream statutory clearance: ${unmet.join(', ')}`;
    } else if (missingMandatory.length > 0) {
      blockerReason = `Missing ${missingMandatory.length} mandatory document(s): ${missingMandatory.join(', ')}`;
    } else if (hasInvalidDocs) {
      blockerReason = 'Document renewal or re-upload required';
    } else if (!app) {
      blockerReason = 'Workspace pending initialization';
    }

    // Scrutiny complexity
    let scrutinyPriority = null;
    if (app) {
      const scrutiny = calculateScrutinyPriority({
        application_status: app.status,
        required_documents_count: docReqs.length,
        uploaded_documents_count: appDocs.length,
        prerequisites: prereqList.map((p) => ({ id: p.approval_type_id, status: p.status })),
        concerned_departments_count: 1,
        requires_inspection: approvalType.requires_inspection,
        scheduled_inspections_count: app.inspections?.length || 0,
        open_queries_count: app.queries?.length || 0,
        sla_status: app.sla_instance?.status || null,
        sla_due_date: app.sla_instance?.due_date || null,
      });
      scrutinyPriority = {
        level: scrutiny.level,
        label: scrutiny.label,
        why: scrutiny.why,
      };
    }

    clearances.push({
      project_approval_id: pa.id,
      approval_name: approvalType.name,
      approval_category: approvalType.category,
      concerned_authority: approvalType.authority,
      department_name: app?.department?.name,
      priority: pa.priority,
      category,
      application_id: app?.id || null,
      application_number: app?.application_number || null,
      application_status: app?.status || null,
      submitted_at: app?.submitted_at || null,
      prerequisites: prereqList,
      has_unmet_prerequisites: hasUnmetPrerequisites,
      document_checklist: {
        total_required: docReqs.length,
        mandatory_count: mandatoryReqs.length,
        uploaded_count: uploadedDocuments.length,
        reused_count: reusedDocuments.length,
        missing_mandatory: missingMandatory,
        reused_documents: reusedDocuments,
        uploaded_documents: uploadedDocuments,
      },
      readiness: {
        is_ready: isReady,
        issues,
        warnings,
        can_submit: canSubmit,
        blocker_reason: blockerReason,
      },
      service_timeline: {
        default_sla_days: approvalType.default_sla_days,
        sla_status: app?.sla_instance?.status || null,
        due_date: app?.sla_instance?.due_date || null,
        label: `${approvalType.default_sla_days} Statutory Days (${approvalType.authority})`,
      },
      scrutiny_priority: scrutinyPriority,
    });
  }

  const totalClearances = clearances.length;
  const readyToSubmit = clearances.filter((c) => c.category === 'READY_TO_SUBMIT').length;
  const blockedByPrerequisites = clearances.filter((c) => c.category === 'BLOCKED_BY_PREREQUISITES').length;
  const inPreparation = clearances.filter((c) => c.category === 'IN_PREPARATION').length;
  const submitted = clearances.filter((c) => c.category === 'SUBMITTED').length;
  const approved = clearances.filter((c) => c.category === 'APPROVED').length;
  const overallReadinessPercent =
    totalClearances > 0 ? Math.round(((readyToSubmit + submitted + approved) / totalClearances) * 100) : 0;

  return {
    project: {
      id: project.id,
      name: project.name,
      sector: project.sector,
      district: project.district,
      stage: project.stage,
      organization: {
        id: project.organization.id,
        legal_name: project.organization.legal_name,
        entity_type: project.organization.entity_type,
      },
    },
    metrics: {
      total_clearances: totalClearances,
      ready_to_submit: readyToSubmit,
      blocked_by_prerequisites: blockedByPrerequisites,
      in_preparation: inPreparation,
      submitted,
      approved,
      overall_readiness_percent: overallReadinessPercent,
    },
    clearances,
  };
}

/**
 * POST /api/projects/:id/submit-application/:applicationId
 *
 * Explicit Review & Submit action from the Project Submission Centre.
 * Validates:
 * - Application belongs to the project
 * - Prerequisites are completed
 * - Document readiness passes
 * Performs statutory submission and synchronizes audit and notification events.
 */
export async function submitProjectApplication(
  projectId: string,
  applicationId: string,
  actorId?: string,
  notes?: string
) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project_approval: {
        include: {
          approval_type: true,
          project: true,
        },
      },
    },
  });

  if (!app) throw new NotFoundError('Application not found');
  if (app.project_approval?.project_id !== projectId) {
    throw new BadRequestError('Application does not belong to the specified project proposal.');
  }

  // 1. Verify prerequisite clearances
  const prereqDeps = await prisma.approvalDependency.findMany({
    where: {
      dependent_approval_type_id: app.project_approval.approval_type_id,
      dependency_type: 'PREREQUISITE',
    },
    include: { prerequisite_approval: true },
  });

  if (prereqDeps.length > 0) {
    const prereqTypeIds = prereqDeps.map((d) => d.prerequisite_approval_type_id);
    const prereqApprovals = await prisma.projectApproval.findMany({
      where: {
        project_id: projectId,
        approval_type_id: { in: prereqTypeIds },
      },
      include: { approval_type: true },
    });
    const incompletePrereqs = prereqApprovals.filter((pa) => pa.status !== 'COMPLETED');
    if (incompletePrereqs.length > 0) {
      const names = incompletePrereqs.map((p) => p.approval_type.name).join(', ');
      throw new BadRequestError(
        `Statutory submission blocked: Upstream prerequisite clearances must be completed first: ${names}`
      );
    }
  }

  // 2. Verify platform readiness
  const readiness = await runReadinessCheck(applicationId);
  if (!readiness.ready) {
    throw new BadRequestError(
      `Statutory submission blocked: Application has ${readiness.issues.length} blocking issue(s): ${readiness.issues.join('; ')}`
    );
  }

  // 3. Perform official submission
  const updated = await updateApplicationStatus(
    applicationId,
    'SUBMITTED',
    actorId,
    notes || 'Application officially reviewed and submitted via Project Submission Centre.'
  );

  return {
    success: true,
    application_id: applicationId,
    application_number: app.application_number,
    status: 'SUBMITTED',
    approval_name: app.project_approval.approval_type.name,
    authority: app.project_approval.approval_type.authority,
    submitted_at: updated.submitted_at,
    message: 'Application submitted successfully to Concerned Competent Authority.',
  };
}
