# Project Progress

## Phase 10 Reliability, Security Authorization, Accessibility & Government UX Hardening (COMPLETED ✅)
- **1. Backend Route Authorization Hardening & RBAC Enforcement**:
  - [backend/src/services/applicationService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/applicationService.ts):
    - Hardened `updateApplicationStatus`:
      - Blocked `ENTREPRENEUR` and `MANAGER` roles from recording statutory approval or rejection decisions on applications (`403 Forbidden`).
      - Blocked `NODAL` (MAITRI Nodal Officer) from granting approvals (`403 Forbidden` — Nodal coordinates & monitors; decisions belong to Concerned Competent Authority).
      - Blocked `INSPECTOR` (Designated Inspection Officer) from granting approvals (`403 Forbidden` — Inspectors verify findings; decisions belong to Competent Authority Officer).
      - Strictly enforced cross-department jurisdictional boundaries: Competent Authority Officers can only approve or reject applications within their assigned department (`user.department_id === app.department_id`), returning `403 Forbidden` on jurisdictional violations.
      - Restricted initiation of `UNDER_REVIEW` and `INSPECTION_SCHEDULED` statuses to authorized government and inspection officers.
  - [backend/src/routes/applications.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/applications.ts):
    - Guarded `POST /applications/:id/coordination-note` with `requireRole('OFFICER', 'NODAL', 'ADMIN', 'INSPECTOR')`.
    - Guarded `POST /applications/:id/escalate` with `requireRole('OFFICER', 'NODAL', 'ADMIN', 'ENTREPRENEUR')`.
    - Exposed `GET /applications/:id/external-status` for simulated gateway inspection.
  - [backend/src/routes/inspections.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/inspections.ts):
    - Guarded inspection scheduling (`POST /projects/:id/inspections`, `POST /inspections`) with `requireRole('OFFICER', 'INSPECTOR', 'ADMIN', 'NODAL')`.
    - Guarded recording and updating inspection findings (`POST /inspections/:id/findings`, `PATCH /inspections/findings/:findingId`) with `requireRole('OFFICER', 'INSPECTOR', 'ADMIN')`.
    - Maintained applicant site readiness confirmation (`action: 'confirm_readiness'`) and reschedule requests while blocking non-officers from marking inspections as `COMPLETED`.
  - [backend/src/routes/queries.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/queries.ts):
    - Guarded query raising (`POST /applications/:id/queries`) with `requireRole('OFFICER', 'INSPECTOR', 'ADMIN', 'NODAL')`.
    - Guarded query resolution and escalation (`PATCH /queries/:id/status`) with `requireRole('OFFICER', 'NODAL', 'ADMIN')`.
  - [backend/src/routes/sla.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/sla.ts):
    - Added `requireRole('OFFICER', 'NODAL', 'ADMIN', 'INSPECTOR')` to `/government/sla-monitor` and `/government/sla-monitor/evaluate`.

- **2. Simulated Integration Boundaries & Gateway Metadata**:
  - [backend/src/adapters/GovernmentIntegrationAdapter.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/adapters/GovernmentIntegrationAdapter.ts) & [backend/src/adapters/MockGovernmentAdapter.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/adapters/MockGovernmentAdapter.ts):
    - Strictly typed and enriched all adapter methods (`submitApplication`, `getApplicationStatus`, `uploadDocument`, `submitResponse`) with explicit metadata: `{ integration_type: 'Simulated integration', is_simulated: true }`.
    - Hooked application submission workflow (`status === 'SUBMITTED'`) to automatically dispatch simulated external submission and persist audit event `external_gateway_sync` with `Simulated integration` tag and generated simulated reference number.

- **3. Government Context Headers, Portal Guards & UX Hardening**:
  - [frontend/src/app/government/layout.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/layout.tsx):
    - Integrated client-side authorization guard with `AuthLoadingState` and `PermissionDeniedState` (403 Forbidden).
    - Top Context Header Bar: Explicitly presents **Concerned Department / Authority** (e.g. `Maharashtra Pollution Control Board (MPCB)` or `Maharashtra Industrial Development Corporation (MIDC)`) alongside official role label (`Competent Authority Officer`, `MAITRI Nodal Officer`, or `Designated Inspection Officer`).
    - Prominent `PROTOTYPE / DEMO DATA` badge and `BHASHINI Seam Ready` button.
  - [frontend/src/app/admin/layout.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/layout.tsx):
    - Added strict role guard rendering `PermissionDeniedState` if non-admin accesses `/admin`.
    - Top context header with System Administrator governance console context.
  - [frontend/src/app/app/layout.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/layout.tsx):
    - Integrated auth guard with `AuthLoadingState` and `PermissionDeniedState`.
    - Top context header presenting `Applicant Entity: ABC Foods Pvt Ltd` and authenticated role.

- **4. Accessibility & UI States (States.tsx)**:
  - [frontend/src/components/ui/States.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/components/ui/States.tsx):
    - Added `PermissionDeniedState` component with `role="alert"`, `aria-live="assertive"`, statutory authorization context, and clear return CTA.
    - Added `AuthLoadingState` component with `role="status"`, `aria-live="polite"`.
    - Added ARIA labels and accessibility attributes across `CardSkeleton`, `TableRowSkeleton`, `EmptyState`, and `ErrorState`.

- **5. BHASHINI Language Mission Architectural Seam**:
  - [frontend/src/components/ui/BhashiniSeam.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/components/ui/BhashiniSeam.tsx):
    - Preserved future integration seam for Government of India's Digital India BHASHINI Division.
    - Accessible dialog displaying planned language pipelines (Marathi मराठी, Hindi हिंदी, Gujarati ગુજરાતી) while explicitly clarifying that current build operates in English as the authoritative reference language with zero fake translations.

- **Phase 10 Verification & Test Results**:
  - **Phase 10 Integration Suite (`backend/src/tests/integration/phase10.integration.test.ts`)**: 10/10 tests passed against live Supabase data:
    1. Admin routes enforce strict 403 Forbidden for non-admin callers.
    2. Government routes enforce strict 403 Forbidden for Applicant / Investor callers.
    3. Coordination notes route blocks unauthorized non-government callers.
    4. Site inspection scheduling route blocks non-officer callers.
    5. Applicant / Investor self-approval attempts blocked with descriptive 403 error.
    6. MAITRI Nodal Officer statutory approval attempts blocked with 403 error.
    7. Designated Inspection Officer statutory approval attempts blocked with 403 error.
    8. Cross-department officer approvals blocked with jurisdictional violation 403 error.
    9. External gateway status check returns explicit `Simulated integration` metadata.
    10. Non-existent application ID queries return structured 404 error without crashing.
  - **Full Backend Test Suite**: **83/83 tests passed across all 14 suites (100% pass rate)**.
  - **Frontend Production Build**: `npm --prefix frontend run build` compiled successfully with **zero errors across all 24 routes**.
  - **Database Schema**: Existing 22 tables and relations 100% preserved; zero breaking schema changes.

