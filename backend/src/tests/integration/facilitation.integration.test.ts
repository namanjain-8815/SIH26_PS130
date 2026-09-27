import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('P0.4 — Investor Assistance & Facilitation Integration Tests', () => {
  let entrepreneurToken: string;
  let nodalToken: string;
  let baseUrl: string;
  let createdRequestId: string;
  let requestRef: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
    nodalToken = await loginAs('nodal@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. POST /api/facilitation creates a new investor assistance request with category and priority', async () => {
    const res = await fetch(`${baseUrl}/api/facilitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        category: 'Approval Guidance',
        subject: 'Clarification regarding MIDC Tree Felling clearance process',
        description: 'We need guidance on whether tree transit permission is required before boundary demarcation or during ground clearing.',
        project_id: 'proj-abc-foods-001',
        priority: 'HIGH',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = (await res.json()) as any;

    assert.ok(data.id, 'Request ID must be generated');
    assert.ok(data.reference.startsWith('FAC-2026-'), 'Reference must follow FAC-2026-XXXX format');
    assert.strictEqual(data.category, 'Approval Guidance');
    assert.strictEqual(data.status, 'OPEN');
    assert.strictEqual(data.priority, 'HIGH');
    assert.strictEqual(data.project_id, 'proj-abc-foods-001');
    assert.strictEqual(data.responsible_desk, 'MAITRI Single Window Nodal Cell');
    assert.strictEqual(data.notes.length, 0);
    assert.ok(data.timeline.length >= 1, 'Timeline must record initial submission event');

    createdRequestId = data.id;
    requestRef = data.reference;
  });

  it('2. GET /api/facilitation lists requests for entrepreneur', async () => {
    const res = await fetch(`${baseUrl}/api/facilitation`, {
      headers: {
        Authorization: `Bearer ${entrepreneurToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const list = (await res.json()) as any[];
    assert.ok(Array.isArray(list), 'Response must be an array');
    const found = list.find((r) => r.id === createdRequestId);
    assert.ok(found, 'Created request must be found in applicant list');
    assert.strictEqual(found.reference, requestRef);
  });

  it('3. Entrepreneur cannot claim facilitation request (role guard check)', async () => {
    const res = await fetch(`${baseUrl}/api/facilitation/${createdRequestId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({ desk: 'Unauthorized Desk' }),
    });

    assert.strictEqual(res.status, 403, 'Entrepreneur role must be forbidden from claiming facilitation requests');
  });

  it('4. MAITRI Nodal Officer can view all facilitation requests in government queue', async () => {
    const res = await fetch(`${baseUrl}/api/facilitation`, {
      headers: {
        Authorization: `Bearer ${nodalToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const list = (await res.json()) as any[];
    assert.ok(list.length > 0, 'Government queue must contain requests');
    const found = list.find((r) => r.id === createdRequestId);
    assert.ok(found, 'Nodal officer must see applicant request in queue');
  });

  it('5. MAITRI Nodal Officer can claim the facilitation request', async () => {
    const res = await fetch(`${baseUrl}/api/facilitation/${createdRequestId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nodalToken}`,
      },
      body: JSON.stringify({ desk: 'MAITRI Agro-Processing Fast-Track Desk' }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.strictEqual(data.status, 'ASSIGNED');
    assert.strictEqual(data.responsible_desk, 'MAITRI Agro-Processing Fast-Track Desk');
    assert.ok(data.assigned_to, 'Officer ID must be assigned');
    assert.ok(data.assigned_to_name, 'Officer name must be assigned');

    const claimEvent = data.timeline.find((t: any) => t.event === 'REQUEST_CLAIMED');
    assert.ok(claimEvent, 'Claim event must be recorded in timeline');
  });

  it('6. MAITRI Nodal Officer can add coordination notes to the request', async () => {
    const res = await fetch(`${baseUrl}/api/facilitation/${createdRequestId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nodalToken}`,
      },
      body: JSON.stringify({
        note: 'Coordinated with MIDC Sub-Divisional Engineer. Tree transit permission is only needed if felling more than 5 protected species trees; simple ground clearance requires standard site declaration.',
        is_internal: false,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.strictEqual(data.status, 'IN_PROGRESS');
    assert.strictEqual(data.notes.length, 1);
    assert.strictEqual(data.notes[0].author_role, 'NODAL');
    assert.ok(data.notes[0].note.includes('Coordinated with MIDC'));
  });

  it('7. MAITRI Nodal Officer resolves facilitation request with resolution notes', async () => {
    const res = await fetch(`${baseUrl}/api/facilitation/${createdRequestId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nodalToken}`,
      },
      body: JSON.stringify({
        resolution_notes: 'Provided statutory guidance: Applicant advised to proceed with standard boundary declaration. Fast-track liaison provided with MIDC engineering wing.',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.strictEqual(data.status, 'RESOLVED');
    assert.ok(data.resolved_at, 'resolved_at date must be set');
    assert.ok(data.resolution_notes.includes('Fast-track liaison provided'));

    const resolveEvent = data.timeline.find((t: any) => t.event === 'REQUEST_RESOLVED');
    assert.ok(resolveEvent, 'Resolution event must be present in timeline');
  });
});
