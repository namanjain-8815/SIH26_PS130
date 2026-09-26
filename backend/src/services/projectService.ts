import { prisma } from '../lib/prisma';
import { NotFoundError, NotImplementedError } from '../lib/errors';

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
 * TODO (plan §8, §11, §32-33): aggregate readiness %, approval status
 * breakdown, action-required items, SLA alerts, parallel workflows,
 * bottleneck, upcoming inspections, incentives count and next-best-action
 * into a single Project Control Centre payload — the single most important
 * endpoint in the product. Build it from real ProjectApproval / Application
 * / Query / SLAInstance / Inspection rows, never hardcode a number.
 */
export async function getControlCentre(_projectId: string) {
  throw new NotImplementedError('getControlCentre: build per IMPLEMENTATION_PLAN.md §8/§32/§33');
}
