import { prisma } from '../lib/prisma';
import { evaluateProjectAgainstRules } from '../rule-engine/evaluate';
import { EvaluableRule, ProjectProfile } from '../rule-engine/types';
import { NotFoundError } from '../lib/errors';

/**
 * POST /api/projects/:id/regulatory-analysis (plan §7, §13, §31).
 *
 * Loads the project profile (core fields + flattened ProjectAttribute rows),
 * runs the shared rule evaluator against active ApplicabilityRule rows,
 * idempotently upserts a ProjectApproval row per match, then resolves the
 * required documents + intra-set dependencies. Also reuses the same
 * evaluator against IncentiveScheme.eligibility_rules (plan §23) since both
 * tables share the RuleCondition[] shape.
 */
export async function runRegulatoryAnalysis(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { attributes: true },
  });
  if (!project) throw new NotFoundError('Project not found');

  const profile: ProjectProfile = {
    sector: project.sector,
    district: project.district,
    industrial_area: project.industrial_area,
    investment_amount: Number(project.investment_amount),
    employee_count: project.employee_count,
    stage: project.stage,
    ...Object.fromEntries(project.attributes.map((a) => [a.key, a.value])),
  };

  const [rules, incentiveSchemes] = await Promise.all([
    prisma.applicabilityRule.findMany({ where: { active: true } }),
    prisma.incentiveScheme.findMany(),
  ]);

  const evaluableRules: EvaluableRule[] = rules.map((r) => ({
    id: r.id,
    approval_type_id: r.approval_type_id,
    rule_name: r.rule_name,
    conditions: r.conditions as unknown as EvaluableRule['conditions'],
    jurisdiction: r.jurisdiction,
    sector: r.sector,
  }));

  const approvalResult = evaluateProjectAgainstRules(profile, evaluableRules);

  if (approvalResult.applicableApprovals.length > 0) {
    await prisma.$transaction(
      approvalResult.applicableApprovals.map((approvalTypeId) =>
        prisma.projectApproval.upsert({
          where: { project_id_approval_type_id: { project_id: projectId, approval_type_id: approvalTypeId } },
          update: { applicability_reason: approvalResult.reasons[approvalTypeId] },
          create: {
            project_id: projectId,
            approval_type_id: approvalTypeId,
            applicability_reason: approvalResult.reasons[approvalTypeId],
          },
        })
      )
    );
  }

  const [approvals, documentRequirements, dependencies] = await Promise.all([
    prisma.approvalType.findMany({ where: { id: { in: approvalResult.applicableApprovals } } }),
    prisma.documentRequirement.findMany({
      where: { approval_type_id: { in: approvalResult.applicableApprovals } },
    }),
    prisma.approvalDependency.findMany({
      where: {
        prerequisite_approval_type_id: { in: approvalResult.applicableApprovals },
        dependent_approval_type_id: { in: approvalResult.applicableApprovals },
      },
    }),
  ]);

  const incentiveMatches = incentiveSchemes
    .map((scheme) => {
      const evalResult = evaluateProjectAgainstRules(profile, [
        {
          id: scheme.id,
          approval_type_id: scheme.id,
          rule_name: scheme.name,
          conditions: scheme.eligibility_rules as unknown as EvaluableRule['conditions'],
          jurisdiction: 'maharashtra',
        },
      ]);
      return evalResult.applicableApprovals.length > 0
        ? { scheme, reason: evalResult.reasons[scheme.id] }
        : null;
    })
    .filter((m): m is { scheme: (typeof incentiveSchemes)[number]; reason: string } => m !== null);

  if (incentiveMatches.length > 0) {
    await prisma.$transaction(
      incentiveMatches.map(({ scheme, reason }) =>
        prisma.incentiveMatch.upsert({
          where: { project_id_incentive_scheme_id: { project_id: projectId, incentive_scheme_id: scheme.id } },
          update: { matching_reasons: [reason] },
          create: { project_id: projectId, incentive_scheme_id: scheme.id, matching_reasons: [reason] },
        })
      )
    );
  }

  // TODO (plan §24): also derive ComplianceRequirement rows here for any
  // matched ApprovalType with a renewal_period_days set.

  return {
    approvals,
    documents: documentRequirements,
    dependencies,
    incentives: incentiveMatches.map((m) => ({ scheme: m.scheme, reason: m.reason })),
    warnings: approvalResult.warnings,
  };
}
