import { prisma } from '../lib/prisma';
import { calculateScrutinyPriority } from './scrutinyPriorityService';

/**
 * GET /api/government/work-queue
 *
 * Filterable list of applications for government officers.
 * Returns real application data from the database.
 * (IMPLEMENTATION_PLAN.md §20)
 */
const VALID_APPLICATION_STATUSES = new Set([
  'DRAFT',
  'IN_PREPARATION',
  'SUBMITTED',
  'UNDER_REVIEW',
  'QUERY_RAISED',
  'INSPECTION_PENDING',
  'INSPECTION_SCHEDULED',
  'AWAITING_DEPARTMENT',
  'AWAITING_APPLICANT',
  'RECOMMENDED',
  'APPROVED',
  'REJECTED',
]);

const VALID_PRIORITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

export async function getWorkQueue(filters: {
  department_id?: string;
  status?: string;
  priority?: string;
  district?: string;
}) {
  const statusUpper = filters.status?.toUpperCase();
  const priorityUpper = filters.priority?.toUpperCase();

  const status = statusUpper && VALID_APPLICATION_STATUSES.has(statusUpper) ? (statusUpper as never) : undefined;
  const priority = priorityUpper && VALID_PRIORITIES.has(priorityUpper) ? (priorityUpper as never) : undefined;
  const department_id =
    filters.department_id && filters.department_id !== 'undefined' && filters.department_id !== 'null'
      ? filters.department_id
      : undefined;
  const district =
    filters.district && filters.district !== 'undefined' && filters.district !== 'null'
      ? filters.district
      : undefined;

  const apps = await prisma.application.findMany({
    where: {
      ...(department_id ? { department_id } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { project_approval: { priority } } : {}),
      ...(district ? { project_approval: { project: { district } } } : {}),
    },
    include: {
      project_approval: {
        include: {
          project: {
            include: {
              organization: true,
              project_approvals: {
                include: { approval_type: true },
              },
            },
          },
          approval_type: {
            include: {
              document_requirements: true,
              dependent_on: true,
            },
          },
        },
      },
      department: true,
      sla_instance: true,
      queries: { where: { status: { in: ['OPEN', 'RESPONDED'] } } },
      inspections: {
        include: { findings: true },
      },
      application_documents: true,
    },
    orderBy: [{ submitted_at: 'asc' }],
  });

  return apps.map((app) => {
    const approvalType = app.project_approval?.approval_type;
    const project = app.project_approval?.project;
    const reqDocs = approvalType?.document_requirements?.length ?? 0;
    const upDocs = app.application_documents?.length ?? 0;

    const dependentOn = approvalType?.dependent_on ?? [];
    const projectApprovals = project?.project_approvals ?? [];
    const paByTypeId = new Map<string, any>(projectApprovals.map((pa: any) => [pa.approval_type_id, pa]));

    const prerequisites = dependentOn
      .filter((dep: any) => dep.dependency_type === 'PREREQUISITE')
      .map((dep: any) => ({
        id: dep.prerequisite_approval_type_id,
        status: (paByTypeId.get(dep.prerequisite_approval_type_id) as any)?.status ?? 'NOT_STARTED',
      }));

    const distinctDepts = new Set<string>();
    if (app.department_id) distinctDepts.add(app.department_id);
    for (const pa of projectApprovals) {
      if (pa.approval_type?.department_id) {
        distinctDepts.add(pa.approval_type.department_id);
      }
    }

    let adverseFindingsCount = 0;
    const scheduledInspections = app.inspections ?? [];
    for (const insp of scheduledInspections) {
      for (const finding of insp.findings ?? []) {
        if (
          finding.severity === 'CRITICAL' ||
          finding.severity === 'HIGH' ||
          finding.status === 'NON_COMPLIANT'
        ) {
          adverseFindingsCount++;
        }
      }
    }

    const scrutinyPriority = calculateScrutinyPriority({
      application_status: app.status,
      required_documents_count: reqDocs,
      uploaded_documents_count: upDocs,
      prerequisites,
      concerned_departments_count: Math.max(1, distinctDepts.size),
      requires_inspection: approvalType?.requires_inspection ?? false,
      scheduled_inspections_count: scheduledInspections.length,
      open_queries_count: app.queries?.length ?? 0,
      sla_status: app.sla_instance?.status ?? null,
      sla_due_date: app.sla_instance?.due_date ?? null,
      adverse_findings_count: adverseFindingsCount,
    });

    return {
      id: app.id,
      application_number: app.application_number,
      status: app.status,
      submitted_at: app.submitted_at,
      due_date: app.due_date,
      approval_name: app.project_approval?.approval_type?.name ?? 'Unknown Approval',
      approval_category: app.project_approval?.approval_type?.category ?? 'GENERAL',
      priority: app.project_approval?.priority ?? 'MEDIUM',
      org_name: app.project_approval?.project?.organization?.legal_name ?? 'Unknown Organization',
      project_name: app.project_approval?.project?.name ?? 'Unknown Project',
      district: app.project_approval?.project?.district ?? 'Unknown District',
      department_id: app.department_id,
      department_name: app.department?.name ?? 'Unknown Department',
      sla_status: app.sla_instance?.status ?? null,
      sla_due_date: app.sla_instance?.due_date ?? null,
      open_queries: app.queries?.length ?? 0,
      upcoming_inspections: app.inspections?.length ?? 0,
      scrutiny_priority: scrutinyPriority,
    };
  });
}

