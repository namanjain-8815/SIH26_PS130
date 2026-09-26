# Implementation Plan — Industrial Approval & Compliance Intelligence Platform
SIH 2026 · Problem Statement 26130 · Govt. of Maharashtra

## Build status
Phases 0–2 are **built and running**. Do not re-implement, re-scope, or edit
their content in §6 below — that text is kept as a historical record of what
was built, not a to-do list. Continue the build from **Phase 3** onward.

## 1. Product in one line
Turn a project's business profile into a personalized, dependency-aware approval
roadmap; guide document prep, pre-validate submissions, track applications,
queries, inspections, SLAs, bottlenecks, incentives and renewals — from one
project-centric workspace, for both applicants and government officers.

## 2. MVP scope — build ONLY this
One seeded demo project: **ABC Foods Pvt Ltd**, food processing, Pune (MIDC),
₹25 Cr investment, 80 employees, Maharashtra jurisdiction.

Roles with real dashboards: **Entrepreneur, Government Officer, PCB Officer,
Admin.** PCB Officer reuses the Government portal shell with department-aware
data and permissions. Manager/Nodal/Inspector may reuse shared views; do not
build six separate UIs.

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

### Phase 3 — Core application workflows — ⬜ NEXT (start here)
- Application detail and status transitions.
- Document upload, reuse, replacement, verification, and expiry.
- Readiness check → correction → re-check → submission.
- Query lifecycle: officer raises → applicant responds → officer closes.
- Next-best-action controls must open real workflows.
- Application timeline and applicant-side inspection actions.

### Phase 4 — Regulatory intelligence
- Project profile → applicable approvals.
- Explainable applicability reasons.
- Conditional document requirements.
- Approval prerequisites, downstream effects, and parallel work.
- Rule-driven SLA, inspection, and compliance requirements.

### Phase 5 — Government processing
- Operational government work queue.
- Application review and document verification.
- Query creation and status actions.
- Department-aware permissions and data.
- PCB-specific workflow/data within the shared government portal.
- Inspection assignment, scheduling, findings, and corrective actions.

### Phase 6 — SLA, notifications, and controlled escalation
- SLA countdowns, at-risk states, and breaches from configured policies.
- Notifications for assignments, queries, document issues, inspections,
  approvals, and renewals.
- Configured SLA escalation levels.
- Keep the full grievance/escalation module out of scope unless explicitly
  added to the product scope.

### Phase 7 — Compliance, renewals, and incentives
- Compliance obligations, due dates, and status tracking.
- Renewal workflow and reminders.
- Incentive discovery with eligibility reasons.
- Use "potentially applicable" wording; never imply guaranteed benefits.

### Phase 8 — Admin and master data
- Approval catalog management.
- Regulatory rule management.
- Dependency management.
- SLA policy management.
- Incentive scheme management.
- Audit-log viewing.
- Verify configuration changes affect application behavior without a
  frontend redeploy.

### Phase 9 — Analytics and bottlenecks
- Government workload and processing-time metrics.
- SLA risk/breach metrics.
- Query and inspection delay metrics.
- Approval-stage and department bottleneck views.
- All KPIs and charts must come from stored application/event data.

### Phase 10 — Reliability, security, and UX hardening
- Complete loading, empty, and error states.
- Responsive behavior and accessibility.
- Backend authorization checks for role-sensitive actions.
- Input validation, secure file handling, CORS, rate limiting, and safe
  environment configuration.
- Clean production build and consistent API error handling.

### Phase 11 — Final integration and SIH demo
- Run the complete demo storyline from a clean seeded database.
- Verify Entrepreneur, Government Officer, PCB Officer, and Admin journeys.
- Confirm real persisted data across the main workflow.
- Confirm no critical API or console errors in the demo path.
- Freeze the demo build only after §10 is satisfied.

## 7. API contract — freeze before Phase 1

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

## 9. Demo storyline (~6–8 min)
1. Login as entrepreneur → Project Control Centre (ABC Foods): readiness %, approvals breakdown, action required, SLA alert, bottleneck, next-best-action
2. Approval Roadmap → dependency graph, parallel workflows, "can start now"
3. Open one approval → "Why is this required?"
4. Documents → reused doc, missing doc, expiring doc
5. Run readiness check → "Not ready" → fix → re-run → "Ready"
6. Open application → timeline, query raised → respond
7. Inspections → scheduled inspection
8. Compliance/Renewals → upcoming renewal
9. Incentives → potential matches
10. Switch to Government Officer → work queue, at-risk SLA, update status/raise query
11. Switch to Admin → edit a rule/SLA/dependency via config UI → show applicant side changes with no redeploy
12. Bottleneck/analytics view, built from real stored events
13. Close on differentiation: roadmap + dependency graph + explainability + bottleneck intelligence + lifecycle compliance, all config-driven

## 10. Definition of done

The product is complete only when all of the following are true:

- Frontend and backend boot cleanly using the documented local setup.
- Database initialization/migrations and seed work from a clean Supabase
  database.
- Every P0 requirement in §2 is implemented with real persisted data.
- The demo storyline in §9 runs end-to-end without critical API or console
  errors.
- Entrepreneur, Government Officer, PCB Officer, and Admin journeys work
  end-to-end; PCB Officer uses the shared government portal with
  department-aware data and permissions.
- Implemented workflow controls lead to real pages and state-changing API
  operations rather than dead links.
- Frontend has no direct Supabase database access.
- Regulatory outputs are explainable and data-driven.
- Government analytics and bottlenecks are computed from stored data/events,
  not fabricated static numbers.
- Any schema extension is represented by a versioned SQL migration in the
  repository.
