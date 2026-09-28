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

  // Check project vault for reuse availability
  const vaultDocs = await prisma.document.findMany({
    where: { project_id: application.project_approval.project_id },
  });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);

  // Check each mandatory document requirement
  for (const req of mandatoryRequirements) {
    const attached = attachedDocMap.get(req.document_type);

    if (!attached) {
      issues.push(`Required document missing: "${req.document_type}"`);
      checks.push({ description: `Document present: ${req.document_type}`, status: 'fail' });

      const vaultMatch = vaultDocs.find(
        (vd) =>
          vd.document_type.toLowerCase() === req.document_type.toLowerCase() &&
          vd.verification_status !== 'REJECTED'
      );
      if (vaultMatch) {
        warnings.push(
          `Document "${req.document_type}" is in your Document Vault and can be attached with 1-click.`
        );
      }
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

  // Cross-Document Consistency Evaluation (Milestone P0.5)
  let consistencyResult: any = null;
  try {
    const { checkApplicationDocumentConsistency } = await import(
      './crossDocumentConsistencyService'
    );
    consistencyResult = await checkApplicationDocumentConsistency(applicationId);

    for (const c of consistencyResult.checks) {
      if (c.status === 'DISCREPANCY' && c.severity === 'BLOCKING') {
        issues.push(`Cross-document discrepancy (${c.field_name}): ${c.difference_summary}`);
        checks.push({
          description: `Cross-document consistency: ${c.field_name}`,
          status: 'fail',
        });
      } else if (c.status === 'DISCREPANCY') {
        warnings.push(`Cross-document discrepancy (${c.field_name}): ${c.difference_summary}`);
        checks.push({
          description: `Cross-document consistency: ${c.field_name}`,
          status: 'warn',
        });
      } else if (c.status === 'MANUAL_REVIEW') {
        warnings.push(`Manual verification required for ${c.document_a.file_name}: non-machine-readable format.`);
        checks.push({
          description: `Machine-readable format: ${c.document_a.document_type}`,
          status: 'warn',
        });
      } else if (c.status === 'PASS') {
        checks.push({
          description: `Cross-document consistency: ${c.field_name}`,
          status: 'pass',
        });
      }
    }
  } catch {
    // Non-blocking fallback
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
    cross_document_consistency: consistencyResult,
    document_summary: {
      total_mandatory: mandatoryRequirements.length,
      attached_mandatory: mandatoryRequirements.filter((r) => attachedDocMap.has(r.document_type)).length,
      missing_mandatory: mandatoryRequirements.filter((r) => !attachedDocMap.has(r.document_type)).length,
      reusable_from_vault: mandatoryRequirements.filter(
        (r) =>
          !attachedDocMap.has(r.document_type) &&
          vaultDocs.some(
            (vd) =>
              vd.document_type.toLowerCase() === r.document_type.toLowerCase() &&
              vd.verification_status !== 'REJECTED'
          )
      ).length,
    },
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

// ---------------------------------------------------------------------------
// Milestone P0.4 — Common Application Form / Pre-Populated Application Service
// ---------------------------------------------------------------------------

export interface DepartmentSupplementalField {
  id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'textarea';
  value: string | number;
  unit?: string;
  options?: string[];
  required: boolean;
  help_text?: string;
  source_label: string;
  is_verified_source: boolean;
}

export interface ApplicationFormData {
  application_id: string;
  application_number: string;
  status: string;
  submitted_at: Date | null;
  department: {
    id: string;
    name: string;
    code?: string;
  };
  approval_type: {
    id: string;
    name: string;
    authority: string;
    category: string;
  };
  master_profile: any;
  common_applicant_data: Array<{
    key: string;
    label: string;
    value: string;
    source_label: string;
    verified: boolean;
  }>;
  common_project_data: Array<{
    key: string;
    label: string;
    value: string;
    source_label: string;
    verified: boolean;
  }>;
  location_data: Array<{
    key: string;
    label: string;
    value: string;
    source_label: string;
    verified: boolean;
  }>;
  department_specific_fields: DepartmentSupplementalField[];
  attachments_summary: {
    required_count: number;
    attached_count: number;
    mandatory_missing_count: number;
    all_mandatory_attached: boolean;
    items: Array<{
      document_type: string;
      mandatory: boolean;
      condition?: string;
      attached: boolean;
      document_id?: string;
      file_name?: string;
      status?: string;
    }>;
  };
  prescribed_form: any;
  is_locked: boolean;
}

function getDepartmentFieldsForApproval(
  approvalType: any,
  applicationId: string,
  attrMap: Record<string, string>,
  project: any
): DepartmentSupplementalField[] {
  const name = (approvalType.name || '').toLowerCase();
  const authority = (approvalType.authority || '').toLowerCase();
  const category = (approvalType.category || '').toLowerCase();

  const getValue = (
    key: string,
    fallbackKey?: string,
    defaultValue: string | number = ''
  ): { val: string | number; fromMaster: boolean } => {
    const appKey = `app:${applicationId}:${key}`;
    if (attrMap[appKey] !== undefined && attrMap[appKey] !== '') {
      return { val: attrMap[appKey], fromMaster: false };
    }
    if (fallbackKey && attrMap[fallbackKey] !== undefined && attrMap[fallbackKey] !== '') {
      return { val: attrMap[fallbackKey], fromMaster: true };
    }
    return { val: defaultValue, fromMaster: false };
  };

  const fields: DepartmentSupplementalField[] = [];

  if (
    name.includes('consent') ||
    name.includes('pollution') ||
    authority.includes('mpcb') ||
    category.includes('environment')
  ) {
    const water = getValue('water_consumption_kld', 'water_requirement_kld', 150);
    const effluent = getValue('effluent_generation_kld', 'effluent_generation_kld', 110);
    const etp = getValue('etp_proposed_capacity', 'etp_capacity_kld', 120);
    const fuel = getValue('boiler_fuel_type', undefined, 'PNG / Natural Gas');
    const stack = getValue('chimney_stack_height_m', undefined, 30);
    const haz = getValue('hazardous_waste_category', 'waste_type', 'Cat 5.1 Used Oil & ETP Sludge');

    fields.push(
      {
        id: 'water_consumption_kld',
        field_key: 'water_consumption_kld',
        label: 'Daily Water Consumption (Domestic + Process)',
        field_type: 'number',
        value: water.val,
        unit: 'KLD',
        required: true,
        help_text: 'Daily volume of water required for manufacturing and plant services.',
        source_label: water.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: water.fromMaster,
      },
      {
        id: 'effluent_generation_kld',
        field_key: 'effluent_generation_kld',
        label: 'Industrial & Domestic Effluent Generation',
        field_type: 'number',
        value: effluent.val,
        unit: 'KLD',
        required: true,
        help_text: 'Anticipated total liquid effluent generation requiring treatment.',
        source_label: effluent.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: effluent.fromMaster,
      },
      {
        id: 'etp_proposed_capacity',
        field_key: 'etp_proposed_capacity',
        label: 'Proposed ETP / STP Hydraulic Treatment Capacity',
        field_type: 'number',
        value: etp.val,
        unit: 'KLD',
        required: true,
        help_text: 'Installed handling capacity of effluent and sewage treatment plants.',
        source_label: etp.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: etp.fromMaster,
      },
      {
        id: 'boiler_fuel_type',
        field_key: 'boiler_fuel_type',
        label: 'Boiler / Thermic Heater Fuel Type',
        field_type: 'select',
        value: fuel.val,
        options: [
          'PNG / Natural Gas',
          'Biomass / Agricultural Briquettes',
          'Furnace Oil',
          'Low Sulphur Heavy Stock (LSHS)',
          'Electricity / Induction',
          'Not Applicable',
        ],
        required: true,
        help_text: 'Primary energy fuel for thermal operations and steam boilers.',
        source_label: fuel.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: fuel.fromMaster,
      },
      {
        id: 'chimney_stack_height_m',
        field_key: 'chimney_stack_height_m',
        label: 'Emission Chimney / Stack Height Above Ground',
        field_type: 'number',
        value: stack.val,
        unit: 'Metres',
        required: true,
        help_text: 'Stack height per CPCB/MPCB environmental dispersion standards.',
        source_label: stack.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: stack.fromMaster,
      },
      {
        id: 'hazardous_waste_category',
        field_key: 'hazardous_waste_category',
        label: 'Hazardous Waste Classification (Rule 3/Schedule 1)',
        field_type: 'text',
        value: haz.val,
        required: false,
        help_text: 'Schedule I hazardous waste stream categories and annual volumes.',
        source_label: haz.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: haz.fromMaster,
      }
    );
  } else if (name.includes('factory') || authority.includes('dish') || category.includes('factory')) {
    const power = getValue('installed_power_hp', 'connected_load_kva', 750);
    const builtup = getValue('factory_builtup_area_sqm', 'built_up_area_sqm', 5500);
    const workers = getValue(
      'max_shift_workers',
      undefined,
      project.employee_count ? Math.ceil(project.employee_count / 2) : 60
    );
    const hazProc = getValue('hazardous_process_declared', undefined, 'No - General Non-Hazardous Manufacturing');
    const processDesc = getValue(
      'manufacturing_process_summary',
      undefined,
      'Automated receiving, sorting, processing, aseptic packing, and automated palletized warehousing.'
    );

    fields.push(
      {
        id: 'installed_power_hp',
        field_key: 'installed_power_hp',
        label: 'Total Installed Prime Movers & Electric Power',
        field_type: 'number',
        value: power.val,
        unit: 'HP / kW',
        required: true,
        help_text: 'Total aggregate rated horsepower of all factory machinery prime movers.',
        source_label: power.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: power.fromMaster,
      },
      {
        id: 'factory_builtup_area_sqm',
        field_key: 'factory_builtup_area_sqm',
        label: 'Enclosed Factory Shop Floor Area',
        field_type: 'number',
        value: builtup.val,
        unit: 'sq.m',
        required: true,
        help_text: 'Total constructed manufacturing floor area subject to factory layout rules.',
        source_label: builtup.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: builtup.fromMaster,
      },
      {
        id: 'max_shift_workers',
        field_key: 'max_shift_workers',
        label: 'Maximum Workers in Any Single Shift',
        field_type: 'number',
        value: workers.val,
        unit: 'Workers',
        required: true,
        help_text: 'Peak human occupancy per shift for space and ventilation compliance.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'hazardous_process_declared',
        field_key: 'hazardous_process_declared',
        label: 'Hazardous Process Declaration (Section 2cb)',
        field_type: 'select',
        value: hazProc.val,
        options: [
          'No - General Non-Hazardous Manufacturing',
          'Yes - Section 87 Hazardous Chemical/Pressure Operations',
        ],
        required: true,
        help_text: 'Self-certification under First Schedule of Maharashtra Factories Rules.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'manufacturing_process_summary',
        field_key: 'manufacturing_process_summary',
        label: 'Manufacturing Process Description & Machinery Flow',
        field_type: 'textarea',
        value: processDesc.val,
        required: false,
        help_text: 'Step-by-step manufacturing and handling overview.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      }
    );
  } else if (name.includes('fire') || category.includes('fire')) {
    const height = getValue('building_height_m', undefined, 14.5);
    const tank = getValue('fire_tank_capacity_litres', undefined, 100000);
    const sprinkler = getValue('sprinkler_coverage_pct', undefined, 100);
    const road = getValue('internal_access_road_width_m', undefined, 9.0);

    fields.push(
      {
        id: 'building_height_m',
        field_key: 'building_height_m',
        label: 'Height of Highest Building / Shed',
        field_type: 'number',
        value: height.val,
        unit: 'Metres',
        required: true,
        help_text: 'Height measured from the lowest fire tender access road to eaves/terrace.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'fire_tank_capacity_litres',
        field_key: 'fire_tank_capacity_litres',
        label: 'Static Fire Reserve Water Storage Capacity',
        field_type: 'number',
        value: tank.val,
        unit: 'Litres',
        required: true,
        help_text: 'Underground / overhead dedicated water reservoir capacity exclusively reserved for fire suppression.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'sprinkler_coverage_pct',
        field_key: 'sprinkler_coverage_pct',
        label: 'Internal Automatic Sprinkler Coverage',
        field_type: 'number',
        value: sprinkler.val,
        unit: '%',
        required: true,
        help_text: 'Percentage of shop floor and warehouse area under automatic sprinklers.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'internal_access_road_width_m',
        field_key: 'internal_access_road_width_m',
        label: 'Peripheral Fire Tender Access Road Width',
        field_type: 'number',
        value: road.val,
        unit: 'Metres',
        required: true,
        help_text: 'Clear roadway for fire tender navigation with turning radius.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      }
    );
  } else if (
    name.includes('power') ||
    name.includes('electricity') ||
    authority.includes('msedcl') ||
    category.includes('utilities')
  ) {
    const demand = getValue('contract_demand_kva', 'connected_load_kva', 1000);
    const voltage = getValue('supply_voltage_kv', undefined, '22 kV');
    const feeder = getValue('substation_feeder_name', undefined, 'MIDC Bhosari 33/11 kV Express Feeder');
    const dg = getValue('dg_backup_capacity_kva', undefined, 250);

    fields.push(
      {
        id: 'contract_demand_kva',
        field_key: 'contract_demand_kva',
        label: 'Sanctioned Contract Demand',
        field_type: 'number',
        value: demand.val,
        unit: 'kVA',
        required: true,
        help_text: 'Peak apparent power contract demand requested from MSEDCL.',
        source_label: demand.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: demand.fromMaster,
      },
      {
        id: 'supply_voltage_kv',
        field_key: 'supply_voltage_kv',
        label: 'Requested HT Supply Voltage Level',
        field_type: 'select',
        value: voltage.val,
        options: ['11 kV', '22 kV', '33 kV', '66 kV / 132 kV EHV'],
        required: true,
        help_text: 'Operating voltage for incoming dedicated underground cable or overhead line.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'substation_feeder_name',
        field_key: 'substation_feeder_name',
        label: 'Nearest MSEDCL Substation / Feeder Name',
        field_type: 'text',
        value: feeder.val,
        required: true,
        help_text: 'Designated feeder substation identified in load feasibility study.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'dg_backup_capacity_kva',
        field_key: 'dg_backup_capacity_kva',
        label: 'Captive DG Standby Capacity',
        field_type: 'number',
        value: dg.val,
        unit: 'kVA',
        required: false,
        help_text: 'Standby backup power generator capacity installed at site.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      }
    );
  } else if (name.includes('water') || authority.includes('midc water')) {
    const water = getValue('daily_water_demand_kld', 'water_requirement_kld', 150);
    const pipe = getValue('pipeline_connection_size_mm', undefined, '50 mm (2 inch)');
    const subsoil = getValue('groundwater_extraction_planned', undefined, 'No - 100% MIDC Surface Water Supply');

    fields.push(
      {
        id: 'daily_water_demand_kld',
        field_key: 'daily_water_demand_kld',
        label: 'Required Daily Supply Quantity',
        field_type: 'number',
        value: water.val,
        unit: 'KLD',
        required: true,
        help_text: 'Daily piped water allocation requested from MIDC pipeline network.',
        source_label: water.fromMaster ? 'From Verified Project Profile' : 'Department Supplemental Field',
        is_verified_source: water.fromMaster,
      },
      {
        id: 'pipeline_connection_size_mm',
        field_key: 'pipeline_connection_size_mm',
        label: 'Requested Meter Connection Pipe Size',
        field_type: 'select',
        value: pipe.val,
        options: ['25 mm (1 inch)', '50 mm (2 inch)', '80 mm (3 inch)', '100 mm (4 inch)', '150 mm (6 inch)'],
        required: true,
        help_text: 'Diameter of tapping pipe connection to be installed by MIDC engineers.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'groundwater_extraction_planned',
        field_key: 'groundwater_extraction_planned',
        label: 'Subsoil / Borewell Groundwater Extraction',
        field_type: 'select',
        value: subsoil.val,
        options: ['No - 100% MIDC Surface Water Supply', 'Yes - Combined CGWA / Subsoil Extraction'],
        required: true,
        help_text: 'Statutory declaration regarding groundwater usage.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      }
    );
  } else if (name.includes('fssai') || category.includes('food')) {
    const kind = getValue('food_business_kind', undefined, 'Food Manufacturing / Processing');
    const cap = getValue('daily_installed_capacity_mt', undefined, 25);
    const cold = getValue('cold_chain_installed', undefined, 'Yes - Dedicated Cold Room / Freezers Present');
    const pot = getValue('water_potability_source', undefined, 'MIDC Industrial Piped Supply with On-Site RO System');

    fields.push(
      {
        id: 'food_business_kind',
        field_key: 'food_business_kind',
        label: 'Category of Food Business Operation (Kind of Business)',
        field_type: 'select',
        value: kind.val,
        options: [
          'Food Manufacturing / Processing',
          'Packaging & Relabelling',
          'Cold Storage & Warehousing',
          'Wholesale & Distribution',
        ],
        required: true,
        help_text: 'Operational category under Schedule 2 Form B regulations.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'daily_installed_capacity_mt',
        field_key: 'daily_installed_capacity_mt',
        label: 'Installed Daily Food Processing Capacity',
        field_type: 'number',
        value: cap.val,
        unit: 'MT / Day',
        required: true,
        help_text: 'Gross maximum daily throughput capacity of processing equipment.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'cold_chain_installed',
        field_key: 'cold_chain_installed',
        label: 'Cold Chain / Temperature-Controlled Storage',
        field_type: 'select',
        value: cold.val,
        options: ['Yes - Dedicated Cold Room / Freezers Present', 'No - Ambient Temperature Processing Only'],
        required: true,
        help_text: 'Chilled or deep-freeze facilities for perishable ingredients/finished foods.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'water_potability_source',
        field_key: 'water_potability_source',
        label: 'Source of Potable Processing Water (IS 10500)',
        field_type: 'text',
        value: pot.val,
        required: true,
        help_text: 'Testing and potability certification compliance for water ingredient.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      }
    );
  } else {
    // General / Other clearances
    const desc = getValue(
      'proposed_activity_description',
      undefined,
      `${project.name} - ${project.sector} operations at ${project.district}`
    );
    const remarks = getValue(
      'statutory_remarks',
      undefined,
      'All statutory terms, safety regulations, and environmental standards shall be strictly complied with.'
    );

    fields.push(
      {
        id: 'proposed_activity_description',
        field_key: 'proposed_activity_description',
        label: 'Specific Operational Activity & Scope',
        field_type: 'textarea',
        value: desc.val,
        required: true,
        help_text: 'Specific activity requiring approval under this department jurisdiction.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      },
      {
        id: 'statutory_remarks',
        field_key: 'statutory_remarks',
        label: 'Statutory Undertaking & Remarks',
        field_type: 'textarea',
        value: remarks.val,
        required: false,
        help_text: 'Self-declaration and undertakings provided by the applicant.',
        source_label: 'Department Supplemental Field',
        is_verified_source: false,
      }
    );
  }

  return fields;
}

export async function getApplicationForm(applicationId: string): Promise<ApplicationFormData> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
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
              project_approvals: { include: { approval_type: true } },
            },
          },
        },
      },
      department: true,
      application_documents: { include: { document: true } },
      sla_instance: true,
    },
  });

  if (!application) throw new NotFoundError('Application not found');

  const { getProjectProfile } = await import('./projectService');
  const project = application.project_approval.project;
  const approvalType = application.project_approval.approval_type;
  const profile = await getProjectProfile(project.id);

  const rawAttrs = project.attributes || [];
  const attrMap: Record<string, string> = {};
  for (const a of rawAttrs) {
    attrMap[a.key] = a.value;
  }

  const common_applicant_data = [
    {
      key: 'legal_name',
      label: 'Legal Entity Name',
      value: profile.entity.legal_name,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'entity_type',
      label: 'Business Constitution / Entity Type',
      value: profile.entity.entity_type,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'pan',
      label: 'Permanent Account Number (PAN)',
      value: profile.entity.pan,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'gstin',
      label: 'GSTIN Registration',
      value: profile.entity.gstin,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'cin',
      label: 'Corporate Identification Number (CIN)',
      value: profile.entity.cin,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'registered_address',
      label: 'Registered Corporate Office Address',
      value: profile.entity.registered_address,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'authorized_signatory',
      label: 'Authorized Signatory / Representative',
      value: attrMap['signatory_name'] || 'Rajesh Mehta (Managing Director)',
      source_label: 'From Verified Project Profile',
      verified: true,
    },
  ];

  const common_project_data = [
    {
      key: 'project_name',
      label: 'Project Proposal Title',
      value: profile.proposal.name,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'sector',
      label: 'Industrial Sector / Activity',
      value: profile.proposal.sector,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'investment_amount',
      label: 'Gross Capital Investment',
      value: `₹${(profile.proposal.investment_amount / 10_000_000).toFixed(2)} Crores`,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'employee_count',
      label: 'Proposed Total Workforce',
      value: `${profile.proposal.employee_count} Persons`,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'stage',
      label: 'Project Lifecycle Stage',
      value: profile.proposal.stage,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'target_start_date',
      label: 'Proposed Commercial Operation Date',
      value: profile.proposal.target_start_date
        ? new Date(profile.proposal.target_start_date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Q4 2026',
      source_label: 'From Verified Project Profile',
      verified: true,
    },
  ];

  const location_data = [
    {
      key: 'district',
      label: 'Revenue District',
      value: profile.location.district,
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'industrial_area',
      label: 'MIDC Industrial Area / Zone',
      value: profile.location.industrial_area || 'Not in designated MIDC zone',
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'site_address',
      label: 'Site Address / Plot Number',
      value: profile.location.address || 'MIDC Industrial Area',
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'taluka',
      label: 'Taluka',
      value: attrMap['taluka'] || 'Haveli',
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'village',
      label: 'Village / Locality',
      value: attrMap['village'] || 'Bhosari',
      source_label: 'From Verified Project Profile',
      verified: true,
    },
    {
      key: 'survey_number',
      label: 'Survey / Gat / Plot No.',
      value: attrMap['survey_number'] || 'Plot No. 42',
      source_label: 'From Verified Project Profile',
      verified: true,
    },
  ];

  const deptFields = getDepartmentFieldsForApproval(approvalType, applicationId, attrMap, project);

  const attachedMap = new Map(
    application.application_documents.map((ad: any) => [ad.document.document_type, ad])
  );
  const reqItems = (approvalType.document_requirements || []).map((req: any) => {
    const attached = attachedMap.get(req.document_type);
    return {
      document_type: req.document_type,
      mandatory: !!req.mandatory,
      condition: req.condition,
      attached: !!attached,
      document_id: attached?.document?.id,
      file_name: attached?.document?.file_name,
      status: attached?.document?.status,
    };
  });

  const mandatoryMissing = reqItems.filter((i: any) => i.mandatory && !i.attached);
  const prescribedForm = getPrescribedFormForApproval(approvalType.name);

  const isLocked = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'INSPECTION_SCHEDULED',
    'APPROVED',
    'REJECTED',
  ].includes(application.status);

  return {
    application_id: application.id,
    application_number: application.application_number,
    status: application.status,
    submitted_at: application.submitted_at,
    department: {
      id: application.department.id,
      name: application.department.name,
      code: application.department.code,
    },
    approval_type: {
      id: approvalType.id,
      name: approvalType.name,
      authority: approvalType.authority,
      category: approvalType.category,
    },
    master_profile: profile,
    common_applicant_data,
    common_project_data,
    location_data,
    department_specific_fields: deptFields,
    attachments_summary: {
      required_count: reqItems.length,
      attached_count: application.application_documents.length,
      mandatory_missing_count: mandatoryMissing.length,
      all_mandatory_attached: mandatoryMissing.length === 0,
      items: reqItems,
    },
    prescribed_form: prescribedForm,
    is_locked: isLocked,
  };
}

export async function saveApplicationForm(
  applicationId: string,
  departmentValues: Record<string, any>,
  actorId?: string,
  notes?: string
): Promise<ApplicationFormData> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project_approval: { include: { project: true } },
    },
  });

  if (!application) throw new NotFoundError('Application not found');

  const lockedStates = ['SUBMITTED', 'UNDER_REVIEW', 'INSPECTION_SCHEDULED', 'APPROVED', 'REJECTED'];
  if (lockedStates.includes(application.status)) {
    throw new ForbiddenError('Application is already submitted and locked for review');
  }

  const projectId = application.project_approval.project_id;

  const ops: Promise<any>[] = [];
  for (const [key, value] of Object.entries(departmentValues)) {
    const attributeKey = `app:${applicationId}:${key}`;
    const stringVal = value !== null && value !== undefined ? String(value) : '';
    ops.push(
      prisma.projectAttribute.upsert({
        where: { project_id_key: { project_id: projectId, key: attributeKey } },
        update: { value: stringVal },
        create: { project_id: projectId, key: attributeKey, value: stringVal },
      })
    );
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  if (application.status === 'NOT_STARTED' || application.status === 'READY_TO_START') {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'IN_PREPARATION' },
    });
  }

  await prisma.applicationEvent.create({
    data: {
      application_id: applicationId,
      actor_id: actorId,
      event_type: 'form_saved',
      notes:
        notes ||
        `Common Application Form draft saved with ${Object.keys(departmentValues).length} department-specific fields.`,
    },
  });

  return getApplicationForm(applicationId);
}