## Phase 9 Analytics & Bottlenecks (COMPLETED ✅)
- **1. Department & Authority Performance Analytics**:
  - Backend [backend/src/services/analyticsService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/analyticsService.ts) and [backend/src/routes/government.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/government.ts):
    - `getAnalyticsSummary` enriched with real aggregated records:
      - **Applications by Concerned Department / Authority**: Grouped by approving authority (MIDC, MPCB, Directorate of Industrial Safety & Health, Industries Dept, etc.) with totals, under-review counts, and time limit breaches.
      - **Clarification / Query Resolution Duration**: Distinct breakdown measuring average applicant clarification response turnaround (hours) vs department scrutiny resolution duration.
      - **Site Inspection Delays & Findings**: Tracks scheduled vs completed field inspections and isolates critical/high defect severities.
      - **Statutory Specified Time Limit Compliance**: Real time limit performance under Maharashtra Industry, Trade and Investment Facilitation Rules, 2025.
      - **Empowered Committee Escalations**: Real-time counter of delayed applications transferred under Section 10 of MAITRI Act 2023.
    - Added optional `department_id` query filter to both `GET /api/government/analytics` and `GET /api/government/bottlenecks` for authority-specific and MAITRI Nodal cross-department scoping.
    - Updated government route authorization to include `INSPECTOR` along with `OFFICER`, `NODAL`, and `ADMIN`.
  - Frontend [frontend/src/app/government/analytics/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/analytics/page.tsx):
    - Dynamic **Concerned Authority** filter dropdown allowing officers to inspect authority-specific or statewide single-window performance.
    - 4 Executive KPI Cards: Total Applications, Average Scrutiny Duration, Applicant Query Response Turnaround, and Specified Time Limit Compliance %.
    - Recharts Visualizations:
      - Applications by Concerned Department / Authority (BarChart with authority labels).
      - Specified Time Limit Performance (PieChart with compliant, at-risk, and breached breakdown).
      - Query Resolution Flow (Awaiting Applicant vs Under Dept Review vs Resolved).
      - Site Inspection Delays & Defect Severity (Scheduled vs Completed, Critical Findings).
    - Clear **"Prototype / Demonstration Data — Computed from Stored Events"** indicators and statutory context notices.

- **2. Process Bottlenecks & Delay Intelligence**:
  - Backend `getBottlenecks`:
    - Categorizes bottlenecks derived from real `ApplicationEvent` audit rows, inspection queues, and query logs.
    - Identifies **Delay Origin Party** (`APPLICANT`, `DEPARTMENT`, `INSPECTION_OFFICER`, `EMPOWERED_COMMITTEE`) to pinpoint structural delay causes.
  - Frontend [frontend/src/app/government/bottlenecks/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/bottlenecks/page.tsx):
    - Upgraded with interactive Concerned Authority filter dropdown.
    - Ranked delay cards color-coded by severity, showing delay origin badges (e.g. *Applicant Clarification Pending*, *Competent Authority Scrutiny*, *Designated Inspection Officer*, *Empowered Committee Review*).
    - Contributing workflow statuses and audit data source transparency.

- **Phase 9 Verification & Test Results**:
  - **Phase 9 Integration Suite (`backend/src/tests/integration/phase9.integration.test.ts`)**: 5/5 tests passed against live Supabase data:
    1. Retrieval of analytics summary with department breakdown, query response timing, and inspection metrics (`GET /api/government/analytics`).
    2. Dynamic department scoping to MIDC (`GET /api/government/analytics?department_id=dept-midc`).
    3. Delay intelligence retrieval with delay origin parties (`GET /api/government/bottlenecks`).
    4. Inspector role authorization verification for analytics and bottlenecks.
    5. Role guard enforcement: 403 Forbidden for non-government callers (`ENTREPRENEUR`).
  - **Full Backend Test Suite**: 73/73 tests passed across 13 suites (100% pass rate).
  - **Frontend Production Build**: `npm --prefix frontend run build` compiled successfully with zero errors across all 24 routes.
  - **Database Schema**: Reused existing tables and relations; zero schema migrations required; 100% backward-compatible.

## Phase 8 System Administration & Master Data (COMPLETED ✅)
- **1. System Administrator Master Catalogues & Config-Driven Regulatory Engine**:
  - Renamed admin-facing role presentation to **System Administrator** across layouts and navigation.
  - Upgraded **Permissions / Approvals Catalogue** ([frontend/src/app/admin/approval-types/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/approval-types/page.tsx)):
    - Displays statutory permissions with Concerned Department / Authority, Category, Default Specified Time Limit, Renewal Period, Inspection Requirement, and Statutory Act / Legal Reference.
    - Added interactive **"Add Permission / Approval"** modal saving directly to PostgreSQL without requiring code deployment or frontend rebuild.
    - Safe backend fallbacks in [backend/src/routes/admin.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/admin.ts) ensuring complete database model compliance.
  - Upgraded **Applicability & Eligibility Rules** ([frontend/src/app/admin/rules/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/rules/page.tsx)):
    - Integrated real-time **Active / Inactive Status Toggle** with instant mutation and audit trail generation.
    - Added **"Add Applicability Rule"** modal with permission selector, jurisdiction scoping, sector criteria, and JSON rule conditions.
    - Added relation hydration for `approval_type` in `RELATION_MAP` ([backend/src/lib/supabaseDb.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/lib/supabaseDb.ts)) so rules display resolved permission names.
  - Upgraded **Permission Dependencies** ([frontend/src/app/admin/dependencies/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/dependencies/page.tsx)):
    - Added interactive **"Add Dependency"** modal to link prerequisite permissions with dependent permissions under statutory relationship types (`PREREQUISITE`, `PARALLEL`, `INFORMATIONAL`).
    - Added **Delete Dependency** control.
  - Upgraded **Specified Time Limit Policies** ([frontend/src/app/admin/sla-policies/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/sla-policies/page.tsx)):
    - Displays statutory processing duration and escalation paths under MAITRI Rules 2025.
    - Added inline quick-edit for specified time limit duration (`duration_days`).
    - Added **"Add Time Limit Policy"** modal supporting statutory escalation entities: Empowered Committee (Sec 10), MAITRI Nodal Agency Coordination, and Supervisory Committee (Sec 12).
  - Upgraded **Incentive Schemes Master Data** ([frontend/src/app/admin/incentive-schemes/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/incentive-schemes/page.tsx)):
    - Added **"Add Incentive Scheme"** modal capturing scheme name, department authority, fiscal benefit description, application deadline, and GR references.
    - Added Delete control and non-guaranteed statutory benefit notices.
  - Upgraded **Audit Trail & System Logs** ([frontend/src/app/admin/audit-log/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/audit-log/page.tsx)):
    - Formatted actors with official role terminology using `formatRole`.
    - Added interactive **"Inspect"** modal displaying JSON before/after state diffs for regulatory compliance auditing.
    - Captures `before_data` and `after_data` across all admin CRUD mutations.
  - Typed API Client ([frontend/src/lib/api.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/lib/api.ts)):
    - Expanded `adminApi` with full typed CRUD interfaces for `approvalTypes`, `rules`, `dependencies`, `slaPolicies`, `incentiveSchemes`, and `auditLog`.
  - Prominent **"Demonstration Master Data / Configurable Regulatory Parameters"** badges and disclaimers on all admin views.

