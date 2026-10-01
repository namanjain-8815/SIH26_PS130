import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';
import { extractFieldsFromPdf, extractTextFromPdf } from '../../services/pdfExtractionService';

describe('B0.1 - B0.4 — Document Vault, PDF Extraction & Detail Centre Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  let testProjectId: string;
  let uploadedDocId: string;
  let secondDocId: string;

  // Candidate fixture directories for testing
  const candidateFixtureDirs = [
    process.env.DEMO_DOCUMENTS_DIR,
    path.resolve(process.cwd(), '../demo-documents'),
    path.resolve(process.cwd(), 'demo-documents'),
  ].filter(Boolean) as string[];

  const fixtureDir = candidateFixtureDirs.find((d) => {
    try {
      return fs.existsSync(d) && fs.readdirSync(d).some((f) => f.endsWith('.pdf'));
    } catch {
      return false;
    }
  });

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');

    // Create an isolated project for this test suite
    const project = await prisma.project.create({
      data: {
        org_id: 'org-abc-foods',
        name: 'Automated Extraction Test Project',
        type: 'Manufacturing',
        sector: 'Food Processing',
        investment_amount: 150000000,
        employee_count: 50,
        stage: 'pre_establishment',
        district: 'Pune',
        industrial_area: 'MIDC',
        address: 'Plot No. 42, MIDC Bhosari, Pune',
      },
    });
    testProjectId = project.id;
  });

  after(async () => {
    if (testProjectId) {
      const docs = await prisma.document.findMany({ where: { project_id: testProjectId } });
      for (const d of docs) {
        await prisma.applicationDocument.deleteMany({ where: { document_id: d.id } });
        await prisma.document.delete({ where: { id: d.id } }).catch(() => {});
      }
      await prisma.projectAttribute.deleteMany({ where: { project_id: testProjectId } });
      await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
    }
    await closeTestServer();
  });

  it('1. Real PDF text extraction correctly parses text and extracts configured fields without hardcoding', async () => {
    let pdfBuffer: Buffer;

    if (fixtureDir && fs.existsSync(path.join(fixtureDir, '01_company_identity_profile.pdf'))) {
      pdfBuffer = fs.readFileSync(path.join(fixtureDir, '01_company_identity_profile.pdf'));
    } else {
      // Programmatic minimal text PDF fallback
      const sampleText = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 180 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Legal Entity Name Test Entity Pvt Ltd) Tj\n(Corporate Identity Number CIN U15132MH2021PTC368912) Tj\n(Permanent Account Number PAN AAACB1234F) Tj\n(GSTIN 27AAACB1234F1Z5) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000206 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n436\n%%EOF`;
      pdfBuffer = Buffer.from(sampleText);
    }

    const { text, isReadable } = await extractTextFromPdf(pdfBuffer);
    assert.ok(isReadable, 'Text-based PDF must be marked readable');
    assert.ok(text.length > 20, 'Text length should be greater than 20 characters');

    const result = await extractFieldsFromPdf(pdfBuffer, {
      documentId: 'doc-test-1',
      fileName: 'identity.pdf',
      documentType: 'Company Identity Profile',
    });

    assert.strictEqual(result.is_readable, true);
    assert.strictEqual(result.status, 'EXTRACTED');
    assert.ok(result.field_count >= 2, 'Should extract at least 2 fields');
    assert.ok(result.fields.pan, 'PAN must be extracted');
    assert.strictEqual(result.fields.pan.value, 'AAACB1234F');
  });

  it('2. Unreadable / scanned document falls back gracefully to MANUAL_VERIFICATION_REQUIRED', async () => {
    // Binary junk simulating an encrypted or unreadable scanned image
    const binaryJunk = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd, 0x10, 0x20]);
    const result = await extractFieldsFromPdf(binaryJunk, {
      documentId: 'doc-unreadable',
      fileName: 'scanned_deed.pdf',
      documentType: 'Land Possession Deed',
    });

    assert.strictEqual(result.is_readable, false);
    assert.strictEqual(result.status, 'MANUAL_VERIFICATION_REQUIRED');
    assert.strictEqual(result.field_count, 0);
  });

  it('3. POST /api/projects/:id/documents uploads real PDF and persists extraction result', async () => {
    let pdfBuffer: Buffer;
    if (fixtureDir && fs.existsSync(path.join(fixtureDir, '02_midc_lease_agreement.pdf'))) {
      pdfBuffer = fs.readFileSync(path.join(fixtureDir, '02_midc_lease_agreement.pdf'));
    } else {
      const syntheticLease = `Legal Entity Name ABC Foods Pvt Ltd\nPlot Number Plot No. 42\nPlot / Site Area 5,000 sq.m\nDistrict Pune\nAgreement Date 15 July 2026\n`;
      pdfBuffer = Buffer.from(syntheticLease);
    }

    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_type: 'MIDC Land Allotment / Lease Agreement',
        file_name: 'midc_lease_agreement.pdf',
        file_base64: pdfBuffer.toString('base64'),
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as any;
    assert.ok(body.id, 'Document ID should be created');
    uploadedDocId = body.id;

    // Check extraction endpoint
    const extRes = await fetch(`${baseUrl}/api/documents/${uploadedDocId}/extracted-fields`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(extRes.status, 200);
    const extBody = (await extRes.json()) as any;
    assert.strictEqual(extBody.document_id, uploadedDocId);
    assert.ok(extBody.field_count > 0, 'Extracted field count must be > 0');
  });

  it('4. Uploads second document with conflicting plot area to test conflict detection', async () => {
    let pdfBuffer: Buffer;
    if (fixtureDir && fs.existsSync(path.join(fixtureDir, '06_building_plan_discrepancy_sample.pdf'))) {
      pdfBuffer = fs.readFileSync(path.join(fixtureDir, '06_building_plan_discrepancy_sample.pdf'));
    } else {
      const syntheticDiscrepancy = `Legal Entity Name ABC Foods Pvt Ltd\nPlot Number Plot No. 42\nPlot / Site Area 4,800 sq.m\nBuilt-up Area 3,200 sq.m\nDistrict Pune\n`;
      pdfBuffer = Buffer.from(syntheticDiscrepancy);
    }

    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_type: 'Architectural / Structural Drawings',
        file_name: 'building_plan_discrepancy.pdf',
        file_base64: pdfBuffer.toString('base64'),
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as any;
    secondDocId = body.id;
  });

  it('5. GET /api/projects/:id/document-detail-centre returns aggregated master fields and detects discrepancy', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/document-detail-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;

    assert.strictEqual(body.project_id, testProjectId);
    assert.ok(body.categories.Site, 'Site category should exist');

    const plotAreaField = body.categories.Site.find((f: any) => f.key === 'plot_area_sqm');
    assert.ok(plotAreaField, 'Plot area field must exist in Site category');
    assert.ok(plotAreaField.original_extracted_values.length >= 2, 'Should have multiple extractions');
    assert.strictEqual(plotAreaField.has_conflict, true, 'Should detect conflict between 5000 and 4800 sq.m');
    assert.ok(plotAreaField.conflict_summary?.includes('Conflict detected'));
  });

  it('6. PATCH /api/projects/:id/document-detail-centre/:fieldKey confirms master value and updates downstream reuse targets', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/document-detail-centre/plot_area_sqm`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        value: 5000,
        note: 'Confirmed against registered MIDC lease deed section 3',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    const plotAreaField = body.categories.Site.find((f: any) => f.key === 'plot_area_sqm');

    assert.strictEqual(plotAreaField.master_value, 5000);
    assert.strictEqual(plotAreaField.is_overridden, true);
    assert.strictEqual(plotAreaField.provenance, 'User Override / Manually Confirmed');

    // Verify automatic downstream reuse in ProjectAttribute
    const attr = await prisma.projectAttribute.findUnique({
      where: { project_id_key: { project_id: testProjectId, key: 'land_area_sqm' } },
    });
    assert.ok(attr, 'Downstream ProjectAttribute land_area_sqm should be synchronized');
    assert.strictEqual(attr.value, '5000');
  });

  it('7. POST /api/documents/:id/re-extract re-executes extraction successfully', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${uploadedDocId}/re-extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.document_id, uploadedDocId);
    assert.ok(body.field_count > 0);
  });

  it('8. DELETE /api/documents/:id safely deletes unattached document', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${secondDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);

    // Verify document is removed from database
    const doc = await prisma.document.findUnique({ where: { id: secondDocId } });
    assert.strictEqual(doc, null);
  });

  it('9. DELETE /api/documents/:id blocks deletion if attached to a submitted application', async () => {
    // Create a real ProjectApproval for foreign key constraint
    const approvalType = await prisma.approvalType.findFirst();
    const pa = await prisma.projectApproval.create({
      data: {
        project_id: testProjectId,
        approval_type_id: approvalType!.id,
        applicability_reason: 'Testing delete protection',
        status: 'IN_PROGRESS',
      },
    });

    // Attach uploadedDocId to a submitted application
    const app = await prisma.application.create({
      data: {
        project_approval_id: pa.id,
        department_id: 'dept-midc',
        application_number: 'APP-SUBMITTED-TEST-001',
        status: 'SUBMITTED',
      },
    });

    await prisma.applicationDocument.create({
      data: {
        application_id: app.id,
        document_id: uploadedDocId,
        validation_status: 'VALID',
      },
    });

    const res = await fetch(`${baseUrl}/api/documents/${uploadedDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    // Clean up test application and project approval
    await prisma.applicationDocument.deleteMany({ where: { application_id: app.id } });
    await prisma.application.delete({ where: { id: app.id } });
    await prisma.projectApproval.delete({ where: { id: pa.id } });

    assert.strictEqual(res.status, 400);
    const body = (await res.json()) as any;
    assert.ok(body.error?.includes('Cannot delete document') || body.error?.includes('submitted application'));
  });

  it('10. GET /api/documents/:id/file serves inline PDF stream with proper MIME headers for browser viewing', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${uploadedDocId}/file`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type');
    const contentDisposition = res.headers.get('content-disposition');

    assert.ok(contentType?.includes('application/pdf'), 'Content-Type should be application/pdf');
    assert.ok(contentDisposition?.includes('inline'), 'Content-Disposition should be inline');

    const arrayBuffer = await res.arrayBuffer();
    assert.ok(arrayBuffer.byteLength > 0, 'Served file buffer must not be empty');
  });

  it('11. GET /api/projects/:id/document-detail-centre returns summary metrics and downstream_targets', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/document-detail-centre`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;

    assert.ok(body.summary, 'Summary object must exist');
    assert.ok(typeof body.summary.total_documents === 'number');
    assert.ok(typeof body.summary.total_fields_extracted === 'number');
    assert.ok(typeof body.summary.conflicts_detected === 'number');

    // Check downstream_targets attached to fields
    const allFields = Object.values(body.categories).flat() as any[];
    for (const f of allFields) {
      assert.ok(Array.isArray(f.downstream_targets), `Field ${f.key} must have downstream_targets array`);
      assert.ok(f.downstream_targets.length > 0, `Field ${f.key} should have at least 1 downstream reuse target`);
    }
  });

  it('12. PATCH /api/projects/:id/document-detail-centre/:fieldKey accepts { master_value } format', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/document-detail-centre/worker_count`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        master_value: 120,
        confirmed: true,
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    const workerField = body.categories.Utilities.find((f: any) => f.key === 'worker_count');
    assert.strictEqual(workerField.master_value, 120);
    assert.strictEqual(workerField.is_overridden, true);
  });

  it('13. Synthetic test fixtures (07 through 10) extract structured fields accurately', async () => {
    if (!fixtureDir) return;

    const fixtureChecks = [
      {
        file: '07_fire_safety_layout_drawing.pdf',
        expectedKeys: ['legal_name', 'cin', 'pan', 'gstin', 'plot_number'],
      },
      {
        file: '08_environmental_impact_assessment_report.pdf',
        expectedKeys: ['legal_name', 'plot_area_sqm', 'built_up_area_sqm', 'water_demand_kld'],
      },
      {
        file: '09_memorandum_of_association.pdf',
        expectedKeys: ['legal_name', 'cin', 'document_date'],
      },
      {
        file: '10_company_pan_card_demo.pdf',
        expectedKeys: ['legal_name', 'pan', 'document_date'],
      },
    ];

    for (const { file, expectedKeys } of fixtureChecks) {
      const filePath = path.join(fixtureDir, file);
      if (!fs.existsSync(filePath)) continue;

      const buf = fs.readFileSync(filePath);
      const result = await extractFieldsFromPdf(buf, {
        documentId: 'fixture-test-' + file,
        fileName: file,
      });

      assert.strictEqual(result.status, 'EXTRACTED', `${file} should have status EXTRACTED`);
      assert.ok(result.field_count >= expectedKeys.length, `${file} should extract at least ${expectedKeys.length} fields`);

      for (const k of expectedKeys) {
        assert.ok(result.fields[k], `${file} must extract field "${k}"`);
        assert.ok(result.fields[k].value, `${file} field "${k}" must have non-empty value`);
      }
    }
  });
});
