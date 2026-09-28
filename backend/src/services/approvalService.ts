import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { getPrescribedFormForApproval } from './prescribedFormService';
import { evaluateProjectAgainstRules } from '../rule-engine/evaluate';
import { EvaluableRule, ProjectProfile } from '../rule-engine/types';

export async function listApprovalTypes() {
  const types = await prisma.approvalType.findMany({
    where: { active: true },
    include: {
      document_requirements: true,
      applicability_rules: true,
      dependent_on: {
        include: { prerequisite_approval: true },
      },
      prerequisite_for: {
        include: { dependent_approval: true },
      },
    },
    orderBy: { name: 'asc' },
  });
  return types.map((t) => ({
    ...t,
    prescribed_form: getPrescribedFormForApproval(t.name),
  }));
}

export async function getApprovalType(id: string) {
  const approvalType = await prisma.approvalType.findUnique({
    where: { id },
    include: {
      document_requirements: true,
      applicability_rules: true,
      dependent_on: {
        include: { prerequisite_approval: true },
      },
      prerequisite_for: {
        include: { dependent_approval: true },
      },
    },
  });
  if (!approvalType) throw new NotFoundError('Approval type not found');
  return {
    ...approvalType,
    prescribed_form: getPrescribedFormForApproval(approvalType.name),
  };
}

export async function checkApprovalApplicability(approvalTypeId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { attributes: true },
  });
  if (!project) throw new NotFoundError('Project not found');

  const approvalType = await prisma.approvalType.findUnique({
    where: { id: approvalTypeId },
    include: {
      document_requirements: true,
      applicability_rules: true,
      dependent_on: {
        include: { prerequisite_approval: true },
      },
      prerequisite_for: {
        include: { dependent_approval: true },
      },
    },
  });
  if (!approvalType) throw new NotFoundError('Approval type not found');

  const profile: ProjectProfile = {
    sector: project.sector,
    district: project.district,
    industrial_area: project.industrial_area,
    investment_amount: Number(project.investment_amount),
    employee_count: project.employee_count,
    stage: project.stage,
    ...Object.fromEntries(project.attributes.map((a) => [a.key, a.value])),
  };

  const evaluableRules: EvaluableRule[] = (approvalType.applicability_rules || []).map((r) => ({
    id: r.id,
    approval_type_id: r.approval_type_id,
    rule_name: r.rule_name,
    conditions: r.conditions as unknown as EvaluableRule['conditions'],
    jurisdiction: r.jurisdiction,
    sector: r.sector,
  }));

  const result = evaluateProjectAgainstRules(profile, evaluableRules);
  const isApplicable = result.applicableApprovals.includes(approvalTypeId);

  const existingProjectApproval = await prisma.projectApproval.findUnique({
    where: {
      project_id_approval_type_id: {
        project_id: projectId,
        approval_type_id: approvalTypeId,
      },
    },
    include: { application: true },
  });

  return {
    approval_type_id: approvalTypeId,
    approval_name: approvalType.name,
    authority: approvalType.authority,
    project_id: projectId,
    project_name: project.name,
    applicable: isApplicable || !!existingProjectApproval,
    reason: isApplicable
      ? result.reasons[approvalTypeId]
      : existingProjectApproval?.applicability_reason || 'Criteria not met for current project attributes.',
    matched_rules: result.matches.map((m) => m.reason),
    status_in_project: existingProjectApproval?.status || (isApplicable ? 'NOT_STARTED' : null),
    application_id: existingProjectApproval?.application?.id || null,
    application_status: existingProjectApproval?.application?.status || null,
    requires_inspection: approvalType.requires_inspection,
    default_sla_days: approvalType.default_sla_days,
    renewal_period_days: approvalType.renewal_period_days,
    document_requirements: approvalType.document_requirements || [],
    prerequisites: (approvalType.dependent_on || []).map((d: any) => d.prerequisite_approval).filter(Boolean),
  };
}

export async function listProjectApprovals(projectId: string) {
  return prisma.projectApproval.findMany({
    where: { project_id: projectId },
    include: { approval_type: true, application: true },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }],
  });
}

/**
 * GET /api/project-approvals/:id
 *
 * The "ten-question" approval detail view:
 *   1. What is this approval?
 *   2. Why is it required for this project?
 *   3. Who issues it?
 *   4. What documents are needed?
 *   5. What are the prerequisite approvals?
 *   6. What approvals does this unblock (downstream)?
 *   7. What is the current status?
 *   8. What is the SLA / time remaining?
 *   9. Is there an active application? What is its state?
 *  10. What is the recommended next action?
 *
 * (IMPLEMENTATION_PLAN.md §14)
 */