- **Phase 8 Verification & Test Results**:
  - **Phase 8 Integration Suite (`backend/src/tests/integration/phase8.integration.test.ts`)**: 9/9 tests passed against live Supabase data:
    1. Retrieval of statutory permissions catalogue (`GET /api/admin/approval-types`).
    2. Dynamic permission creation with audit logging (`POST /api/admin/approval-types`).
    3. Applicability rules retrieval with hydrated `approval_type` (`GET /api/admin/rules`).
    4. Immediate rule active toggle and audit capture (`PATCH /api/admin/rules/:id`).
    5. Specified time limit policies retrieval with hydrated `approval_type` (`GET /api/admin/sla-policies`).
    6. Updating time limit duration (`PATCH /api/admin/sla-policies/:id`).
    7. Permission dependencies chain retrieval (`GET /api/admin/dependencies`).
    8. Audit trail retrieval with actor details (`GET /api/admin/audit-log`).
    9. Role guard enforcement: 403 Forbidden for non-admin callers.
  - **Full Backend Test Suite**: 68/68 tests passed across 12 suites (100% pass rate).
  - **Frontend Production Build**: `npm --prefix frontend run build` compiled successfully with zero errors across all 24 routes.
  - **Database Schema**: Reused existing tables and relations; zero schema migrations required; 100% backward-compatible.

## Phase 7 Compliance, Renewals, Incentives & Investor Support (COMPLETED ✅)
- **1. Compliance & Renewals Workspace & Automation**:
  - Backend `PATCH /api/compliance/:id/complete` in [backend/src/routes/compliance.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/compliance.ts) and `markComplianceCompleted` in [backend/src/services/complianceService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/complianceService.ts): marks statutory compliance obligation as completed and auto-schedules subsequent renewal in the calendar for periodic frequency requirements (e.g. annual renewals).
  - Backend `POST /api/projects/:id/compliance/remind` and `sendComplianceReminders`: scans upcoming and overdue returns (≤90 days) and dispatches role-aware notifications into the user's notification feed.
  - Frontend [frontend/src/app/app/compliance/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/compliance/page.tsx): upgraded with interactive "Record Compliance / Renew" button, "Send Renewal Reminders" control, urgency-coded badges, and statutory return disclaimers.

- **2. Potentially Applicable Incentives & Schemes Discovery**:
  - Backend `PATCH /api/incentives/:id/status` in [backend/src/routes/incentives.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/incentives.ts) and `GET /api/incentive-schemes`: allows updating match status (`POTENTIALLY_ELIGIBLE`, `APPLIED`, `NOT_ELIGIBLE`) and catalogues government promotional schemes.
  - Created dedicated Applicant Portal page: [frontend/src/app/app/incentives/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/incentives/page.tsx) with fiscal benefit descriptions, rule matching reasons, "Mark as Applied" workflow, and statutory non-guaranteed benefit disclaimers.
  - Added "Incentives & Schemes" to sidebar navigation in [frontend/src/app/app/layout.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/layout.tsx).

- **Phase 7 Verification & Test Results**:
  - **Phase 7 Integration Suite (`backend/src/tests/integration/phase7.integration.test.ts`)**: 6/6 tests passed against live Supabase data:
    1. Retrieval of compliance calendar and renewals (`GET /api/projects/:id/compliance`).
    2. Renewal reminder dispatch and notifications creation (`POST /api/projects/:id/compliance/remind`).
    3. Recording compliance and auto-scheduling next period (`PATCH /api/compliance/:id/complete`).
    4. Scheme matching with explainable reasons (`GET /api/projects/:id/incentives`).
    5. Updating scheme application status (`PATCH /api/incentives/:id/status`).
    6. Promotional schemes master catalogue retrieval (`GET /api/incentive-schemes`).
  - **Full Backend Test Suite**: 59/59 tests passed across 11 suites (100% pass rate).
  - **Frontend Production Build**: `npm --prefix frontend run build` compiled successfully with zero errors across all 24 routes.
  - **Database Schema**: Zero schema migrations required; 100% backward-compatible.

## Phase 6 Specified Time Limits, Notifications & Controlled Escalation (COMPLETED ✅)
- **1. Statutory Specified Time Limits & Demonstration Labeling**:
  - Backend [backend/src/services/slaService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/slaService.ts):
    - `computeSLAStatus` & `getGovernmentSLAMonitor` enriched with statutory semantics (`specified_time_limit_days`, `statutory_reference: 'Maharashtra Industry, Trade and Investment Facilitation Rules, 2025'`, and clear prototype labeling: *"Configured service timeline — statutory specified time limit under MAITRI Rules (Demonstration Data)"*).
    - Preserved the existing stored-event SLA engine, computing elapsed time from `submitted_at` or `created_at`.
    - Added `evaluateAndNotifySLAs()` background assessment engine exposed via `POST /api/government/sla-monitor/evaluate` to scan active applications and identify timelines at risk (<25% remaining) or breached.
  - Frontend [frontend/src/app/government/sla-monitor/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/sla-monitor/page.tsx):
    - Renamed headers and metrics to official vocabulary: **Specified Time Limit Monitor**, **Time Limit Breached**, **At Risk (< 25% Remaining)**, and **Within Specified Limit**.
    - Interactive **Concerned Authority** filter dropdown (MIDC, MPCB, PMC Fire, Labour, etc.) for cross-department monitoring and department-bound officer scoping.
    - Status filter tabs: `All`, `Breached`, `At Risk`, and `Within Limit`.
    - Added **"Evaluate Time Limits"** button triggering the live evaluation routine with real-time feedback notice.

- **2. Role-Aware Notification System**:
  - Enhanced [backend/src/services/notificationService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/notificationService.ts):
    - Added `notifyRoleUsers` and `notifyUsers` for department- and role-scoped dispatching.
    - `notifyApplicationSubmitted`: Alerts applicant of successful filing and notifies Competent Authority Officers of the concerned department that an application is awaiting scrutiny.
    - `notifyDecisionRecorded`: Notifies applicant of statutory clearance/order (or rejection reasons) and dispatches decision notices to MAITRI Nodal Officers.
    - `notifyEmpoweredCommitteeEscalation`: Notifies Nodal Officers, department Competent Authority Officers, and the Applicant entity simultaneously when an application is transferred to the Empowered Committee.
    - `notifySLAAtRisk` & `notifyTimeLimitApproaching`: Delivers proactive warnings when applications approach statutory deadlines.
  - Wired role notifications into lifecycle events in [backend/src/services/applicationService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/applicationService.ts).
  - Added live notification bell and unread badge count to Government Shell in [frontend/src/app/government/layout.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/layout.tsx).

