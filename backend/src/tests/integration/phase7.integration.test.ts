import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Phase 7 — Compliance, Renewals, Incentives & Investor Support Integration Tests', () => {
  let baseUrl: string;
  let entrepreneurToken: string;
  const projectId = 'proj-abc-foods-001';
  let complianceId: string;
  let incentiveMatchId: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/projects/:id/compliance returns compliance calendar and renewals', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/compliance`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const items = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(items));
    assert.ok(items.length > 0, 'Project should have compliance requirements');

    const first = items[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(first.authority);
    assert.ok(first.frequency);
    assert.ok(first.urgency);
    assert.strictEqual(typeof first.days_until_due, 'number');
    complianceId = first.id;
  });

  it('2. POST /api/projects/:id/compliance/remind dispatches renewal reminder notifications', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/compliance/remind`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { success: boolean; reminders_sent: number };
    assert.strictEqual(data.success, true);
    assert.strictEqual(typeof data.reminders_sent, 'number');
  });

  it('3. PATCH /api/compliance/:id/complete records compliance and schedules next period', async () => {
    const res = await fetch(`${baseUrl}/api/compliance/${complianceId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { id: string; status: string };
    assert.strictEqual(data.id, complianceId);
    assert.strictEqual(data.status, 'COMPLETED');
  });

  it('4. GET /api/projects/:id/incentives returns matched schemes with matching reasons', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/incentives`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const matches = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(matches));
    assert.ok(matches.length > 0, 'Project should have incentive matches');

    const first = matches[0];
    assert.ok(first.id);
    assert.ok(first.scheme);
    assert.ok(first.scheme.name);
    assert.ok(first.scheme.authority);
    assert.ok(first.scheme.benefit_description);
    assert.ok(Array.isArray(first.matching_reasons));
    assert.ok(first.matching_reasons.length > 0);
    assert.ok(first.label.includes('Potentially applicable'));
    incentiveMatchId = first.id;
  });

  it('5. PATCH /api/incentives/:id/status updates scheme application status', async () => {
    const res = await fetch(`${baseUrl}/api/incentives/${incentiveMatchId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${entrepreneurToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'APPLIED' }),
    });

    assert.strictEqual(res.status, 200);
    const updated = (await res.json()) as { id: string; status: string };
    assert.strictEqual(updated.status, 'APPLIED');
  });

  it('6. GET /api/incentive-schemes returns government promotional schemes catalogue', async () => {
    const res = await fetch(`${baseUrl}/api/incentive-schemes`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const schemes = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(schemes));
    assert.ok(schemes.length >= 2, 'Should catalogue multiple government schemes');
  });
});
