import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('P1.12 — Contextual Help & Guidance Assistant Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  let testProjectId: string;
  let testApprovalTypeId: string;
  let testAppId: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');

    const uid = Date.now();
    testProjectId = `proj-guide-${uid}`;
    testApprovalTypeId = `at-guide-${uid}`;

    // Create test project
    await prisma.project.create({
      data: {
        id: testProjectId,
        org_id: 'org-abc-foods',
        name: 'Guidance Assistant Test Food Park',
        sector: 'Food Processing',
        district: 'Pune',
        stage: 'pre_establishment',
        investment_amount: 100000000,
        employee_count: 50,
      },
    });

    // Create approval type
    await prisma.approvalType.create({
      data: {
        id: testApprovalTypeId,
        name: 'MPCB Consent to Establish (CTE - Red Category)',
        authority: 'Maharashtra Pollution Control Board',
        category: 'environment',
        description: 'Statutory environmental clearance for industrial emission and effluent discharge',
        purpose: 'Pollution control and environmental protection',
        default_sla_days: 45,
        requires_inspection: true,
        renewal_period_days: 365,
      },
    });

    // Create document requirement
    await prisma.documentRequirement.create({
      data: {
        id: `dr-guide-${uid}`,
        approval_type_id: testApprovalTypeId,
        document_type: 'environmental_management_plan',
        mandatory: true,
        condition: 'Environmental management and water balance statement',
      },
    });

    // Create project approval
    const pa = await prisma.projectApproval.create({
      data: {
        id: `pa-guide-${uid}`,
        project_id: testProjectId,
        approval_type_id: testApprovalTypeId,
        applicability_reason: 'Mandatory for Food Processing red-category manufacturing units in Maharashtra',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      },
    });

    // Create application
    const app = await prisma.application.create({
      data: {
        id: `app-guide-${uid}`,
        project_approval_id: pa.id,
        department_id: 'dept-pcb',
        application_number: `APP-GUIDE-${uid}`,
        status: 'IN_PREPARATION',
      },
    });
    testAppId = app.id;
  });

  after(async () => {
    await prisma.application.deleteMany({
      where: { project_approval: { project_id: testProjectId } },
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

  it('1. GET /api/guidance/contextual returns page-aware context and suggested questions for application workspace', async () => {
    const res = await fetch(
      `${baseUrl}/api/guidance/contextual?page=application&project_id=${testProjectId}&application_id=${testAppId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;

    assert.ok(body.context, 'Must include context block');
    assert.strictEqual(body.context.project_id, testProjectId);
    assert.strictEqual(body.context.application_id, testAppId);
    assert.ok(body.context.approval_name.includes('MPCB Consent to Establish'));
    assert.strictEqual(body.context.authority, 'Maharashtra Pollution Control Board');

    assert.ok(Array.isArray(body.suggested_questions), 'Must return array of suggested questions');
    assert.ok(body.suggested_questions.length >= 5, 'Must provide rich tailored questions');

    // Confirm presence of key statutory questions
    const questionIds = body.suggested_questions.map((q: any) => q.id);
    assert.ok(questionIds.includes('why_permission_required'));
    assert.ok(questionIds.includes('what_documents_needed'));
    assert.ok(questionIds.includes('what_should_i_do_next'));
    assert.ok(questionIds.includes('what_is_configured_time_limit'));
  });

  it('2. Grounded deterministic answer: "Why is this permission required?" reflects database applicability reason', async () => {
    const res = await fetch(
      `${baseUrl}/api/guidance/contextual?page=application&project_id=${testProjectId}&application_id=${testAppId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    const q1 = body.answers['why_permission_required'];

    assert.ok(q1, 'Must contain why_permission_required answer');
    assert.ok(q1.answer.includes('Maharashtra Pollution Control Board'));
    assert.ok(q1.answer.includes('Food Processing red-category manufacturing units'), 'Must include stored applicability reason');
    assert.ok(q1.answer.includes('45 working days'), 'Must include configured SLA timeline');
    assert.ok(Array.isArray(q1.actions), 'Must provide actionable links');
  });

  it('3. Grounded deterministic answer: "What documents are needed?" lists active statutory requirements', async () => {
    const res = await fetch(
      `${baseUrl}/api/guidance/contextual?page=application&project_id=${testProjectId}&application_id=${testAppId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    const q2 = body.answers['what_documents_needed'];

    assert.ok(q2, 'Must contain what_documents_needed answer');
    assert.ok(q2.answer.includes('environmental management plan'));
    assert.ok(q2.answer.includes('Mandatory'));
  });

  it('4. Grounded deterministic answer: "What is the configured time limit?" reflects statutory SLA rules', async () => {
    const res = await fetch(
      `${baseUrl}/api/guidance/contextual?page=application&project_id=${testProjectId}&application_id=${testAppId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    const qSla = body.answers['what_is_configured_time_limit'];

    assert.ok(qSla, 'Must contain what_is_configured_time_limit answer');
    assert.ok(qSla.answer.includes('45 working days'));
    assert.ok(qSla.answer.includes('Maharashtra Right to Public Services Act'));
    assert.ok(qSla.answer.includes('Empowered Committee'));
  });

  it('5. Keyword search / intention matching maps free-form text to deterministic answers without external LLM', async () => {
    // Search for "blocked"
    const resBlocked = await fetch(
      `${baseUrl}/api/guidance/contextual?project_id=${testProjectId}&application_id=${testAppId}&query_text=why+is+my+application+blocked`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.strictEqual(resBlocked.status, 200);
    const bodyBlocked = (await resBlocked.json()) as any;
    assert.strictEqual(bodyBlocked.search_match?.question_id, 'why_application_blocked');

    // Search for "documents"
    const resDocs = await fetch(
      `${baseUrl}/api/guidance/contextual?project_id=${testProjectId}&application_id=${testAppId}&query_text=what+documents+must+i+upload`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.strictEqual(resDocs.status, 200);
    const bodyDocs = (await resDocs.json()) as any;
    assert.strictEqual(bodyDocs.search_match?.question_id, 'what_documents_needed');

    // Search for "deadline"
    const resDeadline = await fetch(
      `${baseUrl}/api/guidance/contextual?project_id=${testProjectId}&application_id=${testAppId}&query_text=what+is+the+sla+time+limit`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.strictEqual(resDeadline.status, 200);
    const bodyDeadline = (await resDeadline.json()) as any;
    assert.strictEqual(bodyDeadline.search_match?.question_id, 'what_is_configured_time_limit');
  });

  it('6. Enforces authentication guard on contextual guidance endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/guidance/contextual`);
    assert.strictEqual(res.status, 401, 'Must require Bearer token');
  });
});