- **3. Controlled Statutory Escalation: Nodal Agency → Empowered Committee**:
  - Implemented `POST /api/applications/:id/escalate` in [backend/src/routes/applications.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/applications.ts) calling `escalateApplication` in [backend/src/services/applicationService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/applicationService.ts).
  - Persists `escalated_to_empowered_committee` in `ApplicationEvent` with statutory reference (*"Section 10 of the Maharashtra Industry, Trade and Investment Facilitation Act, 2023"*).
  - Frontend [frontend/src/app/government/sla-monitor/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/sla-monitor/page.tsx):
    - Added **"Escalate to Committee"** button on delayed/breached applications.
    - Interactive **Statutory Escalation Modal** capturing justification note and explaining legal basis under MAITRI framework.
    - Displays persistent "In Committee Review" / "Escalated to Committee" status badge across monitors and work queues.

- **Phase 6 Verification & Test Results**:
  - **Phase 6 Integration Suite (`backend/src/tests/integration/phase6.integration.test.ts`)**: 6/6 tests passed against live Supabase data:
    1. Retrieval of tracked instances with specified time limits (`GET /api/government/sla-monitor`).
    2. Dynamic department scoping to MIDC (`GET /api/government/sla-monitor?department_id=dept-midc`).
    3. Live evaluation routine execution (`POST /api/government/sla-monitor/evaluate`).
    4. Empowered Committee statutory transfer (`POST /api/applications/:id/escalate`).
    5. Chronological timeline audit trail (`GET /api/applications/:id/timeline`).
    6. Role-aware notification dispatch and retrieval (`GET /api/notifications` & unread count).
  - **Full Backend Test Suite**: 53/53 tests passed across 10 suites (100% pass rate).
  - **Frontend Production Build**: `npm --prefix frontend run build` compiled successfully with zero errors across all 23 routes.
  - **Database Schema**: Zero schema migrations required; 100% backward-compatible.

## Phase 5 Government Processing with Authority-Aware Permissions (COMPLETED ✅)
- **1. Department Catalogue & Dynamic Authority Scoping**:
  - Backend `GET /api/government/departments` in [backend/src/routes/government.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/government.ts): Returns all concerned authorities (MIDC, MPCB, Discom, Fire, Labour, FSSAI) directly from PostgreSQL.
  - Added `governmentApi.departments()` in [frontend/src/lib/api.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/lib/api.ts).
  - Enhanced `getWorkQueue` in [backend/src/services/analyticsService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/analyticsService.ts) to return `department_id: app.department_id` on each item.
  - Additive Token & Request hydration: Added `department_id?: string | null` to `TokenPayload` in [backend/src/lib/jwt.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/lib/jwt.ts), `Express.Request` user type in [backend/src/types/express.d.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/types/express.d.ts), and auth middleware in [backend/src/middleware/auth.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/middleware/auth.ts).

- **2. Authority-Aware Permissions & Jurisdiction Guardrails**:
  - Enhanced `updateApplicationStatus` in [backend/src/services/applicationService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/applicationService.ts):
    - **Cross-Department Protection**: Competent Authority Officers (`OFFICER`) can only approve or reject applications within their assigned department (`actor.department_id === app.department_id`), returning `403 Forbidden` with a descriptive message on cross-department attempts.
    - **MAITRI Nodal Agency Boundaries**: Nodal officers (`NODAL`) attempting to record statutory approval/rejection decisions receive `403 Forbidden` (*"MAITRI Nodal Officers provide inter-department facilitation and monitoring; statutory approval decisions must be taken by the Concerned Competent Authority Officer."*).
    - **Designated Inspection Officers (`INSPECTOR`)**: Approval/rejection attempts receive `403 Forbidden` (*"Designated Inspection Officers record inspection findings; statutory approval decisions must be taken by the Competent Authority Officer."*).
  - Added inter-department coordination notes:
    - Route `POST /api/applications/:id/coordination-note` in [backend/src/routes/applications.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/applications.ts) calling `recordCoordinationNote` in [backend/src/services/applicationService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/applicationService.ts).
    - Persists `nodal_coordination_note` and `escalated_to_empowered_committee` events in `ApplicationEvent` timeline.
  - Statutory Escalation Protocol:
    - Enhanced `updateQueryStatus` in [backend/src/services/queryService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/queryService.ts) to handle `status: 'ESCALATED'`, creating a `query_escalated_to_empowered_committee` audit event.
    - Added `queriesApi.escalate(queryId)` in [frontend/src/lib/api.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/lib/api.ts).

- **3. Competent Authority Work Queue UI Personalization ([frontend/src/app/government/work-queue/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/work-queue/page.tsx))**:
  - **Dynamic Jurisdiction Scoping**:
    - For `OFFICER`: Automatically filters to their department with visual badge: `Concerned Authority: {name}` with a `Jurisdiction Scoped` lock tag.
    - For `NODAL` / `ADMIN`: Dropdown populated with all concerned authorities to facilitate cross-department monitoring or focus on a specific authority.
  - Table columns display Concerned Authority prominently under each permission name.
  - **Decision Modals**:
    - **Record Decision — Grant Permission**: Captures Clearance Reference Number and Conditions of Approval / Statutory Reasons.
    - **Record Decision — Rejection**: Enforces mandatory entry of statutory grounds and non-compliances per MAITRI Rules.
    - **Cross-Department Notice**: Renders read-only jurisdiction warning banner when viewing an outside application.
  - **MAITRI Nodal Agency Panel**:
    - Distinctive coordination view with 4 actions: *Inter-Department Coordination Note*, *Facilitate Query* (prefixed with `[MAITRI Facilitation]`), *Escalate to Empowered Committee*, and *Coordinate Inspection*.
    - Disabled decision buttons indicating statutory decision authority belongs to the Concerned Department.
  - **Query Escalation Control**: Added "Escalate to Committee" button for open queries in the application detail drawer.

- **Phase 5 Verification & Test Results**:
  - **Phase 5 Integration Suite (`backend/src/tests/integration/phase5.integration.test.ts`)**: 8/8 tests passed against live Supabase data:
    1. Department catalogue retrieval (`GET /api/government/departments`).
    2. Competent Authority Officer department-scoped work queue.
    3. Competent Authority Officer of MIDC approves MIDC application.
    4. Cross-department protection: MPCB officer rejected with 403 on MIDC application.
    5. MAITRI Nodal Officer rejected with 403 when attempting statutory approval.
    6. Designated Inspection Officer rejected with 403 when attempting statutory approval.
    7. MAITRI Nodal Officer records coordination note in application timeline.
    8. Query escalation to Empowered Committee updates status and logs event.
  - **Full Backend Test Suite**: 47/47 tests passed across 9 suites (100% pass rate).
  - **Frontend Production Build**: `npm --prefix frontend run build` compiled successfully with zero errors across all 23 routes.
  - **Database Schema**: Zero schema migrations required; complete backward compatibility maintained.

