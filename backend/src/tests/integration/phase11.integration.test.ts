import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Phase 11 — End-to-End Integration & Rehearsal Verification', () => {
  let baseUrl: string;
  let entrepreneurToken: string;
  let midcOfficerToken: string;
  let mpcbOfficerToken: string;
  let nodalToken: string;
  let inspectorToken: string;
  let adminToken: string;

  const DEMO_PROJECT_ID = 'proj-abc-foods-001';
  let demoAppId: string;
  let testQueryId: string;
  let testInspectionId: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
    midcOfficerToken = await loginAs('officer@demo.local');
    mpcbOfficerToken = await loginAs('pcb.officer@demo.local');
    nodalToken = await loginAs('nodal@demo.local');
    inspectorToken = await loginAs('inspector@demo.local');
    adminToken = await loginAs('admin@demo.local');

    // Retrieve an application for ABC Foods
    const appsRes = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/applications`, {
      headers: { Authorization: `Bearer ${entrepreneurToken}` },
    });
    const apps = (await appsRes.json()) as any[];
    assert.ok(apps.length > 0, 'ABC Foods must have seeded applications');
    demoAppId = apps[0].id;
  });

  after(async () => {
    await closeTestServer();
  });

  // 1. APPLICANT / INVESTOR JOURNEY
  describe('1. Applicant / Investor Journey (ABC Foods Pvt Ltd)', () => {
    it('authenticates and validates Applicant / Investor profile', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const user = (await res.json()) as any;
      assert.strictEqual(user.role, 'ENTREPRENEUR');
      assert.strictEqual(user.email, 'entrepreneur@demo.local');
      assert.strictEqual(user.org_id, 'org-abc-foods');
    });

    it('loads Project Control Centre with readiness %, blockers and alerts', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/control-centre`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const cc = (await res.json()) as any;
      assert.strictEqual(cc.project.id, DEMO_PROJECT_ID);
      assert.strictEqual(cc.project.organization.legal_name, 'ABC Foods Pvt Ltd');
      assert.strictEqual(typeof cc.readiness.percent, 'number');
      assert.ok(cc.approvals.total > 0);
      assert.ok(Array.isArray(cc.sla_alerts));
      assert.ok(Array.isArray(cc.upcoming_renewals));
    });

    it('retrieves Permissions & Approvals roadmap', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/approvals`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const approvals = (await res.json()) as any[];
      assert.ok(approvals.length > 0);
      const first = approvals[0];
      assert.ok(first.approval_type);
      assert.ok(first.approval_type.authority);
      assert.ok(first.status);
    });

    it('retrieves Dependency Graph with parallel workflows and can_start_now flags', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/dependency-graph`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const graph = (await res.json()) as any;
      assert.ok(Array.isArray(graph.nodes));
      assert.ok(Array.isArray(graph.edges));
      assert.ok(graph.nodes.length > 0);
      assert.ok(graph.nodes.some((n: any) => n.data.can_start_now !== undefined));
    });

    it('provides explainable "Why is this required?" basis on permission details', async () => {
      const res = await fetch(`${baseUrl}/api/project-approvals/pa-pollution`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const detail = (await res.json()) as any;
      assert.ok(detail.approval_type);
      assert.ok(detail.approval_type.name);
      assert.ok(detail.approval_type.authority || detail.authority);
      assert.ok(detail.approval_type.description || detail.approval_type.purpose);
    });

    it('loads Document Vault with status and expiration tracking', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/documents`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const docs = (await res.json()) as any[];
      assert.ok(Array.isArray(docs));
      assert.ok(docs.length > 0);
      assert.ok(docs.every((d) => d.document_type && d.file_name));
    });

    it('runs Pre-Submission Readiness Validation check', async () => {
      const res = await fetch(`${baseUrl}/api/applications/${demoAppId}/readiness-check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const check = (await res.json()) as any;
      assert.strictEqual(typeof check.ready, 'boolean');
      assert.ok(Array.isArray(check.checks));
      assert.ok(check.label);
    });

    it('loads Application Workspace details and chronological event timeline', async () => {
      const appRes = await fetch(`${baseUrl}/api/applications/${demoAppId}`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(appRes.status, 200);
      const app = (await appRes.json()) as any;
      assert.ok(app.application_number);
      assert.ok(app.department);

      const timelineRes = await fetch(`${baseUrl}/api/applications/${demoAppId}/timeline`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(timelineRes.status, 200);
      const events = (await timelineRes.json()) as any[];
      assert.ok(Array.isArray(events));
      assert.ok(events.length > 0);
    });

    it('loads Post-Approval Compliance & Renewals schedule', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/compliance`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const items = (await res.json()) as any[];
      assert.ok(Array.isArray(items));
      assert.ok(items.length > 0);
    });

    it('loads Potentially Applicable Government Schemes / Incentives', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${DEMO_PROJECT_ID}/incentives`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const matches = (await res.json()) as any[];
      assert.ok(Array.isArray(matches));
      assert.ok(matches.length > 0);
    });
  });

  // 2. COMPETENT AUTHORITY OFFICER JOURNEY (MIDC)
  describe('2. Competent Authority Officer (MIDC)', () => {
    it('verifies MIDC officer profile and department binding', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${midcOfficerToken}` },
      });
      assert.strictEqual(res.status, 200);
      const user = (await res.json()) as any;
      assert.strictEqual(user.role, 'OFFICER');
      assert.strictEqual(user.department_id, 'dept-midc');
    });

    it('retrieves department-bound Competent Authority Work Queue', async () => {
      const res = await fetch(`${baseUrl}/api/government/work-queue?department_id=dept-midc`, {
        headers: { Authorization: `Bearer ${midcOfficerToken}` },
      });
      assert.strictEqual(res.status, 200);
      const queue = (await res.json()) as any[];
      assert.ok(Array.isArray(queue));
      assert.ok(queue.length > 0);
      assert.ok(queue.every((q) => q.department_id === 'dept-midc' || q.department?.id === 'dept-midc'));
    });

    it('raises a query seeking clarification from applicant', async () => {
      const res = await fetch(`${baseUrl}/api/applications/${demoAppId}/queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${midcOfficerToken}`,
        },
        body: JSON.stringify({
          subject: 'Phase 11 Rehearsal Clarification',
          description: 'Please submit updated equipment specifications.',
          priority: 'HIGH',
        }),
      });
      assert.strictEqual(res.status, 201);
      const query = (await res.json()) as any;
      assert.ok(query.id);
      testQueryId = query.id;
    });

    it('applicant responds to query, then officer resolves query', async () => {
      // Applicant responds
      const respondRes = await fetch(`${baseUrl}/api/queries/${testQueryId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${entrepreneurToken}`,
        },
        body: JSON.stringify({ response_text: 'Equipment layout and catalog attached.' }),
      });
      assert.strictEqual(respondRes.status, 201);

      // Officer resolves
      const resolveRes = await fetch(`${baseUrl}/api/queries/${testQueryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${midcOfficerToken}`,
        },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      assert.strictEqual(resolveRes.status, 200);
      const resolved = (await resolveRes.json()) as any;
      assert.strictEqual(resolved.status, 'RESOLVED');
    });
  });

  // 3. MPCB COMPETENT AUTHORITY OFFICER JOURNEY (SHARED SHELL)
  describe('3. MPCB Competent Authority Officer (Shared Government Shell)', () => {
    it('verifies MPCB officer profile in the same shared shell', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${mpcbOfficerToken}` },
      });
      assert.strictEqual(res.status, 200);
      const user = (await res.json()) as any;
      assert.strictEqual(user.role, 'OFFICER');
      assert.ok(user.department?.name?.toLowerCase().includes('pollution') || user.department_id === 'dept-pcb');
    });

    it('retrieves MPCB-specific queue within the shared government portal', async () => {
      const res = await fetch(`${baseUrl}/api/government/work-queue?department_id=dept-pcb`, {
        headers: { Authorization: `Bearer ${mpcbOfficerToken}` },
      });
      assert.strictEqual(res.status, 200);
      const queue = (await res.json()) as any[];
      assert.ok(Array.isArray(queue));
    });
  });

  // 4. MAITRI NODAL OFFICER JOURNEY (COORDINATION & ESCALATION)
  describe('4. MAITRI Nodal Officer Journey (Single Window Coordination)', () => {
    it('verifies MAITRI Nodal Officer profile', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${nodalToken}` },
      });
      assert.strictEqual(res.status, 200);
      const user = (await res.json()) as any;
      assert.strictEqual(user.role, 'NODAL');
    });

    it('accesses cross-department Single Window analytics', async () => {
      const res = await fetch(`${baseUrl}/api/government/analytics`, {
        headers: { Authorization: `Bearer ${nodalToken}` },
      });
      assert.strictEqual(res.status, 200);
      const analytics = (await res.json()) as any;
      assert.ok(analytics.applications_by_department);
      assert.ok(analytics.sla);
      assert.ok(analytics.query_metrics);
      assert.ok(analytics.inspection_metrics);
    });

    it('accesses Specified Time Limit monitor across departments', async () => {
      const res = await fetch(`${baseUrl}/api/government/sla-monitor`, {
        headers: { Authorization: `Bearer ${nodalToken}` },
      });
      assert.strictEqual(res.status, 200);
      const sla = (await res.json()) as any;
      assert.ok(Array.isArray(sla) || Array.isArray(sla.tracked_applications));
    });

    it('records an inter-department coordination note', async () => {
      const res = await fetch(`${baseUrl}/api/applications/${demoAppId}/coordination-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nodalToken}`,
        },
        body: JSON.stringify({
          note: 'MAITRI Nodal Agency coordinated inter-department review meeting with MIDC and MPCB.',
        }),
      });
      assert.strictEqual(res.status, 201);
      const event = (await res.json()) as any;
      assert.strictEqual(event.event_type, 'nodal_coordination_note');
    });

    it('transfers delayed application to Empowered Committee under Section 10', async () => {
      const res = await fetch(`${baseUrl}/api/applications/${demoAppId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nodalToken}`,
        },
        body: JSON.stringify({
          reason: 'Application exceeded specified statutory timeline under MAITRI Rules 2025; escalated to Empowered Committee.',
        }),
      });
      assert.strictEqual(res.status, 200);
      const result = (await res.json()) as any;
      assert.strictEqual(result.event?.event_type || result.event_type, 'escalated_to_empowered_committee');
    });
  });

  // 5. DESIGNATED INSPECTION OFFICER JOURNEY
  describe('5. Designated Inspection Officer Journey', () => {
    it('verifies Designated Inspection Officer profile', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${inspectorToken}` },
      });
      assert.strictEqual(res.status, 200);
      const user = (await res.json()) as any;
      assert.strictEqual(user.role, 'INSPECTOR');
    });

    it('schedules an inspection and records verified site findings', async () => {
      // Schedule inspection
      const schedRes = await fetch(`${baseUrl}/api/inspections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${inspectorToken}`,
        },
        body: JSON.stringify({
          application_id: demoAppId,
          department_id: 'dept-midc',
          scheduled_date: new Date(Date.now() + 3 * 86_400_000).toISOString(),
          location: 'Plot 42 MIDC Pune Food Park',
          purpose: 'Verification of industrial effluent connection',
        }),
      });
      assert.strictEqual(schedRes.status, 201);
      const insp = (await schedRes.json()) as any;
      testInspectionId = insp.id;

      // Record finding
      const findRes = await fetch(`${baseUrl}/api/inspections/${testInspectionId}/findings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${inspectorToken}`,
        },
        body: JSON.stringify({
          description: 'Effluent containment bunding installed per environmental clearance conditions.',
          severity: 'LOW',
          corrective_action: 'Install permanent high-visibility markers.',
          status: 'OPEN',
        }),
      });
      assert.strictEqual(findRes.status, 201);
      const finding = (await findRes.json()) as any;
      assert.ok(finding.id);
    });
  });

  // 6. SYSTEM ADMINISTRATOR JOURNEY
  describe('6. System Administrator Journey (Platform Catalogues & Governance)', () => {
    it('verifies System Administrator profile', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const user = (await res.json()) as any;
      assert.strictEqual(user.role, 'ADMIN');
    });

    it('accesses Permissions Catalogue, Rules, Dependencies, SLA Policies, Schemes, and Audit Diffs', async () => {
      const [atRes, rulesRes, depsRes, slaRes, schemesRes, auditRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/approval-types`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch(`${baseUrl}/api/admin/rules`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch(`${baseUrl}/api/admin/dependencies`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch(`${baseUrl}/api/admin/sla-policies`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch(`${baseUrl}/api/admin/incentive-schemes`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch(`${baseUrl}/api/admin/audit-log`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);

      assert.strictEqual(atRes.status, 200);
      assert.strictEqual(rulesRes.status, 200);
      assert.strictEqual(depsRes.status, 200);
      assert.strictEqual(slaRes.status, 200);
      assert.strictEqual(schemesRes.status, 200);
      assert.strictEqual(auditRes.status, 200);

      const audit = (await auditRes.json()) as any[];
      assert.ok(Array.isArray(audit));
      assert.ok(audit.length > 0);
    });
  });

  // 7. SIMULATED INTEGRATION BOUNDARY & PROTOTYPE HONESTY
  describe('7. Simulated Integration Boundary & Prototype Honesty', () => {
    it('returns explicit Simulated integration metadata on external gateway status check', async () => {
      const res = await fetch(`${baseUrl}/api/applications/${demoAppId}/external-status`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.integration_type, 'Simulated integration');
      assert.strictEqual(data.is_simulated, true);
    });

    it('enforces RBAC: blocks applicant from accessing administration or officer functions', async () => {
      const adminRes = await fetch(`${baseUrl}/api/admin/approval-types`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(adminRes.status, 403);

      const queueRes = await fetch(`${baseUrl}/api/government/work-queue`, {
        headers: { Authorization: `Bearer ${entrepreneurToken}` },
      });
      assert.strictEqual(queueRes.status, 403);
    });
  });
});