export async function submitApplicationFromForm(
  applicationId: string,
  departmentValues?: Record<string, any>,
  actorId?: string,
  notes?: string
) {
  if (departmentValues && Object.keys(departmentValues).length > 0) {
    await saveApplicationForm(applicationId, departmentValues, actorId, notes);
  }

  const form = await getApplicationForm(applicationId);

  // Validate mandatory department fields
  for (const field of form.department_specific_fields) {
    if (
      field.required &&
      (field.value === '' || field.value === null || field.value === undefined)
    ) {
      const { BadRequestError } = await import('../lib/errors');
      throw new BadRequestError(`Mandatory department field "${field.label}" must be completed.`);
    }
  }

  // Validate mandatory document requirements
  if (!form.attachments_summary.all_mandatory_attached) {
    const { BadRequestError } = await import('../lib/errors');
    throw new BadRequestError(
      `Cannot submit application: ${form.attachments_summary.mandatory_missing_count} mandatory document(s) are missing.`
    );
  }

  const updated = await updateApplicationStatus(
    applicationId,
    'SUBMITTED',
    actorId,
    notes || 'Submitted via Common Application Form'
  );

  return {
    success: true,
    application: updated,
    message: `Application ${form.application_number} submitted successfully to ${form.department.name}.`,
  };
}


