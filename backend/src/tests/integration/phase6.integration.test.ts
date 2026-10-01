import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Phase 6 — Specified Time Limits, Notifications & Controlled Escalation Integration Tests', () => {
  let baseUrl: string;
  let entrepreneurToken: string;
  let nodalToken: string;
  let midcOfficerToken: string;
  let testAppId: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
    nodalToken = await loginAs('nodal@demo.local');
    midcOfficerToken = await loginAs('officer@demo.local');

    // Discover active application
    const qRes = await fetch(`${baseUrl}/api/government/work-queue`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });
    assert.strictEqual(qRes.status, 200);
    const queue = (await qRes.json()) as Array<{ id: string }>;
    assert.ok(queue.length > 0);
    testAppId = queue[0].id;
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/government/sla-monitor returns tracked instances with specified time limits', async () => {
    const res = await fetch(`${baseUrl}/api/government/sla-monitor`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });

    assert.strictEqual(res.status, 200);
    const items = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(items));
    assert.ok(items.length > 0);

    const first = items[0];
    assert.ok(first.id);
    assert.ok(first.application_id);
    assert.ok(first.application_number);
    assert.ok(first.approval_name);
    assert.ok(first.department_name);
    assert.ok(first.sla_status);
    assert.ok(first.label.includes('statutory specified time limit'));
  });

  it('2. GET /api/government/sla-monitor?department_id=dept-midc scopes to MIDC department', async () => {
    const res = await fetch(`${baseUrl}/api/government/sla-monitor?department_id=dept-midc`, {
      headers: { Authorization: `Bearer ${midcOfficerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const items = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(items));
    for (const item of items) {
      assert.strictEqual(item.department_id, 'dept-midc');
    }
  });

  it('3. POST /api/government/sla-monitor/evaluate evaluates active applications', async () => {
    const res = await fetch(`${baseUrl}/api/government/sla-monitor/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${nodalToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { evaluated_count: number; evaluations: any[] };
    assert.strictEqual(typeof data.evaluated_count, 'number');
    assert.ok(Array.isArray(data.evaluations));
  });

  it('4. POST /api/applications/:id/escalate transfers application to Empowered Committee', async () => {
    const escalationReason =
      'Statutory delay in processing. Transferred by MAITRI Nodal Agency to the Empowered Committee under Section 10 of MAITRI Act 2023.';

    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/escalate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nodalToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: escalationReason }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { success: boolean; event: any };
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.event.event_type, 'escalated_to_empowered_committee');
    assert.ok(data.event.notes.includes('Section 10'));
  });

  it('5. GET /api/applications/:id/timeline includes the Empowered Committee escalation event', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/timeline`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });

    assert.strictEqual(res.status, 200);
    const events = (await res.json()) as Array<any>;
    assert.ok(Array.isArray(events));
    const escalationEvent = events.find(
      (e: any) => e.event_type === 'escalated_to_empowered_committee'
    );
    assert.ok(escalationEvent, 'Expected escalated_to_empowered_committee event in timeline');
  });

  it('6. Role-aware notifications are retrieved via GET /api/notifications', async () => {
    const nodalNotifsRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });

    assert.strictEqual(nodalNotifsRes.status, 200);
    const notifs = (await nodalNotifsRes.json()) as Array<any>;
    assert.ok(Array.isArray(notifs));
    assert.ok(notifs.length > 0);

    const escalationNotif = notifs.find((n: any) =>
      n.title.toLowerCase().includes('empowered committee')
    );
    assert.ok(escalationNotif, 'Nodal officer should have received Empowered Committee notification');

    const unreadRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });

    assert.strictEqual(unreadRes.status, 200);
    const unread = (await unreadRes.json()) as { count: number };
    assert.strictEqual(typeof unread.count, 'number');
  });
});
