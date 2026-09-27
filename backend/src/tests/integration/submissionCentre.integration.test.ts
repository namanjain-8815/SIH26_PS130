import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('P1.11 — Project Submission Centre Integration Tests', () => {
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

  it('1. GET /api/projects/:id/submission-centre returns proposal metrics and clearance checklist', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/submission-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.ok(data.project, 'Must return project proposal metadata');
    assert.strictEqual(data.project.id, projectId);
    assert.ok(data.project.name);
    assert.ok(data.project.organization);

    assert.ok(data.metrics, 'Must return summary metrics');
    assert.strictEqual(typeof data.metrics.total_clearances, 'number');
    assert.strictEqual(typeof data.metrics.ready_to_submit, 'number');
    assert.strictEqual(typeof data.metrics.blocked_by_prerequisites, 'number');
    assert.strictEqual(typeof data.metrics.in_preparation, 'number');
    assert.strictEqual(typeof data.metrics.submitted, 'number');
    assert.strictEqual(typeof data.metrics.approved, 'number');
    assert.strictEqual(typeof data.metrics.overall_readiness_percent, 'number');

    assert.ok(Array.isArray(data.clearances), 'clearances must be an array');
    assert.ok(data.clearances.length > 0, 'Must have at least one clearance in demo project');

    // Inspect first clearance
    const item = data.clearances[0];
    assert.ok(item.project_approval_id);
    assert.ok(item.approval_name);
    assert.ok(item.concerned_authority);
    assert.ok(item.service_timeline);
    assert.strictEqual(typeof item.service_timeline.default_sla_days, 'number');
    assert.ok(item.service_timeline.label);

    assert.ok(item.document_checklist);
    assert.strictEqual(typeof item.document_checklist.total_required, 'number');
    assert.strictEqual(typeof item.document_checklist.mandatory_count, 'number');
    assert.strictEqual(typeof item.document_checklist.uploaded_count, 'number');
    assert.strictEqual(typeof item.document_checklist.reused_count, 'number');
    assert.ok(Array.isArray(item.document_checklist.missing_mandatory));
    assert.ok(Array.isArray(item.document_checklist.reused_documents));
    assert.ok(Array.isArray(item.document_checklist.uploaded_documents));

    assert.ok(item.readiness);
    assert.strictEqual(typeof item.readiness.is_ready, 'boolean');
    assert.strictEqual(typeof item.readiness.can_submit, 'boolean');
    assert.ok(Array.isArray(item.readiness.issues));
  });

  it('2. Correctly flags prerequisite blockers and prevents premature submission', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/submission-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    const blockedItem = data.clearances.find((c: any) => c.has_unmet_prerequisites);
    if (blockedItem) {
      assert.strictEqual(blockedItem.category, 'BLOCKED_BY_PREREQUISITES');
      assert.strictEqual(blockedItem.readiness.can_submit, false);
      assert.ok(blockedItem.prerequisites.length > 0);
      assert.ok(blockedItem.readiness.blocker_reason?.includes('Blocked by upstream'));

      // If it has an application, test submission endpoint rejection
      if (blockedItem.application_id) {
        const submitRes = await fetch(
          `${baseUrl}/api/projects/${projectId}/submit-application/${blockedItem.application_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ notes: 'Attempting blocked submission' }),
          }
        );

        assert.strictEqual(submitRes.status, 400);
        const errData = (await submitRes.json()) as any;
        assert.ok(
          errData.error?.includes('prerequisite') || errData.message?.includes('prerequisite'),
          'Must explicitly cite prerequisite failure'
        );
      }
    }
  });

  it('3. Rejects submission when application has missing mandatory documents', async () => {
    // Find or create an application that is missing mandatory documents
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/submission-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as any;

    const inPrepItem = data.clearances.find(
      (c: any) => c.application_id && c.document_checklist.missing_mandatory.length > 0
    );

    if (inPrepItem) {
      const submitRes = await fetch(
        `${baseUrl}/api/projects/${projectId}/submit-application/${inPrepItem.application_id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notes: 'Submitting with missing docs' }),
        }
      );

      assert.strictEqual(submitRes.status, 400);
      const errData = (await submitRes.json()) as any;
      assert.ok(
        errData.error?.includes('readiness') || errData.error?.includes('missing') ||
        errData.message?.includes('readiness') || errData.message?.includes('missing'),
        'Must block submission due to readiness/missing documents'
      );
    }
  });

  it('4. Rejects submission if application does not belong to project proposal', async () => {
    const invalidAppId = 'app-non-existent-999';
    const submitRes = await fetch(
      `${baseUrl}/api/projects/${projectId}/submit-application/${invalidAppId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'Test cross-project exploit' }),
      }
    );

    assert.strictEqual(submitRes.status, 404);
  });

  it('5. Successfully executes Review & Submit on an eligible clearance with complete documents', async () => {
    // Create a standalone mock project and approval with all prerequisites and documents satisfied
    const testOrg = await prisma.organization.create({
      data: {
        legal_name: 'P11 Test Food Processing Pvt Ltd',
        entity_type: 'Private Limited Company',
        sector: 'Food Processing',
      },
    });

    const testProject = await prisma.project.create({
      data: {
        org_id: testOrg.id,
        name: 'Submission Centre Test Facility',
        sector: 'Food Processing',
        stage: 'Planning',
        district: 'Pune',
        investment_amount: 10000000,
        employee_count: 50,
      },
    });

    // Find an approval type with simple document requirements
    const approvalTypes = await prisma.approvalType.findMany({
      include: { document_requirements: true },
    });
    const targetType = approvalTypes.find((t) => t.document_requirements.length > 0) || approvalTypes[0];

    const pa = await prisma.projectApproval.create({
      data: {
        project_id: testProject.id,
        approval_type_id: targetType.id,
        applicability_reason: 'Mandatory statutory clearance for food processing',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
      },
    });

    const depts = await prisma.department.findMany();
    const app = await prisma.application.create({
      data: {
        project_approval_id: pa.id,
        department_id: depts[0]?.id || 'dept-midc-001',
        application_number: `APP-TEST-SUBMIT-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        status: 'IN_PREPARATION',
      },
    });

    // Attach required mandatory documents
    for (const req of targetType.document_requirements.filter((r) => r.mandatory)) {
      const doc = await prisma.document.create({
        data: {
          org_id: testOrg.id,
          project_id: testProject.id,
          document_type: req.document_type,
          file_name: `${req.document_type.toLowerCase().replace(/\s+/g, '_')}.pdf`,
          file_url: `/uploads/${req.document_type}.pdf`,
          verification_status: 'VERIFIED',
          version: 1,
        },
      });

      await prisma.applicationDocument.create({
        data: {
          application_id: app.id,
          document_id: doc.id,
          validation_status: 'VALID',
        },
      });
    }

    // Verify submission centre shows it as READY_TO_SUBMIT
    const scRes = await fetch(`${baseUrl}/api/projects/${testProject.id}/submission-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(scRes.status, 200);
    const scData = (await scRes.json()) as any;

    const readyItem = scData.clearances.find((c: any) => c.application_id === app.id);
    assert.ok(readyItem, 'Test clearance must appear in submission centre');
    assert.strictEqual(readyItem.category, 'READY_TO_SUBMIT');
    assert.strictEqual(readyItem.readiness.can_submit, true);

    // Now execute Review & Submit!
    const submitRes = await fetch(
      `${baseUrl}/api/projects/${testProject.id}/submit-application/${app.id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'All statutory declarations completed and verified.' }),
      }
    );

    assert.strictEqual(submitRes.status, 200);
    const submitResult = (await submitRes.json()) as any;

    assert.strictEqual(submitResult.success, true);
    assert.strictEqual(submitResult.status, 'SUBMITTED');
    assert.strictEqual(submitResult.application_id, app.id);
    assert.ok(submitResult.submitted_at);

    // Verify application state transitioned in DB
    const updatedApp = await prisma.application.findUnique({ where: { id: app.id } });
    assert.strictEqual(updatedApp?.status, 'SUBMITTED');
    assert.ok(updatedApp?.submitted_at);

    // Verify event was recorded
    const events = await prisma.applicationEvent.findMany({ where: { application_id: app.id } });
    assert.ok(events.some((e) => e.event_type === 'status_changed:SUBMITTED'));
    assert.ok(events.some((e) => e.event_type === 'external_gateway_sync'));

    // Re-query submission centre to verify metrics updated
    const afterRes = await fetch(`${baseUrl}/api/projects/${testProject.id}/submission-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterData = (await afterRes.json()) as any;
    assert.strictEqual(afterData.metrics.submitted, 1);
    assert.strictEqual(afterData.metrics.ready_to_submit, 0);
  });

  it('6. Requires authentication to access submission centre', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/submission-centre`);
    assert.strictEqual(res.status, 401);
  });
});
