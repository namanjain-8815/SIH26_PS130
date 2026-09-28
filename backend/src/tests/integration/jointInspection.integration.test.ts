import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('P1.10 — Joint Department Inspection Planner Integration Tests', () => {
  let officerToken: string;
  let inspectorToken: string;
  let nodalToken: string;
  let entrepreneurToken: string;
  let baseUrl: string;
  const demoProjectId = 'proj-abc-foods-001';

  let testProjectId: string;
  let testAppId1: string;
  let testAppId2: string;
  let scheduledInspIds: string[] = [];

  before(async () => {
    baseUrl = await getTestBaseUrl();
    officerToken = await loginAs('officer@demo.local');
    inspectorToken = await loginAs('inspector@demo.local');
    nodalToken = await loginAs('nodal@demo.local');
    entrepreneurToken = await loginAs('entrepreneur@demo.local');

    // Create a dedicated test project and clearances for mutating joint tests
    // so existing demo project state remains pristine for other test suites
    const uid = Date.now();
    testProjectId = `proj-joint-${uid}`;
    await prisma.project.create({
      data: {
        id: testProjectId,
        org_id: 'org-abc-foods',
        name: 'Joint Test Industrial Complex',
        sector: 'Food Processing',
        district: 'Pune',
        stage: 'pre_establishment',
        investment_amount: 120000000,
        employee_count: 45,
      },
    });

    const pa1 = await prisma.projectApproval.create({
      data: {
        id: `pa-jt1-${uid}`,
        project_id: testProjectId,
        approval_type_id: 'at-env-clearance',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        applicability_reason: 'Mandatory statutory clearance for environmental monitoring in test project.',
      },
    });

    const pa2 = await prisma.projectApproval.create({
      data: {
        id: `pa-jt2-${uid}`,
        project_id: testProjectId,
        approval_type_id: 'at-fire-noc',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        applicability_reason: 'Mandatory statutory clearance for fire safety in test project.',
      },
    });

    const app1 = await prisma.application.create({
      data: {
        id: `app-jt1-${uid}`,
        project_approval_id: pa1.id,
        department_id: 'dept-midc',
        application_number: `APP-JT-ENV-${uid}`,
        status: 'UNDER_REVIEW',
      },
    });
    testAppId1 = app1.id;

    const app2 = await prisma.application.create({
      data: {
        id: `app-jt2-${uid}`,
        project_approval_id: pa2.id,
        department_id: 'dept-fire',
        application_number: `APP-JT-FIRE-${uid}`,
        status: 'UNDER_REVIEW',
      },
    });
    testAppId2 = app2.id;
  });

  after(async () => {
    try {
      if (testProjectId) {
        await prisma.inspectionEvent?.deleteMany?.({ where: { inspection: { application_id: { in: [testAppId1, testAppId2] } } } }).catch(() => {});
        await prisma.applicationEvent.deleteMany({ where: { application_id: { in: [testAppId1, testAppId2] } } }).catch(() => {});
        await prisma.inspection.deleteMany({ where: { application_id: { in: [testAppId1, testAppId2] } } }).catch(() => {});
        await prisma.application.deleteMany({ where: { id: { in: [testAppId1, testAppId2] } } }).catch(() => {});
        await prisma.projectApproval.deleteMany({ where: { project_id: testProjectId } }).catch(() => {});
        await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
      }
    } finally {
      await closeTestServer();
    }
  });

  it('1. GET /api/inspections/joint-plans returns grouped joint inspection plans with departments, officers, and findings', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/joint-plans`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const plans = (await res.json()) as any[];
    assert.ok(Array.isArray(plans));
    assert.ok(plans.length >= 1, 'Expected at least one joint inspection plan in seed data');

    const first = plans[0];
    assert.ok(first.id);
    assert.ok(first.project_id);
    assert.ok(first.project_name);
    assert.ok(first.district);
    assert.ok(first.scheduled_date);
    assert.ok(first.status);
    assert.ok(Array.isArray(first.departments));
    assert.ok(first.departments.length >= 1);
    assert.ok(typeof first.has_conflicts === 'boolean');
    assert.ok(Array.isArray(first.conflict_warnings));
    assert.ok(first.findings_summary);
    assert.ok(typeof first.findings_summary.total === 'number');
    assert.ok(Array.isArray(first.consolidated_findings));

    // Verify department item structure
    const dept = first.departments[0];
    assert.ok(dept.inspection_id);
    assert.ok(dept.department_name);
    assert.ok(dept.approval_name);
    assert.ok(dept.application_number);
    assert.ok(typeof dept.has_conflict === 'boolean');
  });

  it('2. GET /api/projects/:id/joint-inspections returns project-level joint plans and clearances requiring inspection', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${demoProjectId}/joint-inspections`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(data.project.id, demoProjectId);
    assert.ok(data.project.name);
    assert.ok(Array.isArray(data.joint_plans));
    assert.ok(Array.isArray(data.clearances_requiring_inspection));
    assert.ok(data.summary);
    assert.ok(typeof data.summary.total_joint_visits === 'number');

    // Check clearances requiring inspection
    const reqClearances = data.clearances_requiring_inspection;
    assert.ok(reqClearances.length >= 1);
    for (const c of reqClearances) {
      assert.ok(c.approval_name);
      assert.ok(typeof c.has_scheduled_inspection === 'boolean');
    }
  });

  it('3. POST /api/inspections/joint-schedule coordinates site inspection across multiple departments on shared date & location', async () => {
    const scheduledDate = new Date(Date.now() + 14 * 86_400_000).toISOString();
    const location = 'Plot No. 42, MIDC Bhosari Industrial Area, Sector 7, Pune';
    const purpose = 'Statutory pre-commissioning joint inspection by MIDC Fire and MPCB officials.';

    const depts = [
      {
        application_id: testAppId1,
        department_id: 'dept-midc',
        inspector_id: 'user-inspector',
      },
      {
        application_id: testAppId2,
        department_id: 'dept-fire',
        inspector_id: 'user-inspector',
      },
    ];

    const scheduleRes = await fetch(`${baseUrl}/api/inspections/joint-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        project_id: testProjectId,
        scheduled_date: scheduledDate,
        location,
        purpose,
        departments: depts,
      }),
    });

    assert.strictEqual(scheduleRes.status, 201);
    const scheduleData = (await scheduleRes.json()) as any;
    assert.ok(scheduleData.inspections);
    assert.strictEqual(scheduleData.inspections.length, 2);
    assert.strictEqual(scheduleData.location, location);

    scheduledInspIds = scheduleData.inspections.map((i: any) => i.id);
    assert.strictEqual(scheduledInspIds.length, 2);
  });

  it('4. POST /api/inspections/joint-reschedule coordinates rescheduling all participating inspections simultaneously', async () => {
    assert.ok(scheduledInspIds.length >= 1, 'Expected scheduled inspection IDs from test 3');
    const newDate = new Date(Date.now() + 21 * 86_400_000).toISOString();

    const rescheduleRes = await fetch(`${baseUrl}/api/inspections/joint-reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nodalToken}`,
      },
      body: JSON.stringify({
        project_id: testProjectId,
        inspection_ids: scheduledInspIds,
        new_date: newDate,
        reason: 'Consolidated monsoon site prep rescheduling coordinated by Single Window Nodal Officer.',
      }),
    });

    assert.strictEqual(rescheduleRes.status, 200);
    const result = (await rescheduleRes.json()) as any;
    assert.strictEqual(result.rescheduled_count, scheduledInspIds.length);
  });

  it('5. POST /api/inspections/joint-readiness confirms applicant site readiness across all participating clearances', async () => {
    assert.ok(scheduledInspIds.length >= 1, 'Expected scheduled inspection IDs from test 3');

    const readyRes = await fetch(`${baseUrl}/api/inspections/joint-readiness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        project_id: testProjectId,
        inspection_ids: scheduledInspIds,
        notes: 'Site boundary marked, fire pump room cleared, and DG set installation completed for joint inspection.',
      }),
    });

    assert.strictEqual(readyRes.status, 200);
    const readyData = (await readyRes.json()) as any;
    assert.strictEqual(readyData.confirmed_count, scheduledInspIds.length);
  });

  it('6. Role Guarding: Entrepreneur cannot schedule government joint inspections', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/joint-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        project_id: testProjectId,
        scheduled_date: new Date().toISOString(),
        departments: [{ application_id: testAppId1, department_id: 'dept-midc' }],
      }),
    });

    assert.strictEqual(res.status, 403);
  });
});
