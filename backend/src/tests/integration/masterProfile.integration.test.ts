import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

describe('P0.3 — Master Business / Project Profile & Verified Data Reuse Integration Tests', () => {
  let token: string;
  let baseUrl: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/projects/:id/profile returns structured master business and project profile with verified sources', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const profile = (await res.json()) as any;

    assert.strictEqual(profile.project_id, DEMO_PROJECT_ID);

    // Entity details
    assert.ok(profile.entity, 'Entity profile must exist');
    assert.strictEqual(profile.entity.legal_name, 'ABC Foods Pvt Ltd');
    assert.strictEqual(profile.entity.entity_type, 'Private Limited Company');
    assert.ok(profile.entity.pan, 'PAN must be present');
    assert.ok(profile.entity.gstin, 'GSTIN must be present');
    assert.ok(profile.entity.cin, 'CIN must be present');
    assert.ok(profile.entity.source, 'Entity verified source must be declared');

    // Proposal details
    assert.ok(profile.proposal, 'Proposal profile must exist');
    assert.strictEqual(profile.proposal.name, 'ABC Foods Pvt Ltd — New Food Processing Unit');
    assert.strictEqual(profile.proposal.sector, 'Food Processing');
    assert.strictEqual(profile.proposal.investment_amount, 250000000);
    assert.strictEqual(profile.proposal.employee_count, 80);
    assert.strictEqual(profile.proposal.stage, 'pre_establishment');

    // Location details
    assert.ok(profile.location, 'Location profile must exist');
    assert.strictEqual(profile.location.district, 'Pune');
    assert.strictEqual(profile.location.industrial_area, 'MIDC');
    assert.ok(profile.location.address);

    // Reusable fields array
    assert.ok(Array.isArray(profile.reusable_fields), 'Reusable fields array must exist');
    assert.ok(profile.reusable_fields.length >= 10, 'Must have at least 10 reusable verified fields');

    for (const field of profile.reusable_fields) {
      assert.ok(field.key, 'Field key required');
      assert.ok(field.label, 'Field label required');
      assert.notStrictEqual(field.value, undefined, 'Field value must be present');
      assert.ok(field.source, `Source required for field ${field.key}`);
      assert.strictEqual(field.verified, true, 'Field must be marked verified');
    }
  });

  it('2. PATCH /api/projects/:id/profile performs controlled update to master profile and attributes', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        employee_count: 85,
        attributes: {
          water_usage_kld: '55',
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const updated = (await res.json()) as any;

    assert.strictEqual(updated.proposal.employee_count, 85);
    assert.strictEqual(updated.technical_attributes.water_usage_kld, '55');

    // Revert employee_count to 80 for test isolation
    await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        employee_count: 80,
        attributes: {
          water_usage_kld: '50',
        },
      }),
    });
  });

  it('3. GET /api/projects/:id/control-centre includes enriched verified master profile info', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/control-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const cc = (await res.json()) as any;

    assert.strictEqual(cc.project.id, DEMO_PROJECT_ID);
    assert.ok(cc.project.organization);
    assert.strictEqual(cc.project.organization.legal_name, 'ABC Foods Pvt Ltd');
    assert.ok(cc.project.organization.pan);
    assert.ok(cc.project.organization.gstin);
    assert.ok(cc.project.address);
    assert.ok(Array.isArray(cc.project.attributes));
  });
});
