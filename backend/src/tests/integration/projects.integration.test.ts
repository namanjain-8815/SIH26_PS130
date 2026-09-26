import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Projects & Clearances Integration Tests', () => {
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

  it('GET /api/projects lists projects for authenticated entrepreneur', async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any[];
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.strictEqual(data[0].id, projectId);
  });

  it('GET /api/projects/:id/control-centre returns dashboard metrics and approval stats', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/control-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.project);
    assert.ok(data.approvals);
    assert.ok(typeof data.approvals.total === 'number');
    assert.ok(data.readiness);
    assert.ok(Array.isArray(data.sla_alerts));
    assert.ok(Array.isArray(data.upcoming_inspections));
    assert.ok(Array.isArray(data.blocked_approvals));
  });

  it('GET /api/projects/:id/dependency-graph returns graph nodes and edges', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/dependency-graph`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data.nodes), 'Nodes array should exist');
    assert.ok(Array.isArray(data.edges), 'Edges array should exist');
    assert.ok(data.nodes.length > 0);
  });

  it('GET /api/projects/:id/approvals returns project approvals with types and SLAs', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/approvals`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any[];
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].approval_type);
  });

  it('GET /api/notifications returns user notifications and unread-count', async () => {
    const resList = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(resList.status, 200);
    const notifications = (await resList.json()) as any[];
    assert.ok(Array.isArray(notifications));

    const resCount = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(resCount.status, 200);
    const countData = (await resCount.json()) as { count: number };
    assert.strictEqual(typeof countData.count, 'number');
  });

  it('PATCH /api/applications/:id/status updates application status and records event', async () => {
    const officerToken = await loginAs('officer@demo.local');
    const appId = 'app-env-clearance';

    const res = await fetch(`${baseUrl}/api/applications/${appId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ status: 'UNDER_REVIEW', notes: 'Verification test transition' }),
    });

    assert.strictEqual(res.status, 200);
    const updated = (await res.json()) as any;
    assert.strictEqual(updated.status, 'UNDER_REVIEW');

    // Restore to APPROVED
    await fetch(`${baseUrl}/api/applications/${appId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Restored original status' }),
    });
  });
});
