import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('P0.3 — Parallel Application Orchestration Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  const projectId = 'proj-abc-foods-001';

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. POST /api/projects/:id/start-eligible-applications orchestrates parallel start without bypassing prerequisites', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/start-eligible-applications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.ok(data.summary, 'Summary should be present');
    assert.ok(Array.isArray(data.started), 'started should be an array');
    assert.ok(Array.isArray(data.already_active), 'already_active should be an array');
    assert.ok(Array.isArray(data.blocked_by_prerequisites), 'blocked_by_prerequisites should be an array');

    // All started applications must be in IN_PREPARATION (not auto-submitted)
    for (const app of data.started) {
      assert.strictEqual(app.status, 'IN_PREPARATION');
      assert.ok(app.application_id, 'Must have application_id');
      assert.ok(app.application_number, 'Must have application_number');
    }

    // All already_active applications must be valid
    assert.ok(data.already_active.length > 0, 'Should identify already-active applications');

    // Blocked approvals must have missing_prerequisites listed
    for (const blocked of data.blocked_by_prerequisites) {
      assert.ok(blocked.missing_prerequisites.length > 0, 'Blocked approval must explain why prerequisites are missing');
    }
  });

  it('2. Second call to start-eligible-applications is idempotent and does not create duplicates', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/start-eligible-applications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    // Idempotency: no new duplicate applications should be created on second run
    assert.strictEqual(data.summary.started_count, 0, 'No duplicates should be started on second execution');
    assert.ok(data.summary.already_active_count > 0, 'Active applications remain tracked');
  });
});
