export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
}

// Flattened project profile: core Project fields + every ProjectAttribute
// key/value pair merged in, so rule conditions can reference either.
export interface ProjectProfile {
  sector: string;
  district: string;
  industrial_area?: string | null;
  investment_amount: number;
  employee_count: number;
  stage: string;
  [attributeKey: string]: unknown;
}

export interface EvaluableRule {
  id: string;
  approval_type_id: string;
  rule_name: string;
  conditions: RuleCondition[];
  jurisdiction: string;
  sector?: string | null;
}

export interface RuleMatch {
  approval_type_id: string;
  rule_id: string;
  reason: string;
}

export interface EvaluationResult {
  applicableApprovals: string[];
  reasons: Record<string, string>;
  matches: RuleMatch[];
  warnings: string[];
}
