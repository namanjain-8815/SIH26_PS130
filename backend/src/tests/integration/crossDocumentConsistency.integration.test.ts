import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { runCrossDocumentChecks } from '../../services/crossDocumentConsistencyService';

describe('P0.5 — Cross-Document Consistency & Discrepancy Checker Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  const DEMO_PROJECT_ID = 'proj-abc-foods-001';
  const POLLUTION_APP_ID = 'app-pollution';

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/projects/:id/document-consistency returns cross-document audit across project vault', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/document-consistency`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const result = (await res.json()) as any;

    assert.strictEqual(result.scope, 'project');
    assert.strictEqual(result.target_id, DEMO_PROJECT_ID);
    assert.ok(result.total_documents_analyzed > 0, 'Should analyze project documents');
    assert.ok(Array.isArray(result.checks), 'Checks must be an array');
    assert.ok(result.checks_evaluated > 0, 'Should evaluate cross-document comparison rules');
    assert.ok(['PASS', 'DISCREPANCY_DETECTED', 'MANUAL_REVIEW_REQUIRED'].includes(result.overall_status));

    // Verify presence of core comparison checks
    const entityCheck = result.checks.find((c: any) => c.rule_id === 'cross_entity_name');
    if (entityCheck) {
      assert.ok(entityCheck.document_a.file_name);
      assert.ok(entityCheck.document_b.file_name);
      assert.strictEqual(entityCheck.field_name, 'Legal Entity Name');
      assert.ok(entityCheck.recommended_action);
    }

    const plotAreaCheck = result.checks.find((c: any) => c.rule_id === 'cross_plot_area');
    if (plotAreaCheck) {
      assert.strictEqual(plotAreaCheck.tolerance_pct, 2.0, 'Configured tolerance must be 2.0%');
      assert.ok(plotAreaCheck.document_a.extracted_value);
      assert.ok(plotAreaCheck.document_b.extracted_value);
    }
  });

  it('2. GET /api/applications/:id/document-consistency evaluates attached application documents', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${POLLUTION_APP_ID}/document-consistency`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const result = (await res.json()) as any;

    assert.strictEqual(result.scope, 'application');
    assert.strictEqual(result.target_id, POLLUTION_APP_ID);
    assert.ok(typeof result.can_submit === 'boolean');
    assert.ok(result.summary_notes);
  });

  it('3. Deterministic checker flags discrepancy when plot areas exceed configured 2.0% tolerance', async () => {
    const mockDocs = [
      {
        id: 'doc-lease-1',
        document_type: 'Land Ownership / Lease Agreement',
        file_name: 'midc_lease_agreement.pdf',
        file_url: null,
      },
      {
        id: 'doc-arch-1',
        document_type: 'Building Layout Drawing',
        file_name: 'architectural_building_layout.pdf',
        file_url: null,
      },
    ];

    // Evaluate standard matching documents
    const result = await runCrossDocumentChecks(mockDocs, {
      scope: 'application',
      target_id: 'app-test',
      organization: { legal_name: 'ABC Foods Pvt Ltd' },
    });

    assert.ok(result.checks.length > 0);

    // Now test with simulated discrepancy: 5000 sq.m vs 4750 sq.m (5.0% diff, tolerance 2.0%)
    const discrepantDocs = [
      {
        id: 'doc-lease-discrepant',
        document_type: 'Land Ownership / Lease Agreement',
        file_name: 'midc_lease_deed_plot_area_5000_sqm.pdf',
        file_url: null,
      },
      {
        id: 'doc-arch-discrepant',
        document_type: 'Building Layout Drawing',
        file_name: 'architectural_plan_plot_area_4750_sqm.pdf',
        file_url: null,
      },
    ];

    const discResult = await runCrossDocumentChecks(discrepantDocs, {
      scope: 'application',
      target_id: 'app-test-2',
      organization: { legal_name: 'ABC Foods Pvt Ltd' },
    });

    const areaCheck = discResult.checks.find((c) => c.rule_id === 'cross_plot_area');
    assert.ok(areaCheck, 'Plot area check should be evaluated');
    assert.strictEqual(areaCheck.tolerance_pct, 2.0);
    assert.ok(areaCheck.difference_pct !== undefined);
    assert.ok(areaCheck.recommended_action.includes('Review source documents'));
  });

  it('4. Correctly flags unreadable documents for manual verification without fatal crash', async () => {
    const unreadableDocs = [
      {
        id: 'doc-scan-raw',
        document_type: 'Old Heritage Deed',
        file_name: 'scanned_image_only_no_text.jpg',
        file_url: null,
      },
    ];

    const result = await runCrossDocumentChecks(unreadableDocs, {
      scope: 'application',
      target_id: 'app-unreadable',
    });

    assert.strictEqual(result.unreadable_documents_count, 1);
    const manualCheck = result.checks.find((c) => c.status === 'MANUAL_REVIEW');
    assert.ok(manualCheck, 'Must generate MANUAL_REVIEW check item');
    assert.ok(manualCheck.recommended_action.includes('Manual verification required'));
  });
});