## Phase 4 Government Terminology & Role Personalization (COMPLETED ✅)
- **1. Centralized Presentation Mapping (`frontend/src/lib/terminology.ts`)**:
  - Implemented `ROLE_LABELS` and `ROLE_META` mapping internal enum values to official Maharashtra Single Window (MAITRI) roles:
    - `ENTREPRENEUR` → **Applicant / Investor**
    - `MANAGER` → **Authorized Representative**
    - `OFFICER` → **Competent Authority Officer**
    - `NODAL` → **MAITRI Nodal Officer**
    - `INSPECTOR` → **Designated Inspection Officer**
    - `ADMIN` → **System Administrator**
  - Added `formatRole(role, departmentName)` producing department-aware descriptions (e.g. *Competent Authority Officer · Maharashtra Pollution Control Board (MPCB)*).
  - Added `TERMS` dictionary for standardized UI vocabulary: *Industrial Undertaking*, *Investment Proposal*, *Permission / Approval*, *Specified Time Limit*, *Configured Service Timeline*, *Concerned Department / Authority*, *Scrutiny & Decision*.

- **2. Additive Backend User & Department Hydration**:
  - Enhanced [backend/src/services/authService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/authService.ts): Added `{ include: { department: true } }` in `login` and `getCurrentUser` queries using existing `RELATION_MAP.User.department` in `supabaseDb.ts`.
  - Zero database schema modifications: preserved internal `Role` enums and API contracts while dynamically delivering department context.
  - Extended [frontend/src/lib/auth-context.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/lib/auth-context.tsx) `AuthUser` interface to expose hydrated `department: { id: string; name: string } | null`.

- **3. Login & Portal Layouts Personalization**:
  - Demo login screen ([frontend/src/app/login/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/login/page.tsx)):
    - All 7 demo quick-login buttons updated with official role titles and department contexts (MIDC, MPCB, Discom).
    - Added visible **PROTOTYPE** badge and SIH demonstration disclaimer ("SIH 2026 Problem Statement 26130 · Solution Prototype. Not an official Government of Maharashtra service.").
  - Shared Government Shell ([frontend/src/app/government/layout.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/layout.tsx)):
    - Navigation updated: *Competent Authority Queue*, *Specified Time Limits*, *Bottlenecks & Delays*, *Scrutiny Analytics*.
    - Header displays dynamic **Concerned Authority** badge based on officer's department.
    - Bottom user chip renders official role formatted with department context using `formatRole`.
  - Applicant Portal Layout ([frontend/src/app/app/layout.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/layout.tsx)):
    - Navigation updated: *Investment Proposals*, *Permissions & Approvals*, *Compliance & Renewals*.
    - Added **PROTOTYPE** indicator next to Udyog Setu branding.
  - Admin Portal Layout ([frontend/src/app/admin/layout.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/layout.tsx)):
    - Navigation updated: *Permissions Catalogue*, *Applicability & Eligibility*, *Permission Dependencies*, *Specified Time Policies*, *Audit Trail & Logs*.
    - User chip labeled **System Administrator**.

- **4. Government Processing & Scrutiny Workspaces**:
  - Competent Authority Work Queue ([frontend/src/app/government/work-queue/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/work-queue/page.tsx)):
    - Renamed to **Competent Authority Work Queue** with dynamic Concerned Authority badge and statutory scrutiny subtitle.
    - Table columns updated: *Application Ref*, *Permission / Approval*, *Applicant Entity*, *Specified Time Limit*, *Actions*.
    - Detail drawer updated: *Applicant Entity*, *Project / Investment Proposal*, *Concerned Department / Authority*, *Specified Time Limit Status*.
    - Actions aligned to official decision semantics: **Start / Resume Scrutiny**, **Raise Query / Seek Info**, **Schedule Site Inspection**, **Approve Permission**, **Reject Application (Record Decision)**.
    - Query modal updated with official MAITRI scrutiny guidance ("Under the Maharashtra Single Window clearance framework, queries must be raised promptly...").
  - Specified Time Limit Monitor ([frontend/src/app/government/sla-monitor/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/sla-monitor/page.tsx)):
    - Renamed with statutory time limit subtitle and prototype indicator.
  - Scrutiny & Performance Analytics ([frontend/src/app/government/analytics/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/analytics/page.tsx)):
    - Renamed with official KPI cards and time limit metrics.
  - Bottlenecks & Delays ([frontend/src/app/government/bottlenecks/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/bottlenecks/page.tsx)):
    - Renamed to **Process Bottlenecks & Delay Intelligence**.

- **5. Applicant-Side Screens & Admin Catalogue Alignment**:
  - Dashboard ([frontend/src/app/app/dashboard/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/dashboard/page.tsx)): Updated to *Permissions & Approvals*, *Recent Permission Applications*, *Investment proposal status*.
  - Permissions & Approvals ([frontend/src/app/app/approvals/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/approvals/page.tsx)): Renamed to **Permissions, Approvals & Registrations**, *Application Reference Number*, *Concerned Department / Authority*.
  - Dependency Map ([frontend/src/app/app/projects/[id]/dependency-graph/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/projects/[id]/dependency-graph/page.tsx)): Renamed to **Permissions & Approvals Dependency Map**.
  - Application Workspace ([frontend/src/app/app/applications/[id]/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/applications/[id]/page.tsx)): Formatted actor roles in timeline (`By {ev.actor.name} ({formatRole(ev.actor.role)})`), updated tooltips and copy.
  - Projects ([frontend/src/app/app/projects/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/projects/page.tsx)): Renamed to **Project / Investment Proposals** and industrial undertakings.
  - Compliance ([frontend/src/app/app/compliance/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/compliance/page.tsx)): Renamed to **Compliance & Renewals**.
  - Documents ([frontend/src/app/app/documents/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/documents/page.tsx)): Subtitle updated for permission applications.
  - Inspections ([frontend/src/app/app/inspections/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/inspections/page.tsx)): Subtitle and cards updated with Designated Inspection Officer context.
  - Settings ([frontend/src/app/app/settings/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/settings/page.tsx)): Profile role badge uses `formatRole`.
  - Admin Catalogue & Configuration pages ([approval-types](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/approval-types/page.tsx), [rules](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/rules/page.tsx), [dependencies](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/dependencies/page.tsx), [sla-policies](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/sla-policies/page.tsx), [audit-log](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/admin/audit-log/page.tsx)): Updated page titles, table columns, and formatted actor roles.

- **Phase 4 Verification & Test Results**:
  - **Full Backend Test Suite**: 39/39 tests passed across 8 suites (100% pass rate).
  - **Frontend Production Build**: `npm --prefix frontend run build` compiled successfully with zero errors across all 23 routes.
  - **Database Schema**: Zero schema migrations required; complete backward compatibility maintained.

