import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export type RenewalCategory = 'ACTION_REQUIRED' | 'DUE_SOON' | 'HEALTHY' | 'OVERDUE';

export interface RenewalDocumentRequirementItem {
  document_type: string;
  mandatory: boolean;
  condition?: string | null;
  available_in_vault: boolean;
  vault_document_id?: string;
  vault_file_name?: string;
  is_verified?: boolean;
  expiry_date?: string | null;
}

export interface RenewalWorkspaceItem {
  id: string;
  project_id: string;
  name: string;
  authority: string;
  frequency: string;
  next_due_date: string;
  days_remaining: number;
  category: RenewalCategory;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  approval_type: {
    id: string;
    name: string;
    authority: string;
    category: string;
    renewal_period_days: number | null;
  } | null;
  source_application: {
    id: string;
    application_number: string;
    status: string;
    granted_at: string | null;
    due_date: string | null;
  } | null;
  required_renewal_documents: RenewalDocumentRequirementItem[];
  reusable_profile_fields: Record<string, string | number>;
  created_at: string;
}

export interface RenewalsWorkspaceResponse {
  project: {
    id: string;
    name: string;
    sector: string;
    district: string;
    stage: string;
    organization: {
      id: string;
      legal_name: string;
    } | null;
  };
  summary: {
    total: number;
    action_required: number;
    due_soon: number;
    healthy: number;
    overdue: number;
    completed: number;
  };
  renewals: RenewalWorkspaceItem[];
}

/**
 * Enhanced listProjectCompliance: Maintains backwards compatibility while
 * hydrating renewal category, days_remaining, and source application reference.
 */
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

    let category: RenewalCategory;
    let urgency: 'critical' | 'high' | 'medium' | 'low';

    if (req.status === 'COMPLETED') {
      category = 'HEALTHY';
      urgency = 'low';
    } else if (daysUntilDue < 0 || req.status === 'OVERDUE') {
      category = 'OVERDUE';
      urgency = 'critical';
    } else if (daysUntilDue <= 30) {
      category = 'ACTION_REQUIRED';
      urgency = 'high';
    } else if (daysUntilDue <= 90) {
      category = 'DUE_SOON';
      urgency = 'medium';
    } else {
      category = 'HEALTHY';
      urgency = 'low';
    }

    return {
      ...req,
      days_until_due: daysUntilDue,
      days_remaining: daysUntilDue,
      category,
      urgency,
      is_due_soon: dueDate <= in30Days && req.status !== 'COMPLETED',
      is_upcoming: dueDate <= in90Days && req.status !== 'COMPLETED',
    };
  });
}

/**
 * P1.11 — Comprehensive Statutory Renewals Workspace
 * Aggregates all periodic compliance & renewal obligations into 4 distinct buckets:
 * Action Required / Due Soon / Healthy / Overdue.
 * Enriches every renewal with linked source application, required renewal documents,
 * and vault reuse indicators.
 */
