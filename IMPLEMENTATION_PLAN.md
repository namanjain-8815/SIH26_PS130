# Implementation Plan — Industrial Approval & Compliance Intelligence Platform
SIH 2026 · Problem Statement 26130 · Govt. of Maharashtra

## Build status
Phases 0–3 are **built and running**. Do not re-implement, re-scope, or edit
their completed implementation work. Phases 0–3 below are kept as the
historical implementation contract; continue new work from **Phase 4** onward.

## 1. Product in one line
Turn a project's business profile into a personalized, dependency-aware approval
roadmap; guide document prep, pre-validate submissions, track applications,
queries, inspections, SLAs, bottlenecks, incentives and renewals — from one
project-centric workspace, for both applicants and government officers.


## Change log — Government terminology personalization (post-Phase-3)

**What changed:** future implementation phases now use Maharashtra/MAITRI-aligned terminology and role semantics.
**What did not change:** the core product scope, Phase 0–3 implementation, tech stack, REST architecture, shared government UI,
22-table database strategy, and existing Phase-3 workflows remain intact.

**Strictly necessary changes above the Phase 3 implementation details:** only three minimal contract clarifications were made:
1. the build status now marks **Phase 3 as complete** (matching the current verified progress);
2. the MVP role description now documents an explicit display-role mapping while retaining the existing internal role enum values; and
3. the database policy explicitly says that label personalization alone must not trigger a role-enum migration.
No Phase-0/1/2/3 workflow or feature was re-scoped.

## 2. MVP scope — build ONLY this
One seeded demo project: **ABC Foods Pvt Ltd**, food processing, Pune (MIDC),
₹25 Cr investment, 80 employees, Maharashtra jurisdiction.

Roles with real dashboards remain the same underlying implementation scope, but
visible role terminology must align with the Maharashtra single-window vocabulary:
**Applicant / Investor, Authorized Representative, Competent Authority Officer,
MAITRI Nodal Officer, Designated Inspection Officer, and System Administrator.**
The existing internal enum values (`ENTREPRENEUR`, `MANAGER`, `OFFICER`, `NODAL`,
`INSPECTOR`, `ADMIN`) are retained for compatibility unless a later phase proves
a database migration is genuinely necessary. PCB/MPCB personnel are represented as
**Competent Authority Officers** whose concerned department/authority is displayed
as **Maharashtra Pollution Control Board (MPCB)**. Keep the shared government shell;
do not create separate department UIs.


### 2A. Official terminology and role mapping — POST-Phase-3 alignment
This is a **terminology, presentation, and permission-model alignment**, not a
rebuild of the product. Use the following mapping for all new work and gradually
replace visible legacy labels in existing screens during Phases 4–5.

| Current internal role/code | User-facing role label | Authority meaning / scope |
|---|---|---|
| `ENTREPRENEUR` | **Applicant / Investor** | The entrepreneur or investor submitting an application for a permission/approval through the Single Window System. |
| `MANAGER` | **Authorized Representative** | A person duly authorised by the entrepreneur/investor to act on the applicant's behalf. |
| `OFFICER` | **Competent Authority Officer** | Officer/authority processing an application for the concerned Department/agency and taking the decision under the relevant law. |
| `NODAL` | **MAITRI Nodal Officer** | MAITRI/Nodal Agency coordination role for monitoring, inter-department coordination, investor assistance, and unresolved-query escalation. |
| `INSPECTOR` | **Designated Inspection Officer** | Operational inspection role for assigned site inspections/findings. This is a project implementation label, not a generic statutory MAITRI role. |
| `ADMIN` | **System Administrator** | Technical/configuration role for the platform; not a statutory approval authority. |

**Authority relationship that the UI must communicate:**
`Applicant / Investor → Single Window System → Concerned Department / Competent Authority`.
MAITRI is the **Nodal Agency** for Maharashtra's Single Window System and should
appear as a coordination/facilitation layer rather than as the approving authority
for every permission.

