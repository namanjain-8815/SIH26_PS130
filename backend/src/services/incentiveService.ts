import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

/**
 * Incentive matching is driven by regulatoryService.runRegulatoryAnalysis(),
 * which reuses the same rule-engine evaluator against IncentiveScheme.eligibility_rules.
 * This service reads back and formats the persisted matches.
 *
 * UI copy MUST say "Potentially applicable based on current project information" —
 * NEVER "guaranteed" (IMPLEMENTATION_PLAN.md §23, DEVELOPER_GUIDE.md §6).
 */
export async function listProjectIncentives(projectId: string) {
  const matches = await prisma.incentiveMatch.findMany({
    where: { project_id: projectId },
    include: { incentive_scheme: true },
    orderBy: { created_at: 'desc' },
  });

  return matches.map((m) => ({
    id: m.id,
    status: m.status,
    matching_reasons: m.matching_reasons as string[],
    scheme: {
      id: m.incentive_scheme.id,
      name: m.incentive_scheme.name,
      authority: m.incentive_scheme.authority,
      description: m.incentive_scheme.description,
      benefit_description: m.incentive_scheme.benefit_description,
      deadline: m.incentive_scheme.deadline,
      source_reference: m.incentive_scheme.source_reference,
    },
    label: 'Potentially applicable based on current project information — verify eligibility with the issuing authority',
  }));
}

export async function updateIncentiveMatchStatus(
  matchId: string,
  status: 'POTENTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'APPLIED'
) {
  const match = await prisma.incentiveMatch.findUnique({ where: { id: matchId } });
  if (!match) throw new NotFoundError('Incentive match not found');
  return prisma.incentiveMatch.update({ where: { id: matchId }, data: { status } });
}

export async function listAllIncentiveSchemes() {
  return prisma.incentiveScheme.findMany({ orderBy: { name: 'asc' } });
}
