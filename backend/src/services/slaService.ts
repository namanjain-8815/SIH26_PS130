import { prisma } from '../lib/prisma';
import { NotImplementedError } from '../lib/errors';

/**
 * TODO (plan §19): compute time-remaining / overdue / at-risk from
 * SLAPolicy.duration_days + the application's start_event timestamp, then
 * write or refresh the matching SLAInstance row. UI copy must say
 * "Configured SLA" / "Configured service timeline" — never "legally
 * guaranteed" (DEVELOPER_GUIDE.md §6).
 */
export async function computeSLAStatus(_applicationId: string) {
  throw new NotImplementedError('computeSLAStatus: build per IMPLEMENTATION_PLAN.md §19');
}

export async function getProjectSLAStatus(projectId: string) {
  return prisma.sLAInstance.findMany({
    where: { application: { project_approval: { project_id: projectId } } },
    include: { application: true },
  });
}

export async function getGovernmentSLAMonitor(departmentId?: string) {
  return prisma.sLAInstance.findMany({
    where: departmentId ? { application: { department_id: departmentId } } : undefined,
    include: {
      application: { include: { project_approval: { include: { project: true, approval_type: true } } } },
    },
    orderBy: { due_date: 'asc' },
  });
}
