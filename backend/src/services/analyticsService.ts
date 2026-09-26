import { prisma } from '../lib/prisma';
import { NotImplementedError } from '../lib/errors';

export async function getWorkQueue(filters: { department_id?: string; status?: string; priority?: string }) {
  return prisma.application.findMany({
    where: {
      department_id: filters.department_id,
      status: filters.status as never,
      project_approval: filters.priority ? { priority: filters.priority as never } : undefined,
    },
    include: { project_approval: { include: { project: true, approval_type: true } } },
    orderBy: { submitted_at: 'asc' },
  });
}

/**
 * TODO (plan §20, §26): compute real bottleneck analytics from
 * ApplicationEvent rows — top bottleneck categories (document clarification,
 * inspection scheduling, department review, etc), by counting/grouping
 * event_type values. No hardcoded or vanity charts (plan §26).
 */
export async function getBottlenecks() {
  throw new NotImplementedError('getBottlenecks: build per IMPLEMENTATION_PLAN.md §20/§26');
}

/**
 * TODO (plan §26): average processing time, SLA breach rate,
 * applications-by-status funnel, applications by department/district — each
 * one computed from stored rows, matching a chart the government control
 * tower actually shows.
 */
export async function getAnalyticsSummary() {
  throw new NotImplementedError('getAnalyticsSummary: build per IMPLEMENTATION_PLAN.md §26');
}
