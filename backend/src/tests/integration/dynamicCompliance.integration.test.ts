import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('P0.5 — Dynamic Compliance Generation Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  const testProjectId = `proj-test-dyn-comp-${crypto.randomUUID().slice(0, 6)}`;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');

    // Create a new test project with attributes matching multiple approvals with renewals
    await prisma.project.create({
      data: {
        id: testProjectId,
        org_id: 'org-abc-foods',
        name: 'Dynamic Compliance Test Dairy Processing Unit',
        type: 'Manufacturing',
        sector: 'Food Processing',
        investment_amount: 15_00_00_000,
        employee_count: 50,
        stage: 'pre_establishment',
        district: 'Pune',
        industrial_area: 'MIDC',
      },
    });

    await prisma.projectAttribute.createMany({
      data: [
        { project_id: testProjectId, key: 'pollution_category', value: 'red' },
        { project_id: testProjectId, key: 'product_type', value: 'processed_food' },
        { project_id: testProjectId, key: 'state', value: 'maharashtra' },
        { project_id: testProjectId, key: 'building_type', value: 'industrial' },
        { project_id: testProjectId, key: 'power_requirement_kva', value: '300' },
      ],
    });
  });

  after(async () => {
    // Cleanup created test records
    await prisma.complianceRequirement.deleteMany({ where: { project_id: testProjectId } });
    await prisma.projectApproval.deleteMany({ where: { project_id: testProjectId } });
    await prisma.projectAttribute.deleteMany({ where: { project_id: testProjectId } });
    await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
    await closeTestServer();
  });

  it('1. POST /api/projects/:id/regulatory-analysis dynamically derives compliance obligations from applicable permissions', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/regulatory-analysis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(res.status, 200);

    // Verify compliance requirements exist in the database for the test project
    const compReqs = await prisma.complianceRequirement.findMany({
      where: { project_id: testProjectId },
    });

    assert.ok(compReqs.length > 0, 'Compliance obligations must be dynamically derived from matched permissions');

    // Verify structure and frequencies
    for (const req of compReqs) {
      assert.ok(req.name, 'Obligation must have name');
      assert.ok(req.authority, 'Obligation must specify statutory authority');
      assert.ok(req.frequency, 'Obligation must have renewal frequency (e.g. Annual)');
      assert.ok(req.next_due_date, 'Obligation must have a computed next due date');
      assert.strictEqual(req.status, 'UPCOMING');

      const dueDate = new Date(req.next_due_date);
      assert.ok(dueDate.getTime() > Date.now(), 'Next due date must be scheduled in the future');
    }
  });

  it('2. GET /api/projects/:id/compliance returns derived obligations with urgency and timeline calculations', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/compliance`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any[];

    assert.ok(Array.isArray(data), 'Compliance response must be an array');
    assert.ok(data.length > 0, 'Must contain derived obligations');

    for (const item of data) {
      assert.ok(typeof item.days_until_due === 'number', 'Must calculate days_until_due');
      assert.ok(['critical', 'high', 'medium', 'low'].includes(item.urgency), 'Must calculate urgency tier');
    }
  });

  it('3. Repeated regulatory analysis is idempotent and avoids duplicate compliance obligations', async () => {
    const countBefore = await prisma.complianceRequirement.count({
      where: { project_id: testProjectId },
    });

    // Run regulatory analysis a second time
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/regulatory-analysis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.strictEqual(res.status, 200);

    const countAfter = await prisma.complianceRequirement.count({
      where: { project_id: testProjectId },
    });

    assert.strictEqual(
      countAfter,
      countBefore,
      'Subsequent regulatory analysis must NOT create duplicate compliance obligations'
    );
  });

  it('4. Preserves completed compliance state across subsequent re-evaluations', async () => {
    const all = await prisma.complianceRequirement.findMany({
      where: { project_id: testProjectId },
    });
    assert.ok(all.length > 0);

    const first = all[0];

    // Mark the first requirement as COMPLETED via PATCH /api/compliance/:id/complete
    const completeRes = await fetch(`${baseUrl}/api/compliance/${first.id}/complete`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.strictEqual(completeRes.status, 200);

    // Re-run regulatory analysis
    await fetch(`${baseUrl}/api/projects/${testProjectId}/regulatory-analysis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Check that the original requirement remained COMPLETED
    const rechecked = await prisma.complianceRequirement.findUnique({
      where: { id: first.id },
    });
    assert.strictEqual(rechecked?.status, 'COMPLETED', 'Completed status must be preserved');
  });
});