**Do not expose these legacy labels in visible UI:** `ENTREPRENEUR`, `MANAGER`,
`OFFICER`, `NODAL`, `INSPECTOR`, `ADMIN`, `Govt Officer`, or `PCB Officer`.
Keep the codes internally where changing them would risk breaking Phase-3 behavior.

P0 checklist (nothing else):
- [ ] JWT auth + role-based routing
- [ ] Org/Project creation wizard (5 steps)
- [ ] Regulatory rule engine (data-driven JSON rules, not hardcoded logic)
- [ ] Personalized approval roadmap + "why is this required"
- [ ] Approval dependency graph (React Flow) + "can start now" / parallel view
- [ ] Document vault + reuse across applications
- [ ] Pre-submission readiness validation (ready / not ready + reasons)
- [ ] Application workspace (overview/documents/timeline/queries/inspection tabs)
- [ ] Query management (officer raises → applicant responds → officer closes)
- [ ] SLA tracker ("configured SLA" language, never "legally guaranteed")
- [ ] Project Control Centre dashboard (readiness %, blockers, next-best-action)
- [ ] Government work queue + officer actions
- [ ] Bottleneck analytics computed from real stored events (not fake charts)
- [ ] Inspection scheduling (list view)
- [ ] Incentive discovery ("potentially applicable", never "guaranteed")
- [ ] Renewal/compliance tracker
- [ ] Admin CRUD: approval catalog, rules, dependencies, SLA policies, incentives
- [ ] Audit log
- [ ] Seed data powering every number on every screen

**Explicitly out of scope:** OCR/AI document extraction, real government API
integration, multilingual UI, mobile app, grievance/escalation module,
rule-versioning UI (keep only `effective_from/effective_to` fields), any
blockchain/microservices/k8s.

## 3. Tech stack (fixed — do not substitute)
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
  + React Flow (dependency graph) + Recharts (charts) + React Hook Form + Zod
  + TanStack Query (server state)
- **Backend:** Node.js + Express + TypeScript + @supabase/supabase-js + @supabase/server
- **Database:** Supabase PostgreSQL
- **Auth:** JWT + bcrypt, custom Express middleware (no external auth provider needed)
- **Storage:** local disk behind a `StorageAdapter` interface (swap for S3/Supabase Storage later)
- **Repo:** one monorepo, `/frontend` and `/backend`, this file is the shared contract

## 4. Architecture
```
Next.js (:3000)  --REST-->  Express API (:4000)  -->  Supabase Client  -->  PostgreSQL
```
No business logic in React components. No business logic in Express route
handlers — routes call services only.

Backend service modules (one file each, keep these exact names):
`authService, projectService, regulatoryService, approvalService,
dependencyService, documentService, applicationService, queryService,
inspectionService, slaService, incentiveService, complianceService,
notificationService, analyticsService, auditService`

All "talk to a department" calls go through a `GovernmentIntegrationAdapter`
interface with one implementation, `MockGovernmentAdapter`. Label anything it
returns as **"Simulated integration"** in the UI — never imply a live government
connection.

## 5. Data model (MVP-trimmed: 22 tables, not 30+)
Dropped from the full spec for MVP: `Establishment` (fold address into
`Project`), `RegulationVersion` (use `effective_from/to` on the rule row
instead), `Grievance`, `Escalation`.

### 5A. Database evolution policy
The schema in §5 is the **initial MVP schema**, not a guarantee that it will
never change. Upcoming phases may add columns, tables, indexes, views, or
policies when a feature genuinely requires them.

- Do not manually redesign the schema in the Supabase dashboard as the normal
  development workflow.
- Before any schema change, inspect and reuse existing tables and relations.
- Apply genuine changes through versioned SQL migrations such as
  `supabase/migrations/*.sql`.
- Update the backend service/query layer in the same milestone as each schema
  migration.
- The frontend must use the backend API and must not connect directly to
  Supabase.
- Keep database structure and migrations in the repository as the source of
  truth.
