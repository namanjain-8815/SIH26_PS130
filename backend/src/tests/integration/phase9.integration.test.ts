import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Phase 9 — Analytics & Bottlenecks Integration Tests', () => {
  let baseUrl: string;
  let officerToken: string;
  let nodalToken: string;
  let inspectorToken: string;
  let entrepreneurToken: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    officerToken = await loginAs('officer@demo.local');
    nodalToken = await loginAs('nodal@demo.local');
    inspectorToken = await loginAs('inspector@demo.local');
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/government/analytics returns summary with department and timing metrics', async () => {
    const res = await fetch(`${baseUrl}/api/government/analytics`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(typeof data.total_applications, 'number');
    assert.ok(data.applications_by_status);
    assert.ok(Array.isArray(data.applications_by_department), 'Should include applications_by_department breakdown');
    assert.ok(data.applications_by_department.length > 0);

    const firstDept = data.applications_by_department[0];
    assert.ok(firstDept.id);
    assert.ok(firstDept.name);
    assert.strictEqual(typeof firstDept.total, 'number');

    // SLA metrics under MAITRI Rules 2025
    assert.ok(data.sla);
    assert.strictEqual(typeof data.sla.on_track, 'number');
    assert.strictEqual(typeof data.sla.breached, 'number');
    assert.ok(data.sla.label.includes('Maharashtra Industry, Trade and Investment Facilitation Rules, 2025'));

    // Query timing metrics
    assert.ok(data.query_metrics);
    assert.strictEqual(typeof data.query_metrics.total, 'number');
    assert.strictEqual(typeof data.query_metrics.avg_applicant_response_hours, 'number');

    // Inspection metrics
    assert.ok(data.inspection_metrics);
    assert.strictEqual(typeof data.inspection_metrics.total, 'number');
    assert.strictEqual(typeof data.inspection_metrics.critical_findings, 'number');

    // Empowered Committee escalations
    assert.strictEqual(typeof data.empowered_committee_escalations, 'number');
  });

  it('2. GET /api/government/analytics?department_id=dept-midc scopes analytics to MIDC', async () => {
    const res = await fetch(`${baseUrl}/api/government/analytics?department_id=dept-midc`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.strictEqual(typeof data.total_applications, 'number');
    assert.ok(data.applications_by_department.every((d: any) => d.id === 'dept-midc' || d.total === 0));
  });

  it('3. GET /api/government/bottlenecks returns delay intelligence with delay parties', async () => {
    const res = await fetch(`${baseUrl}/api/government/bottlenecks`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data.bottlenecks));
    assert.ok(data.bottlenecks.length > 0);

    const b = data.bottlenecks[0];
    assert.ok(b.category);
    assert.strictEqual(typeof b.count, 'number');
    assert.ok(b.description);
    assert.ok(b.delay_party, 'Should identify delay origin party');
  });

  it('4. Designated Inspection Officer has access to analytics and bottlenecks', async () => {
    const res = await fetch(`${baseUrl}/api/government/analytics`, {
      headers: { Authorization: `Bearer ${inspectorToken}` },
    });
    assert.strictEqual(res.status, 200);

    const bnRes = await fetch(`${baseUrl}/api/government/bottlenecks`, {
      headers: { Authorization: `Bearer ${inspectorToken}` },
    });
    assert.strictEqual(bnRes.status, 200);
  });

  it('5. Role Guard: Entrepreneur cannot access government analytics', async () => {
    const res = await fetch(`${baseUrl}/api/government/analytics`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });
    assert.strictEqual(res.status, 403);
  });
});
