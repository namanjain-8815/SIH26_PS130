import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

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
      project_approval: { include: { approval_type: { include: { document_requirements: true } }, project: true } },
      department: true,
      application_documents: { include: { document: true } },
      queries: { include: { responses: true, creator: true }, orderBy: { created_at: 'desc' } },
      inspections: { include: { inspector: true, findings: true }, orderBy: { scheduled_date: 'asc' } },
      sla_instance: true,
      events: { orderBy: { timestamp: 'asc' } },
    },
  });
  if (!application) throw new NotFoundError('Application not found');
  return application;
}

export async function updateApplicationStatus(id: string, status: string, actorId?: string, notes?: string) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id },
      include: { project_approval: true },
    });
    if (!app) throw new NotFoundError('Application not found');

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