- **Role-label personalization does not justify renaming the existing `Role` enum.**
  Prefer a centralized presentation mapping and department-aware rendering. Add a
  `designation`/equivalent database field only if a later phase genuinely requires
  storing a verified government designation; otherwise do not expand the schema.


## 6. Implementation sequence

Build the product incrementally from the current repository state. Keep the
API contract, database schema, service boundaries, and UI patterns consistent
across all phases. Complete and verify each phase before moving to the next.

### Phase 0 — Foundation — ✅ COMPLETE (built & running — do not modify)
- Confirm the monorepo structure and environment variables.
- Define/apply the initial Supabase database schema.
- Seed the ABC Foods demo data and regulatory rule data.
- Verify API boot, database access, and the initial API contract.

### Phase 1 — Backend foundation — ✅ COMPLETE (built & running — do not modify)
- JWT authentication and role-based authorization.
- Project and organization management.
- Data-driven regulatory analysis.
- Approval roadmap and dependency logic.
- Document vault and application foundation.
- Queries, inspections, SLA, incentives, compliance, analytics,
  notifications, and audit services.
- Government integration through `GovernmentIntegrationAdapter` with only
  `MockGovernmentAdapter`.

### Phase 2 — Frontend integration — ✅ COMPLETE (built & running — do not modify)
- Build applicant, government, PCB officer, and admin interfaces against the
  backend API.
- Replace development fixtures with real API calls.
- Verify authentication, navigation, dashboard data, and core API flows.
- Verify the frontend, Express API, and Supabase database work together.
- Close integration defects before declaring Phase 2 complete.

### Phase 3 — Core application workflows — ✅ COMPLETE (verified; do not re-implement)
**Status source:** current project progress records all seven Phase-3 workflows as implemented and verified; do not rebuild them merely to change labels.

- Application detail and status transitions.
- Document upload, reuse, replacement, verification, and expiry.
- Readiness check → correction → re-check → submission.
- Query lifecycle: officer raises → applicant responds → officer closes.
- Next-best-action controls must open real workflows.
- Application timeline and applicant-side inspection actions.

### Phase 4 — Official terminology alignment + regulatory intelligence
**Goal:** personalize the existing product vocabulary and improve explainability
without changing the product's core workflow.

**4A — UI and role terminology alignment**
- Add one centralized role-display mapping used by applicant, government, and admin UIs.
- Render `ENTREPRENEUR` as **Applicant / Investor**.
- Render `MANAGER` as **Authorized Representative**.
- Render `OFFICER` as **Competent Authority Officer**.
- Render `NODAL` as **MAITRI Nodal Officer**.
- Render `INSPECTOR` as **Designated Inspection Officer**.
- Render `ADMIN` as **System Administrator**.
- For department-bound officers, display the department/authority name directly below
  the role, e.g. **Competent Authority Officer · Maharashtra Pollution Control Board (MPCB)**.
- Replace visible `Department` field labels with **Concerned Department / Authority**
  where the value can be a department, local authority, state-owned corporation, utility,
  or other authority.
- Replace visible `Approval Type` with **Permission / Approval Type** where appropriate.
- Replace **Approvals & Licences** with **Permissions, Approvals & Registrations**.
- Replace **Approval Roadmap** with **Permissions & Approvals Roadmap**.
- Replace **Approval Dependencies** with **Permission Dependencies**.
- Replace **Government Work Queue** with **Competent Authority Work Queue**.
- Replace **Officer Actions** with **Application Processing Actions** or **Competent Authority Actions**.
- Replace generic `Authority` display with **Issuing Department / Competent Authority**.
- Prefer **Application Reference Number** over informal identifiers in user-facing copy.

**4B — Official business vocabulary**
- Use **Industrial Undertaking** when referring to the regulated business/entity context.
- Use **Investment Proposal** or **Project / Investment Proposal** for the existing Project concept;
  do not rename the database table/API merely for presentation.
