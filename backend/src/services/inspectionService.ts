import { prisma } from '../lib/prisma';

export async function listProjectInspections(projectId: string) {
  return prisma.inspection.findMany({
    where: { application: { project_approval: { project_id: projectId } } },
    include: { department: true, application: true },
    orderBy: { scheduled_date: 'asc' },
  });
}

export async function listInspectorInspections(inspectorId: string) {
  return prisma.inspection.findMany({
    where: { inspector_id: inspectorId },
    include: {
      application: { include: { project_approval: { include: { project: true, approval_type: true } } } },
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
  return prisma.inspection.create({ data });
}

export async function updateInspection(
  id: string,
  data: Partial<{ status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED'; scheduled_date: Date }>
) {
  return prisma.inspection.update({ where: { id }, data: data as never });
}

export async function recordFinding(
  inspectionId: string,
  data: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; description: string; corrective_action?: string }
) {
  return prisma.inspectionFinding.create({ data: { inspection_id: inspectionId, ...data } });
}
