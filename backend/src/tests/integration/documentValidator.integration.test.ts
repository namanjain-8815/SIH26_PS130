import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('P0.6 — Document Pre-Validation / Document Checker Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  const testProjectId = 'proj-abc-foods-001';
  let createdDocId: string | null = null;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    if (createdDocId) {
      await prisma.applicationDocument.deleteMany({ where: { document_id: createdDocId } }).catch(() => {});
      await prisma.document.delete({ where: { id: createdDocId } }).catch(() => {});
    }
    await closeTestServer();
  });

  it('1. Pre-validates a valid statutory PDF document', async () => {
    const validPanPdf = Buffer.from('%PDF-1.4\nIncome Tax Department Govt of India Permanent Account Number PAN Card AAAAB1234C\n%%EOF');
    const res = await fetch(`${baseUrl}/api/documents/pre-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_type: 'Company PAN Card',
        file_name: 'company_pan_card.pdf',
        file_base64: validPanPdf.toString('base64'),
        size_bytes: validPanPdf.length,
        project_id: testProjectId,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.strictEqual(data.accepted, true);
    assert.strictEqual(data.status, 'ACCEPTED');
    assert.strictEqual(data.errors.length, 0);
    assert.ok(data.checks.length >= 3);
    assert.ok(data.checks.every((c: any) => c.status === 'pass'));
  });

  it('2. Rejects conflicting document type mismatch with exact failure reasons', async () => {
    // Content is a Lease Agreement but applicant selected Company PAN Card
    const leasePdf = Buffer.from('%PDF-1.4\nRegistered Lease Deed and Tenancy Agreement between Lessor and Lessee for Plot 42 MIDC\n%%EOF');
    const res = await fetch(`${baseUrl}/api/documents/pre-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_type: 'Company PAN Card',
        file_name: 'lease_agreement_signed.pdf',
        file_base64: leasePdf.toString('base64'),
        size_bytes: leasePdf.length,
        project_id: testProjectId,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.strictEqual(data.accepted, false);
    assert.strictEqual(data.status, 'REJECTED');
    assert.strictEqual(data.detected_type, 'Lease Agreement');
    assert.ok(data.errors.length > 0);
    assert.ok(data.errors.some((err: string) => err.includes('Detected: Lease Agreement') && err.includes('Expected: Company PAN Card')));
  });

  it('3. Rejects expired statutory certificate', async () => {
    const validPdf = Buffer.from('%PDF-1.4\nEnvironmental Clearance baseline report EIA emission standards\n%%EOF');
    const pastDate = new Date(Date.now() - 365 * 86_400_000).toISOString();

    const res = await fetch(`${baseUrl}/api/documents/pre-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_type: 'Environmental Impact Assessment (EIA)',
        file_name: 'eia_report_old.pdf',
        file_base64: validPdf.toString('base64'),
        expiry_date: pastDate,
        project_id: testProjectId,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.strictEqual(data.accepted, false);
    assert.strictEqual(data.status, 'REJECTED');
    assert.ok(data.errors.some((err: string) => err.includes('expired')));
  });

  it('4. Handles scanned or image document without text stream safely with MANUAL_VERIFICATION_REQUIRED', async () => {
    // Pure binary or image without recognized text
    const imagePdf = Buffer.from('%PDF-1.4\n\x00\x01\x02\x03\x04\x05\x06\x07ScannedBinaryDataWithoutTextKeywords\n%%EOF');
    const res = await fetch(`${baseUrl}/api/documents/pre-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_type: 'Factory Layout Plan',
        file_name: 'scanned_blueprint_scan.pdf',
        file_base64: imagePdf.toString('base64'),
        project_id: testProjectId,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    // According to Section 7 safety rule: do not reject solely for lack of OCR; mark manual verification required
    assert.strictEqual(data.accepted, true);
    assert.strictEqual(data.status, 'MANUAL_VERIFICATION_REQUIRED');
    assert.ok(data.warnings.length > 0);
    assert.ok(data.warnings.some((w: string) => w.includes('manual verification required')));
  });

  it('5. Upload endpoint rejects uploading an incompatible document', async () => {
    // Upload lease document for Company PAN Card
    const leasePdf = Buffer.from('%PDF-1.4\nRegistered Tenancy Agreement between Lessor and Lessee for Industrial Plot\n%%EOF');
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_type: 'Company PAN Card',
        file_name: 'lease_agreement_wrong.pdf',
        file_base64: leasePdf.toString('base64'),
      }),
    });

    assert.strictEqual(res.status, 400);
    const errData = (await res.json()) as any;
    assert.strictEqual(errData.error, 'Document not accepted');
    assert.ok(Array.isArray(errData.reasons));
    assert.ok(errData.reasons.length > 0);
  });

  it('6. Upload endpoint accepts and creates valid pre-validated document', async () => {
    const panPdf = Buffer.from('%PDF-1.4\nGovt of India Income Tax Dept Permanent Account Number Card PAN\n%%EOF');
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_type: 'Company PAN Card',
        file_name: 'company_pan_verified.pdf',
        file_base64: panPdf.toString('base64'),
      }),
    });

    assert.strictEqual(res.status, 201);
    const created = (await res.json()) as any;
    assert.ok(created.id);
    createdDocId = created.id;
    assert.strictEqual(created.document_type, 'Company PAN Card');
    assert.strictEqual(created.verification_status, 'PENDING');
  });
});