- Use **Permission** as the umbrella UI term because the MAITRI Act defines permission broadly to
  include approval, NOC, clearance, allotment, consent, registration, enrolment, licence, and similar items.
- Keep `SLA` as an internal technical/data concept, but user-facing Maharashtra terminology should be
  **Specified Time Limit** for statutory processing and **Configured Service Timeline** for demo/configuration language.
- Keep **Query** as the official workflow term; use **Clarification / Query** in applicant-facing helper text.
- Use **Scrutiny & Decision** for the government review stage where that wording fits the screen.
- Do not label a timeline as legally guaranteed unless an authoritative source is actually integrated.

**4C — Regulatory intelligence**
- Project profile → applicable permissions/approvals.
- Explainable applicability reasons.
- Conditional document requirements.
- Approval/permission prerequisites, downstream effects, and parallel work.
- Rule-driven specified-time-limit, inspection, and compliance requirements.
- Keep all rules/data clearly marked as **demonstration/configurable data** unless backed by an
  authoritative integrated source.

### Phase 5 — Government processing with authority-aware permissions
**Goal:** align workflow behavior with the MAITRI Act/Rules distinction between the applicant,
concerned Department/Competent Authority, and MAITRI/Nodal Agency.

- Competent Authority Officer sees and acts on applications assigned to the concerned Department/authority.
- Competent Authority Officer actions must center on **scrutiny, requesting additional information,
  taking a decision, and recording reasons**.
- Replace the generic `Send Back for Revision` government action with **Raise Query / Seek Additional Information**
  when the reason is missing or additional information is required.
- Keep the applicant response path as **Respond to Query / Submit Clarification**.
- Preserve **Approve** and **Reject Application** actions, but present them as a decision taken by the
  concerned Competent Authority rather than by the generic “government” role.
- Do not allow a MAITRI Nodal Officer to appear to grant every permission. Nodal role should emphasize
  monitoring, coordination, investor facilitation, unresolved-query handling, and escalation/transfer workflows.
- Department-aware filtering must be visible and understandable: **Concerned Department / Authority**.
- PCB/MPCB work remains within the shared government shell but should read **MPCB Competent Authority Officer**
  (or the department-aware equivalent), not “PCB Officer”.
- Inspection assignment remains available to the **Designated Inspection Officer**. Do not grant that role generic
  approval-decision powers unless a concrete departmental configuration explicitly requires it.
- Preserve the existing shared government UI; personalize terminology rather than creating six portals.

### Phase 6 — Specified time limits, notifications, and controlled escalation
- Show **Specified Time Limit** when the data is intended to represent the statutory MAITRI processing timeline.
- Show **Configured Service Timeline** where the value is demonstration/configuration data.
- Keep the current stored-event SLA engine; only change labels and explanatory copy.
- Compute elapsed time from the relevant application receipt/submission event according to the existing model;
  do not silently change the Phase-3 timeline logic.
- Add role-aware notifications for assignments, queries, document issues, inspections, decisions, renewals,
  and approaching time limits.
- Where the escalation feature is expanded, use official escalation vocabulary:
  **Nodal Agency → Empowered Committee** for eligible delayed applications, rather than inventing a generic
  “manager escalation” hierarchy.
- Keep the full grievance module out of scope unless explicitly added; the official MAITRI framework does have
  grievance-related functions, but the product scope remains unchanged for now.

### Phase 7 — Compliance, renewals, incentives, and investor support
- Rename user-facing **Compliance Calendar** to **Compliance & Renewals** or **Post-Approval Compliance & Renewals**.
- Keep renewal reminders and due-date tracking.
- Present incentive discovery as **Potentially Applicable Incentives / Schemes** with eligibility reasons.
- Prefer **Government Scheme / Incentive Scheme** wording where the data represents a scheme rather than an approval.
- Keep the existing disclaimer: no guaranteed benefit language.
- Preserve the one-project demo; enrich only the vocabulary and source metadata.

