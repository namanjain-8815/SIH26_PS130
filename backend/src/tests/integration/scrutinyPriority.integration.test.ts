import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { calculateScrutinyPriority } from '../../services/scrutinyPriorityService';

describe('P1.9 — Explainable Scrutiny Priority Integration Tests', () => {
  let officerToken: string;
  let entrepreneurToken: string;
  let baseUrl: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    officerToken = await loginAs('officer@demo.local');
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  describe('1. Scrutiny Priority Rule Engine Unit Evaluation', () => {
    it('evaluates a clean application as LOW scrutiny priority with healthy baseline factors', () => {
      const result = calculateScrutinyPriority({
        application_status: 'UNDER_REVIEW',
        required_documents_count: 3,
        uploaded_documents_count: 3,
        prerequisites: [],
        concerned_departments_count: 1,
        requires_inspection: false,
        open_queries_count: 0,
        sla_status: 'ON_TRACK',
        adverse_findings_count: 0,
      });

      assert.strictEqual(result.level, 'LOW');
      assert.strictEqual(result.label, 'Standard Scrutiny');
      assert.ok(result.score <= 1);
      assert.ok(result.factors.length >= 2 && result.factors.length <= 4);
      assert.ok(result.why.includes('Standard procedural scrutiny'));
      assert.ok(result.disclaimer.includes('Not a legally binding statutory risk score'));
    });

    it('elevates priority to HIGH when critical factors exist (e.g. breached SLA and missing documents)', () => {
      const result = calculateScrutinyPriority({
        application_status: 'UNDER_REVIEW',
        required_documents_count: 4,
        uploaded_documents_count: 1, // 3 missing
        prerequisites: [{ id: 'pa-1', status: 'IN_PROGRESS' }],
        concerned_departments_count: 3,
        requires_inspection: true,
        open_queries_count: 2,
        sla_status: 'BREACHED',
        adverse_findings_count: 1,
      });

      assert.strictEqual(result.level, 'HIGH');
      assert.strictEqual(result.label, 'High Review Complexity');
      assert.ok(result.score >= 5);
      assert.ok(result.factors.length >= 2 && result.factors.length <= 4);
      assert.ok(result.why.startsWith('High scrutiny priority driven by:'));
      assert.strictEqual(result.metrics.missing_documents, 3);
      assert.strictEqual(result.metrics.sla_status, 'BREACHED');
      assert.strictEqual(result.metrics.critical_findings_count, 1);
      assert.ok(result.contributing_factors.some((f) => f.category === 'SLA_TIMELINE'));
      assert.ok(result.contributing_factors.some((f) => f.category === 'DOCUMENTATION'));
      assert.ok(result.contributing_factors.some((f) => f.category === 'FINDINGS'));
    });

    it('evaluates moderate review complexity as MEDIUM when queries or inspections are pending', () => {
      const result = calculateScrutinyPriority({
        application_status: 'QUERY_RAISED',
        required_documents_count: 2,
        uploaded_documents_count: 2,
        prerequisites: [],
        concerned_departments_count: 2,
        requires_inspection: true,
        open_queries_count: 1,
        sla_status: 'ON_TRACK',
        adverse_findings_count: 0,
      });

      assert.strictEqual(result.level, 'MEDIUM');
      assert.strictEqual(result.label, 'Medium Review Complexity');
      assert.ok(result.factors.length >= 2);
      assert.ok(result.contributing_factors.some((f) => f.category === 'CLARIFICATION'));
    });
  });

  describe('2. Government Work Queue Scrutiny Priority Enrichment', () => {
    it('GET /api/government/work-queue enriches every item with explainable scrutiny priority', async () => {
      const res = await fetch(`${baseUrl}/api/government/work-queue`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });

      assert.strictEqual(res.status, 200);
      const items = (await res.json()) as any[];
      assert.ok(Array.isArray(items));
      assert.ok(items.length > 0);

      for (const item of items) {
        assert.ok(item.scrutiny_priority, `Missing scrutiny_priority on application ${item.application_number}`);
        assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(item.scrutiny_priority.level));
        assert.ok(typeof item.scrutiny_priority.score === 'number');
        assert.ok(Array.isArray(item.scrutiny_priority.factors));
        assert.ok(item.scrutiny_priority.factors.length >= 2 && item.scrutiny_priority.factors.length <= 4);
        assert.ok(typeof item.scrutiny_priority.why === 'string');
        assert.ok(item.scrutiny_priority.why.length > 0);
        assert.ok(item.scrutiny_priority.disclaimer.includes('Not a legally binding statutory risk score'));
        assert.ok(item.scrutiny_priority.metrics);
      }
    });
  });

  describe('3. Application Workspace Scrutiny Priority Hydration & Endpoint', () => {
    it('GET /api/applications/:id hydrates scrutiny_priority on the application object', async () => {
      // First get a known application ID from the work queue
      const wqRes = await fetch(`${baseUrl}/api/government/work-queue`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const items = (await wqRes.json()) as any[];
      const targetApp = items[0];
      assert.ok(targetApp);

      const res = await fetch(`${baseUrl}/api/applications/${targetApp.id}`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });

      assert.strictEqual(res.status, 200);
      const app = (await res.json()) as any;
      assert.strictEqual(app.id, targetApp.id);
      assert.ok(app.scrutiny_priority);
      assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(app.scrutiny_priority.level));
      assert.ok(app.scrutiny_priority.factors.length >= 2);
      assert.ok(app.scrutiny_priority.why);
    });

    it('GET /api/applications/:id/scrutiny-priority returns detailed priority breakdown', async () => {
      const wqRes = await fetch(`${baseUrl}/api/government/work-queue`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const items = (await wqRes.json()) as any[];
      const targetApp = items[0];

      const res = await fetch(`${baseUrl}/api/applications/${targetApp.id}/scrutiny-priority`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });

      assert.strictEqual(res.status, 200);
      const priority = (await res.json()) as any;
      assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(priority.level));
      assert.ok(typeof priority.score === 'number');
      assert.ok(Array.isArray(priority.contributing_factors));
      assert.ok(priority.metrics);
      assert.ok(typeof priority.metrics.missing_documents === 'number');
      assert.ok(typeof priority.metrics.prerequisite_count === 'number');
      assert.ok(typeof priority.metrics.concerned_authorities === 'number');
      assert.ok(priority.disclaimer.includes('Not a legally binding statutory risk score'));
    });
  });
});
