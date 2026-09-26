import { prisma } from '../lib/prisma';

export async function listProjectIncentives(projectId: string) {
  return prisma.incentiveMatch.findMany({
    where: { project_id: projectId },
    include: { incentive_scheme: true },
  });
}

// Matching itself happens in regulatoryService.runRegulatoryAnalysis, which
// reuses the rule-engine evaluator against IncentiveScheme.eligibility_rules
// (plan §23). This service only reads back the persisted matches. UI copy
// must say "Potentially applicable based on current project information" —
// never "You are guaranteed this benefit" (plan §23, DEVELOPER_GUIDE.md §6).
