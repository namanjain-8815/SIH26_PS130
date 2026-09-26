import { EvaluableRule, EvaluationResult, ProjectProfile, RuleCondition } from './types';

function matchesCondition(profile: ProjectProfile, condition: RuleCondition): boolean {
  const actual = profile[condition.field];
  switch (condition.operator) {
    case 'eq':
      return actual === condition.value;
    case 'neq':
      return actual !== condition.value;
    case 'gt':
      return Number(actual) > Number(condition.value);
    case 'gte':
      return Number(actual) >= Number(condition.value);
    case 'lt':
      return Number(actual) < Number(condition.value);
    case 'lte':
      return Number(actual) <= Number(condition.value);
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case 'contains':
      return typeof actual === 'string' && typeof condition.value === 'string'
        ? actual.includes(condition.value)
        : false;
    default:
      return false;
  }
}

/**
 * evaluateProjectAgainstRules() — DEVELOPER_GUIDE.md §5.
 *
 * A dumb, predictable AND-group condition matcher. Resist adding a
 * scripting/expression language here — complexity belongs in the seeded
 * rule data (ApplicabilityRule.conditions / IncentiveScheme.eligibility_rules),
 * not in this evaluator. Both tables share the same RuleCondition[] shape,
 * so this same function drives approval applicability (plan §13) and
 * incentive matching (plan §23) — see regulatoryService.runRegulatoryAnalysis.
 *
 * Every match carries a human-readable reason — never surface an approval
 * (or incentive) with no explanation (plan §31).
 */
export function evaluateProjectAgainstRules(
  profile: ProjectProfile,
  rules: EvaluableRule[]
): EvaluationResult {
  const applicableApprovals: string[] = [];
  const reasons: Record<string, string> = {};
  const matches: EvaluationResult['matches'] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const allConditionsMet = rule.conditions.every((condition) => matchesCondition(profile, condition));
    if (!allConditionsMet) continue;

    const reason =
      `Matched rule "${rule.rule_name}" for ${rule.jurisdiction}` +
      (rule.sector ? ` / ${rule.sector}` : '') +
      ' based on the current project profile. This is demonstration / configurable regulatory data.';

    if (!applicableApprovals.includes(rule.approval_type_id)) {
      applicableApprovals.push(rule.approval_type_id);
    }
    reasons[rule.approval_type_id] = reason;
    matches.push({ approval_type_id: rule.approval_type_id, rule_id: rule.id, reason });
  }

  if (applicableApprovals.length === 0) {
    warnings.push(
      'No applicability rules matched this project profile — regulatory data may be incomplete for this configuration.'
    );
  }

  return { applicableApprovals, reasons, matches, warnings };
}
