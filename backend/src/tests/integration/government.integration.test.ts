import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Government Work Queue & Analytics Integration Tests', () => {
  let token: string;
  let baseUrl: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('officer@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('GET /api/government/work-queue returns all applications when unfiltered', async () => {
    const res = await fetch(`${baseUrl}/api/government/work-queue`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any[];
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0, 'Should return seeded applications');
    const first = data[0];
    assert.ok(first.application_number);
    assert.ok(first.approval_name);
    assert.ok(first.org_name);
  });

  it('GET /api/government/work-queue handles ?status=undefined&priority=undefined gracefully (regression test)', async () => {
    const res = await fetch(`${baseUrl}/api/government/work-queue?status=undefined&priority=undefined`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200, 'Should return 200 instead of 500 when undefined params are sent');
    const data = (await res.json()) as any[];
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
  });

  it('GET /api/government/work-queue filters correctly by status and priority', async () => {
    const res = await fetch(`${baseUrl}/api/government/work-queue?status=UNDER_REVIEW`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any[];
    assert.ok(Array.isArray(data));
    for (const item of data) {
      assert.strictEqual(item.status, 'UNDER_REVIEW');
    }
  });

  it('GET /api/government/analytics returns summary metrics and SLA distributions', async () => {
    const res = await fetch(`${baseUrl}/api/government/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.applications_by_status);
    assert.ok(typeof data.total_applications === 'number');
    assert.ok(data.sla);
    assert.ok(typeof data.sla.total === 'number');
    assert.ok(data.applications_by_district);
  });

  it('GET /api/government/sla-monitor returns tracked application timelines', async () => {
    const res = await fetch(`${baseUrl}/api/government/sla-monitor`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any[];
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
  });

  it('GET /api/government/bottlenecks returns computed bottleneck categories', async () => {
    const res = await fetch(`${baseUrl}/api/government/bottlenecks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data.bottlenecks));
  });
});
