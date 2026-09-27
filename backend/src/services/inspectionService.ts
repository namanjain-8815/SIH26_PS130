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
