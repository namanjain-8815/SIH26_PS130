import { NotImplementedError } from '../lib/errors';

/**
 * TODO (plan §15): build a React Flow-shaped { nodes, edges } payload from
 * ApprovalDependency rows scoped to this project's ProjectApproval set, with
 * each node carrying its current status (completed / active / blocked /
 * not_started / awaiting_applicant / awaiting_department) so the frontend
 * can color it without another round trip.
 */
export async function getDependencyGraph(_projectId: string) {
  throw new NotImplementedError('getDependencyGraph: build per IMPLEMENTATION_PLAN.md §15');
}

/**
 * TODO (plan §15): approvals with no incomplete prerequisite — powers the
 * "N approvals can start immediately" section.
 */
export async function getCanStartNow(_projectId: string) {
  throw new NotImplementedError('getCanStartNow: build per IMPLEMENTATION_PLAN.md §15');
}
