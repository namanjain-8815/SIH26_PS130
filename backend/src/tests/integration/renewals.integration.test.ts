import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('P1.11 — Statutory Renewals Management Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  let testProjectId: string;
  let testComplianceId: string;
  let testApprovalTypeId: string;
  let testDocId: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');

    const uid = Date.now();
    testProjectId = `proj-ren-${uid}`;
    testApprovalTypeId = `at-ren-${uid}`;

    // Create test project
    await prisma.project.create({
      data: {
        id: testProjectId,
        org_id: 'org-abc-foods',
        name: 'Statutory Renewals Dairy & Agro Complex',
        sector: 'Food Processing',
        district: 'Pune',
        stage: 'operational',
        investment_amount: 150000000,
        employee_count: 65,
        industrial_area: 'MIDC Chakan',
      },
    });

    // Create custom approval type with 365-day renewal cycle
    await prisma.approvalType.create({
      data: {
        id: testApprovalTypeId,
        name: 'Consent to Operate Renewal (Water & Air)',
        authority: 'Maharashtra Pollution Control Board',
        category: 'environment',
        description: 'Periodic consent renewal under Water Act 1974 & Air Act 1981',
        purpose: 'Environmental compliance renewal',
        default_sla_days: 45,
        requires_inspection: true,
        renewal_period_days: 365,
      },
    });

    // Create document requirement for this approval
    await prisma.documentRequirement.create({
      data: {
        id: `dr-ren-${uid}`,
        approval_type_id: testApprovalTypeId,
        document_type: 'environmental_audit_report',
        mandatory: true,
        condition: 'Annual environmental compliance statement in Form V',
      },
    });

    // Create matching verified document in project vault
    testDocId = `doc-ren-${uid}`;
    await prisma.document.create({
      data: {
        id: testDocId,
        org_id: 'org-abc-foods',
        project_id: testProjectId,
        document_type: 'environmental_audit_report',
        file_name: 'Form_V_Environmental_Audit_2025.pdf',
        file_url: 'https://vault.local/Form_V_Environmental_Audit_2025.pdf',
        version: 1,
        verification_status: 'VERIFIED',
      },
    });

    // Create project approval
    const pa = await prisma.projectApproval.create({
      data: {
        id: `pa-ren-${uid}`,
        project_id: testProjectId,
        approval_type_id: testApprovalTypeId,
        applicability_reason: 'Periodic environmental clearance renewal',
        status: 'COMPLETED',
        priority: 'HIGH',
        actual_completion_date: new Date(Date.now() - 340 * 86_400_000), // 340 days ago -> due in 25 days (ACTION_REQUIRED)
      },
    });

    // Create compliance requirement
    const compReq = await prisma.complianceRequirement.create({
      data: {
        id: `cr-ren-${uid}`,
        project_id: testProjectId,
        name: 'Consent to Operate Renewal (Water & Air) — Annual Renewal',
        authority: 'Maharashtra Pollution Control Board',
        frequency: 'Annual',
        next_due_date: new Date(Date.now() + 25 * 86_400_000), // Due in 25 days -> Action Required bucket
        status: 'UPCOMING',
        linked_approval_id: testApprovalTypeId,
      },
    });
    testComplianceId = compReq.id;

    // Create historical application
    await prisma.application.create({
      data: {
        id: `app-hist-${uid}`,
        project_approval_id: pa.id,
        department_id: 'dept-pcb',
        application_number: `APP-MPCB-${uid}`,
        status: 'APPROVED',
      },
    });
  });

  after(async () => {
    // Cleanup
    await prisma.applicationDocument.deleteMany({
      where: { document_id: testDocId },
    }).catch(() => {});
    await prisma.applicationEvent.deleteMany({
      where: { application: { project_approval: { project_id: testProjectId } } },
    }).catch(() => {});
    await prisma.application.deleteMany({
      where: { project_approval: { project_id: testProjectId } },
    }).catch(() => {});
    await prisma.complianceRequirement.deleteMany({
      where: { project_id: testProjectId },
    }).catch(() => {});
    await prisma.document.deleteMany({
      where: { project_id: testProjectId },
    }).catch(() => {});
    await prisma.documentRequirement.deleteMany({
      where: { approval_type_id: testApprovalTypeId },
    }).catch(() => {});
    await prisma.projectApproval.deleteMany({
      where: { project_id: testProjectId },
    }).catch(() => {});
    await prisma.approvalType.delete({
      where: { id: testApprovalTypeId },
    }).catch(() => {});
    await prisma.project.delete({
      where: { id: testProjectId },
    }).catch(() => {});

    await closeTestServer();
  });

  it('1. GET /api/projects/:id/renewals-workspace returns 4 categories (Action Required, Due Soon, Healthy, Overdue) and summary metrics', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/renewals-workspace`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;

    assert.ok(body.project, 'Must include project information');
    assert.strictEqual(body.project.id, testProjectId);
    assert.ok(body.summary, 'Must include summary metrics');
    assert.ok(typeof body.summary.total === 'number');
    assert.ok(typeof body.summary.action_required === 'number');
    assert.ok(typeof body.summary.due_soon === 'number');
    assert.ok(typeof body.summary.healthy === 'number');
    assert.ok(typeof body.summary.overdue === 'number');

    assert.ok(Array.isArray(body.renewals), 'Must return array of renewals');
    assert.ok(body.renewals.length > 0, 'Must include test renewal requirement');

    const matched = body.renewals.find((r: any) => r.id === testComplianceId);
    assert.ok(matched, 'Test renewal must be in the renewals array');
    assert.strictEqual(matched.authority, 'Maharashtra Pollution Control Board');
    assert.strictEqual(matched.category, 'ACTION_REQUIRED', 'Due in 25 days must be categorized as ACTION_REQUIRED');
    assert.strictEqual(matched.urgency, 'high');
    assert.ok(matched.days_remaining <= 26 && matched.days_remaining >= 24);
  });

  it('2. Enriches each renewal with linked source clearance, required documents, and vault reuse indicators', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/renewals-workspace`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    const renewal = body.renewals.find((r: any) => r.id === testComplianceId);

    assert.ok(renewal.approval_type, 'Must link approval type');
    assert.strictEqual(renewal.approval_type.id, testApprovalTypeId);
    assert.strictEqual(renewal.approval_type.renewal_period_days, 365);

    assert.ok(renewal.source_application, 'Must link source clearance application');
    assert.ok(renewal.source_application.application_number.startsWith('APP-MPCB-'));

    assert.ok(Array.isArray(renewal.required_renewal_documents), 'Must list required renewal documents');
    assert.ok(renewal.required_renewal_documents.length > 0);

    const docReq = renewal.required_renewal_documents.find(
      (d: any) => d.document_type === 'environmental_audit_report'
    );
    assert.ok(docReq, 'Must include environmental_audit_report requirement');
    assert.strictEqual(docReq.available_in_vault, true, 'Vault document must be recognized as available');
    assert.strictEqual(docReq.is_verified, true, 'Vault document must be recognized as VERIFIED');
    assert.strictEqual(docReq.vault_document_id, testDocId);
  });

  it('3. GET /api/compliance/:id/detail returns comprehensive renewal specifications and project dossier', async () => {
    const res = await fetch(`${baseUrl}/api/compliance/${testComplianceId}/detail`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;

    assert.strictEqual(body.id, testComplianceId);
    assert.strictEqual(body.name, 'Consent to Operate Renewal (Water & Air) — Annual Renewal');
    assert.strictEqual(body.category, 'ACTION_REQUIRED');
    assert.ok(body.project, 'Must include parent project details');
    assert.ok(body.reusable_profile_fields, 'Must include reusable project profile attributes');
  });

  it('4. POST /api/compliance/:id/prepare-renewal prepares renewal workspace with reused data without auto-submitting', async () => {
    const res = await fetch(`${baseUrl}/api/compliance/${testComplianceId}/prepare-renewal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as any;

    assert.strictEqual(body.success, true);
    assert.ok(body.application_id, 'Must return prepared renewal application ID');
    assert.ok(body.application_number, 'Must return application number');
    assert.strictEqual(body.attached_documents_count, 1, 'Must auto-attach 1 matching vault document');
    assert.strictEqual(body.target_url, `/app/applications/${body.application_id}`);

    // Verify application state in database: must be IN_PREPARATION, NOT auto-submitted
    const app = await prisma.application.findUnique({
      where: { id: body.application_id },
      include: { application_documents: true },
    });

    assert.ok(app, 'Application must exist in database');
    assert.strictEqual(app.status, 'IN_PREPARATION', 'Must NOT be auto-submitted; remains in preparation');
    assert.ok(app.application_documents.length >= 1, 'Vault document must be linked to application');
    assert.strictEqual(app.application_documents[0].document_id, testDocId);

    // Verify application event was recorded
    const events = await prisma.applicationEvent.findMany({
      where: { application_id: app.id },
    });
    assert.ok(
      events.some((e) => e.event_type === 'renewal_prepared'),
      'Must record renewal_prepared event in application audit log'
    );
  });

  it('5. PATCH /api/compliance/:id/complete marks obligation completed and auto-schedules next periodic cycle', async () => {
    const res = await fetch(`${baseUrl}/api/compliance/${testComplianceId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.status, 'COMPLETED');

    // Verify subsequent cycle was scheduled in database
    const all = await prisma.complianceRequirement.findMany({
      where: { project_id: testProjectId },
      orderBy: { next_due_date: 'desc' },
    });

    assert.ok(all.length >= 2, 'Next compliance cycle must be scheduled');
    const nextCycle = all[0];
    assert.strictEqual(nextCycle.status, 'UPCOMING');
    const nextDate = new Date(nextCycle.next_due_date);
    assert.ok(nextDate.getTime() > Date.now() + 300 * 86_400_000, 'Next cycle must be scheduled ~1 year out');
  });

  it('6. Enforces authentication guards across all renewal endpoints', async () => {
    const res1 = await fetch(`${baseUrl}/api/projects/${testProjectId}/renewals-workspace`);
    assert.strictEqual(res1.status, 401);

    const res2 = await fetch(`${baseUrl}/api/compliance/${testComplianceId}/detail`);
    assert.strictEqual(res2.status, 401);

    const res3 = await fetch(`${baseUrl}/api/compliance/${testComplianceId}/prepare-renewal`, {
      method: 'POST',
    });
    assert.strictEqual(res3.status, 401);
  });
});
