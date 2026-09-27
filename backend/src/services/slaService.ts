import { prisma } from '../lib/prisma';
import { SLAStatus } from '../types/database';

/**
 * Compute SLA status for a single application.
 *
 * Uses SLAPolicy.duration_days + application.submitted_at to derive due date.
 * Thresholds:
 *   - COMPLETED: application is APPROVED or CLOSED
 *   - BREACHED: due_date is in the past and not completed
 *   - AT_RISK: < 20% of configured duration remaining
 *   - ON_TRACK: otherwise
 *
 * Copy must say "Configured SLA" — never "legally guaranteed".
 * (IMPLEMENTATION_PLAN.md §19, DEVELOPER_GUIDE.md §6)
 */
export async function computeSLAStatus(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project_approval: {
        include: { approval_type: { include: { sla_policies: true } } },
      },
    },
  });
  if (!application) return null;

  const slaPolicy = application.project_approval.approval_type.sla_policies[0];
  if (!slaPolicy) return null;

  const now = new Date();
  const startDate = application.submitted_at ?? application.created_at;
  const dueDate = new Date(startDate.getTime() + slaPolicy.duration_days * 86_400_000);

  const isCompleted = ['APPROVED', 'CLOSED', 'REJECTED'].includes(application.status);

  let status: SLAStatus;
  let breached = false;
  let breach_duration: number | null = null;

  if (isCompleted) {
    status = 'COMPLETED';
  } else if (now > dueDate) {
    status = 'BREACHED';
    breached = true;
    breach_duration = Math.ceil((now.getTime() - dueDate.getTime()) / 86_400_000);
  } else {
    const totalMs = dueDate.getTime() - startDate.getTime();
    const remainingMs = dueDate.getTime() - now.getTime();
    const fractionRemaining = remainingMs / totalMs;
    status = fractionRemaining < 0.2 ? 'AT_RISK' : 'ON_TRACK';
  }

  // Upsert SLAInstance
  const instance = await prisma.sLAInstance.upsert({
    where: { application_id: applicationId },
    update: { due_date: dueDate, status, breached, breach_duration },
    create: { application_id: applicationId, due_date: dueDate, status, breached, breach_duration },
  });

  return {
    ...instance,
    configured_duration_days: slaPolicy.duration_days,
    specified_time_limit_days: slaPolicy.duration_days,
    start_event: slaPolicy.start_event,
    statutory_reference: 'Maharashtra Industry, Trade and Investment Facilitation Rules, 2025',
    label: 'Configured service timeline — statutory specified time limit under MAITRI Rules (Demonstration Data)',
  };
}

export async function getProjectSLAStatus(projectId: string) {
  const instances = await prisma.sLAInstance.findMany({
    where: { application: { project_approval: { project_id: projectId } } },
    include: {
      application: {
        include: {
          project_approval: { include: { approval_type: true } },
          department: true,
        },
      },
    },
    orderBy: { due_date: 'asc' },
  });

  return instances.map((inst) => ({
    ...inst,
    approval_name: inst.application.project_approval.approval_type.name,
    application_number: inst.application.application_number,
    department_name: inst.application.department.name,
    label: 'Configured service timeline — statutory specified time limit under MAITRI Rules (Demonstration Data)',
  }));
}

export async function getGovernmentSLAMonitor(departmentId?: string) {
  const instances = await prisma.sLAInstance.findMany({
    where: departmentId ? { application: { department_id: departmentId } } : undefined,
    include: {
      application: {
        include: {
          project_approval: {
            include: { project: { include: { organization: true } }, approval_type: { include: { sla_policies: true } } },
          },
          department: true,
          events: true,
        },
      },
    },
    orderBy: { due_date: 'asc' },
  });

  return instances.map((inst) => {
    const isCompleted = ['APPROVED', 'CLOSED', 'REJECTED'].includes(inst.application.status);
    const isEscalated = inst.application.events?.some(
      (e: any) => e.event_type === 'escalated_to_empowered_committee'
    ) ?? false;
    const slaDurationDays = inst.application.project_approval.approval_type?.sla_policies?.[0]?.duration_days ?? 30;

    return {
      id: inst.id,
      application_id: inst.application.id,
      application_number: inst.application.application_number,
      approval_name: inst.application.project_approval.approval_type.name,
      org_name: inst.application.project_approval.project.organization.legal_name,
      department_name: inst.application.department.name,
      department_id: inst.application.department_id,
      sla_status: inst.status,
      specified_time_limit_days: slaDurationDays,
      due_date: inst.due_date,
      breached: inst.breached,
      breach_duration_days: inst.breach_duration,
      application_status: inst.application.status,
      is_escalated: isEscalated,
      can_escalate: !isCompleted && (inst.breached || inst.status === 'AT_RISK'),
      statutory_reference: 'Maharashtra Industry, Trade and Investment Facilitation Rules, 2025',
      label: 'Configured service timeline — statutory specified time limit under MAITRI Rules (Demonstration Data)',
    };
  });
}

export async function evaluateAndNotifySLAs() {
  const activeApplications = await prisma.application.findMany({
    where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED', 'INSPECTION_PENDING', 'INSPECTION_SCHEDULED'] } },
    include: {
      project_approval: { include: { approval_type: { include: { sla_policies: true } }, project: true } },
      department: true,
    },
  });

  const evaluations: any[] = [];
  for (const app of activeApplications) {
    const sla = await computeSLAStatus(app.id);
    if (!sla) continue;

    evaluations.push({
      application_number: app.application_number,
      approval_name: app.project_approval.approval_type.name,
      status: sla.status,
      due_date: sla.due_date,
    });
  }

  return { evaluated_count: evaluations.length, evaluations };
}
