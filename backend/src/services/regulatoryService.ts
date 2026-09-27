import { prisma } from '../lib/prisma';
import { evaluateProjectAgainstRules } from '../rule-engine/evaluate';
import { EvaluableRule, ProjectProfile } from '../rule-engine/types';
import { NotFoundError } from '../lib/errors';
import { deriveComplianceObligations } from './complianceService';

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
      include: {
        prerequisite_approval: true,
        dependent_approval: true,
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

  // Derive ComplianceRequirement rows for any matched ApprovalType with a renewal_period_days set (P0.5)
  await deriveComplianceObligations(projectId, approvals);

  const prerequisiteTargetIds = new Set(
    dependencies
      .filter((d) => d.dependency_type === 'PREREQUISITE')
      .map((d) => d.dependent_approval_type_id)
  );

  const enrichedApprovals = approvals.map((a) => ({
    ...a,
    applicability_reason: approvalResult.reasons[a.id] ?? 'Applicable based on registered project profile',
    can_proceed_in_parallel: !prerequisiteTargetIds.has(a.id),
    prerequisites: dependencies
      .filter((d) => d.dependent_approval_type_id === a.id && d.dependency_type === 'PREREQUISITE')
      .map((d) => ({
        id: d.prerequisite_approval_type_id,
        name: (d as any).prerequisite_approval?.name ?? d.prerequisite_approval_type_id,
      })),
  }));

  return {
    approvals: enrichedApprovals,
    reasons: approvalResult.reasons,
    documents: documentRequirements,
    dependencies,
    incentives: incentiveMatches.map((m) => ({ scheme: m.scheme, reason: m.reason })),
    warnings: approvalResult.warnings,
    summary: {
      total: enrichedApprovals.length,
      parallel_count: enrichedApprovals.filter((a) => a.can_proceed_in_parallel).length,
      prerequisite_dependent_count: enrichedApprovals.filter((a) => !a.can_proceed_in_parallel).length,
      documents_count: documentRequirements.length,
      incentives_count: incentiveMatches.length,
    },
  };
}
