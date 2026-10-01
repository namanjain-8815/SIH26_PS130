import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

describe('P0.2 — Approval & Permission Directory Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  let approvalTypes: any[] = [];

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/approval-types returns full approval catalogue with documents, dependencies and rules', async () => {
    const res = await fetch(`${baseUrl}/api/approval-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    approvalTypes = (await res.json()) as any[];
    assert.ok(Array.isArray(approvalTypes));
    assert.ok(approvalTypes.length > 0, 'Approval types catalogue should not be empty');

    // Verify properties required by Approval Directory
    for (const item of approvalTypes) {
      assert.ok(item.id, 'Approval item must have id');
      assert.ok(item.name, 'Approval item must have name');
      assert.ok(item.authority, 'Approval item must have authority');
      assert.ok(item.category, 'Approval item must have category');
      assert.strictEqual(typeof item.default_sla_days, 'number');
      assert.strictEqual(typeof item.requires_inspection, 'boolean');
      assert.ok(Array.isArray(item.document_requirements), 'Document requirements should be loaded');
      assert.ok(Array.isArray(item.applicability_rules), 'Applicability rules should be loaded');
    }
  });

  it('2. POST /api/approval-types/:id/check-applicability evaluates approval against a project', async () => {
    assert.ok(approvalTypes.length > 0);
    // Find an approval that should apply to ABC Foods (e.g. MPCB CTE or Factory Plan Approval)
    const targetApproval =
      approvalTypes.find((a) => a.name.includes('Consent to Establish') || a.name.includes('CTE')) ||
      approvalTypes[0];

    const res = await fetch(`${baseUrl}/api/approval-types/${targetApproval.id}/check-applicability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ project_id: DEMO_PROJECT_ID }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(data.approval_type_id, targetApproval.id);
    assert.strictEqual(data.approval_name, targetApproval.name);
    assert.strictEqual(data.project_id, DEMO_PROJECT_ID);
    assert.strictEqual(typeof data.applicable, 'boolean');
    assert.ok(data.reason, 'Reason should be provided');
    assert.ok(Array.isArray(data.document_requirements));
    assert.ok(Array.isArray(data.prerequisites));
  });

  it('3. POST /api/approval-types/:id/check-applicability requires project_id', async () => {
    assert.ok(approvalTypes.length > 0);
    const targetId = approvalTypes[0].id;

    const res = await fetch(`${baseUrl}/api/approval-types/${targetId}/check-applicability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    assert.strictEqual(res.status, 400);
    const err = (await res.json()) as any;
    assert.ok(err.error);
  });
});
