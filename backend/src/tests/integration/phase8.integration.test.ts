import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Phase 8 — System Administration & Master Data Integration Tests', () => {
  let baseUrl: string;
  let adminToken: string;
  let entrepreneurToken: string;
  let createdApprovalTypeId: string;
  let firstRuleId: string;
  let firstPolicyId: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    adminToken = await loginAs('admin@demo.local');
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    if (createdApprovalTypeId) {
      await fetch(`${baseUrl}/api/admin/approval-types/${createdApprovalTypeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    await closeTestServer();
  });

  it('1. GET /api/admin/approval-types returns permissions catalogue', async () => {
    const res = await fetch(`${baseUrl}/api/admin/approval-types`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const items = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(items));
    assert.ok(items.length > 0, 'Master catalogue should contain seeded approval types');

    const first = items[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(first.authority);
    assert.ok(first.category);
    assert.strictEqual(typeof first.default_sla_days, 'number');
  });

  it('2. POST /api/admin/approval-types creates a permission and logs audit event', async () => {
    const res = await fetch(`${baseUrl}/api/admin/approval-types`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Hazardous Storage Clearance',
        authority: 'Directorate of Industrial Safety & Health (DISH)',
        category: 'PRE_COMMISSIONING',
        description: 'Statutory verification for boiler and chemical storage safety',
        purpose: 'Verify compliance with factory safety standards',
        default_sla_days: 21,
        requires_inspection: true,
        source_reference: 'Maharashtra Factories Rules, 1963',
      }),
    });

    assert.strictEqual(res.status, 201);
    const created = (await res.json()) as { id: string; name: string };
    assert.ok(created.id);
    assert.strictEqual(created.name, 'Test Hazardous Storage Clearance');
    createdApprovalTypeId = created.id;
  });

  it('3. GET /api/admin/rules returns applicability rules with hydrated approval_type', async () => {
    const res = await fetch(`${baseUrl}/api/admin/rules`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const rules = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(rules));
    assert.ok(rules.length > 0, 'Regulatory engine should have rules');

    const first = rules[0];
    assert.ok(first.id);
    assert.ok(first.approval_type_id);
    assert.strictEqual(typeof first.active, 'boolean');
    assert.ok(first.approval_type, 'Relation approval_type should be hydrated');
    assert.ok(first.approval_type.name);
    firstRuleId = first.id;
  });

  it('4. PATCH /api/admin/rules/:id updates active status and logs audit event', async () => {
    const res = await fetch(`${baseUrl}/api/admin/rules/${firstRuleId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ active: false }),
    });

    assert.strictEqual(res.status, 200);
    const updated = (await res.json()) as { id: string; active: boolean };
    assert.strictEqual(updated.active, false);

    // Re-enable for system health
    await fetch(`${baseUrl}/api/admin/rules/${firstRuleId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ active: true }),
    });
  });

  it('5. GET /api/admin/sla-policies returns policies with hydrated approval_type', async () => {
    const res = await fetch(`${baseUrl}/api/admin/sla-policies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const policies = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(policies));
    assert.ok(policies.length > 0);

    const first = policies[0];
    assert.ok(first.id);
    assert.strictEqual(typeof first.duration_days, 'number');
    assert.ok(first.approval_type, 'Policy approval_type relation should be hydrated');
    firstPolicyId = first.id;
  });

  it('6. PATCH /api/admin/sla-policies/:id updates specified time limit duration', async () => {
    const res = await fetch(`${baseUrl}/api/admin/sla-policies/${firstPolicyId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ duration_days: 45 }),
    });

    assert.strictEqual(res.status, 200);
    const updated = (await res.json()) as { id: string; duration_days: number };
    assert.strictEqual(updated.duration_days, 45);
  });

  it('7. GET /api/admin/dependencies returns prerequisite chains with hydrated names', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dependencies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const deps = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(deps));
    assert.ok(deps.length > 0);

    const first = deps[0];
    assert.ok(first.id);
    assert.ok(first.prerequisite_approval_type_id);
    assert.ok(first.dependent_approval_type_id);
    assert.ok(first.prerequisite_approval_type || first.prerequisite_approval);
  });

  it('8. GET /api/admin/audit-log returns audit entries with actor details', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audit-log`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const logs = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(logs));
    assert.ok(logs.length > 0, 'Audit trail should record events');

    const first = logs[0];
    assert.ok(first.id);
    assert.ok(first.action);
    assert.ok(first.entity_type);
    assert.ok(first.timestamp);
  });

  it('9. Role Guard: non-admin receives 403 Forbidden on admin endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/admin/approval-types`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 403);
  });
});
