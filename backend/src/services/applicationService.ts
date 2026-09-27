import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { mockGovernmentAdapter } from '../adapters/MockGovernmentAdapter';
import { getPrescribedFormForApproval } from './prescribedFormService';
import { calculateScrutinyPriority } from './scrutinyPriorityService';
import {
  notifyApplicationSubmitted,
  notifyDecisionRecorded,
  notifyEmpoweredCommitteeEscalation,
} from './notificationService';

export async function listApplications(projectId: string) {
  return prisma.application.findMany({
    where: { project_approval: { project_id: projectId } },
    include: { project_approval: { include: { approval_type: true } }, department: true, sla_instance: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function createApplication(projectApprovalId: string, departmentId?: string) {
  let resolvedDeptId = departmentId;
  if (!resolvedDeptId) {
    const pa = await prisma.projectApproval.findUnique({
      where: { id: projectApprovalId },
      include: { approval_type: true },
    });
    if (pa) {
      const depts = await prisma.department.findMany();
      const match = depts.find(
        (d) =>
          d.name.toLowerCase().includes(pa.approval_type.authority.toLowerCase()) ||
          pa.approval_type.authority.toLowerCase().includes(d.name.toLowerCase())
      );
      resolvedDeptId = match?.id ?? depts[0]?.id;
    }
  }
  if (!resolvedDeptId) throw new NotFoundError('Department could not be determined');

  const application_number = `APP-${Date.now().toString(36).toUpperCase()}`;
  const app = await prisma.application.create({
    data: {
      project_approval_id: projectApprovalId,
      department_id: resolvedDeptId,
      application_number,
      status: 'IN_PREPARATION',
    },
  });
  // Create initial event
  await prisma.applicationEvent.create({
    data: {
      application_id: app.id,
      event_type: 'application_created',
      notes: 'Application workspace created.',
    },
  });
  return app;
}

export async function getApplication(id: string) {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      project_approval: {
        include: {
          approval_type: {
            include: {
              document_requirements: true,
              dependent_on: true,
            },
          },
          project: {
            include: {
              organization: true,
              attributes: true,
              project_approvals: {
                include: { approval_type: true },
              },
            },
          },
        },
      },
      department: true,
      application_documents: { include: { document: true } },
      queries: { include: { responses: true, creator: true }, orderBy: { created_at: 'desc' } },
      inspections: { include: { inspector: true, findings: true }, orderBy: { scheduled_date: 'asc' } },
      sla_instance: true,
      events: { orderBy: { timestamp: 'asc' } },
    },
  });
  if (!application) throw new NotFoundError('Application not found');

  const prescribedForm = getPrescribedFormForApproval(application.project_approval.approval_type.name);

  const approvalType = application.project_approval?.approval_type;
  const project = application.project_approval?.project;
  const reqDocs = approvalType?.document_requirements?.length ?? 0;
  const upDocs = application.application_documents?.length ?? 0;

  const dependentOn = approvalType?.dependent_on ?? [];
  const projectApprovals = project?.project_approvals ?? [];
  const paByTypeId = new Map(projectApprovals.map((pa: any) => [pa.approval_type_id, pa]));

  const prerequisites = dependentOn
    .filter((dep: any) => dep.dependency_type === 'PREREQUISITE')
    .map((dep: any) => ({
      id: dep.prerequisite_approval_type_id,
      status: paByTypeId.get(dep.prerequisite_approval_type_id)?.status ?? 'NOT_STARTED',
    }));

  const distinctDepts = new Set<string>();
  if (application.department_id) distinctDepts.add(application.department_id);
  for (const pa of projectApprovals) {
    if ((pa as any).approval_type?.department_id) {
      distinctDepts.add((pa as any).approval_type.department_id);
    }
  }

  let adverseFindingsCount = 0;
  const scheduledInspections = application.inspections ?? [];
  for (const insp of scheduledInspections) {
    for (const finding of (insp as any).findings ?? []) {
      if (
        finding.severity === 'CRITICAL' ||
        finding.severity === 'HIGH' ||
        finding.status === 'NON_COMPLIANT'
      ) {
        adverseFindingsCount++;
      }
    }
  }

  const scrutinyPriority = calculateScrutinyPriority({
    application_status: application.status,
    required_documents_count: reqDocs,
    uploaded_documents_count: upDocs,
    prerequisites,
    concerned_departments_count: Math.max(1, distinctDepts.size),
    requires_inspection: approvalType?.requires_inspection ?? false,
    scheduled_inspections_count: scheduledInspections.length,
    open_queries_count: application.queries?.length ?? 0,
    sla_status: application.sla_instance?.status ?? null,
    sla_due_date: application.sla_instance?.due_date ?? null,
    adverse_findings_count: adverseFindingsCount,
  });

  return {
    ...application,
    scrutiny_priority: scrutinyPriority,
    project_approval: {
      ...application.project_approval,
      approval_type: {
        ...application.project_approval.approval_type,
        prescribed_form: prescribedForm,
      },
    },
  };
}

export async function updateApplicationStatus(id: string, status: string, actorId?: string, notes?: string) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id },
      include: {
        project_approval: {
          include: {
            approval_type: true,
            project: { include: { organization: true } },
          },
        },
        department: true,
      },
    });
    if (!app) throw new NotFoundError('Application not found');

    if (actorId) {
      const actor = await tx.user.findUnique({ where: { id: actorId } });
      if (actor) {
        if (['APPROVED', 'REJECTED'].includes(status)) {
          if (actor.role === 'ENTREPRENEUR' || actor.role === 'MANAGER') {
            throw new ForbiddenError(
              'Applicant / Investor cannot take statutory decisions on their own applications. Decisions must be taken by the Concerned Competent Authority Officer.'
            );
          }
          if (actor.role === 'NODAL') {
            throw new ForbiddenError(
              'MAITRI Nodal Officers provide inter-department facilitation and monitoring; statutory approval decisions must be taken by the Concerned Competent Authority Officer.'
            );
          }
          if (actor.role === 'INSPECTOR') {
            throw new ForbiddenError(
              'Designated Inspection Officers record inspection findings; statutory approval decisions must be taken by the Competent Authority Officer.'
            );
          }
          if (actor.role === 'OFFICER' && actor.department_id && app.department_id && actor.department_id !== app.department_id) {
            throw new ForbiddenError(
              'Cross-department jurisdiction violation: Only an officer of the Concerned Department / Authority can record approval or rejection.'
            );
          }
        }

        if (['UNDER_REVIEW', 'INSPECTION_SCHEDULED'].includes(status)) {
          if (actor.role === 'ENTREPRENEUR' || actor.role === 'MANAGER') {
            throw new ForbiddenError(
              'Scrutiny and inspection scheduling can only be initiated by the Concerned Competent Authority or Designated Inspection Officer.'
            );
          }
        }
      }
    }

    const updateData: any = { status: status as never };
    if (status === 'SUBMITTED' && !app.submitted_at) {
      updateData.submitted_at = new Date();
    }
    if ((status === 'APPROVED' || status === 'REJECTED' || status === 'CLOSED') && !app.completed_at) {
      updateData.completed_at = new Date();
    }

    const updated = await tx.application.update({ where: { id }, data: updateData });

    // Synchronize ProjectApproval status
    if (app.project_approval_id) {
      if (status === 'APPROVED') {
        await tx.projectApproval.update({
          where: { id: app.project_approval_id },
          data: { status: 'COMPLETED', actual_completion_date: new Date() },
        });
      } else if (['SUBMITTED', 'UNDER_REVIEW', 'INSPECTION_SCHEDULED', 'QUERY_RAISED'].includes(status)) {
        await tx.projectApproval.update({
          where: { id: app.project_approval_id },
          data: { status: 'IN_PROGRESS' },
        });
      }
    }

    await tx.applicationEvent.create({
      data: { application_id: id, actor_id: actorId, event_type: `status_changed:${status}`, notes },
    });

    // Simulated external gateway sync on submission (per plan §37)
    if (status === 'SUBMITTED') {
      const simGateway = await mockGovernmentAdapter.submitApplication(id);
      await tx.applicationEvent.create({
        data: {
          application_id: id,
          actor_id: actorId,
          event_type: 'external_gateway_sync',
          notes: `Simulated integration: Application forwarded to Concerned Authority gateway (Reference: ${simGateway.referenceId})`,
        },
      });
    }

    // Role-aware notification dispatching
    if (status === 'SUBMITTED') {
      await notifyApplicationSubmitted(
        app.application_number,
        app.project_approval?.approval_type?.name ?? 'Permission',
        app.department_id,
        app.project_approval?.project?.org_id
      );
    } else if (status === 'APPROVED' || status === 'REJECTED') {
      await notifyDecisionRecorded(
        app.application_number,
        app.project_approval?.approval_type?.name ?? 'Permission',
        status as 'APPROVED' | 'REJECTED',
        app.department?.name ?? 'Concerned Competent Authority',
        app.project_approval?.project?.org_id,
        notes
      );
    }

    return updated;
  });
}