export async function getProjectRenewalsWorkspace(projectId: string): Promise<RenewalsWorkspaceResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: true },
  });
  if (!project) throw new NotFoundError('Project not found');

  // Ensure obligations exist or are derived
  let reqs = await prisma.complianceRequirement.findMany({
    where: { project_id: projectId },
    orderBy: { next_due_date: 'asc' },
  });

  const projectApprovals = await prisma.projectApproval.findMany({
    where: { project_id: projectId },
    include: { approval_type: true },
  });

  if (reqs.length === 0 && projectApprovals.length > 0) {
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

  // Load all document requirements, vault documents, and applications for this project
  const [docReqs, vaultDocs, applications, projectAttributes] = await Promise.all([
    prisma.documentRequirement.findMany(),
    prisma.document.findMany({ where: { project_id: projectId } }),
    prisma.application.findMany({
      where: { project_approval: { project_id: projectId } },
      include: { project_approval: true },
      orderBy: { created_at: 'desc' },
    }),
    prisma.projectAttribute.findMany({ where: { project_id: projectId } }),
  ]);

  const attributesMap: Record<string, string | number> = {
    project_name: project.name,
    district: project.district,
    sector: project.sector,
    industrial_area: project.industrial_area || '',
    investment_amount: project.investment_amount,
    employee_count: project.employee_count,
  };
  for (const attr of projectAttributes) {
    attributesMap[attr.key] = attr.value;
  }

  const now = new Date();
  const renewals: RenewalWorkspaceItem[] = [];

  for (const req of reqs) {
    const dueDate = new Date(req.next_due_date);
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);

    // Find matching ApprovalType
    const approvalType = projectApprovals.find(
      (pa) =>
        pa.approval_type_id === req.linked_approval_id ||
        pa.approval_type?.id === req.linked_approval_id ||
        req.name.toLowerCase().includes((pa.approval_type?.name || '').toLowerCase())
    )?.approval_type || null;

    // Find latest linked Application for this approval
    const sourceApp = applications.find(
      (app) =>
        app.project_approval?.approval_type_id === approvalType?.id ||
        app.project_approval_id === req.linked_approval_id
    ) || null;

    // Match required renewal documents against vault
    const matchedDocReqs = approvalType
      ? docReqs.filter((dr) => dr.approval_type_id === approvalType.id)
      : [];

    const requiredDocs: RenewalDocumentRequirementItem[] = matchedDocReqs.map((dr) => {
      const vaultMatch = vaultDocs.find(
        (vd) =>
          vd.document_type.toLowerCase() === dr.document_type.toLowerCase() ||
          vd.file_name.toLowerCase().includes(dr.document_type.toLowerCase().replace(/_/g, ' '))
      );

      return {
        document_type: dr.document_type,
        mandatory: dr.mandatory,
        condition: dr.condition,
        available_in_vault: Boolean(vaultMatch),
        vault_document_id: vaultMatch?.id,
        vault_file_name: vaultMatch?.file_name,
        is_verified: vaultMatch?.verification_status === 'VERIFIED',
        expiry_date: vaultMatch?.expiry_date ? new Date(vaultMatch.expiry_date).toISOString() : null,
      };
    });

    // Determine category: OVERDUE, ACTION_REQUIRED, DUE_SOON, HEALTHY
    let category: RenewalCategory;
    let urgency: 'critical' | 'high' | 'medium' | 'low';
    let status = req.status;

    if (req.status === 'COMPLETED') {
      category = 'HEALTHY';
      urgency = 'low';
    } else if (daysRemaining < 0) {
      category = 'OVERDUE';
      urgency = 'critical';
      status = 'OVERDUE';
    } else if (daysRemaining <= 30) {
      category = 'ACTION_REQUIRED';
      urgency = 'high';
      status = 'ACTION_REQUIRED';
    } else if (daysRemaining <= 90) {
      category = 'DUE_SOON';
      urgency = 'medium';
    } else {
      category = 'HEALTHY';
      urgency = 'low';
    }

    // Check if an application is currently in progress for this renewal
    if (
      sourceApp &&
      (sourceApp.status === 'IN_PREPARATION' ||
        sourceApp.status === 'READY_TO_START' ||
        sourceApp.status === 'SUBMITTED' ||
        sourceApp.status === 'UNDER_REVIEW')
    ) {
      status = 'RENEWAL_IN_PROGRESS';
    }

    renewals.push({
      id: req.id,
      project_id: req.project_id,
      name: req.name,
      authority: req.authority,
      frequency: req.frequency,
      next_due_date: dueDate.toISOString(),
      days_remaining: daysRemaining,
      category,
      urgency,
      status,
      approval_type: approvalType
        ? {
            id: approvalType.id,
            name: approvalType.name,
            authority: approvalType.authority,
            category: approvalType.category,
            renewal_period_days: approvalType.renewal_period_days ?? null,
          }
        : null,
      source_application: sourceApp
        ? {
            id: sourceApp.id,
            application_number: sourceApp.application_number,
            status: sourceApp.status,
            granted_at: (sourceApp as any).granted_at ? new Date((sourceApp as any).granted_at).toISOString() : null,
            due_date: sourceApp.due_date ? new Date(sourceApp.due_date).toISOString() : null,
          }
        : null,
      required_renewal_documents: requiredDocs,
      reusable_profile_fields: attributesMap,
      created_at: new Date(req.created_at).toISOString(),
    });
  }

  // Dashboard metrics
  const summary = {
    total: renewals.length,
    action_required: renewals.filter((r) => r.category === 'ACTION_REQUIRED').length,
    due_soon: renewals.filter((r) => r.category === 'DUE_SOON').length,
    healthy: renewals.filter((r) => r.category === 'HEALTHY').length,
    overdue: renewals.filter((r) => r.category === 'OVERDUE').length,
    completed: renewals.filter((r) => r.status === 'COMPLETED').length,
  };

  return {
    project: {
      id: project.id,
      name: project.name,
      sector: project.sector,
      district: project.district,
      stage: project.stage,
      organization: project.organization
        ? {
            id: project.organization.id,
            legal_name: project.organization.legal_name,
          }
        : null,
    },
    summary,
    renewals,
  };
}

