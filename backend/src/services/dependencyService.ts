import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

/**
 * GET /api/projects/:id/dependency-graph
 *
 * Returns a React Flow-compatible {nodes, edges} payload.
 * Nodes = ProjectApproval rows for this project.
 * Edges = ApprovalDependency rows whose both ends are in this project's approval set.
 * Each node carries current status so the frontend can colour it without a second round-trip.
 *
 * Also computes "can_start_now" — approvals with no incomplete prerequisites.
 * (IMPLEMENTATION_PLAN.md §15)
 */
export async function getDependencyGraph(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('Project not found');

  const projectApprovals = await prisma.projectApproval.findMany({
    where: { project_id: projectId },
    include: {
      approval_type: {
        include: {
          document_requirements: true,
          prerequisite_for: true,
          dependent_on: true,
        },
      },
      application: { include: { sla_instance: true, queries: true } },
    },
  });

  // Build lookup by approval_type_id → ProjectApproval
  const paByTypeId = new Map<string, any>(projectApprovals.map((pa) => [pa.approval_type_id, pa]));
  const approvalTypeIds = new Set(projectApprovals.map((pa) => pa.approval_type_id));

  // Fetch all relevant dependencies (both ends in this project's approval set)
  const dependencies = await prisma.approvalDependency.findMany({
    where: {
      prerequisite_approval_type_id: { in: [...approvalTypeIds] },
      dependent_approval_type_id: { in: [...approvalTypeIds] },
    },
    include: {
      prerequisite_approval: true,
      dependent_approval: true,
    },
  });

  // Compute "can start now" per approval:
  // An approval can start if all its PREREQUISITE predecessors are COMPLETED.
  function canStartNow(pa: (typeof projectApprovals)[0]): boolean {
    if (pa.status === 'COMPLETED') return false; // already done
    const prereqEdges = dependencies.filter(
      (d) =>
        d.dependent_approval_type_id === pa.approval_type_id &&
        d.dependency_type === 'PREREQUISITE'
    );
    return prereqEdges.every((d) => {
      const prereqPA = paByTypeId.get(d.prerequisite_approval_type_id);
      return prereqPA?.status === 'COMPLETED';
    });
  }

  // Build nodes
  const nodes = projectApprovals.map((pa) => ({
    id: pa.id,
    type: 'approvalNode',
    data: {
      approval_type_id: pa.approval_type_id,
      label: pa.approval_type.name,
      authority: pa.approval_type.authority,
      category: pa.approval_type.category,
      status: pa.status,
      priority: pa.priority,
      due_date: pa.due_date,
      actual_completion_date: pa.actual_completion_date,
      blocked_reason: pa.blocked_reason,
      applicability_reason: pa.applicability_reason,
      can_start_now: canStartNow(pa),
      requires_inspection: pa.approval_type.requires_inspection,
      default_sla_days: pa.approval_type.default_sla_days,
      sla_status: pa.application?.sla_instance?.status ?? null,
      open_queries: pa.application?.queries?.filter((q) => q.status === 'OPEN').length ?? 0,
      application_id: pa.application?.id ?? null,
      application_status: pa.application?.status ?? null,
    },
    position: { x: 0, y: 0 }, // Frontend (React Flow) will auto-layout
  }));

  // Build edges
  const edges = dependencies.map((d) => {
    const sourcePA = paByTypeId.get(d.prerequisite_approval_type_id);
    const targetPA = paByTypeId.get(d.dependent_approval_type_id);
    return {
      id: d.id,
      source: sourcePA?.id ?? d.prerequisite_approval_type_id,
      target: targetPA?.id ?? d.dependent_approval_type_id,
      type: d.dependency_type === 'PARALLEL_OK' ? 'parallel' : 'prerequisite',
      label: d.dependency_type === 'PREREQUISITE' ? 'Required first' : 'Parallel OK',
      animated: d.dependency_type === 'PREREQUISITE',
      data: {
        dependency_type: d.dependency_type,
        prerequisite_name: d.prerequisite_approval.name,
        dependent_name: d.dependent_approval.name,
      },
    };
  });

  // Summary stats
  const canStartNowCount = projectApprovals.filter((pa) => canStartNow(pa)).length;
  const blockedCount = projectApprovals.filter((pa) => pa.status === 'BLOCKED').length;
  const completedCount = projectApprovals.filter((pa) => pa.status === 'COMPLETED').length;

  return {
    nodes,
    edges,
    summary: {
      total: projectApprovals.length,
      completed: completedCount,
      blocked: blockedCount,
      can_start_now: canStartNowCount,
    },
  };
}

/**
 * Returns approvals with no incomplete prerequisites.
 * Used for the "N approvals can start immediately" banner.
 */
export async function getCanStartNow(projectId: string) {
  const projectApprovals = await prisma.projectApproval.findMany({
    where: { project_id: projectId },
    include: { approval_type: true },
  });

  const approvalTypeIds = projectApprovals.map((pa) => pa.approval_type_id);
  const paByTypeId = new Map<string, any>(projectApprovals.map((pa) => [pa.approval_type_id, pa]));

  const dependencies = await prisma.approvalDependency.findMany({
    where: {
      prerequisite_approval_type_id: { in: approvalTypeIds },
      dependent_approval_type_id: { in: approvalTypeIds },
      dependency_type: 'PREREQUISITE',
    },
  });

  return projectApprovals.filter((pa) => {
    if (pa.status === 'COMPLETED') return false;
    const prereqs = dependencies.filter((d) => d.dependent_approval_type_id === pa.approval_type_id);
    return prereqs.every((d) => paByTypeId.get(d.prerequisite_approval_type_id)?.status === 'COMPLETED');
  });
}
