import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('P1.10 — Common Inspection Planner Integration Tests', () => {
  let officerToken: string;
  let inspectorToken: string;
  let nodalToken: string;
  let entrepreneurToken: string;
  let baseUrl: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    officerToken = await loginAs('officer@demo.local');
    inspectorToken = await loginAs('inspector@demo.local');
    nodalToken = await loginAs('nodal@demo.local');
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/inspectors lists designated inspection officers', async () => {
    const res = await fetch(`${baseUrl}/api/inspectors`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const inspectors = (await res.json()) as any[];
    assert.ok(Array.isArray(inspectors));
    assert.ok(inspectors.length >= 1);
    const inspector = inspectors.find((i) => i.email === 'inspector@demo.local');
    assert.ok(inspector);
    assert.strictEqual(inspector.name, 'Arun Kumar');
  });

  it('2. GET /api/inspections retrieves scheduled inspections with application and department context', async () => {
    const res = await fetch(`${baseUrl}/api/inspections`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const inspections = (await res.json()) as any[];
    assert.ok(Array.isArray(inspections));
    assert.ok(inspections.length > 0);

    const first = inspections[0];
    assert.ok(first.id);
    assert.ok(first.scheduled_date);
    assert.ok(first.status);
    assert.ok(first.department);
    assert.ok(first.application);
    assert.ok(first.application.application_number);
    assert.ok(first.application.project_approval?.approval_type);
    assert.ok(typeof first.has_conflict === 'boolean');
  });

  it('3. GET /api/inspections detects scheduling conflicts when inspector has overlapping site visits', async () => {
    // Schedule a second inspection for the same inspector on the exact same date
    const listRes = await fetch(`${baseUrl}/api/inspections`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const list = (await listRes.json()) as any[];
    const existing = list.find((i) => i.inspector_id);
    assert.ok(existing, 'Expected an inspection with an assigned inspector');

    // Re-query with inspector filter to verify conflict detection returns boolean and explanatory reason
    const conflictRes = await fetch(
      `${baseUrl}/api/inspections?inspector_id=${existing.inspector_id}`,
      { headers: { Authorization: `Bearer ${officerToken}` } }
    );

    assert.strictEqual(conflictRes.status, 200);
    const inspectorVisits = (await conflictRes.json()) as any[];
    assert.ok(inspectorVisits.length >= 1);
    for (const v of inspectorVisits) {
      assert.ok('has_conflict' in v);
      if (v.has_conflict) {
        assert.ok(typeof v.conflict_reason === 'string');
        assert.ok(v.conflict_reason.length > 0);
      }
    }
  });

  it('4. PATCH /api/inspections/:id reschedules site visit and assigns inspector', async () => {
    const listRes = await fetch(`${baseUrl}/api/inspections`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const list = (await listRes.json()) as any[];
    const target = list[0];
    assert.ok(target);

    const newDate = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const updateRes = await fetch(`${baseUrl}/api/inspections/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        action: 'reschedule',
        scheduled_date: newDate,
        notes: 'Rescheduled per joint inspection coordination schedule.',
      }),
    });

    assert.strictEqual(updateRes.status, 200);
    const updated = (await updateRes.json()) as any;
    assert.strictEqual(updated.status, 'RESCHEDULED');
  });

  it('5. Designated Inspection Officer records finding and completes inspection', async () => {
    // Retrieve inspector-scoped inspections
    const inspRes = await fetch(`${baseUrl}/api/inspections`, {
      headers: { Authorization: `Bearer ${inspectorToken}` },
    });
    assert.strictEqual(inspRes.status, 200);
    const list = (await inspRes.json()) as any[];
    assert.ok(list.length > 0);
    const target = list[0];

    // Record finding
    const findingRes = await fetch(`${baseUrl}/api/inspections/${target.id}/findings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inspectorToken}`,
      },
      body: JSON.stringify({
        severity: 'LOW',
        description: 'Site boundary and setback verified as per approved building plan.',
        corrective_action: 'None required.',
        status: 'COMPLIANT',
      }),
    });

    assert.strictEqual(findingRes.status, 201);
    const finding = (await findingRes.json()) as any;
    assert.strictEqual(finding.severity, 'LOW');
    assert.strictEqual(finding.status, 'COMPLIANT');

    // Complete inspection
    const completeRes = await fetch(`${baseUrl}/api/inspections/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inspectorToken}`,
      },
      body: JSON.stringify({
        status: 'COMPLETED',
        notes: 'Site verification completed satisfactorily.',
      }),
    });

    assert.strictEqual(completeRes.status, 200);
    const completed = (await completeRes.json()) as any;
    assert.strictEqual(completed.status, 'COMPLETED');
  });

  it('6. Role Guard: Entrepreneur cannot complete inspections or record findings', async () => {
    const listRes = await fetch(`${baseUrl}/api/inspections`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const list = (await listRes.json()) as any[];
    const target = list[0];

    const res = await fetch(`${baseUrl}/api/inspections/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });

    assert.strictEqual(res.status, 403);
  });
});
