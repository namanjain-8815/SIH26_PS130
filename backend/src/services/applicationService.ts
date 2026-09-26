import { prisma } from '../lib/prisma';
import { NotFoundError, NotImplementedError } from '../lib/errors';

export async function listApplications(projectId: string) {
  return prisma.application.findMany({
    where: { project_approval: { project_id: projectId } },
    include: { project_approval: { include: { approval_type: true } }, department: true },
  });
}

export async function createApplication(projectApprovalId: string, departmentId: string) {
  const application_number = `APP-${Date.now().toString(36).toUpperCase()}`;
  return prisma.application.create({
    data: {
      project_approval_id: projectApprovalId,
      department_id: departmentId,
      application_number,
    },
  });
}

export async function getApplication(id: string) {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      project_approval: { include: { approval_type: true, project: true } },
      department: true,
      application_documents: { include: { document: true } },
      queries: true,
      inspections: true,
      sla_instance: true,
    },
  });
  if (!application) throw new NotFoundError('Application not found');
  return application;
}

export async function updateApplicationStatus(id: string, status: string, actorId?: string, notes?: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({ where: { id }, data: { status: status as never } });
    await tx.applicationEvent.create({
      data: { application_id: id, actor_id: actorId, event_type: `status_changed:${status}`, notes },
    });
    return updated;
  });
}

export async function getApplicationTimeline(applicationId: string) {
  return prisma.applicationEvent.findMany({
    where: { application_id: applicationId },
    orderBy: { timestamp: 'asc' },
  });
}

/**
 * TODO (plan §17): platform-level submission readiness check — verify every
 * mandatory DocumentRequirement for the linked approval type has a
 * matching, verified, non-expired ApplicationDocument, plus the cross-field
 * checks in §17 (org name matches profile, project info present, etc).
 * Return { ready: boolean, checks: [...], warnings: [...] }. This is
 * platform-level submission readiness validation, never legal validation —
 * word it that way in the UI.
 */
export async function runReadinessCheck(_applicationId: string) {
  throw new NotImplementedError('runReadinessCheck: build per IMPLEMENTATION_PLAN.md §17');
}