export async function getApplicationTimeline(applicationId: string) {
  return prisma.applicationEvent.findMany({
    where: { application_id: applicationId },
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { timestamp: 'asc' },
  });
}

export async function recordCoordinationNote(
  applicationId: string,
  actorId: string,
  notes: string,
  eventType: string = 'nodal_coordination_note'
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project_approval: {
        include: {
          approval_type: true,
          project: { include: { organization: true } },
        },
      },
    },
  });
  if (!application) throw new NotFoundError('Application not found');

  const event = await prisma.applicationEvent.create({
    data: {
      application_id: applicationId,
      actor_id: actorId,
      event_type: eventType,
      notes,
    },
  });

  if (eventType === 'escalated_to_empowered_committee') {
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    await notifyEmpoweredCommitteeEscalation(
      application.application_number,
      application.project_approval?.approval_type?.name ?? 'Permission',
      application.department_id,
      application.project_approval?.project?.org_id,
      actor?.name ?? 'MAITRI Nodal Agency',
      notes
    );
  }

  return event;
}

export async function escalateApplication(applicationId: string, actorId: string, reason?: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project_approval: {
        include: {
          approval_type: true,
          project: { include: { organization: true } },
        },
      },
      department: true,
    },
  });
  if (!application) throw new NotFoundError('Application not found');

  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  const escalationNote =
    reason ||
    'Application exceeded specified statutory time limit. Transferred / Escalated to the Empowered Committee under Maharashtra Industry, Trade and Investment Facilitation Act, 2023 for statutory resolution.';

  const event = await prisma.applicationEvent.create({
    data: {
      application_id: applicationId,
      actor_id: actorId,
      event_type: 'escalated_to_empowered_committee',
      notes: escalationNote,
    },
  });

  await notifyEmpoweredCommitteeEscalation(
    application.application_number,
    application.project_approval?.approval_type?.name ?? 'Permission',
    application.department_id,
    application.project_approval?.project?.org_id,
    actor?.name ?? 'MAITRI Nodal Agency',
    escalationNote
  );

  return {
    success: true,
    application_id: applicationId,
    application_number: application.application_number,
    event,
    message: 'Application successfully transferred to the Empowered Committee under MAITRI Rules.',
  };
}

