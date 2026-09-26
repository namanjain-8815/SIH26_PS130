import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export async function listProjectInspections(projectId: string) {
  return prisma.inspection.findMany({
    where: { application: { project_approval: { project_id: projectId } } },
    include: {
      department: true,
      inspector: { select: { id: true, name: true, email: true } },
      application: { include: { project_approval: { include: { approval_type: true } } } },
      findings: true,
    },
    orderBy: { scheduled_date: 'asc' },
  });
}

export async function listInspectorInspections(inspectorId: string) {
  return prisma.inspection.findMany({
    where: { inspector_id: inspectorId },
    include: {
      department: true,
      application: { include: { project_approval: { include: { project: true, approval_type: true } } } },
      findings: true,
    },
    orderBy: { scheduled_date: 'asc' },
  });
}

export async function scheduleInspection(data: {
  application_id: string;
  department_id: string;
  inspector_id?: string;
  scheduled_date: Date;
  location?: string;
  purpose?: string;
}) {
  const application = await prisma.application.findUnique({
    where: { id: data.application_id },
    include: { project_approval: { include: { approval_type: true, project: true } } },
  });
  if (!application) throw new NotFoundError('Application not found');

  return prisma.$transaction(async (tx) => {
    const inspection = await tx.inspection.create({ data });

    await tx.application.update({
      where: { id: data.application_id },
      data: { status: 'INSPECTION_SCHEDULED' },
    });

    await tx.applicationEvent.create({
      data: {
        application_id: data.application_id,
        event_type: 'inspection_scheduled',
        notes: `Inspection scheduled for ${data.scheduled_date.toDateString()}. Location: ${data.location ?? 'TBD'}`,
      },
    });

    // Notify the entrepreneur (we notify project org users)
    const orgUsers = await tx.user.findMany({
      where: { org_id: application.project_approval.project.org_id, role: { in: ['ENTREPRENEUR', 'MANAGER'] } },
    });

    for (const u of orgUsers) {
      await tx.notification.create({
        data: {
          user_id: u.id,
          title: `Inspection Scheduled — ${application.project_approval.approval_type.name}`,
          message: `A site inspection has been scheduled on ${data.scheduled_date.toDateString()} for application ${application.application_number}. Location: ${data.location ?? 'TBD'}`,
          type: 'info',
        },
      });
    }

    return inspection;
  });
}

export async function updateInspection(
  id: string,
  actorId: string,
  data: Partial<{ status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED'; scheduled_date: Date }>
) {
  const inspection = await prisma.inspection.findUnique({ where: { id } });
  if (!inspection) throw new NotFoundError('Inspection not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.inspection.update({ where: { id }, data: data as never });

    if (data.status === 'COMPLETED') {
      await tx.applicationEvent.create({
        data: {
          application_id: inspection.application_id,
          actor_id: actorId,
          event_type: 'inspection_completed',
          notes: 'Site inspection completed.',
        },
      });
    }

    return updated;
  });
}

export async function recordFinding(
  inspectionId: string,
  data: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; description: string; corrective_action?: string }
) {
  return prisma.inspectionFinding.create({ data: { inspection_id: inspectionId, ...data } });
}

export async function getInspection(id: string) {
  const insp = await prisma.inspection.findUnique({
    where: { id },
    include: {
      department: true,
      inspector: { select: { id: true, name: true, email: true } },
      application: { include: { project_approval: { include: { approval_type: true, project: true } } } },
      findings: true,
    },
  });
  if (!insp) throw new NotFoundError('Inspection not found');
  return insp;
}
