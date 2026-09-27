import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export async function listProjectCompliance(projectId: string) {
  let reqs = await prisma.complianceRequirement.findMany({
    where: { project_id: projectId },
    orderBy: { next_due_date: 'asc' },
  });

  // If no compliance requirements exist yet, attempt dynamic derivation from project approvals
  if (reqs.length === 0) {
    const projectApprovals = await prisma.projectApproval.findMany({
      where: { project_id: projectId },
      include: { approval_type: true },
    });
    if (projectApprovals.length > 0) {
      const types = projectApprovals
        .map((pa) => pa.approval_type)
        .filter((t): t is NonNullable<typeof t> => t != null);
      if (types.length > 0) {
        await deriveComplianceObligations(projectId, types);
        reqs = await prisma.complianceRequirement.findMany({
          where: { project_id: projectId },
          orderBy: { next_due_date: 'asc' },
        });
      }
    }
  }

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);
  const in90Days = new Date(now.getTime() + 90 * 86_400_000);

  return reqs.map((req) => {
    const dueDate = new Date(req.next_due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
    let urgency: 'critical' | 'high' | 'medium' | 'low';
    if (req.status === 'OVERDUE' || daysUntilDue < 0) urgency = 'critical';
    else if (daysUntilDue <= 30) urgency = 'high';
    else if (daysUntilDue <= 90) urgency = 'medium';
    else urgency = 'low';

    return {
      ...req,
      days_until_due: daysUntilDue,
      urgency,
      is_due_soon: dueDate <= in30Days && req.status !== 'COMPLETED',
      is_upcoming: dueDate <= in90Days && req.status !== 'COMPLETED',
    };
  });
}

/**
 * Dynamically derives and synchronizes compliance obligations for a project
 * based on applicable approval types with renewal_period_days configured.
 * (P0.5 — Dynamic Compliance Generation)
 */
export async function deriveComplianceObligations(
  projectId: string,
  approvalTypes: Array<{
    id: string;
    name: string;
    authority: string;
    renewal_period_days?: number | null;
  }>
) {
  // Filter for approvals that require periodic renewal/compliance
  const periodicApprovals = approvalTypes.filter(
    (a) => a.renewal_period_days && a.renewal_period_days > 0
  );

  if (periodicApprovals.length === 0) return [];

  // Fetch existing obligations for this project to prevent duplicates
  const existing = await prisma.complianceRequirement.findMany({
    where: { project_id: projectId },
  });

  const results = [];
  const now = Date.now();

  for (const approval of periodicApprovals) {
    const renewalDays = approval.renewal_period_days!;
    let frequency = 'Annual';
    if (renewalDays <= 90) frequency = 'Quarterly';
    else if (renewalDays <= 185) frequency = 'Half-Yearly';
    else if (renewalDays <= 365) frequency = 'Annual';
    else if (renewalDays <= 1095) frequency = '3-Yearly';
    else frequency = '5-Yearly';

    const defaultName = `${approval.name} — ${frequency} Renewal`;

    // Check if an obligation already exists for this approval
    const found = existing.find(
      (e) =>
        e.linked_approval_id === approval.id ||
        e.name === defaultName ||
        (e.name.toLowerCase().includes(approval.name.toLowerCase()) && e.frequency === frequency)
    );

    if (found) {
      // If already COMPLETED, preserve completed state!
      if (found.status === 'COMPLETED') {
        results.push(found);
        continue;
      }
      // Otherwise update authority if changed
      if (found.authority !== approval.authority) {
        const updated = await prisma.complianceRequirement.update({
          where: { id: found.id },
          data: { authority: approval.authority },
        });
        results.push(updated);
      } else {
        results.push(found);
      }
    } else {
      // Calculate next due date from configured renewal period
      const nextDueDate = new Date(now + renewalDays * 86_400_000);
      const created = await prisma.complianceRequirement.create({
        data: {
          project_id: projectId,
          name: defaultName,
          authority: approval.authority,
          frequency,
          next_due_date: nextDueDate,
          status: 'UPCOMING',
          linked_approval_id: approval.id,
        },
      });
      results.push(created);
    }
  }

  return results;
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
  const req = await prisma.complianceRequirement.findUnique({ where: { id } });
  if (!req) throw new NotFoundError('Compliance requirement not found');

  // Mark current as completed, and create the next due date if frequency-based
  return prisma.$transaction(async (tx) => {
    const updated = await tx.complianceRequirement.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    // Auto-schedule next compliance requirement based on frequency
    if (req.frequency === 'Annual') {
      const nextDue = new Date(req.next_due_date.getTime() + 365 * 86_400_000);
      await tx.complianceRequirement.create({
        data: {
          project_id: req.project_id,
          name: req.name,
          authority: req.authority,
          frequency: req.frequency,
          next_due_date: nextDue,
          status: 'UPCOMING',
          linked_approval_id: req.linked_approval_id,
        },
      });
    }

    return updated;
  });
}

export async function sendComplianceReminders(projectId: string, userId: string) {
  const reqs = await prisma.complianceRequirement.findMany({
    where: { project_id: projectId },
  });

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86_400_000);
  let remindersSent = 0;

  for (const req of reqs) {
    if (req.status === 'COMPLETED') continue;
    const dueDate = new Date(req.next_due_date);
    if (dueDate <= in90Days) {
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
      const isOverdue = daysLeft < 0;
      await prisma.notification.create({
        data: {
          user_id: userId,
          title: isOverdue ? `Statutory Compliance Overdue — ${req.name}` : `Renewal / Compliance Reminder — ${req.name}`,
          message: isOverdue
            ? `Compliance requirement "${req.name}" under ${req.authority} is ${Math.abs(daysLeft)} days overdue. Immediate action required.`
            : `Statutory compliance for "${req.name}" (${req.authority}) is due in ${daysLeft} days on ${dueDate.toLocaleDateString()}. Frequency: ${req.frequency}.`,
          type: isOverdue || daysLeft <= 30 ? 'warning' : 'info',
        },
      });
      remindersSent++;
    }
  }

  return { success: true, reminders_sent: remindersSent };
}

/**
 * When a ProjectApproval with a renewal_period_days is COMPLETED,
 * auto-create the next ComplianceRequirement (the renewal).
 * Called from regulatory analysis or status update hooks.
 * (IMPLEMENTATION_PLAN.md §24)
 */
export async function createRenewalFromApproval(projectApprovalId: string) {
  const pa = await prisma.projectApproval.findUnique({
    where: { id: projectApprovalId },
    include: { approval_type: true, project: true },
  });

  if (!pa || pa.status !== 'COMPLETED' || !pa.approval_type.renewal_period_days) return null;

  const completedDate = pa.actual_completion_date ?? new Date();
  const nextDue = new Date(completedDate.getTime() + pa.approval_type.renewal_period_days * 86_400_000);

  return prisma.complianceRequirement.create({
    data: {
      project_id: pa.project_id,
      name: `${pa.approval_type.name} — Renewal`,
      authority: pa.approval_type.authority,
      frequency: pa.approval_type.renewal_period_days === 365 ? 'Annual' : `Every ${pa.approval_type.renewal_period_days} days`,
      next_due_date: nextDue,
      status: 'UPCOMING',
      linked_approval_id: pa.approval_type_id,
    },
  });
}