export async function getProjectApprovalDetail(projectApprovalId: string) {
  const pa = await prisma.projectApproval.findUnique({
    where: { id: projectApprovalId },
    include: {
      approval_type: {
        include: {
          document_requirements: true,
          sla_policies: true,
          prerequisite_for: {
            include: { dependent_approval: true },
          },
          dependent_on: {
            include: { prerequisite_approval: true },
          },
        },
      },
      project: {
        include: {
          project_approvals: { include: { approval_type: true } },
        },
      },
      application: {
        include: {
          department: true,
          application_documents: { include: { document: true } },
          events: { orderBy: { timestamp: 'asc' } },
          queries: { include: { responses: true } },
          inspections: true,
          sla_instance: true,
        },
      },
    },
  });

  if (!pa) throw new NotFoundError('Project approval not found');

  // 4. Documents needed
  const requiredDocuments = pa.approval_type.document_requirements.map((dr) => ({
    id: dr.id,
    document_type: dr.document_type,
    mandatory: dr.mandatory,
    condition: dr.condition,
  }));

  // 5. Prerequisites — look up in this project's approval set
  const paByTypeId = new Map<string, any>(
    pa.project.project_approvals.map((p) => [p.approval_type_id, p])
  );

  const [dependentOn, prerequisiteFor] = await Promise.all([
    pa.approval_type.dependent_on
      ? Promise.resolve(pa.approval_type.dependent_on)
      : prisma.approvalDependency.findMany({
          where: { dependent_approval_type_id: pa.approval_type_id },
          include: { prerequisite_approval: true, prerequisite_approval_type: true },
        }),
    pa.approval_type.prerequisite_for
      ? Promise.resolve(pa.approval_type.prerequisite_for)
      : prisma.approvalDependency.findMany({
          where: { prerequisite_approval_type_id: pa.approval_type_id },
          include: { dependent_approval: true, dependent_approval_type: true },
        }),
  ]);

  const prerequisites = (dependentOn || []).map((dep: any) => {
    const prereqPA = paByTypeId.get(dep.prerequisite_approval_type_id);
    return {
      approval_type_id: dep.prerequisite_approval_type_id,
      name: dep.prerequisite_approval?.name || dep.prerequisite_approval_type?.name || 'Prerequisite Approval',
      dependency_type: dep.dependency_type,
      status: prereqPA?.status ?? 'NOT_IN_PROJECT',
      project_approval_id: prereqPA?.id ?? null,
    };
  });

  // 6. Downstream — what this approval unlocks
  const downstream = (prerequisiteFor || []).map((dep: any) => {
    const depPA = paByTypeId.get(dep.dependent_approval_type_id);
    return {
      approval_type_id: dep.dependent_approval_type_id,
      name: dep.dependent_approval?.name || dep.dependent_approval_type?.name || 'Dependent Approval',
      dependency_type: dep.dependency_type,
      status: depPA?.status ?? 'NOT_IN_PROJECT',
      project_approval_id: depPA?.id ?? null,
    };
  });

  // 8. SLA
  const slaPolicy = pa.approval_type.sla_policies?.[0];
  const slaInstance = pa.application?.sla_instance;
  const now = new Date();
  let timeRemaining: string | null = null;
  if (slaInstance?.due_date) {
    const diffMs = slaInstance.due_date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86_400_000);
    timeRemaining = diffDays > 0 ? `${diffDays} days remaining` : `Overdue by ${Math.abs(diffDays)} days`;
  }

  // 10. Next action
  let nextAction: string;
  if (pa.status === 'COMPLETED') {
    nextAction = 'This approval has been obtained. Monitor renewal dates in the Compliance tracker.';
  } else if (pa.status === 'BLOCKED') {
    const pendingPrereqs = prerequisites
      .filter((p) => p.status !== 'COMPLETED')
      .map((p) => p.name)
      .join(', ');
    nextAction = `Obtain prerequisites first: ${pendingPrereqs || 'see prerequisites list'}`;
  } else if (pa.application?.queries?.some((q) => q.status === 'OPEN')) {
    nextAction = 'Respond to the open query from the issuing department.';
  } else if (pa.application?.status === 'INSPECTION_SCHEDULED') {
    nextAction = 'Prepare the premises for the scheduled inspection.';
  } else if (!pa.application) {
    nextAction = 'Create and submit an application to the issuing department.';
  } else if (pa.application.status === 'IN_PREPARATION') {
    nextAction = 'Complete and submit the application with all required documents.';
  } else {
    nextAction = 'Monitor application status and respond promptly to any queries.';
  }

  return {
    id: pa.id,
    // 1. What is this?
    approval_type: {
      id: pa.approval_type.id,
      name: pa.approval_type.name,
      description: pa.approval_type.description,
      purpose: pa.approval_type.purpose,
      category: pa.approval_type.category,
      source_reference: pa.approval_type.source_reference,
      requires_inspection: pa.approval_type.requires_inspection,
      renewal_period_days: pa.approval_type.renewal_period_days,
      authority: pa.approval_type.authority,
    },
    // 2. Why required?
    applicability_reason: pa.applicability_reason,
    // 3. Who issues?
    authority: pa.approval_type.authority,
    // 4. Documents
    required_documents: requiredDocuments,
    // 5. Prerequisites
    prerequisites,
    // 6. Downstream
    downstream,
    // 7. Status
    status: pa.status,
    priority: pa.priority,
    blocked_reason: pa.blocked_reason,
    due_date: pa.due_date,
    actual_completion_date: pa.actual_completion_date,
    // 8. SLA
    sla: slaPolicy
      ? {
          configured_duration_days: slaPolicy.duration_days,
          start_event: slaPolicy.start_event,
          escalation_level: slaPolicy.escalation_level,
          instance_status: slaInstance?.status ?? null,
          due_date: slaInstance?.due_date ?? null,
          time_remaining: timeRemaining,
          label: 'Configured service timeline — not a legally guaranteed commitment',
        }
      : null,
    // 9. Application
    application: pa.application
      ? {
          id: pa.application.id,
          application_number: pa.application.application_number,
          status: pa.application.status,
          submitted_at: pa.application.submitted_at,
          department: pa.application.department,
          open_queries: pa.application.queries.filter((q) => q.status === 'OPEN').length,
          upcoming_inspections: pa.application.inspections.filter((i) => i.status === 'SCHEDULED').length,
          timeline_events: pa.application.events,
          documents_attached: pa.application.application_documents.length,
        }
      : null,
    // 10. Next action
    next_action: nextAction,
    // 11. Prescribed Form / Template (P1.8)
    prescribed_form: getPrescribedFormForApproval(pa.approval_type.name),
  };
}