### Phase 8 — System administration and master data
- Rename the admin-facing role to **System Administrator**.
- Rename **Approval Types** to **Permissions / Approvals Catalogue**.
- Rename **Applicability Rules** to **Applicability & Eligibility Rules** where appropriate.
- Rename **SLA Policies** to **Specified Time Limit Policies** for the visible admin menu, while keeping internal code names.
- Keep the existing config-driven model so changes affect application behavior without frontend redeploy.
- Maintain authority metadata fields for Department/Authority, service/permission, jurisdiction, and configurable source.
- Do not add government committee accounts as ordinary approval roles merely because they exist in the Act/Rules.
  The Empowered Committee and Supervisory Committee should remain escalation/oversight entities unless the product scope is later expanded.

### Phase 9 — Analytics and bottlenecks
- Preserve real stored-event analytics.
- Government charts should use labels such as **Applications by Concerned Department / Authority**,
  **Specified Time Limit Status**, **Query Resolution Time**, and **Inspection Delays**.
- Add MAITRI/Nodal monitoring views only for information the Nodal Agency role is permitted to see.
- Distinguish applicant-caused waiting periods from Department/Competent Authority processing periods when the data model supports it.
- Avoid presenting analytics as an official government dashboard; keep a visible **Prototype / Demonstration Data** indicator.

### Phase 10 — Reliability, security, accessibility, and government UX hardening
- Complete loading, empty, error, and permission-denied states.
- Ensure no raw internal role codes are visible anywhere in production UI.
- Add an explicit department/authority context badge on government screens.
- Ensure every government action is backed by authorization checks, not only frontend visibility.
- Keep the interface accessible and compatible with screen-reader and keyboard use.
- Keep Bhashini out of the active build; preserve a future integration seam only. Do not add a fake translation
  service or pretend that multilingual functionality is already integrated.
- Keep all external-government integration paths behind the existing adapter and label them **Simulated integration**.
- Never use MAITRI's official branding, seal, or wording in a way that implies this prototype is an official government portal.
  The product may state **“Maharashtra Industrial Approvals — Prototype”** or keep the existing product brand with a clear
  **Prototype / Demonstration** label.

### Phase 11 — Final integration and SIH demo
- Demo the applicant journey using **Applicant / Investor** terminology.
- Demo the authorized-person journey only where needed; do not show “Manager” in the UI.
- Demo the concerned Department workflow as **Competent Authority Officer**.
- Demo MPCB as **MPCB Competent Authority Officer** within the shared government portal.
- Demo MAITRI coordination as **MAITRI Nodal Officer** without implying it is the final approving authority for every permission.
- Demo inspections as **Designated Inspection Officer**.
- Demo configuration as **System Administrator**.
- Close on the actual differentiation already present: personalized roadmap + permission dependencies + explainability +
  document readiness + lifecycle tracking + department-aware processing + bottleneck intelligence.

## 7. API contract — freeze before Phase 1

### API compatibility rule for terminology personalization
- **Do not rename existing REST endpoints only to match new government labels.** The internal API contract may continue to use
  `/approval-types`, `project_approvals`, `department_id`, and the existing role enum values while the UI uses the official labels above.
- Prefer presentation-layer mappings over breaking API changes.
- If an API response needs a human-readable government label later, add an additive field such as `role_display_name` or
  `department_display_name` rather than replacing the existing code value.

**Auth**
| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/login | issue JWT |
| GET | /api/auth/me | current user |

**Projects**
| Method | Path | Purpose |
|---|---|---|
| GET/POST | /api/projects | list / create |
| GET/PATCH | /api/projects/:id | read / update |
| POST | /api/projects/:id/attributes | save wizard step 4 attributes |
| POST | /api/projects/:id/regulatory-analysis | run rule engine → creates ProjectApproval rows, returns roadmap |
| GET | /api/projects/:id/control-centre | aggregated dashboard payload |
| GET | /api/projects/:id/dependency-graph | graph nodes/edges |

