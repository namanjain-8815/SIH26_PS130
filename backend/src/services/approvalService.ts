import { prisma } from '../lib/prisma';
import { NotFoundError, NotImplementedError } from '../lib/errors';

export async function listApprovalTypes() {
  return prisma.approvalType.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
}

export async function getApprovalType(id: string) {
  const approvalType = await prisma.approvalType.findUnique({
    where: { id },
    include: { document_requirements: true, applicability_rules: true },
  });
  if (!approvalType) throw new NotFoundError('Approval type not found');
  return approvalType;
}

export async function listProjectApprovals(projectId: string) {
  return prisma.projectApproval.findMany({
    where: { project_id: projectId },
    include: { approval_type: true, application: true },
  });
}

/**
 * TODO (plan §14): assemble the ten-question approval detail view — what is
 * this, why is it required, who issues it, when to apply, required
 * documents, prerequisite/downstream approvals, current status, time
 * remaining, next action.
 */
export async function getProjectApprovalDetail(_projectApprovalId: string) {
  throw new NotImplementedError('getProjectApprovalDetail: build per IMPLEMENTATION_PLAN.md §14');
}
