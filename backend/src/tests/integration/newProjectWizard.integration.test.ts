import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

import { prisma } from '../../lib/prisma';

describe('P0.1 — New Project Wizard Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  let createdProjectId: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    if (createdProjectId) {
      await prisma.projectApproval.deleteMany({ where: { project_id: createdProjectId } });
      await prisma.projectAttribute.deleteMany({ where: { project_id: createdProjectId } });
      await prisma.incentiveMatch.deleteMany({ where: { project_id: createdProjectId } });
      await prisma.project.delete({ where: { id: createdProjectId } }).catch(() => {});
    }
    await closeTestServer();
  });

  it('1. POST /api/projects creates a new investment proposal', async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Sahyadri Agro Processing Hub',
        type: 'Manufacturing',
        sector: 'Food Processing',
        investment_amount: 300000000, // ₹30 Crore
        employee_count: 95,
        stage: 'pre_establishment',
        district: 'Pune',
        industrial_area: 'MIDC',
        address: 'Plot B-12, MIDC Chakan Phase II, Pune 410501, Maharashtra',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = (await res.json()) as any;
    assert.ok(data.id, 'Project ID should be returned');
    assert.strictEqual(data.name, 'Sahyadri Agro Processing Hub');
    assert.strictEqual(data.sector, 'Food Processing');
    assert.strictEqual(data.stage, 'pre_establishment');
    assert.strictEqual(data.investment_amount, 300000000);
    assert.strictEqual(data.employee_count, 95);

    createdProjectId = data.id;
  });

  it('2. POST /api/projects/:id/attributes saves regulatory attributes', async () => {
    assert.ok(createdProjectId, 'Project ID must exist from previous step');

    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}/attributes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pollution_category: 'red',
        water_usage_kld: '40',
        power_requirement_kva: '450',
        land_area_sqm: '6000',
        building_type: 'industrial',
        product_type: 'processed_fruits_and_spices',
        waste_type: 'effluent',
        industrial_area: 'MIDC',
        state: 'maharashtra',
      }),
    });

    assert.strictEqual(res.status, 200);
  });

  it('3. POST /api/projects/:id/regulatory-analysis returns personalized permissions roadmap with reasons and parallel indicators', async () => {
    assert.ok(createdProjectId, 'Project ID must exist');

    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}/regulatory-analysis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const result = (await res.json()) as any;

    assert.ok(Array.isArray(result.approvals), 'Approvals should be an array');
    assert.ok(result.approvals.length > 0, 'Should match applicable approvals for pre_establishment Food Processing unit');
    assert.ok(Array.isArray(result.documents), 'Documents should be an array');
    assert.ok(Array.isArray(result.dependencies), 'Dependencies should be an array');
    assert.ok(Array.isArray(result.incentives), 'Incentives should be an array');

    // Verify explainable applicability reasons
    for (const approval of result.approvals) {
      assert.ok(approval.applicability_reason, `Approval ${approval.name} should have an applicability reason`);
      assert.strictEqual(typeof approval.can_proceed_in_parallel, 'boolean');
      assert.ok(Array.isArray(approval.prerequisites));
    }

    // Verify summary metrics
    assert.ok(result.summary, 'Summary metrics should exist');
    assert.strictEqual(result.summary.total, result.approvals.length);
    assert.ok(result.summary.parallel_count >= 1, 'Should have at least 1 parallel-startable approval');

    // Verify parallel approvals
    const parallelApprovals = result.approvals.filter((a: any) => a.can_proceed_in_parallel);
    assert.ok(parallelApprovals.length > 0, 'Should have approvals that can proceed in parallel');
  });

  it('4. GET /api/projects/:id/control-centre loads control centre for newly created project', async () => {
    assert.ok(createdProjectId, 'Project ID must exist');

    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}/control-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const cc = (await res.json()) as any;

    assert.strictEqual(cc.project.id, createdProjectId);
    assert.strictEqual(cc.project.name, 'Sahyadri Agro Processing Hub');
    assert.ok(cc.approvals.total > 0, 'Approvals count should reflect regulatory analysis');
    assert.strictEqual(typeof cc.readiness.percent, 'number');
  });
});