**Approvals & documents**
| Method | Path | Purpose |
|---|---|---|
| GET | /api/approval-types(/:id) | catalog |
| GET | /api/projects/:id/approvals | project's approvals |
| GET | /api/project-approvals/:id | single approval detail (the 10-question view) |
| GET/POST | /api/projects/:id/documents | vault |
| PATCH | /api/documents/:id | verify / replace / expire |
| POST | /api/applications/:id/readiness-check | pre-submission validation |

**Applications, queries, inspections**
| Method | Path | Purpose |
|---|---|---|
| GET/POST | /api/projects/:id/applications | list / create from project_approval_id |
| GET | /api/applications/:id | + PATCH /status, GET /timeline |
| GET/POST | /api/applications/:id/queries | + POST /api/queries/:id/respond, PATCH /status |
| GET/POST | /api/projects/:id/inspections | applicant view; `GET /api/inspections?inspector_id=` for officer; PATCH for status/findings |

**SLA, incentives, compliance**
| Method | Path | Purpose |
|---|---|---|
| GET | /api/projects/:id/sla-status | |
| GET | /api/government/sla-monitor | |
| GET | /api/projects/:id/incentives | |
| GET | /api/projects/:id/compliance | renewals + periodic compliance |

**Government & admin**
| Method | Path | Purpose |
|---|---|---|
| GET | /api/government/work-queue | filterable table feed |
| GET | /api/government/bottlenecks | /analytics |
| CRUD | /api/admin/approval-types, /rules, /dependencies, /sla-policies, /incentive-schemes | config-driven regulatory engine |
| GET | /api/admin/audit-log | |
| GET/PATCH | /api/notifications | |

## 8. UI direction (a reference dashboard image is provided separately)
- Fixed dark left sidebar (~240px): logo, icon+label nav, active item highlighted, user/role chip pinned at bottom
- Top bar: search, notification bell, avatar + role dropdown
- Content area: light gray background, white cards, `rounded-2xl`, soft shadow, generous padding
- Two soft accent colors for highlight cards only (e.g. mint-green for "on track", lavender for informational) — used sparingly
- Status is always a labeled badge (green=completed, amber=in progress/at risk, red=blocked/breached, gray=not started) — never color alone
- Applicant views: card-based summaries. Government/admin views: dense filterable tables.
- One clean sans-serif typeface, clear size hierarchy
- No gradients, no glassmorphism, no neon, no sci-fi/crypto styling — this should look adoptable by an actual government department
- **Homepage must communicate what the product does and who it's for within a few seconds, no scrolling** — one-line pitch + 4-step flow + a visual mock of the Project Control Centre, right at the top
- Mobile: sidebar collapses, cards stack, tables scroll horizontally

- Government header role label: **Competent Authority Officer**, **MAITRI Nodal Officer**, **Designated Inspection Officer**,
  or **System Administrator**, depending on the authenticated role.
- Applicant header role label: **Applicant / Investor** or **Authorized Representative**.
- Department context on government pages: **Concerned Department / Authority**.
- Keep a small **Prototype / Demonstration Data** indicator so the interface is not mistaken for a live government portal.

## 9. Demo storyline (~6–8 min)
1. Login as **Applicant / Investor** → Project / Investment Proposal Control Centre (ABC Foods): readiness %, permissions breakdown, action required, configured service timeline alert, bottleneck, next-best-action.
2. Permissions & Approvals Roadmap → dependency graph, parallel workflows, “can start now”.
3. Open one permission → “Why is this required?” with an explainable rule reason.
4. Documents → reused document, missing document, expiring document.
5. Run readiness check → “Not ready” → fix → re-run → “Ready”.
6. Open application → application reference, timeline, **Clarification / Query** raised → respond.
7. Inspections → scheduled site inspection with designated inspection officer context.
8. Compliance & Renewals → upcoming renewal.
9. Incentives / Schemes → potentially applicable matches.
10. Switch to **Competent Authority Officer (MIDC)** → department-aware work queue, specified-time-limit status, scrutiny, raise query, decision.
11. Switch to **MPCB Competent Authority Officer** → show only MPCB-related application context in the same government shell.
12. Switch to **MAITRI Nodal Officer** → cross-department monitoring/coordination view; demonstrate that the role coordinates rather than impersonating every approving authority.
13. Switch to **System Administrator** → edit a rule / specified-time-limit policy / dependency via config UI → show applicant-side behavior changes without redeploy.
14. Bottleneck/analytics view from real stored events.
15. Close on differentiation: personalized permissions roadmap + dependencies + explainability + readiness + department-aware processing + bottleneck intelligence + compliance lifecycle, all configuration-driven.