## Phase 3 Core Application Workflows (COMPLETED ✅)
- **1. Application Detail / Workspace & Real Status Transitions**:
  - Created dedicated Application Workspace page at [frontend/src/app/app/applications/[id]/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/applications/[id]/page.tsx) with 6 interactive tabs: *Overview*, *Documents*, *Readiness Check*, *Queries*, *Site Inspection*, and *Timeline*.
  - Implemented real status transitions: `IN_PREPARATION` → `SUBMITTED` → `UNDER_REVIEW` → `QUERY_RAISED` → `APPROVED` via `PATCH /api/applications/:id/status`.
  - Automatically sets `submitted_at` on submission, sets `completed_at` and synchronizes linked `project_approval.status = 'COMPLETED'` on approval, updates `project_approval.status = 'IN_PROGRESS'` during active review, and records `ApplicationEvent` audit entries for every state transition.
  - Added `POST /api/applications` alias in backend router for project-level application creation.

- **2. Document Lifecycle: Upload, Reuse, Replacement, Verification & Expiry**:
  - Enhanced [backend/src/services/documentService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/documentService.ts) and [backend/src/routes/documents.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/documents.ts):
    - Added `replaceDocument(id, originalName, buffer, expiryDate)` (`POST /api/documents/:id/replace`) bumping version number (`v+1`), preserving audit history, and resetting verification status to `PENDING`.
    - Added `detachDocument(applicationId, documentId)` (`DELETE /api/applications/:id/documents/:docId`) to cleanly unlink documents.
    - Updated `uploadDocument` with project-level organization resolution and auto-attachment via `application_id`.
    - Synchronized document verification: officer action (`PATCH /api/documents/:id/verify`) cascades to update `ApplicationDocument.validation_status` (`VALID`, `INVALID`, `PENDING`).
  - Frontend Document Workspace & Vault:
    - [frontend/src/app/app/documents/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/documents/page.tsx): Added interactive modals for "Upload Document", "Replace Document", "Missing Documents" quick-upload, and "View Details & Reuse" drawer.
    - Application Workspace Documents Tab: Requirement checklist, "Attach from Vault" modal for instant reuse of approved documents, "Upload New" modal, "Replace" modal, and "Detach" action.

- **3. Pre-Submission Readiness Check & Submission Workflow**:
  - `POST /api/applications/:id/readiness-check` computes mandatory document completeness, checks validity (`VALID` vs `INVALID`/`PENDING`), detects expired files, and generates actionable blocking issues.
  - Application Workspace Readiness Check Tab: Real-time readiness gauge, breakdown of passed/failed rules, warning badges, direct "Fix Issue" shortcuts, and an unlocked "Submit Application" action once all blocking requirements are met.

- **4. Query Lifecycle: Officer Raises → Applicant Responds → Officer Closes**:
  - Officer-side: Government Work Queue ([frontend/src/app/government/work-queue/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/government/work-queue/page.tsx)) includes "Raise Query" modal (`POST /api/queries`) with priority and description; moves application to `QUERY_RAISED` and records audit event.
  - Applicant-side: Application Workspace Queries Tab displays the query thread, SLA badges, and applicant response form (`POST /api/queries/:id/respond`).
  - Officer Resolution: Officer marks query `RESOLVED` (`PATCH /api/queries/:id/resolve`).
  - Automatic Review Resumption: When the final open query is resolved, the backend automatically transitions the application status back to `UNDER_REVIEW` and logs an event.

- **5. "Next Best Action" / "Take Action" Deep-Link Integration**:
  - Backend [backend/src/services/projectService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/projectService.ts): Enriched `getControlCentre` to provide `next_best_action_link` targeting the exact pending workflow (`/app/applications/:id?tab=documents`, `/app/applications/:id?tab=queries`, etc.), and attached `application_id` to SLA alerts, pending queries, and upcoming inspections.
  - Applicant Dashboard ([frontend/src/app/app/dashboard/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/dashboard/page.tsx)): Wired the "Next Best Action" hero button to open the designated workflow. SLA alerts and pending query cards now link directly to the relevant application workspace tabs.
  - Approvals Page ([frontend/src/app/app/approvals/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/approvals/page.tsx)): Added "Open Application Workspace" button when an application exists, and "Start Application Workspace" when not started.

- **6. Application Timeline using Persisted Events**:
  - `GET /api/applications/:id/timeline` retrieves chronological persisted `ApplicationEvent` records.
  - Dedicated "Timeline & Audit Trail" tab in the Application Workspace renders icons, timestamps, actor roles, and stage transitions.

- **7. Applicant-Side Site Inspection Actions**:
  - Backend [backend/src/services/inspectionService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/inspectionService.ts): Added safe date parsing, applicant actions in `updateInspection` (`confirm_readiness` and `reschedule` setting status to `RESCHEDULED`), and added `updateFinding(findingId, actorId, data)` (`PATCH /api/inspections/findings/:findingId`).
  - Frontend [frontend/src/app/app/inspections/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/inspections/page.tsx) and Workspace Site Inspection Tab: Interactive "Confirm Site Readiness", "Request Reschedule" modal with proposed date/reason, and "Acknowledge Finding" buttons.

- **Phase 3 Verification & Test Results**:
  - **Phase 3 Integration Suite (`backend/src/tests/integration/phase3.integration.test.ts`)**: 7/7 tests passed against live Supabase data:
    1. Workspace structure verification (`GET /api/applications/:id`).
    2. Readiness check evaluation (`POST /api/applications/:id/readiness-check`).
    3. Chronological timeline retrieval (`GET /api/applications/:id/timeline`).
    4. Document lifecycle: upload, attach, replace (`POST /api/documents/:id/replace`), and detach (`DELETE /api/applications/:id/documents/:docId`).
    5. Query lifecycle: raise → respond → resolve with auto-transition back to `UNDER_REVIEW`.
    6. Applicant-side inspection actions: confirm readiness & request reschedule.
    7. Application submission & status transition: `SUBMITTED` setting `submitted_at` timestamp.
  - **Full Backend Test Suite**: 39/39 tests passed across 8 suites (100% pass rate).
  - **Frontend Production Build**: `npm --prefix frontend run build` passed with zero errors (all 23 routes compiled cleanly).
  - **Database Schema**: 0 changes required; all 22 existing Supabase tables and relations fully utilized and intact.

## Phase 2 Verification, Bug Fixes & Testing Suite (COMPLETED ✅)
- **Root Workspace `npm run dev` Script**:
  - Resolved `npm error Missing script: "dev"` by adding `concurrently` to the root workspace.
  - Configured root `package.json` scripts:
    - `"dev"`: Runs both backend (port 4000) and frontend (port 3000) concurrently with colored terminal tags.
    - `"test"`: Runs entire native test suite (`npm --prefix backend run test`).
    - `"test:unit"`: Runs unit tests only (`npm --prefix backend run test:unit`).
    - `"test:integration"`: Runs integration tests only (`npm --prefix backend run test:integration`).
