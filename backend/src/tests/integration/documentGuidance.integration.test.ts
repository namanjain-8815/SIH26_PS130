import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('P0.6 — Stronger Document Guidance & Checklist Integration Tests', () => {
  let baseUrl: string;
  let token: string;
  let testOrg: any;
  let testProject: any;
  let testApproval: any;
  let testApplication: any;
  let testVaultDoc: any;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');

    testOrg = await prisma.organization.findFirst();

    testProject = await prisma.project.create({
      data: {
        org_id: testOrg?.id || 'org-abc-foods',
        name: `Test Guidance Project ${Date.now()}`,
        stage: 'PROPOSED',
        sector: 'Food Processing',
        investment_amount: 10000000,
        employee_count: 50,
        district: 'Pune',
      },
    });

    const approvalTypes = await prisma.approvalType.findMany({
      include: { document_requirements: true },
    });
    const targetType = approvalTypes.find(
      (t) => t.document_requirements && t.document_requirements.length >= 2
    ) || approvalTypes[0];

    testApproval = await prisma.projectApproval.create({
      data: {
        project_id: testProject.id,
        approval_type_id: targetType.id,
        applicability_reason: 'Guidance integration testing',
        status: 'IN_PROGRESS',
      },
    });

    const depts = await prisma.department.findMany();
    testApplication = await prisma.application.create({
      data: {
        project_approval_id: testApproval.id,
        department_id: depts[0]?.id || 'dept-mpcb-001',
        application_number: `APP-GUIDE-${Date.now()}`,
        status: 'IN_PREPARATION',
      },
    });

    const firstReq = targetType.document_requirements[0];
    testVaultDoc = await prisma.document.create({
      data: {
        org_id: testOrg?.id || 'org-abc-foods',
        project_id: testProject.id,
        document_type: firstReq.document_type,
        file_name: 'test_vault_record.pdf',
        file_url: '/uploads/test_vault_record.pdf',
        verification_status: 'VERIFIED',
        version: 1,
      },
    });
  });

  after(async () => {
    if (testApplication) {
      await prisma.applicationDocument.deleteMany({ where: { application_id: testApplication.id } });
      await prisma.application.delete({ where: { id: testApplication.id } }).catch(() => {});
    }
    if (testVaultDoc) {
      await prisma.document.delete({ where: { id: testVaultDoc.id } }).catch(() => {});
    }
    if (testApproval) {
      await prisma.projectApproval.delete({ where: { id: testApproval.id } }).catch(() => {});
    }
    if (testProject) {
      await prisma.project.delete({ where: { id: testProject.id } }).catch(() => {});
    }
    await closeTestServer();
  });

  it('1. GET /api/applications/:id/document-checklist returns statutory guidance and checklist', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testApplication.id}/document-checklist`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;

    assert.equal(data.application_id, testApplication.id);
    assert.ok(data.approval_type);
    assert.ok(data.metrics);
    assert.ok(Array.isArray(data.required_documents));
    assert.ok(Array.isArray(data.optional_documents));
    assert.ok(Array.isArray(data.all_documents));

    for (const doc of data.all_documents) {
      assert.ok(doc.purpose, `Purpose should be defined for ${doc.document_type}`);
      assert.ok(doc.format, `Format should be defined for ${doc.document_type}`);
      assert.ok(doc.issuing_authority, `Issuing authority should be defined for ${doc.document_type}`);
      assert.ok(doc.validity_rule, `Validity rule should be defined for ${doc.document_type}`);
      assert.ok(typeof doc.mandatory === 'boolean');
      assert.ok(doc.vault_reuse);
    }
  });

  it('2. Detects vault match and indicates 1-click reuse availability for unattached documents', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testApplication.id}/document-checklist`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;

    const matchingReq = data.all_documents.find(
      (d: any) => d.document_type.toLowerCase() === testVaultDoc.document_type.toLowerCase()
    );

    assert.ok(matchingReq, 'Should find requirement matching vault doc');
    assert.equal(matchingReq.is_attached, false, 'Should not yet be attached to application');
    assert.equal(matchingReq.vault_reuse.available_in_vault, true, 'Should detect available in vault');
    assert.equal(matchingReq.vault_reuse.vault_document_id, testVaultDoc.id);
    assert.equal(matchingReq.vault_reuse.can_one_click_reuse, true);
    assert.ok(data.metrics.reusable_from_vault_count >= 1);
  });

  it('3. Successfully attaches vault document in 1-click and updates checklist state to attached', async () => {
    const attachRes = await fetch(`${baseUrl}/api/applications/${testApplication.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_id: testVaultDoc.id }),
    });

    assert.equal(attachRes.status, 201);

    const checkRes = await fetch(`${baseUrl}/api/applications/${testApplication.id}/document-checklist`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const checkData = await checkRes.json() as any;

    const updatedReq = checkData.all_documents.find(
      (d: any) => d.document_type.toLowerCase() === testVaultDoc.document_type.toLowerCase()
    );

    assert.equal(updatedReq.is_attached, true);
    assert.equal(updatedReq.attached_document_id, testVaultDoc.id);
    assert.equal(updatedReq.vault_reuse.can_one_click_reuse, false, 'No longer needs reuse as already attached');
    assert.ok(checkData.metrics.attached_count >= 1);
  });

  it('4. GET /api/projects/:id/document-checklist groups requirements by clearance type', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProject.id}/document-checklist`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;

    assert.equal(data.project_id, testProject.id);
    assert.ok(Array.isArray(data.clearances));
    assert.ok(data.clearances.length >= 1);

    const clearance = data.clearances[0];
    assert.ok(clearance.approval_name);
    assert.ok(clearance.authority);
    assert.ok(Array.isArray(clearance.required_documents));
    assert.ok(typeof clearance.completion_rate === 'number');
  });

  it('5. Readiness check integrates vault reuse guidance for missing documents', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${testApplication.id}/readiness-check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;

    assert.ok(data.document_summary);
    assert.ok(typeof data.document_summary.total_mandatory === 'number');
    assert.ok(typeof data.document_summary.attached_mandatory === 'number');
    assert.ok(typeof data.document_summary.missing_mandatory === 'number');
  });
});
