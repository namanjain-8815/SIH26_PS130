import { prisma } from '../lib/prisma';

export async function listProjectCompliance(projectId: string) {
  return prisma.complianceRequirement.findMany({
    where: { project_id: projectId },
    orderBy: { next_due_date: 'asc' },
  });
}

export async function createComplianceRequirement(data: {
  project_id: string;
  name: string;
  authority: string;
  frequency: string;
  next_due_date: Date;
  linked_approval_id?: string;
}) {
  return prisma.complianceRequirement.create({ data });
}

export async function markComplianceCompleted(id: string) {
  return prisma.complianceRequirement.update({ where: { id }, data: { status: 'COMPLETED' } });
}

// TODO (plan §24): when a ProjectApproval with an ApprovalType.renewal_period_days
// moves to COMPLETED, auto-create the next ComplianceRequirement row (the
// renewal) with next_due_date = completion date + renewal_period_days.
