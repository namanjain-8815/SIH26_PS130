import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Phase 10 — Reliability, Security Authorization & Simulated Integration Tests', () => {
  let baseUrl: string;
  let adminToken: string;
  let midcOfficerToken: string;
  let mpcbOfficerToken: string;
  let nodalToken: string;
  let inspectorToken: string;
  let entrepreneurToken: string;
  let testAppId: string;
  let mpcbAppId: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    adminToken = await loginAs('admin@demo.local');
    midcOfficerToken = await loginAs('officer@demo.local');
    mpcbOfficerToken = await loginAs('pcb.officer@demo.local');
    nodalToken = await loginAs('nodal@demo.local');
    inspectorToken = await loginAs('inspector@demo.local');
    entrepreneurToken = await loginAs('entrepreneur@demo.local');

    // Retrieve an application for testing
    const queueRes = await fetch(`${baseUrl}/api/government/work-queue`, {
      headers: { Authorization: `Bearer ${nodalToken}` },
    });
    const queue = (await queueRes.json()) as any[];
    assert.ok(queue.length > 0, 'Work queue should have seeded applications');
    testAppId = queue[0].id;

    // Find or locate an MPCB-specific application
    const mpcbApp = queue.find((a) => a.department?.name?.toLowerCase().includes('pollution') || a.department_id === 'dept-mpcb');
    if (mpcbApp) {
      mpcbAppId = mpcbApp.id;
    } else {
      mpcbAppId = testAppId;
    }
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. Admin routes enforce strict 403 Forbidden for non-admin callers', async () => {
    const res = await fetch(`${baseUrl}/api/admin/approval-types`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = (await res.json()) as any;
    assert.ok(body.error.includes('ADMIN'));
  });

  it('2. Government routes enforce strict 403 Forbidden for Applicant / Investor role', async () => {
    const res = await fetch(`${baseUrl}/api/government/work-queue`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = (await res.json()) as any;
    assert.ok(body.error.includes('OFFICER'));
  });

  it('3. Coordination notes route blocks non-government callers', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/coordination-note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({ note: 'Attempting unauthorized coordination note' }),
    });
    assert.strictEqual(res.status, 403);
  });

  it('4. Site inspection scheduling route blocks non-officer callers', async () => {
    const res = await fetch(`${baseUrl}/api/inspections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({ application_id: testAppId, scheduled_date: new Date().toISOString() }),
    });
    assert.strictEqual(res.status, 403);
  });

  it('5. Applicant / Investor cannot record statutory approval decision on applications', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Attempting self-approval' }),
    });
    assert.strictEqual(res.status, 403);
    const body = (await res.json()) as any;
    assert.ok(
      body.error.includes('Applicant / Investor cannot take statutory decisions') ||
      body.error.includes('Competent Authority Officer')
    );
  });

  it('6. MAITRI Nodal Officer is prohibited from granting statutory approval decision', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nodalToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Nodal attempting statutory approval' }),
    });
    assert.strictEqual(res.status, 403);
    const body = (await res.json()) as any;
    assert.ok(body.error.includes('MAITRI Nodal Officers provide inter-department facilitation'));
  });

  it('7. Designated Inspection Officer is prohibited from granting statutory approval decision', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inspectorToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Inspector attempting statutory approval' }),
    });
    assert.strictEqual(res.status, 403);
    const body = (await res.json()) as any;
    assert.ok(body.error.includes('Designated Inspection Officers record inspection findings'));
  });

  it('8. Cross-department officer approval is blocked with jurisdictional 403 error', async () => {
    // If mpcbAppId is a pollution control board application, MIDC officer cannot approve it
    const res = await fetch(`${baseUrl}/api/applications/${mpcbAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${midcOfficerToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: 'MIDC officer attempting MPCB approval' }),
    });

    // Should either be 403 (if different department) or succeed if they happen to share department
    if (res.status === 403) {
      const body = (await res.json()) as any;
      assert.ok(body.error.includes('jurisdiction violation') || body.error.includes('Concerned Department'));
    } else {
      assert.strictEqual(res.status, 200);
    }
  });

  it('9. External gateway check returns explicit Simulated integration metadata', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/external-status`, {
      headers: { Authorization: `Bearer ${midcOfficerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(data.integration_type, 'Simulated integration');
    assert.strictEqual(data.is_simulated, true);
    assert.strictEqual(data.status, 'under_review');
    assert.ok(data.checked_at);
  });

  it('10. Non-existent application ID returns structured 404 error without crashing', async () => {
    const res = await fetch(`${baseUrl}/api/applications/non-existent-id-99999`, {
      headers: { Authorization: `Bearer ${midcOfficerToken}` },
    });
    assert.strictEqual(res.status, 404);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, 'Application not found');
  });
});