- **Applicant Settings Route (`/app/settings`)**:
  - Created [frontend/src/app/app/settings/page.tsx](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/frontend/src/app/app/settings/page.tsx).
  - Implemented 4 cohesive tabs: Personal Profile, Organization Profile, Interactive Notification Toggles, and Security/System Status.
  - Resolved 404 error; route now loads cleanly with HTTP 200.
- **Government Work Queue & API Internal Server Errors**:
  - Diagnosed relation filtering in [backend/src/lib/supabaseDb.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/lib/supabaseDb.ts): nested relation filters (`project_approval`, `application`) were previously passed down to SQL root table columns.
  - Implemented in-memory relation condition evaluation and automatic dependency relation hydration in `supabaseDb.ts`.
  - Added timestamp parsing (`parseDates`) converting PostgreSQL ISO strings to `Date` instances for `.getTime()` calculations across all services (`analyticsService.ts`, `slaService.ts`, `complianceService.ts`).
  - Added missing `count` method to `ModelClient` to support `notificationService.count`.
  - Added null safety checks in `analyticsService.ts` for nested relations and date differences.
  - Fixed query parameter serialization in `frontend/src/lib/api.ts` (prevented `?status=undefined&priority=undefined` from being passed).
  - Added query parameter sanitization (`sanitizeParam`) in [backend/src/routes/government.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/routes/government.ts) and enum validation sets in [backend/src/services/analyticsService.ts](file:///c:/Users/naman/OneDrive/Desktop/SIH26_PS130/backend/src/services/analyticsService.ts) to reject invalid enum values before SQL execution.
  - Verified live:
    - `GET /api/government/work-queue` → 200 OK
    - `GET /api/government/work-queue?status=undefined&priority=undefined` → 200 OK
    - `GET /api/government/work-queue?status=SUBMITTED&priority=HIGH` → 200 OK
    - `GET /api/government/work-queue?status=UNDER_REVIEW` → 200 OK
    - `GET /api/government/analytics` → 200 OK
    - `GET /api/government/sla-monitor` → 200 OK
    - `GET /api/government/bottlenecks` → 200 OK
    - All `/app/*` and `/government/*` frontend routes verified returning 200 OK.
- **Unit & Integration Test Suite (32/32 Tests Passed - 100%)**:
  - Implemented lightweight, high-performance native test suite using Node's test runner (`tsx --test`).
  - **Unit Tests (`backend/src/tests/unit/` - 15/15 Passed)**:
    - `Regulatory Rule Engine`: Operator evaluation (`eq`, `num_gt`, `num_gte`, `num_lt`, `num_lte`, `in`, `contains`), multi-condition AND groups, deduplication, and warning generation.
    - `Approval Dependency & DAG Logic`: Prerequisite state evaluation (`canStartNow`), topological sorting without cycles.
    - `Database Adapter Matcher & Date Parsing`: In-memory relation matching, ISO-to-Date parsing, query filter sanitization.
    - `SLA Timeline & Status Engine`: Status computations (`ON_TRACK`, `AT_RISK` at <25% threshold, `BREACHED` days past due, `COMPLETED`).
  - **Integration Tests (`backend/src/tests/integration/` - 17/17 Passed)**:
    - `Auth Integration Tests`: Officer & entrepreneur login, 401 on bad credentials, bearer token validation on `GET /api/auth/me`, unauthenticated rejection.
    - `Government Work Queue & Analytics`: Unfiltered work-queue, query param edge cases (`?status=undefined&priority=undefined` regression test), multi-filter queries, analytics KPIs, SLA monitor timelines, bottleneck calculations.
    - `Projects & Clearances`: Project list, control-centre metrics, React Flow dependency graph serialization, project approvals, notifications and unread-count, application status transitions and audit event generation (`PATCH /api/applications/:id/status`).

## Completed

### Backend Architecture & Migration (Session 3)
- [B4] ✅ Removed Prisma (`@prisma/client`, `prisma` package uninstalled, `backend/prisma/` deleted).
- [B4] ✅ Installed `@supabase/server` & `@supabase/supabase-js`.
- [B4] ✅ Installed `supabase-server` agent skill (`.agents/skills/supabase-server`).
- [B4] ✅ Created Supabase client: `backend/src/lib/supabase.ts` with unmasked `SUPABASE_SECRET_KEY`.
- [B4] ✅ Created type-safe database adapter: `backend/src/lib/supabaseDb.ts` with relation hydration for all models.
- [B4] ✅ Added UUID auto-generation for all inserts (`crypto.randomUUID()`).
- [B4] ✅ Created `backend/src/types/database.ts` with all model interfaces and enum constants.
- [B4] ✅ Generated `backend/supabase_schema.sql` (18KB complete PostgreSQL DDL).
- [B4] ✅ Migrated seed script to `backend/src/seed.ts` (`npm run seed`), successfully seeded Supabase database.
- [B4] ✅ Backend production build verified (`npm run build` passes with zero errors).
- [B4] ✅ Tested live API endpoints:
  - `POST /api/auth/login` → Returns valid JWT and user profile
  - `GET /api/projects` → Returns project list with approvals
  - `GET /api/projects/:id/control-centre` → Returns full aggregated dashboard metrics

### Frontend (Session 2)
- [F0] ✅ Next.js shell configured: tailwind tokens, Inter font, globals.css, providers
- [F1] ✅ lib/api.ts - full typed API client with all endpoint helpers
- [F1] ✅ lib/auth-context.tsx - JWT auth with login/logout/me
- [F1] ✅ lib/utils.ts - formatDate, formatDateTime, formatCurrency, relativeTime, daysUntil, cn
- [F1] ✅ types/index.ts + types/api.ts - full type coverage matching backend shapes
- [F2] ✅ components/ui/StatusBadge.tsx - all status/priority variants
- [F2] ✅ components/ui/States.tsx - Skeleton, CardSkeleton, TableRowSkeleton, EmptyState, ErrorState
- [F3] ✅ app/page.tsx - root redirect by role
- [F3] ✅ app/login/page.tsx - split-pane login with demo quick-fill, password toggle
- [F4] ✅ Applicant layout (app/app/layout.tsx) - dark sidebar, notification badge, user avatar
- [F5] ✅ app/app/dashboard/page.tsx - control-centre API, 4 stat cards, readiness bar, deadlines, incentives
- [F5] ✅ app/app/approvals/page.tsx - status filter tabs, split-pane, 10-question detail panel
- [F5] ✅ app/app/projects/page.tsx - project cards with sector/investment/employees
- [F5] ✅ app/app/projects/[id]/dependency-graph/page.tsx - React Flow, auto-layout, custom nodes
- [F5] ✅ app/app/documents/page.tsx - vault table, missing docs panel, expiry alerts, reuse count
- [F5] ✅ app/app/compliance/page.tsx - urgency-coded cards, days remaining
- [F5] ✅ app/app/inspections/page.tsx - upcoming/past inspections, findings display
- [F5] ✅ app/app/notifications/page.tsx - mark read/all-read, type-color-coded
- [F6] ✅ Government layout (app/government/layout.tsx) - blue accent sidebar
- [F6] ✅ app/government/work-queue/page.tsx - filters, table, action panel (update status)
- [F6] ✅ app/government/sla-monitor/page.tsx - breach/risk/on-track stats, full table
- [F6] ✅ app/government/analytics/page.tsx - Recharts bar+pie charts, KPI cards, bottleneck bars
- [F6] ✅ app/government/bottlenecks/page.tsx - ranked bottleneck cards
- [F7] ✅ Admin layout (app/admin/layout.tsx) - purple accent sidebar
- [F7] ✅ app/admin/approval-types/page.tsx - full table with SLA/renewal/inspection cols
- [F7] ✅ app/admin/rules/page.tsx - applicability rules table
- [F7] ✅ app/admin/dependencies/page.tsx - prerequisite/dependent chain table
- [F7] ✅ app/admin/sla-policies/page.tsx - duration/start_event/escalation table
- [F7] ✅ app/admin/incentive-schemes/page.tsx - scheme cards with benefit description
- [F7] ✅ app/admin/audit-log/page.tsx - filterable audit table
- [F8] ✅ frontend/.env.local - NEXT_PUBLIC_API_URL=http://localhost:4000/api
- [F8] ✅ frontend TypeScript: ZERO ERRORS (npx tsc --noEmit passes)

## Implementation Status — Phases 0 through 10 (COMPLETED ✅)
- **Phase 0 (Setup & Architecture)**: COMPLETED ✅ — REST architecture, Supabase PostgreSQL, JWT auth, seed data.
- **Phase 1 (Project Wizard & Registration)**: COMPLETED ✅ — 5-step investment proposal wizard, attributes, project control centre.
- **Phase 2 (Regulatory Rule Engine & Approvals Roadmap)**: COMPLETED ✅ — JSON-driven rule evaluation, explainability, DAG dependency graph.
- **Phase 3 (Core Application Workflows)**: COMPLETED ✅ — Workspaces, pre-submission readiness validation, queries, document vault, timeline, site inspections.
- **Phase 4 & 5 (Government Terminology & Scrutiny Alignment)**: COMPLETED ✅ — Single-window vocabulary, department-aware scrutiny, MPCB within shared shell, Nodal Agency facilitation.
- **Phase 6 (Specified Time Limits, Notifications & Controlled Escalation)**: COMPLETED ✅ — MAITRI Rules 2025 timelines, role-aware notifications, Section 10 Empowered Committee escalations.
- **Phase 7 (Compliance, Renewals, Incentives & Investor Support)**: COMPLETED ✅ — Post-approval compliance & renewals calendar, automated periodic scheduling, scheme discovery.
- **Phase 8 (System Administration & Master Data)**: COMPLETED ✅ — Catalogues CRUD, active rule toggles, dependency chains, time limit policies, audit trail diffs.
- **Phase 9 (Analytics & Process Bottlenecks)**: COMPLETED ✅ — Department performance, query turnaround, inspection delays, defect severity, delay origin attribution.
- **Phase 10 (Reliability, Security Authorization, Accessibility & UX Hardening)**: COMPLETED ✅ — Strict RBAC guards across all endpoints, simulated integration tags, context badges, accessible states, BHASHINI architectural seam.
- **Backend Test Suite**: 83/83 tests passing across all 14 test suites (100% pass rate).
- **Frontend Production Build**: All 24 routes compiled cleanly with zero errors (`npm --prefix frontend run build`).

## Next Tasks (Phase 11 — Final Integration & Demonstration)
- [ ] End-to-end demonstration verification across all official user journeys (Applicant/Investor, Competent Authority Officer MIDC & MPCB, MAITRI Nodal Officer, Designated Inspection Officer, System Administrator).
- [ ] Demonstration walkthrough validation per IMPLEMENTATION_PLAN.md §9 storyline.

## File Structure (backend/src)
```
src/
  adapters/                     # GovernmentIntegrationAdapter, StorageAdapter
  lib/
    errors.ts                   # Standardized HTTP error classes
    jwt.ts                      # JWT signing and verification
    supabase.ts                 # Supabase client using SUPABASE_SECRET_KEY
    supabaseDb.ts               # Type-safe Supabase ORM/query adapter
    prisma.ts                   # DB export bridge (re-exports supabaseDb)
  middleware/
    auth.ts                     # requireAuth middleware
    roleGuard.ts                # requireRole guard
    auditLogger.ts              # Audit middleware
    errorHandler.ts             # Central Express error handler
  routes/
    admin.ts                    # Admin catalog CRUD routes
    applications.ts             # Application lifecycle routes
    approvalTypes.ts            # Approval types catalog
    auth.ts                     # Login & /me routes
    compliance.ts               # Compliance calendar routes
    documents.ts                # Document vault & reuse routes
    government.ts               # Work queue, SLA monitor, analytics routes
    incentives.ts               # Incentive match routes
    inspections.ts              # Inspection routes
    notifications.ts            # Notification routes
    projectApprovals.ts         # Project approval checklist routes
    projects.ts                 # Project CRUD & control-centre routes
    queries.ts                  # Query & response routes
    sla.ts                      # SLA evaluation routes
    index.ts                    # Main router
  rule-engine/
    evaluate.ts                 # Declarative condition evaluator
    types.ts                    # Rule engine types
  services/                     # 16 domain business logic services
  types/
    database.ts                 # All database models and enum types
    express.d.ts                # Express User request typing
  app.ts                        # Express app setup with CORS and routes
  index.ts                      # Server entry point
  seed.ts                       # Complete database seeding script
```

## Demo Accounts (password: Demo@123)
| Email | Role | Landing page |
|---|---|---|
| entrepreneur@demo.local | ENTREPRENEUR | /app/dashboard |
| manager@demo.local | MANAGER | /app/dashboard |
| officer@demo.local | OFFICER | /government/work-queue |
| pcb.officer@demo.local | OFFICER | /government/work-queue |
| nodal@demo.local | NODAL | /government/work-queue |
| inspector@demo.local | INSPECTOR | /government/work-queue |
| admin@demo.local | ADMIN | /admin/approval-types |

## Database Status
- Connection: ✅ Connected (Supabase HTTPS REST API via `@supabase/supabase-js`)
- Schema: ✅ Applied (`backend/supabase_schema.sql`)
- Seed: ✅ Complete (`npm run seed`)
- Prisma: ❌ Removed (zero dependencies on `@prisma/client` or `prisma`)

## TypeScript Status
- Backend: ✅ Zero errors (`npx tsc --noEmit` passes)
- Frontend: ✅ Zero errors (`npx tsc --noEmit` passes)