export async function attachDocument(applicationId: string, documentId: string) {
  return prisma.applicationDocument.upsert({
    where: { application_id_document_id: { application_id: applicationId, document_id: documentId } },
    update: {},
    create: { application_id: applicationId, document_id: documentId },
  });
}

export async function detachDocument(applicationId: string, documentId: string) {
  const ad = await prisma.applicationDocument.findFirst({
    where: { application_id: applicationId, document_id: documentId },
  });
  if (!ad) throw new NotFoundError('Attached document not found');
  return prisma.applicationDocument.delete({ where: { id: ad.id } });
}

/**
 * POST /api/applications/:id/readiness-check
 *
 * Platform-level submission readiness validation.
 * This checks completeness from the platform's perspective —
 * it does NOT constitute legal or regulatory validation.
 *
 * Checks:
 *  - All mandatory DocumentRequirements for the linked ApprovalType have a matching ApplicationDocument
 *  - Attached documents are VERIFIED (not PENDING / REJECTED / EXPIRED)
 *  - No document is expired (expiry_date < today)
 *  - No document expires within 30 days (warning)
 *  - Application has a department set
 *  - Application status is appropriate for submission
 *
 * (IMPLEMENTATION_PLAN.md §17)
 */
export async function runReadinessCheck(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project_approval: {
        include: {
          approval_type: {
            include: { document_requirements: true },
          },
          project: { include: { organization: true } },
        },
      },
      application_documents: { include: { document: true } },
      department: true,
    },
  });

  if (!application) throw new NotFoundError('Application not found');

  const issues: string[] = [];
  const warnings: string[] = [];
  const checks: Array<{ description: string; status: 'pass' | 'fail' | 'warn' }> = [];

  const mandatoryRequirements = application.project_approval.approval_type.document_requirements.filter(
    (dr) => dr.mandatory
  );

  const attachedDocMap = new Map<string, any>(
    application.application_documents.map((ad) => [ad.document.document_type, ad])
  );

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);

  // Check each mandatory document requirement
  for (const req of mandatoryRequirements) {
    const attached = attachedDocMap.get(req.document_type);

    if (!attached) {
      issues.push(`Required document missing: "${req.document_type}"`);
      checks.push({ description: `Document present: ${req.document_type}`, status: 'fail' });
      continue;
    }

    const doc = attached.document;
    checks.push({ description: `Document present: ${req.document_type}`, status: 'pass' });

    // Check verification status
    if (doc.verification_status === 'REJECTED') {
      issues.push(`Document rejected: "${req.document_type}" — please upload a replacement.`);
      checks.push({ description: `Document accepted: ${req.document_type}`, status: 'fail' });
    } else if (doc.verification_status === 'EXPIRED') {
      issues.push(`Document expired: "${req.document_type}" — renewal required.`);
      checks.push({ description: `Document valid: ${req.document_type}`, status: 'fail' });
    } else if (doc.verification_status === 'PENDING') {
      warnings.push(`Document pending verification: "${req.document_type}" — awaiting review.`);
      checks.push({ description: `Document verified: ${req.document_type}`, status: 'warn' });
    } else {
      checks.push({ description: `Document verified: ${req.document_type}`, status: 'pass' });
    }

    // Check expiry
    if (doc.expiry_date) {
      if (doc.expiry_date < now) {
        issues.push(`Document expired (${doc.expiry_date.toDateString()}): "${req.document_type}"`);
        checks.push({ description: `Document not expired: ${req.document_type}`, status: 'fail' });
      } else if (doc.expiry_date < in30Days) {
        warnings.push(`Document expiring soon (${doc.expiry_date.toDateString()}): "${req.document_type}" — consider renewing before submission.`);
        checks.push({ description: `Document not expiring within 30 days: ${req.document_type}`, status: 'warn' });
      } else {
        checks.push({ description: `Document not expiring within 30 days: ${req.document_type}`, status: 'pass' });
      }
    }
  }

  // Check department is set
  if (!application.department_id) {
    issues.push('No department selected for this application.');
    checks.push({ description: 'Department selected', status: 'fail' });
  } else {
    checks.push({ description: 'Department selected', status: 'pass' });
  }

  // Check application is in submittable state
  const submittableStatuses = ['IN_PREPARATION', 'AWAITING_APPLICANT', 'NOT_STARTED', 'READY_TO_START'];
  if (!submittableStatuses.includes(application.status)) {
    warnings.push(`Application is currently in status "${application.status}" — submission may not be appropriate at this stage.`);
    checks.push({ description: 'Application status allows submission', status: 'warn' });
  } else {
    checks.push({ description: 'Application status allows submission', status: 'pass' });
  }

  const ready = issues.length === 0;

  return {
    ready,
    application_number: application.application_number,
    approval_name: application.project_approval.approval_type.name,
    checked_at: now,
    issues,
    warnings,
    checks,
    label: ready
      ? 'Platform readiness check passed — this is a platform-level completeness check, not a legal validation.'
      : 'Platform readiness check failed — please resolve all issues before submission.',
  };
}

