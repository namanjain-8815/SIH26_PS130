import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('P0.2 — Verified Project Dossier / Data Reuse Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  const appId = 'app-env-clearance'; // Seeded application

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/applications/:id returns application with verified project dossier data', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${appId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.ok(data.project_approval, 'Application must have a project_approval');
    const project = data.project_approval.project;
    assert.ok(project, 'Project approval must include project');

    // 1. Reusable Entity Information
    assert.ok(project.organization, 'Project must include organization');
    assert.strictEqual(project.organization.legal_name, 'ABC Foods Pvt Ltd');
    assert.strictEqual(project.organization.entity_type, 'Private Limited Company');

    // 2. Reusable Project & Investment Information
    assert.strictEqual(project.name, 'ABC Foods Pvt Ltd — New Food Processing Unit');
    assert.strictEqual(project.sector, 'Food Processing');
    assert.ok(typeof project.investment_amount === 'number');
    assert.strictEqual(project.investment_amount, 250000000);
    assert.strictEqual(project.employee_count, 80);
    assert.strictEqual(project.stage, 'pre_establishment');

    // 3. Reusable Spatial / Location Information
    assert.strictEqual(project.district, 'Pune');
    assert.strictEqual(project.industrial_area, 'MIDC');
    assert.ok(project.address, 'Address should exist');

    // 4. Reusable Technical Attributes (from rule engine profile)
    assert.ok(Array.isArray(project.attributes), 'Project must include attributes array');
    assert.ok(project.attributes.length > 0, 'Attributes should be populated');

    const attrMap = Object.fromEntries(project.attributes.map((a: any) => [a.key, a.value]));
    assert.strictEqual(attrMap.pollution_category, 'red');
    assert.strictEqual(attrMap.water_usage_kld, '50');
    assert.strictEqual(attrMap.power_requirement_kva, '500');
    assert.strictEqual(attrMap.state, 'maharashtra');
  });
});