## 10. Official reference basis for terminology and personalization

The terminology in Phases 4–11 is grounded primarily in the Government of Maharashtra's
MAITRI legal and institutional sources, with NSWS used as a national single-window vocabulary
reference and Bhashini/data.gov.in treated as integration/reference inputs rather than role authorities.

### Government of Maharashtra / MAITRI — authoritative vocabulary
- **Maharashtra Industry, Trade and Investment Facilitation Act, 2023:** defines “Competent Authority”,
  “entrepreneur”, “investor”, “permission”, “Nodal Agency”, and the Single Window System; it also sets the
  relationship in which the Competent Authority processes the application and the Nodal Agency can transfer
  delayed eligible applications to the Empowered Committee.
- **Maharashtra Industry, Trade and Investment Facilitation Rules, 2025:** uses the terms entrepreneur, investor,
  duly authorised person, Department, Competent Authority, Nodal Agency, specified time limit, query, and application;
  applications are forwarded to the Competent Authority and additional information is sought through queries.
- **Current Industries, Investment and Services Department MAITRI page:** describes MAITRI as the Government of
  Maharashtra's single-window investment facilitation agency and highlights investor support, departmental coordination,
  incentives, aftercare, and application facilitation.

### NSWS — national reference vocabulary
Use NSWS as a secondary vocabulary reference for terms such as **Business User**, **Ministry Officer**, Know Your Approvals,
applications, document repository, tracking, and renewals. Do not copy its central-government role names into the Maharashtra
role model when the Maharashtra Act/Rules provide a more specific state vocabulary.

### BHASHINI — future language layer only
BHASHINI is a Government of India language technology/translation platform. It supports multilingual access to digital services,
but it does **not** define the government approval-role vocabulary for this application. Keep multilingual functionality out of
scope for the current build and only preserve a future integration seam.

### data.gov.in — reference/master-data source only
The Open Government Data Platform India provides government-owned shareable datasets and APIs. It can be used later for
non-authoritative reference/master data such as district or infrastructure datasets, but it is not the source of truth for
statutory approval rules or official user roles. Regulatory rules in this project remain explicitly configuration/demo data
until an authoritative source is integrated.

### Important prototype boundary
This project is a solution/prototype for SIH and must not present itself as the official MAITRI portal or claim live integration
with Maharashtra government systems unless such integration is actually implemented and authorized. External-government calls
remain behind the existing adapter and must be labeled **Simulated integration**.

## 11. Definition of done

The product is complete only when all of the following are true:

- Frontend and backend boot cleanly using the documented local setup.
- Database initialization/migrations and seed work from a clean Supabase
  database.
- Every P0 requirement in §2 is implemented with real persisted data.
- The demo storyline in §9 runs end-to-end without critical API or console
  errors.
- Applicant / Investor, Authorized Representative (where enabled), Competent Authority Officer, MPCB Competent Authority Officer,
  MAITRI Nodal Officer, Designated Inspection Officer, and System Administrator journeys work within the existing shared shells;
  department-aware data and permissions are enforced by backend authorization.
- Implemented workflow controls lead to real pages and state-changing API
  operations rather than dead links.
- Frontend has no direct Supabase database access.
- Regulatory outputs are explainable and data-driven.
- Government analytics and bottlenecks are computed from stored data/events,
  not fabricated static numbers.
- Any schema extension is represented by a versioned SQL migration in the
  repository.
