import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Phase 5 — Authority-Aware Government Processing Integration Tests', () => {
  let midcOfficerToken: string;
  let pcbOfficerToken: string;
  let nodalToken: string;
  let inspectorToken: string;
  let baseUrl: string;

  const midcAppId = 'app-building-plan';
  const pcbAppId = 'app-pollution';

  before(async () => {
    baseUrl = await getTestBaseUrl();
    midcOfficerToken = await loginAs('officer@demo.local');
    pcbOfficerToken = await loginAs('pcb.officer@demo.local');
    nodalToken = await loginAs('nodal@demo.local');
    inspectorToken = await loginAs('inspector@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/government/departments returns list of concerned authorities', async () => {
    const res = await fetch(`${baseUrl}/api/government/departments`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });

    assert.strictEqual(res.status, 200);
    const depts = (await res.json()) as Array<{ id: string; name: string }>;
    assert.ok(Array.isArray(depts));
    assert.ok(depts.length >= 2, 'Should return at least MIDC and MPCB');
    const midc = depts.find((d) => d.name.includes('MIDC') || d.name.includes('Maharashtra Industrial'));
    assert.ok(midc, 'MIDC department should be in catalogue');
  });

  it('2. Competent Authority Officer can query work queue scoped by department', async () => {
    const res = await fetch(`${baseUrl}/api/government/work-queue`, {
      headers: { Authorization: `Bearer ${midcOfficerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const items = (await res.json()) as any[];
    assert.ok(Array.isArray(items));
    assert.ok(items.length > 0, 'MIDC officer should see applications');
  });

  it('3. Competent Authority Officer of MIDC can record decision (APPROVE) on MIDC application', async () => {
    const decisionNotes = 'Approved under MIDC Standard Building By-laws Ref: MIDC/PUNE/BP/2026/01';
    const res = await fetch(`${baseUrl}/api/applications/${midcAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${midcOfficerToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: decisionNotes }),
    });

    assert.strictEqual(res.status, 200);
    const updated = (await res.json()) as any;
    assert.strictEqual(updated.status, 'APPROVED');
  });

  it('4. Cross-department jurisdiction protection: MPCB Officer cannot approve MIDC application', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${midcAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pcbOfficerToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Cross-department unauthorized attempt' }),
    });

    assert.strictEqual(res.status, 403, 'Should reject cross-department approval with 403 Forbidden');
    const body = (await res.json()) as any;
    assert.ok(
      body.error?.includes('Cross-department jurisdiction violation') ||
      body.message?.includes('Cross-department jurisdiction violation')
    );
  });

  it('5. MAITRI Nodal Officer cannot record statutory approval decisions', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${pcbAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nodalToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Nodal officer attempt to approve' }),
    });

    assert.strictEqual(res.status, 403, 'Should reject Nodal approval with 403 Forbidden');
    const body = (await res.json()) as any;
    assert.ok(
      body.error?.includes('MAITRI Nodal Officers provide inter-department facilitation') ||
      body.message?.includes('MAITRI Nodal Officers provide inter-department facilitation')
    );
  });

  it('6. Designated Inspection Officer cannot record statutory approval decisions', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${pcbAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inspectorToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Inspector attempt to approve' }),
    });

    assert.strictEqual(res.status, 403, 'Should reject Inspector approval with 403 Forbidden');
    const body = (await res.json()) as any;
    assert.ok(
      body.error?.includes('Designated Inspection Officers record inspection findings') ||
      body.message?.includes('Designated Inspection Officers record inspection findings')
    );
  });

  it('7. MAITRI Nodal Officer can record coordination note on an application', async () => {
    const noteText = 'MAITRI Nodal Officer coordinated with MPCB Sub-Regional Office regarding pending CTE clarification.';
    const res = await fetch(`${baseUrl}/api/applications/${pcbAppId}/coordination-note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nodalToken}`,
      },
      body: JSON.stringify({
        note: noteText,
        event_type: 'nodal_coordination_note',
      }),
    });

    assert.strictEqual(res.status, 201);
    const event = (await res.json()) as any;
    assert.strictEqual(event.event_type, 'nodal_coordination_note');
    assert.strictEqual(event.notes, noteText);

    // Verify it appears in timeline
    const timelineRes = await fetch(`${baseUrl}/api/applications/${pcbAppId}/timeline`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });
    assert.strictEqual(timelineRes.status, 200);
    const timeline = (await timelineRes.json()) as any[];
    const recorded = timeline.find((e) => e.event_type === 'nodal_coordination_note');
    assert.ok(recorded, 'Coordination event must be persisted in application timeline');
  });

  it('8. Escalating an unresolved query updates status and records Empowered Committee event', async () => {
    // Look up queries for app-fire-noc
    const queriesRes = await fetch(`${baseUrl}/api/applications/app-fire-noc/queries`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });
    assert.strictEqual(queriesRes.status, 200);
    const queries = (await queriesRes.json()) as any[];
    assert.ok(queries.length > 0, 'app-fire-noc should have queries');
    const targetQuery = queries[0];

    // Escalate query
    const escalateRes = await fetch(`${baseUrl}/api/queries/${targetQuery.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nodalToken}`,
      },
      body: JSON.stringify({ status: 'ESCALATED' }),
    });

    assert.strictEqual(escalateRes.status, 200);
    const updated = (await escalateRes.json()) as any;
    assert.strictEqual(updated.status, 'ESCALATED');

    // Verify event in timeline
    const timelineRes = await fetch(`${baseUrl}/api/applications/app-fire-noc/timeline`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });
    const timeline = (await timelineRes.json()) as any[];
    const escEvent = timeline.find((e) => e.event_type === 'query_escalated_to_empowered_committee');
    assert.ok(escEvent, 'query_escalated_to_empowered_committee event must be recorded');
  });
});
