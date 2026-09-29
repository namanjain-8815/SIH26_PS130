import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Phase 3 — Core Application Workflows Integration Tests', () => {
  let entrepreneurToken: string;
  let officerToken: string;
  let baseUrl: string;

  const projectId = 'proj-abc-foods-001';
  const testAppId = 'app-fire-noc';

  before(async () => {
    baseUrl = await getTestBaseUrl();
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
    officerToken = await loginAs('officer@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/applications/:id returns complete workspace structure', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const app = (await res.json()) as any;
    assert.strictEqual(app.id, testAppId);
    assert.ok(app.application_number);
    assert.ok(app.project_approval, 'Should include project approval');
    assert.ok(app.project_approval.approval_type, 'Should include approval type');
    assert.ok(app.department, 'Should include department');
    assert.ok(Array.isArray(app.application_documents), 'Should include attached documents');
    assert.ok(Array.isArray(app.queries), 'Should include queries');
    assert.ok(Array.isArray(app.inspections), 'Should include inspections');
    assert.ok(Array.isArray(app.events), 'Should include timeline events');
  });

  it('2. POST /api/applications/:id/readiness-check validates document readiness rules', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/readiness-check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const result = (await res.json()) as any;
    assert.strictEqual(typeof result.ready, 'boolean');
    assert.ok(result.application_number);
    assert.ok(result.approval_name);
    assert.ok(Array.isArray(result.issues));
    assert.ok(Array.isArray(result.warnings));
    assert.ok(Array.isArray(result.checks));
    assert.ok(result.checks.length > 0);
  });

  it('3. GET /api/applications/:id/timeline returns chronological persisted events', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/timeline`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const timeline = (await res.json()) as any[];
    assert.ok(Array.isArray(timeline));
    assert.ok(timeline.length > 0);
    assert.ok(timeline[0].event_type);
    assert.ok(timeline[0].timestamp);
  });

  it('4. Document Lifecycle: upload, attach, replace, and detach', async () => {
    // A. Upload new document
    const uploadRes = await fetch(`${baseUrl}/api/projects/${projectId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        document_type: 'Test Phase 3 Architectural Drawing',
        file_name: 'test_phase3_arch.pdf',
        file_base64: Buffer.from('PDF Mock Content Phase 3').toString('base64'),
      }),
    });

    assert.strictEqual(uploadRes.status, 201);
    const uploadedDoc = (await uploadRes.json()) as any;
    assert.ok(uploadedDoc.id);
    assert.strictEqual(uploadedDoc.verification_status, 'PENDING');

    // B. Attach document to application
    const attachRes = await fetch(`${baseUrl}/api/applications/${testAppId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({ document_id: uploadedDoc.id }),
    });
    assert.strictEqual(attachRes.status, 201);

    // C. Replace document
    const replaceRes = await fetch(`${baseUrl}/api/documents/${uploadedDoc.id}/replace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        file_name: 'test_phase3_arch_v2.pdf',
        file_base64: Buffer.from('PDF Mock Content V2').toString('base64'),
      }),
    });
    assert.strictEqual(replaceRes.status, 200);
    const replacedDoc = (await replaceRes.json()) as any;
    assert.strictEqual(replacedDoc.version, 2);
    assert.strictEqual(replacedDoc.file_name, 'test_phase3_arch_v2.pdf');

    // D. Officer verifies document
    const verifyRes = await fetch(`${baseUrl}/api/documents/${uploadedDoc.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ verification_status: 'VERIFIED' }),
    });
    assert.strictEqual(verifyRes.status, 200);
    const verifiedDoc = (await verifyRes.json()) as any;
    assert.strictEqual(verifiedDoc.verification_status, 'VERIFIED');

    // E. Detach document
    const detachRes = await fetch(`${baseUrl}/api/applications/${testAppId}/documents/${uploadedDoc.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });
    assert.strictEqual(detachRes.status, 200);

    // F. Clean up test document to prevent cluttering the demo vault
    const deleteRes = await fetch(`${baseUrl}/api/documents/${uploadedDoc.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });
    assert.strictEqual(deleteRes.status, 200);
  });

  it('5. Query Lifecycle: officer raises → applicant responds → officer resolves', async () => {
    // A. Officer raises query
    const raiseRes = await fetch(`${baseUrl}/api/applications/${testAppId}/queries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        subject: 'Phase 3 Verification Query: Emergency Ventilation',
        description: 'Please clarify the emergency ventilation air change rate per NBC 2016.',
        priority: 'HIGH',
      }),
    });

    assert.strictEqual(raiseRes.status, 201);
    const query = (await raiseRes.json()) as any;
    assert.ok(query.id);
    assert.strictEqual(query.status, 'OPEN');

    // Verify application status updated to QUERY_RAISED
    const appRes = await fetch(`${baseUrl}/api/applications/${testAppId}`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });
    const appData = (await appRes.json()) as any;
    assert.strictEqual(appData.status, 'QUERY_RAISED');

    // B. Applicant responds to query
    const respondRes = await fetch(`${baseUrl}/api/queries/${query.id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        response_text: 'Ventilation rate is 15 air changes per hour as verified by mechanical engineer report.',
      }),
    });

    assert.strictEqual(respondRes.status, 201);

    // C. Officer resolves query
    const resolveRes = await fetch(`${baseUrl}/api/queries/${query.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });

    assert.strictEqual(resolveRes.status, 200);
    const resolvedQuery = (await resolveRes.json()) as any;
    assert.strictEqual(resolvedQuery.status, 'RESOLVED');
  });

  it('6. Applicant-side Inspection Actions: confirm readiness & request reschedule', async () => {
    // Schedule an inspection for testing
    const schedRes = await fetch(`${baseUrl}/api/projects/${projectId}/inspections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        application_id: testAppId,
        department_id: 'dept-fire',
        scheduled_date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        location: 'Plot 42 MIDC Pune',
        purpose: 'Fire safety equipment functional verification',
      }),
    });

    assert.strictEqual(schedRes.status, 201);
    const insp = (await schedRes.json()) as any;
    assert.ok(insp.id);

    // A. Applicant confirms site readiness
    const confirmRes = await fetch(`${baseUrl}/api/inspections/${insp.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        action: 'confirm_readiness',
        notes: 'Site access confirmed and personnel standby organized.',
      }),
    });

    assert.strictEqual(confirmRes.status, 200);

    // B. Applicant requests reschedule
    const newDate = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const reschedRes = await fetch(`${baseUrl}/api/inspections/${insp.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        action: 'reschedule',
        scheduled_date: newDate,
        notes: 'Requested 3 day extension for safety barrier fitting.',
      }),
    });

    assert.strictEqual(reschedRes.status, 200);
    const reschedData = (await reschedRes.json()) as any;
    assert.strictEqual(reschedData.status, 'RESCHEDULED');

    // C. Verify timeline event was persisted for inspection reschedule
    const timelineRes = await fetch(`${baseUrl}/api/applications/${testAppId}/timeline`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });
    const timeline = (await timelineRes.json()) as any[];
    const rescheduleEvent = timeline.find((e) => e.event_type === 'inspection_rescheduled');
    assert.ok(rescheduleEvent, 'Should find inspection_rescheduled event in timeline');
  });

  it('7. Application Submission & Status Transition: SUBMITTED sets submitted_at', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testAppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        status: 'SUBMITTED',
        notes: 'Phase 3 official submission test',
      }),
    });

    assert.strictEqual(res.status, 200);
    const updated = (await res.json()) as any;
    assert.strictEqual(updated.status, 'SUBMITTED');
    assert.ok(updated.submitted_at, 'submitted_at timestamp should be populated');
  });
});