/**
 * GET /api/government/bottlenecks
 *
 * Bottleneck categories derived from ApplicationEvent and Application status data.
 * Each bottleneck includes count + example applications.
 * NO hardcoded or vanity chart data — derived from stored rows.
 * (IMPLEMENTATION_PLAN.md §20, §26)
 */
export async function getBottlenecks(filters?: { department_id?: string }) {
  const [events, applications] = await Promise.all([
    prisma.applicationEvent.findMany({
      select: { event_type: true, application_id: true, timestamp: true },
    }),
    prisma.application.findMany({
      where: filters?.department_id ? { department_id: filters.department_id } : {},
      select: { id: true, status: true, application_number: true, department_id: true },
    }),
  ]);

  const appIds = new Set(applications.map((a) => a.id));
  const scopedEvents = events.filter((e) => appIds.has(e.application_id));

  // Count by event type
  const eventCounts = new Map<string, number>();
  for (const ev of scopedEvents) {
    eventCounts.set(ev.event_type, (eventCounts.get(ev.event_type) ?? 0) + 1);
  }

  // Count applications in each "stuck" status
  const statusCounts = new Map<string, number>();
  for (const app of applications) {
    statusCounts.set(app.status, (statusCounts.get(app.status) ?? 0) + 1);
  }

  const queryRaisedCount = statusCounts.get('QUERY_RAISED') ?? 0;
  const inspectionPendingCount = statusCounts.get('INSPECTION_PENDING') ?? 0;
  const inspectionScheduledCount = statusCounts.get('INSPECTION_SCHEDULED') ?? 0;
  const awaitingDeptCount = statusCounts.get('AWAITING_DEPARTMENT') ?? 0;
  const underReviewCount = statusCounts.get('UNDER_REVIEW') ?? 0;
  const escalatedCount = scopedEvents.filter(
    (e) => e.event_type === 'escalated_to_empowered_committee'
  ).length;

  const bottlenecks = [
    {
      category: 'Clarification / Query Awaiting Applicant Response',
      description: 'Applications temporarily halted while applicant prepares requested clarifications or documents',
      count: queryRaisedCount + (eventCounts.get('query_raised') ?? 0),
      event_type: 'query_raised',
      status_contributing: 'QUERY_RAISED',
      delay_party: 'APPLICANT',
    },
    {
      category: 'Competent Authority Scrutiny & Verification Delay',
      description: 'Applications pending substantive departmental review or inter-departmental technical clearance',
      count: underReviewCount + awaitingDeptCount,
      event_type: 'status_changed',
      status_contributing: 'UNDER_REVIEW',
      delay_party: 'DEPARTMENT',
    },
    {
      category: 'Site Inspection Scheduling & Report Submission',
      description: 'Applications awaiting site inspection assignment, on-site visit, or inspector finding submission',
      count: inspectionPendingCount + inspectionScheduledCount,
      event_type: 'inspection_scheduled',
      status_contributing: 'INSPECTION_SCHEDULED',
      delay_party: 'INSPECTION_OFFICER',
    },
    {
      category: 'Empowered Committee Escalation Review',
      description: 'Statutory transfer under Section 10 of MAITRI Act 2023 due to specified time limit breach',
      count: escalatedCount,
      event_type: 'escalated_to_empowered_committee',
      status_contributing: 'UNDER_REVIEW',
      delay_party: 'EMPOWERED_COMMITTEE',
    },
  ].filter((b) => b.count > 0);

  return {
    bottlenecks,
    computed_from: 'ApplicationEvent, Application status, and Inspection records',
    label: 'Bottleneck data derived from stored application events and status transitions (Demonstration Data).',
  };
}

