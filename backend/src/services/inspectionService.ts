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

export async function listInspectors() {
  return prisma.user.findMany({
    where: { role: 'INSPECTOR' },
    select: { id: true, name: true, email: true, department_id: true },
  });
}

export async function listPlannerInspections(filters: {
  department_id?: string;
  inspector_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}) {
  const where: any = {};
  if (filters.department_id) where.department_id = filters.department_id;
  if (filters.inspector_id) where.inspector_id = filters.inspector_id;
  if (filters.status) where.status = filters.status;

  const rawInspections = await prisma.inspection.findMany({
    where,
    include: {
      department: true,
      inspector: { select: { id: true, name: true, email: true, department_id: true } },
      application: {
        include: {
          project_approval: {
            include: {
              project: { include: { organization: true } },
              approval_type: true,
            },
          },
        },
      },
      findings: true,
    },
    orderBy: { scheduled_date: 'asc' },
  });

  // Filter in-memory for date ranges if provided
  let filtered = rawInspections;
  if (filters.date_from) {
    const fromTime = new Date(filters.date_from).getTime();
    filtered = filtered.filter((i) => new Date(i.scheduled_date).getTime() >= fromTime);
  }
  if (filters.date_to) {
    const toTime = new Date(filters.date_to).getTime() + 86_400_000;
    filtered = filtered.filter((i) => new Date(i.scheduled_date).getTime() <= toTime);
  }

  // Conflict detection:
  // Detect inspectors assigned to multiple visits on the same date
  const inspectionsByInspectorAndDay = new Map<string, typeof rawInspections>();

  for (const insp of rawInspections) {
    if (insp.inspector_id && insp.scheduled_date && insp.status !== 'CANCELLED') {
      const dayKey = `${insp.inspector_id}_${new Date(insp.scheduled_date).toISOString().slice(0, 10)}`;
      const list = inspectionsByInspectorAndDay.get(dayKey) ?? [];
      list.push(insp);
      inspectionsByInspectorAndDay.set(dayKey, list);
    }
  }

  return filtered.map((insp) => {
    let hasConflict = false;
    let conflictReason: string | null = null;

    if (insp.inspector_id && insp.scheduled_date && insp.status !== 'CANCELLED') {
      const dayKey = `${insp.inspector_id}_${new Date(insp.scheduled_date).toISOString().slice(0, 10)}`;
      const sameDay = inspectionsByInspectorAndDay.get(dayKey) ?? [];
      if (sameDay.length > 1) {
        hasConflict = true;
        const otherApps = sameDay
          .filter((i) => i.id !== insp.id)
          .map((i) => i.application?.application_number ?? 'Application')
          .join(', ');
        conflictReason = `Inspector ${insp.inspector?.name ?? 'Assigned Officer'} has ${sameDay.length} site visits scheduled on this day (concurrent with ${otherApps}). Confirm travel and timeline feasibility.`;
      }
    }

    return {
      ...insp,
      has_conflict: hasConflict,
      conflict_reason: conflictReason,
    };
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

    const schedDate = new Date(data.scheduled_date);

    await tx.applicationEvent.create({
      data: {
        application_id: data.application_id,
        event_type: 'inspection_scheduled',
        notes: `Inspection scheduled for ${schedDate.toDateString()}. Location: ${data.location ?? 'TBD'}`,
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
          message: `A site inspection has been scheduled on ${schedDate.toDateString()} for application ${application.application_number}. Location: ${data.location ?? 'TBD'}`,
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
  data: Partial<{
    status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';
    scheduled_date: Date;
    notes?: string;
    action?: 'confirm_readiness' | 'reschedule' | 'assign_inspector';
    inspector_id?: string;
    location?: string;
    purpose?: string;
  }>
) {
  const inspection = await prisma.inspection.findUnique({ where: { id } });
  if (!inspection) throw new NotFoundError('Inspection not found');

  return prisma.$transaction(async (tx) => {
    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
    } else if (data.action === 'reschedule') {
      updateData.status = 'RESCHEDULED';
    }
    if (data.scheduled_date) updateData.scheduled_date = data.scheduled_date;
    if (data.inspector_id !== undefined) updateData.inspector_id = data.inspector_id;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.purpose !== undefined) updateData.purpose = data.purpose;

    const updated = Object.keys(updateData).length > 0
      ? await tx.inspection.update({ where: { id }, data: updateData })
      : inspection;

    if (data.action === 'assign_inspector' || (data.inspector_id && data.inspector_id !== inspection.inspector_id)) {
      const assignedInspector = await tx.user.findUnique({ where: { id: data.inspector_id } });
      await tx.applicationEvent.create({
        data: {
          application_id: inspection.application_id,
          actor_id: actorId,
          event_type: 'inspector_assigned',
          notes: `Designated Inspection Officer ${assignedInspector?.name ?? data.inspector_id} assigned for site verification.`,
        },
      });
    }

    if (data.action === 'confirm_readiness') {
      await tx.applicationEvent.create({
        data: {
          application_id: inspection.application_id,
          actor_id: actorId,
          event_type: 'inspection_readiness_confirmed',
          notes: data.notes || 'Applicant confirmed site readiness for inspection.',
        },
      });
    } else if (data.status === 'RESCHEDULED' || data.action === 'reschedule') {
      await tx.applicationEvent.create({
        data: {
          application_id: inspection.application_id,
          actor_id: actorId,
          event_type: 'inspection_rescheduled',
          notes: `Inspection reschedule requested/updated${data.scheduled_date ? ` for ${new Date(data.scheduled_date).toDateString()}` : ''}. Reason: ${data.notes || 'Per applicant request'}`,
        },
      });
    } else if (data.status === 'COMPLETED') {
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
  data: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; description: string; corrective_action?: string; status?: string }
) {
  const sanitized = {
    inspection_id: inspectionId,
    severity: data.severity || 'LOW',
    description: data.description || '',
    corrective_action: data.corrective_action || null,
    status: data.status || 'OPEN',
  };
  return prisma.inspectionFinding.create({ data: sanitized });
}

export async function updateFinding(
  findingId: string,
  actorId: string,
  data: Partial<{ status: string; corrective_action: string }>
) {
  const finding = await prisma.inspectionFinding.findUnique({ where: { id: findingId } });
  if (!finding) throw new NotFoundError('Inspection finding not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.inspectionFinding.update({ where: { id: findingId }, data: data as never });

    const inspection = await tx.inspection.findUnique({ where: { id: finding.inspection_id } });
    if (inspection) {
      await tx.applicationEvent.create({
        data: {
          application_id: inspection.application_id,
          actor_id: actorId,
          event_type: 'finding_acknowledged',
          notes: `Inspection finding updated (${data.status ?? 'acknowledged'}): "${finding.description.substring(0, 60)}..."`,
        },
      });
    }

    return updated;
  });
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

// ---------------------------------------------------------------------------
// Joint Department Inspection Planning (P1.10)
// ---------------------------------------------------------------------------

export interface JointInspectionDepartmentItem {
  inspection_id: string;
  department_id: string;
  department_name: string;
  approval_type_id: string;
  approval_name: string;
  application_id: string;
  application_number: string;
  inspector_id?: string | null;
  inspector_name?: string | null;
  inspector_email?: string | null;
  status: string;
  findings: Array<{
    id: string;
    severity: string;
    description: string;
    corrective_action: string | null;
    status: string;
  }>;
  has_conflict: boolean;
  conflict_reason?: string | null;
}

export interface JointInspectionPlan {
  id: string;
  project_id: string;
  project_name: string;
  organization_name: string;
  district: string;
  location: string;
  scheduled_date: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'RESCHEDULED' | 'MIXED';
  total_departments: number;
  departments: JointInspectionDepartmentItem[];
  conflict_warnings: string[];
  has_conflicts: boolean;
  findings_summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  consolidated_findings: Array<{
    id: string;
    inspection_id: string;
    department_name: string;
    approval_name: string;
    severity: string;
    description: string;
    corrective_action: string | null;
    status: string;
  }>;
}

function safeIsoDate(val: any): string {
  if (!val) return new Date().toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function safeDateKey(val: any): string {
  if (!val) return 'unscheduled';
  const d = new Date(val);
  return isNaN(d.getTime()) ? 'unscheduled' : d.toISOString().slice(0, 10);
}

/**
 * List all Joint Inspection Plans grouped by project and scheduled date.
 */
export async function listJointInspectionPlans(filters?: {
  project_id?: string;
  district?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<JointInspectionPlan[]> {
  const where: any = {};
  if (filters?.project_id) {
    where.application = { project_approval: { project_id: filters.project_id } };
  }

  const allInspections = await prisma.inspection.findMany({
    where,
    include: {
      department: true,
      inspector: { select: { id: true, name: true, email: true, department_id: true } },
      application: {
        include: {
          project_approval: {
            include: {
              approval_type: true,
              project: { include: { organization: true } },
            },
          },
        },
      },
      findings: true,
    },
    orderBy: { scheduled_date: 'asc' },
  });

  // Filter in-memory by district and date range if provided
  let filtered = allInspections;
  if (filters?.district) {
    filtered = filtered.filter(
      (i) => i.application?.project_approval?.project?.district?.toLowerCase() === filters.district!.toLowerCase()
    );
  }
  if (filters?.date_from) {
    const fromTime = new Date(filters.date_from).getTime();
    filtered = filtered.filter((i) => new Date(i.scheduled_date).getTime() >= fromTime);
  }
  if (filters?.date_to) {
    const toTime = new Date(filters.date_to).getTime() + 86_400_000;
    filtered = filtered.filter((i) => new Date(i.scheduled_date).getTime() <= toTime);
  }

  // Conflict index for inspectors across all scheduled visits
  const inspectionsByInspectorAndDay = new Map<string, typeof allInspections>();
  for (const insp of allInspections) {
    if (insp.inspector_id && insp.scheduled_date && insp.status !== 'CANCELLED') {
      const dayKey = `${insp.inspector_id}_${safeDateKey(insp.scheduled_date)}`;
      const arr = inspectionsByInspectorAndDay.get(dayKey) ?? [];
      arr.push(insp);
      inspectionsByInspectorAndDay.set(dayKey, arr);
    }
  }

  // Group inspections by project_id and scheduled date (day level)
  const grouped = new Map<string, typeof filtered>();

  for (const insp of filtered) {
    const projId = insp.application?.project_approval?.project_id || 'unknown_project';
    const dayKey = safeDateKey(insp.scheduled_date);
    const groupKey = `${projId}_${dayKey}`;

    const list = grouped.get(groupKey) ?? [];
    list.push(insp);
    grouped.set(groupKey, list);
  }

  const plans: JointInspectionPlan[] = [];

  for (const [groupKey, groupItems] of grouped.entries()) {
    if (groupItems.length === 0) continue;

    const first = groupItems[0];
    const project = first.application?.project_approval?.project;
    const projectId = project?.id || 'unknown_project';
    const projectName = project?.name || 'Investment Project';
    const orgName = project?.organization?.legal_name || 'Project Proponent';
    const district = project?.district || 'General';
    const scheduledDate = safeIsoDate(first.scheduled_date);
    const dayKey = safeDateKey(first.scheduled_date);
    const location = groupItems.find((i) => i.location)?.location || `Site at ${district}`;

    let completedCount = 0;
    let cancelledCount = 0;
    let rescheduledCount = 0;
    let scheduledCount = 0;

    const departments: JointInspectionDepartmentItem[] = [];
    const conflictWarnings: string[] = [];
    const consolidatedFindings: JointInspectionPlan['consolidated_findings'] = [];

    const findingsSummary = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const insp of groupItems) {
      if (insp.status === 'COMPLETED') completedCount++;
      else if (insp.status === 'CANCELLED') cancelledCount++;
      else if (insp.status === 'RESCHEDULED') rescheduledCount++;
      else scheduledCount++;

      // Check inspector conflict
      let hasConflict = false;
      let conflictReason: string | null = null;

      if (insp.inspector_id && insp.scheduled_date && insp.status !== 'CANCELLED') {
        const inspectorDayKey = `${insp.inspector_id}_${dayKey}`;
        const sameDayVisits = inspectionsByInspectorAndDay.get(inspectorDayKey) ?? [];
        const otherSiteVisits = sameDayVisits.filter(
          (v) => v.id !== insp.id && v.application?.project_approval?.project_id !== projectId
        );

        if (otherSiteVisits.length > 0) {
          hasConflict = true;
          conflictReason = `Inspector ${insp.inspector?.name || 'Officer'} has ${otherSiteVisits.length} concurrent site visit(s) scheduled on ${dayKey} for another project.`;
          conflictWarnings.push(
            `Double-Booking Warning: Inspector ${insp.inspector?.name || 'Officer'} (${insp.department?.name || 'Department'}) has overlapping assignments on ${dayKey}.`
          );
        }
      }

      if (!insp.inspector_id && insp.status !== 'COMPLETED' && insp.status !== 'CANCELLED') {
        conflictWarnings.push(`Officer Unassigned: ${insp.department?.name || 'Department'} has not yet assigned a Designated Inspection Officer.`);
      }

      // Collect findings
      const deptFindings = (insp.findings || []).map((f: any) => ({
        id: f.id,
        severity: f.severity,
        description: f.description,
        corrective_action: f.corrective_action,
        status: f.status,
      }));

      for (const f of deptFindings) {
        findingsSummary.total++;
        if (f.severity === 'CRITICAL') findingsSummary.critical++;
        else if (f.severity === 'HIGH') findingsSummary.high++;
        else if (f.severity === 'MEDIUM') findingsSummary.medium++;
        else findingsSummary.low++;

        consolidatedFindings.push({
          id: f.id,
          inspection_id: insp.id,
          department_name: insp.department?.name || 'Department',
          approval_name: insp.application?.project_approval?.approval_type?.name || 'Clearance',
          severity: f.severity,
          description: f.description,
          corrective_action: f.corrective_action,
          status: f.status,
        });
      }

      departments.push({
        inspection_id: insp.id,
        department_id: insp.department_id,
        department_name: insp.department?.name || 'Department',
        approval_type_id: insp.application?.project_approval?.approval_type?.id || '',
        approval_name: insp.application?.project_approval?.approval_type?.name || 'Clearance',
        application_id: insp.application_id,
        application_number: insp.application?.application_number || 'APP-000',
        inspector_id: insp.inspector?.id || null,
        inspector_name: insp.inspector?.name || null,
        inspector_email: insp.inspector?.email || null,
        status: insp.status,
        findings: deptFindings,
        has_conflict: hasConflict,
        conflict_reason: conflictReason,
      });
    }

    // Determine overall joint plan status
    let status: JointInspectionPlan['status'] = 'SCHEDULED';
    if (completedCount === groupItems.length) {
      status = 'COMPLETED';
    } else if (rescheduledCount > 0 && rescheduledCount + completedCount === groupItems.length) {
      status = 'RESCHEDULED';
    } else if (completedCount > 0) {
      status = 'IN_PROGRESS';
    } else if (rescheduledCount > 0) {
      status = 'RESCHEDULED';
    } else if (scheduledCount === groupItems.length) {
      status = 'SCHEDULED';
    } else {
      status = 'MIXED';
    }

    if (filters?.status && status !== filters.status) {
      continue;
    }

    plans.push({
      id: `joint_${groupKey}`,
      project_id: projectId,
      project_name: projectName,
      organization_name: orgName,
      district,
      location,
      scheduled_date: scheduledDate,
      status,
      total_departments: departments.length,
      departments,
      conflict_warnings: Array.from(new Set(conflictWarnings)),
      has_conflicts: conflictWarnings.length > 0,
      findings_summary: findingsSummary,
      consolidated_findings: consolidatedFindings,
    });
  }

  // Sort chronologically ascending
  return plans.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
}

/**
 * Get project-level joint inspection overview including scheduled visits,
 * clearances requiring inspection, and coordination opportunities.
 */
export async function getProjectJointInspections(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: true,
      project_approvals: {
        include: {
          approval_type: true,
          application: {
            include: {
              department: true,
              inspections: {
                include: {
                  department: true,
                  inspector: { select: { id: true, name: true, email: true } },
                  findings: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) throw new NotFoundError(`Project ${projectId} not found`);

  // Fetch all joint plans for this project
  const jointPlans = await listJointInspectionPlans({ project_id: projectId });

  // Clearances requiring inspection
  const clearancesRequiringInspection = project.project_approvals
    .filter((pa) => pa.approval_type.requires_inspection)
    .map((pa) => {
      const app = pa.application;
      const inspections = app?.inspections || [];
      const hasActiveInspection = inspections.some((i) => i.status !== 'CANCELLED');
      const latestInspection = inspections[0];

      return {
        approval_type_id: pa.approval_type_id,
        approval_name: pa.approval_type.name,
        department_name: pa.approval_type.authority,
        department_id: latestInspection?.department_id || app?.department_id || null,
        application_id: app?.id || null,
        application_number: app?.application_number || null,
        application_status: app?.status || null,
        has_scheduled_inspection: hasActiveInspection,
        latest_inspection_id: latestInspection?.id || null,
        latest_inspection_status: latestInspection?.status || null,
        latest_inspection_date: latestInspection ? safeIsoDate(latestInspection.scheduled_date) : null,
      };
    });

  // Check for coordination opportunities (inspections scheduled on different dates)
  const coordinationOpportunities: string[] = [];
  if (jointPlans.length > 1) {
    const dates = jointPlans.map((p) => safeDateKey(p.scheduled_date)).join(', ');
    coordinationOpportunities.push(
      `Multiple site visit dates detected for this project (${dates}). Consider unifying them into a single Joint Department Inspection to minimize operational disruption.`
    );
  }

  // Summary counts
  let completedVisits = 0;
  let upcomingVisits = 0;
  let totalFindings = 0;
  let unresolvedFindings = 0;

  for (const plan of jointPlans) {
    if (plan.status === 'COMPLETED') completedVisits++;
    else upcomingVisits++;

    totalFindings += plan.findings_summary.total;
    unresolvedFindings += plan.consolidated_findings.filter((f) => f.status === 'OPEN').length;
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      district: project.district,
      organization: project.organization.legal_name,
    },
    joint_plans: jointPlans,
    clearances_requiring_inspection: clearancesRequiringInspection,
    coordination_opportunities: coordinationOpportunities,
    summary: {
      total_joint_visits: jointPlans.length,
      completed_visits: completedVisits,
      upcoming_visits: upcomingVisits,
      total_findings: totalFindings,
      unresolved_findings: unresolvedFindings,
    },
  };
}

/**
 * Schedule a coordinated Joint Department Inspection across multiple clearance applications.
 */
export async function scheduleJointInspection(data: {
  project_id: string;
  scheduled_date: Date | string;
  location?: string;
  purpose?: string;
  departments: Array<{
    application_id: string;
    department_id: string;
    inspector_id?: string;
  }>;
}) {
  const project = await prisma.project.findUnique({
    where: { id: data.project_id },
    include: { organization: true },
  });
  if (!project) throw new NotFoundError('Project not found');

  if (!data.departments || data.departments.length === 0) {
    throw new Error('At least one department clearance must be included in the joint inspection');
  }

  const schedDate = new Date(data.scheduled_date);
  const location = data.location || `Site at ${project.district}`;
  const purpose = data.purpose || `Joint Department Site Inspection across ${data.departments.length} regulatory authorities`;

  return prisma.$transaction(async (tx) => {
    const createdOrUpdatedInspections: any[] = [];

    for (const item of data.departments) {
      const application = await tx.application.findUnique({
        where: { id: item.application_id },
        include: {
          project_approval: { include: { approval_type: true } },
          department: true,
          inspections: true,
        },
      });

      if (!application) {
        throw new NotFoundError(`Application ${item.application_id} not found`);
      }

      // Check if an inspection already exists for this application
      const existing = (application.inspections || []).find((i: any) => i.status !== 'CANCELLED' && i.status !== 'COMPLETED');

      let inspectionRecord: any;
      if (existing) {
        inspectionRecord = await tx.inspection.update({
          where: { id: existing.id },
          data: {
            scheduled_date: schedDate,
            location,
            purpose,
            ...(item.inspector_id ? { inspector_id: item.inspector_id } : {}),
            status: 'SCHEDULED',
          },
        });
      } else {
        inspectionRecord = await tx.inspection.create({
          data: {
            application_id: item.application_id,
            department_id: item.department_id || application.department_id,
            inspector_id: item.inspector_id || null,
            scheduled_date: schedDate,
            location,
            purpose,
            status: 'SCHEDULED',
          },
        });
      }

      createdOrUpdatedInspections.push(inspectionRecord);

      // Update application status if it was submitted/under review
      if (['SUBMITTED', 'UNDER_SCRUTINY', 'UNDER_REVIEW'].includes(application.status)) {
        await tx.application.update({
          where: { id: item.application_id },
          data: { status: 'INSPECTION_SCHEDULED' },
        });
      }

      // Audit event
      await tx.applicationEvent.create({
        data: {
          application_id: item.application_id,
          event_type: 'joint_inspection_coordinated',
          notes: `Joint Department Inspection coordinated for ${schedDate.toDateString()} at ${location}. Coordinated across ${data.departments.length} regulatory authorities.`,
        },
      });
    }

    // Notify applicant organization
    const orgUsers = await tx.user.findMany({
      where: { org_id: project.org_id, role: { in: ['ENTREPRENEUR', 'MANAGER'] } },
    });

    for (const u of orgUsers) {
      await tx.notification.create({
        data: {
          user_id: u.id,
          title: `Joint Department Site Visit Scheduled — ${project.name}`,
          message: `A coordinated joint site inspection with ${data.departments.length} departments has been scheduled on ${schedDate.toDateString()} at ${location}.`,
          type: 'info',
        },
      });
    }

    return {
      message: `Joint Department Inspection scheduled successfully for ${data.departments.length} clearances.`,
      scheduled_date: schedDate.toISOString(),
      location,
      inspections: createdOrUpdatedInspections,
    };
  });
}

/**
 * Reschedule a joint site visit across all participating inspections simultaneously.
 */
export async function rescheduleJointInspection(
  data: {
    project_id: string;
    inspection_ids: string[];
    new_date: Date | string;
    location?: string;
    reason?: string;
  },
  actorId: string
) {
  if (!data.inspection_ids || data.inspection_ids.length === 0) {
    throw new Error('No inspection IDs provided to reschedule');
  }

  const newDate = new Date(data.new_date);
  const reason = data.reason || 'Joint departmental coordination and scheduling alignment';

  return prisma.$transaction(async (tx) => {
    const updated: any[] = [];

    for (const id of data.inspection_ids) {
      const insp = await tx.inspection.findUnique({
        where: { id },
        include: { application: true },
      });

      if (!insp) continue;

      const updateData: any = {
        scheduled_date: newDate,
        status: 'RESCHEDULED',
      };
      if (data.location) updateData.location = data.location;

      const updatedInsp = await tx.inspection.update({
        where: { id },
        data: updateData,
      });

      updated.push(updatedInsp);

      await tx.applicationEvent.create({
        data: {
          application_id: insp.application_id,
          actor_id: actorId,
          event_type: 'joint_inspection_rescheduled',
          notes: `Joint inspection rescheduled to ${newDate.toDateString()}. Reason: ${reason}`,
        },
      });
    }

    return {
      message: `Rescheduled ${updated.length} inspection(s) to ${newDate.toDateString()}.`,
      rescheduled_count: updated.length,
      new_date: newDate.toISOString(),
      updated,
    };
  });
}

/**
 * Confirm applicant readiness for a joint site inspection across all participating departments.
 */
export async function confirmJointReadiness(
  data: {
    project_id: string;
    inspection_ids: string[];
    notes?: string;
  },
  actorId: string
) {
  if (!data.inspection_ids || data.inspection_ids.length === 0) {
    throw new Error('No inspection IDs provided');
  }

  const notes = data.notes || 'Applicant confirmed site readiness for joint multi-department inspection.';

  return prisma.$transaction(async (tx) => {
    for (const id of data.inspection_ids) {
      const insp = await tx.inspection.findUnique({ where: { id } });
      if (!insp) continue;

      await tx.applicationEvent.create({
        data: {
          application_id: insp.application_id,
          actor_id: actorId,
          event_type: 'inspection_readiness_confirmed',
          notes,
        },
      });
    }

    return {
      message: `Confirmed site readiness for ${data.inspection_ids.length} participating department(s).`,
      confirmed_count: data.inspection_ids.length,
    };
  });
}