export async function getSimulatedGatewayStatus(applicationId: string) {
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) throw new NotFoundError('Application not found');
  return mockGovernmentAdapter.getApplicationStatus(applicationId);
}

/**
 * POST /api/projects/:id/start-eligible-applications (PS 26130 P0.3)
 * Orchestrates parallel application start for eligible ProjectApprovals:
 * - identifies ProjectApproval records that can start now (prerequisites completed/none)
 * - excludes already-started/completed applications
 * - creates missing application workspaces in IN_PREPARATION status
 * - preserves prerequisite/dependency rules
 * - does not bypass required documents or auto-submit
 * - does not create duplicate applications
 */
export async function startEligibleApplications(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('Project not found');

  const projectApprovals = await prisma.projectApproval.findMany({
    where: { project_id: projectId },
    include: {
      approval_type: true,
      application: true,
    },
  });

  const approvalTypeIds = projectApprovals.map((pa) => pa.approval_type_id);
  const paByTypeId = new Map<string, any>(projectApprovals.map((pa) => [pa.approval_type_id, pa]));

  const dependencies = await prisma.approvalDependency.findMany({
    where: {
      prerequisite_approval_type_id: { in: approvalTypeIds },
      dependent_approval_type_id: { in: approvalTypeIds },
      dependency_type: 'PREREQUISITE',
    },
    include: { prerequisite_approval: true },
  });

  const started: Array<{
    project_approval_id: string;
    approval_name: string;
    authority: string;
    application_id: string;
    application_number: string;
    status: string;
  }> = [];

  const alreadyActive: Array<{
    project_approval_id: string;
    approval_name: string;
    application_id: string;
    application_number: string;
    status: string;
  }> = [];

  const blockedByPrerequisites: Array<{
    project_approval_id: string;
    approval_name: string;
    missing_prerequisites: string[];
  }> = [];

  for (const pa of projectApprovals) {
    if (pa.status === 'COMPLETED') continue;

    // Check if application already exists
    if (pa.application) {
      alreadyActive.push({
        project_approval_id: pa.id,
        approval_name: pa.approval_type.name,
        application_id: pa.application.id,
        application_number: pa.application.application_number,
        status: pa.application.status,
      });
      continue;
    }

    // Check prerequisites
    const prereqs = dependencies.filter((d) => d.dependent_approval_type_id === pa.approval_type_id);
    const incompletePrereqs = prereqs.filter((d) => {
      const prereqPA = paByTypeId.get(d.prerequisite_approval_type_id);
      return prereqPA?.status !== 'COMPLETED';
    });

    if (incompletePrereqs.length > 0) {
      blockedByPrerequisites.push({
        project_approval_id: pa.id,
        approval_name: pa.approval_type.name,
        missing_prerequisites: incompletePrereqs.map(
          (d) => d.prerequisite_approval?.name || d.prerequisite_approval_type_id
        ),
      });
      continue;
    }

    // Eligible! Create missing workspace
    const app = await createApplication(pa.id);
    await prisma.projectApproval.update({
      where: { id: pa.id },
      data: { status: 'IN_PROGRESS' },
    });

    started.push({
      project_approval_id: pa.id,
      approval_name: pa.approval_type.name,
      authority: pa.approval_type.authority,
      application_id: app.id,
      application_number: app.application_number,
      status: app.status,
    });
  }

  return {
    started,
    already_active: alreadyActive,
    blocked_by_prerequisites: blockedByPrerequisites,
    summary: {
      started_count: started.length,
      already_active_count: alreadyActive.length,
      blocked_count: blockedByPrerequisites.length,
    },
  };
}