/**
 * GET /api/government/analytics
 *
 * Summary analytics computed from stored records.
 * (IMPLEMENTATION_PLAN.md §26)
 */
export async function getAnalyticsSummary(filters?: { department_id?: string }) {
  const deptFilter = filters?.department_id ? { department_id: filters.department_id } : {};

  const [applications, departments, slaInstances, queries, inspections, events] = await Promise.all([
    prisma.application.findMany({
      where: deptFilter,
      select: {
        id: true,
        status: true,
        submitted_at: true,
        completed_at: true,
        department_id: true,
        project_approval: {
          select: {
            project: { select: { district: true } },
            approval_type: { select: { authority: true, name: true } },
          },
        },
        sla_instance: { select: { status: true, breached: true } },
      },
    }),
    prisma.department.findMany({
      select: { id: true, name: true, state: true, district: true },
    }),
    prisma.sLAInstance.findMany({
      select: { status: true, breached: true, breach_duration: true, application_id: true },
    }),
    prisma.query.findMany({
      include: { responses: { orderBy: { created_at: 'asc' } } },
    }),
    prisma.inspection.findMany({
      include: { findings: true },
    }),
    prisma.applicationEvent.findMany({
      select: { event_type: true, timestamp: true, application_id: true },
      orderBy: { timestamp: 'asc' },
    }),
  ]);

  const appIds = new Set(applications.map((a) => a.id));

  // Applications by status
  const byStatus = new Map<string, number>();
  for (const app of applications) {
    byStatus.set(app.status, (byStatus.get(app.status) ?? 0) + 1);
  }

  // Scrutiny processing time (submitted → completed, days)
  const completedWithTime = applications.filter((a) => a.submitted_at && a.completed_at);
  const avgProcessingDays =
    completedWithTime.length > 0
      ? Math.round(
          completedWithTime.reduce((sum, a) => {
            const completedTime =
              a.completed_at instanceof Date ? a.completed_at.getTime() : new Date(a.completed_at!).getTime();
            const submittedTime =
              a.submitted_at instanceof Date ? a.submitted_at.getTime() : new Date(a.submitted_at!).getTime();
            const days = (completedTime - submittedTime) / 86_400_000;
            return sum + (isNaN(days) ? 0 : days);
          }, 0) / completedWithTime.length
        )
      : null;

  // Applications by Concerned Department / Authority
  const deptMap = new Map<string, { total: number; under_review: number; approved: number; breached: number }>();
  for (const dept of departments) {
    deptMap.set(dept.id, { total: 0, under_review: 0, approved: 0, breached: 0 });
  }

  for (const app of applications) {
    const dId = app.department_id;
    if (dId && deptMap.has(dId)) {
      const stats = deptMap.get(dId)!;
      stats.total++;
      if (app.status === 'UNDER_REVIEW') stats.under_review++;
      if (app.status === 'APPROVED') stats.approved++;
      if (app.sla_instance?.breached) stats.breached++;
    }
  }

  const applications_by_department = departments
    .map((dept) => {
      const s = deptMap.get(dept.id)!;
      return {
        id: dept.id,
        name: dept.name,
        total: s.total,
        under_review: s.under_review,
        approved: s.approved,
        breached: s.breached,
      };
    })
    .filter((d) => d.total > 0 || !filters?.department_id)
    .sort((a, b) => b.total - a.total);

  // SLA metrics scoped
  const scopedSla = slaInstances.filter((s) => appIds.has(s.application_id));
  const slaBreaches = scopedSla.filter((s) => s.breached).length;
  const slaAtRisk = scopedSla.filter((s) => s.status === 'AT_RISK').length;
  const slaOnTrack = scopedSla.filter((s) => s.status === 'ON_TRACK').length;
  const slaCompleted = scopedSla.filter((s) => s.status === 'COMPLETED').length;

  // Applications by district
  const byDistrict = new Map<string, number>();
  for (const app of applications) {
    const district = app.project_approval?.project?.district ?? 'Unknown';
    byDistrict.set(district, (byDistrict.get(district) ?? 0) + 1);
  }

  // Query timing analytics: Applicant response time vs Department scrutiny
  const scopedQueries = queries.filter((q) => appIds.has(q.application_id));
  let totalApplicantResponseHours = 0;
  let responseCount = 0;
  for (const q of scopedQueries) {
    if (q.responses && q.responses.length > 0) {
      const qTime = q.created_at instanceof Date ? q.created_at.getTime() : new Date(q.created_at).getTime();
      const rTime =
        q.responses[0].created_at instanceof Date
          ? q.responses[0].created_at.getTime()
          : new Date(q.responses[0].created_at).getTime();
      const diffHours = (rTime - qTime) / 3_600_000;
      if (diffHours >= 0) {
        totalApplicantResponseHours += diffHours;
        responseCount++;
      }
    }
  }
  const avgApplicantResponseHours = responseCount > 0 ? Math.round(totalApplicantResponseHours / responseCount) : 24;

  const queryMetrics = {
    total: scopedQueries.length,
    open_awaiting_applicant: scopedQueries.filter((q) => q.status === 'OPEN').length,
    responded_awaiting_department: scopedQueries.filter((q) => q.status === 'RESPONDED').length,
    resolved: scopedQueries.filter((q) => q.status === 'CLOSED').length,
    avg_applicant_response_hours: avgApplicantResponseHours,
  };

  // Site Inspections analytics
  const scopedInspections = inspections.filter((i) => appIds.has(i.application_id));
  const totalFindings = scopedInspections.reduce((sum, i) => sum + (i.findings?.length ?? 0), 0);
  const criticalFindings = scopedInspections.reduce(
    (sum, i) =>
      sum + (i.findings?.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length ?? 0),
    0
  );

  const inspectionMetrics = {
    total: scopedInspections.length,
    scheduled: scopedInspections.filter((i) => i.status === 'SCHEDULED').length,
    completed: scopedInspections.filter((i) => i.status === 'COMPLETED').length,
    total_findings: totalFindings,
    critical_findings: criticalFindings,
  };

  // Statutory Escalation count
  const empoweredCommitteeEscalations = events.filter(
    (e) => appIds.has(e.application_id) && e.event_type === 'escalated_to_empowered_committee'
  ).length;

  return {
    applications_by_status: Object.fromEntries(byStatus),
    total_applications: applications.length,
    average_processing_days: avgProcessingDays,
    sla: {
      breached: slaBreaches,
      at_risk: slaAtRisk,
      on_track: slaOnTrack,
      completed: slaCompleted,
      total: scopedSla.length,
      label:
        'Specified Time Limits under Maharashtra Industry, Trade and Investment Facilitation Rules, 2025 (Demonstration Data)',
    },
    applications_by_district: Object.fromEntries(byDistrict),
    applications_by_department,
    query_metrics: queryMetrics,
    inspection_metrics: inspectionMetrics,
    empowered_committee_escalations: empoweredCommitteeEscalations,
    label:
      'Performance Analytics computed from persisted application records, audit events, and scrutiny transitions (Demonstration Data).',
  };
}
