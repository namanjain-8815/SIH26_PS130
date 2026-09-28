import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('P1.9 — Project-Level Approval Tracker & Timeline Integration Tests', () => {
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

  it('1. GET /api/projects/:id/approval-tracker returns consolidated statutory journey payload', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/approval-tracker`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    // Verify project metadata
    assert.ok(data.project);
    assert.strictEqual(data.project.id, projectId);
    assert.ok(data.project.name);
    assert.ok(data.project.organization);

    // Verify 6-stage statutory lifecycle pipeline
    assert.ok(Array.isArray(data.stages), 'Stages should be an array');
    assert.strictEqual(data.stages.length, 6, 'Must feature exactly 6 statutory stages');
    const expectedStages = [
      'PROJECT_SETUP',
      'PERMISSIONS',
      'PARALLEL_PROCESSING',
      'INSPECTION',
      'DECISIONS',
      'COMPLIANCE',
    ];
    for (let i = 0; i < 6; i++) {
      assert.strictEqual(data.stages[i].id, expectedStages[i]);
      assert.strictEqual(data.stages[i].order, i + 1);
      assert.ok(data.stages[i].label);
      assert.ok(data.stages[i].description);
      assert.ok(['COMPLETED', 'IN_PROGRESS', 'UPCOMING', 'BLOCKED'].includes(data.stages[i].status));
    }

    // Verify summary metrics
    assert.ok(data.summary);
    assert.ok(data.summary.total_permissions > 0);
    assert.ok(typeof data.summary.completed === 'number');
    assert.ok(typeof data.summary.in_progress === 'number');
    assert.ok(typeof data.summary.blocked === 'number');
    assert.ok(typeof data.summary.ready_to_start === 'number');
    assert.ok(typeof data.summary.overall_completion_pct === 'number');

    // Verify journey metrics (zero fabricated savings numbers)
    assert.ok(data.journey_metrics);
    assert.ok(data.journey_metrics.elapsed_days >= 0);
    assert.ok(['ON_TRACK', 'AT_RISK', 'BREACHED'].includes(data.journey_metrics.overall_sla_status));
    assert.ok(data.journey_metrics.next_milestone);
    assert.strictEqual(data.journey_metrics.time_saved_days, undefined, 'Must not fabricate unverified time-saved metrics');

    // Verify clearance items and SLA tracking
    assert.ok(Array.isArray(data.approval_items));
    assert.strictEqual(data.approval_items.length, data.summary.total_permissions);
    for (const item of data.approval_items) {
      assert.ok(item.project_approval_id);
      assert.ok(item.approval_name);
      assert.ok(item.concerned_authority);
      assert.ok(item.sla_days > 0);
      assert.ok(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].includes(item.status));
      assert.ok(['ON_TRACK', 'AT_RISK', 'BREACHED', 'COMPLETED', 'NOT_STARTED'].includes(item.sla_status));
    }

    // Verify consolidated ApplicationEvent timeline
    assert.ok(Array.isArray(data.consolidated_timeline));
    assert.ok(data.consolidated_timeline.length > 0);
    const initEvent = data.consolidated_timeline.find((e: any) => e.event_type === 'PROJECT_ONBOARDED');
    assert.ok(initEvent, 'Project onboarding event must be present in consolidated timeline');
    assert.ok(initEvent.actor_name);
    assert.ok(initEvent.created_at);
  });

  it('2. GET /api/projects/:id/approval-tracker returns 404 for invalid project ID', async () => {
    const res = await fetch(`${baseUrl}/api/projects/proj-nonexistent-999/approval-tracker`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 404);
  });

  it('3. GET /api/projects/:id/approval-tracker requires authentication', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/approval-tracker`);
    assert.strictEqual(res.status, 401);
  });
});