/**
 * P1.11 — Single Renewal Detailed View
 */
export async function getRenewalDetail(complianceId: string) {
  const req = await prisma.complianceRequirement.findUnique({
    where: { id: complianceId },
  });
  if (!req) throw new NotFoundError('Compliance requirement not found');

  const workspace = await getProjectRenewalsWorkspace(req.project_id);
  const matched = workspace.renewals.find((r) => r.id === complianceId);
  if (!matched) throw new NotFoundError('Renewal detail could not be derived');

  return {
    ...matched,
    project: workspace.project,
  };
}

/**
 * P1.11 — Prepare Renewal Flow
 * Prepares a statutory renewal application workspace using existing project data
 * and verified documents from the Document Vault.
 * Does NOT auto-submit; sets status to IN_PREPARATION for applicant review.
 */
export async function prepareRenewal(complianceId: string, actorId?: string) {
  const req = await prisma.complianceRequirement.findUnique({
    where: { id: complianceId },
  });
  if (!req) throw new NotFoundError('Compliance requirement not found');

  const project = await prisma.project.findUnique({
    where: { id: req.project_id },
    include: { organization: true },
  });
  if (!project) throw new NotFoundError('Project not found');

  // Find linked ProjectApproval or create if needed
  let projectApproval = await prisma.projectApproval.findFirst({
    where: {
      project_id: req.project_id,
      approval_type_id: req.linked_approval_id || undefined,
    },
    include: { approval_type: true },
  });

  if (!projectApproval && req.linked_approval_id) {
    projectApproval = await prisma.projectApproval.create({
      data: {
        project_id: req.project_id,
        approval_type_id: req.linked_approval_id,
        applicability_reason: `Statutory periodic renewal obligation under ${req.authority}.`,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      },
      include: { approval_type: true },
    });
  }

  if (!projectApproval) {
    // Attempt fallback by authority
    const allApprovals = await prisma.projectApproval.findMany({
      where: { project_id: req.project_id },
      include: { approval_type: true },
    });
    projectApproval = allApprovals.find(
      (pa) =>
        pa.approval_type.authority.toLowerCase() === req.authority.toLowerCase() ||
        req.name.toLowerCase().includes(pa.approval_type.name.toLowerCase())
    ) || null;
  }

  if (!projectApproval) {
    throw new NotFoundError(
      `No applicable approval clearance found for renewal requirement "${req.name}".`
    );
  }

  // Resolve Department
  const depts = await prisma.department.findMany();
  const matchedDept = depts.find(
    (d) =>
      d.name.toLowerCase().includes(req.authority.toLowerCase()) ||
      req.authority.toLowerCase().includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(projectApproval!.approval_type.authority.toLowerCase())
  );
  const departmentId = matchedDept?.id || depts[0]?.id;

  // Check if an existing application exists (1:1 relation with ProjectApproval)
  const existingApps = await prisma.application.findMany({
    where: { project_approval_id: projectApproval.id },
    orderBy: { created_at: 'desc' },
  });

  let app: any = null;
  const existingApp = existingApps[0];

  if (existingApp) {
    if (existingApp.status !== 'IN_PREPARATION' && existingApp.status !== 'READY_TO_START') {
      app = await prisma.application.update({
        where: { id: existingApp.id },
        data: {
          status: 'IN_PREPARATION',
          submitted_at: null,
          due_date: null,
        },
      });
    } else {
      app = existingApp;
    }
  } else {
    // Create new application workspace
    const appNumber = `APP-REN-${Date.now().toString(36).toUpperCase()}`;
    app = await prisma.application.create({
      data: {
        project_approval_id: projectApproval.id,
        department_id: departmentId,
        application_number: appNumber,
        status: 'IN_PREPARATION',
      },
    });

    await prisma.applicationEvent.create({
      data: {
        application_id: app.id,
        actor_id: actorId || null,
        event_type: 'renewal_application_created',
        notes: `Statutory renewal workspace created for ${projectApproval.approval_type.name}.`,
      },
    });
  }

  // Auto-attach eligible verified documents from project vault
  const [docReqs, vaultDocs, existingAppDocs] = await Promise.all([
    prisma.documentRequirement.findMany({
      where: { approval_type_id: projectApproval.approval_type_id },
    }),
    prisma.document.findMany({
      where: { project_id: req.project_id },
    }),
    prisma.applicationDocument.findMany({
      where: { application_id: app.id },
    }),
  ]);

  let attachedCount = 0;
  for (const dr of docReqs) {
    const alreadyAttached = existingAppDocs.some(
      (ead) => vaultDocs.find((vd) => vd.id === ead.document_id)?.document_type === dr.document_type
    );
    if (!alreadyAttached) {
      const matchInVault = vaultDocs.find(
        (vd) =>
          vd.document_type.toLowerCase() === dr.document_type.toLowerCase() ||
          vd.file_name.toLowerCase().includes(dr.document_type.toLowerCase().replace(/_/g, ' '))
      );
      if (matchInVault) {
        await prisma.applicationDocument.create({
          data: {
            application_id: app.id,
            document_id: matchInVault.id,
            validation_status: matchInVault.verification_status === 'VERIFIED' ? 'VALID' : 'PENDING',
            validation_notes: `Auto-attached from Document Vault for statutory renewal.`,
          },
        });
        attachedCount++;
      }
    }
  }

  // Log preparation event
  await prisma.applicationEvent.create({
    data: {
      application_id: app.id,
      actor_id: actorId || null,
      event_type: 'renewal_prepared',
      notes: `Statutory renewal prepared with reused project profile and ${attachedCount} vault documents.`,
      metadata: {
        compliance_id: complianceId,
        renewal_frequency: req.frequency,
        authority: req.authority,
        next_due_date: req.next_due_date,
      },
    },
  });

  // Log system audit
  await prisma.auditLog.create({
    data: {
      actor_id: actorId || null,
      action: 'renewal_prepared',
      entity_type: 'application',
      entity_id: app.id,
      metadata: {
        compliance_id: complianceId,
        project_id: req.project_id,
        application_number: app.application_number,
        approval_name: projectApproval.approval_type.name,
      },
    },
  });

  return {
    success: true,
    message: 'Statutory renewal application workspace prepared successfully with verified project data.',
    compliance_id: complianceId,
    application_id: app.id,
    application_number: app.application_number,
    project_id: req.project_id,
    approval_name: projectApproval.approval_type.name,
    authority: req.authority,
    attached_documents_count: attachedCount,
    target_url: `/app/applications/${app.id}`,
  };
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

  const results: any[] = [];
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
      if (found.status === 'COMPLETED') {
        results.push(found);
        continue;
      }
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
