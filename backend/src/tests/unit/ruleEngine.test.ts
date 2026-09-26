import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateProjectAgainstRules } from '../../rule-engine/evaluate';
import { EvaluableRule, ProjectProfile } from '../../rule-engine/types';

describe('Regulatory Rule Engine (Unit Tests)', () => {
  const baseProfile: ProjectProfile = {
    sector: 'food_processing',
    district: 'Pune',
    industrial_area: 'MIDC',
    investment_amount: 250000000, // ₹25 Cr
    employee_count: 80,
    stage: 'pre_establishment',
    pollution_category: 'red',
    power_requirement_kva: '500',
    water_usage_kld: '50',
    state: 'maharashtra',
  };

  it('matches rules using "eq" operator correctly', () => {
    const rules: EvaluableRule[] = [
      {
        id: 'rule-pollution-red',
        approval_type_id: 'at-pollution-consent',
        rule_name: 'Consent to Establish (Pollution)',
        conditions: [
          { field: 'pollution_category', operator: 'eq', value: 'red' },
          { field: 'state', operator: 'eq', value: 'maharashtra' },
        ],
        jurisdiction: 'Maharashtra',
      },
    ];

    const result = evaluateProjectAgainstRules(baseProfile, rules);
    assert.strictEqual(result.applicableApprovals.length, 1);
    assert.strictEqual(result.applicableApprovals[0], 'at-pollution-consent');
    assert.ok(result.reasons['at-pollution-consent'].includes('Consent to Establish'));
  });

  it('evaluates numeric comparisons (gt, gte, lt, lte)', () => {
    const rules: EvaluableRule[] = [
      {
        id: 'rule-factory-large',
        approval_type_id: 'at-factory-license',
        rule_name: 'Factory License',
        conditions: [
          { field: 'employee_count', operator: 'gte', value: 10 },
          { field: 'investment_amount', operator: 'gt', value: 10000000 },
        ],
        jurisdiction: 'State',
      },
      {
        id: 'rule-small-unit',
        approval_type_id: 'at-cottage-license',
        rule_name: 'Cottage Industry License',
        conditions: [
          { field: 'employee_count', operator: 'lt', value: 10 },
        ],
        jurisdiction: 'State',
      },
    ];

    const result = evaluateProjectAgainstRules(baseProfile, rules);
    assert.strictEqual(result.applicableApprovals.length, 1);
    assert.strictEqual(result.applicableApprovals[0], 'at-factory-license');
  });

  it('evaluates array "in" and string "contains" operators', () => {
    const rules: EvaluableRule[] = [
      {
        id: 'rule-fssai',
        approval_type_id: 'at-fssai-license',
        rule_name: 'FSSAI Food License',
        conditions: [
          { field: 'sector', operator: 'in', value: ['food_processing', 'dairy', 'agro'] },
          { field: 'industrial_area', operator: 'contains', value: 'MIDC' },
        ],
        jurisdiction: 'Central & State',
      },
    ];

    const result = evaluateProjectAgainstRules(baseProfile, rules);
    assert.strictEqual(result.applicableApprovals.length, 1);
    assert.strictEqual(result.applicableApprovals[0], 'at-fssai-license');
  });

  it('handles negative matches and generates appropriate warnings', () => {
    const rules: EvaluableRule[] = [
      {
        id: 'rule-mining',
        approval_type_id: 'at-mining-lease',
        rule_name: 'Mining Clearance',
        conditions: [
          { field: 'sector', operator: 'eq', value: 'mining' },
        ],
        jurisdiction: 'State',
      },
    ];

    const result = evaluateProjectAgainstRules(baseProfile, rules);
    assert.strictEqual(result.applicableApprovals.length, 0);
    assert.strictEqual(result.warnings.length, 1);
    assert.ok(result.warnings[0].includes('No applicability rules matched'));
  });

  it('does not duplicate applicable approvals when multiple rules target the same approval type', () => {
    const rules: EvaluableRule[] = [
      {
        id: 'rule-fire-midc',
        approval_type_id: 'at-fire-noc',
        rule_name: 'MIDC Fire Clearance',
        conditions: [{ field: 'industrial_area', operator: 'eq', value: 'MIDC' }],
        jurisdiction: 'MIDC',
      },
      {
        id: 'rule-fire-hazardous',
        approval_type_id: 'at-fire-noc',
        rule_name: 'Red Category Fire NOC',
        conditions: [{ field: 'pollution_category', operator: 'eq', value: 'red' }],
        jurisdiction: 'State Fire Service',
      },
    ];

    const result = evaluateProjectAgainstRules(baseProfile, rules);
    assert.strictEqual(result.applicableApprovals.length, 1);
    assert.strictEqual(result.applicableApprovals[0], 'at-fire-noc');
    assert.strictEqual(result.matches.length, 2);
  });
});
