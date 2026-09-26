# Implementation Plan — Industrial Approval & Compliance Intelligence Platform
SIH 2026 · Problem Statement 26130 · Govt. of Maharashtra

## 1. Product in one line
Turn a project's business profile into a personalized, dependency-aware approval
roadmap; guide document prep, pre-validate submissions, track applications,
queries, inspections, SLAs, bottlenecks, incentives and renewals — from one
project-centric workspace, for both applicants and government officers.

## 2. MVP scope — build ONLY this
One seeded demo project: **ABC Foods Pvt Ltd**, food processing, Pune (MIDC),
₹25 Cr investment, 80 employees, Maharashtra jurisdiction.

Roles with real dashboards: **Entrepreneur, Government Officer, Admin.**
(Manager/Nodal/Inspector get login stubs + demo accounts but reuse
Officer/Admin views — do not build 6 separate UIs.)

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
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt, custom Express middleware (no external auth provider needed)
- **Storage:** local disk behind a `StorageAdapter` interface (swap for S3/Supabase later)
- **Repo:** one monorepo, `/frontend` and `/backend`, this file is the shared contract

## 4. Architecture
```
Next.js (:3000)  --REST-->  Express API (:4000)  -->  Prisma  -->  PostgreSQL
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

| Entity | Key fields | Relations |
|---|---|---|
| User | id, name, email, password_hash, role, org_id? | Organization, Department |
| Organization | id, legal_name, entity_type, sector | Users, Projects |
| Department | id, name, state, district | Applications, Officers |
| Project | id, org_id, name, sector, investment_amount, employee_count, stage, district, industrial_area, target_start_date | Organization, ProjectAttribute[], ProjectApproval[] |
| ProjectAttribute | id, project_id, key, value | Project |
| ApprovalType | id, name, authority, category, description, purpose, default_sla_days, renewal_period_days, requires_inspection, source_reference | ApplicabilityRule[], DocumentRequirement[] |
| ApplicabilityRule | id, approval_type_id, conditions(json), jurisdiction, sector, effective_from, effective_to, active | ApprovalType |
| ApprovalDependency | id, prerequisite_approval_type_id, dependent_approval_type_id, dependency_type | ApprovalType ×2 |
| ProjectApproval | id, project_id, approval_type_id, applicability_reason, status, priority, due_date, actual_completion_date, blocked_reason | Project, ApprovalType, Application |
| DocumentRequirement | id, approval_type_id, document_type, mandatory, condition | ApprovalType |
| Document | id, org_id, project_id, document_type, file_name, file_url, version, verification_status, issued_date, expiry_date | Project |
| Application | id, project_approval_id, department_id, application_number, status, submitted_at, due_date, completed_at | ProjectApproval, Department |
| ApplicationDocument | id, application_id, document_id, validation_status, validation_notes | Application, Document |
| ApplicationEvent | id, application_id, actor_id, event_type, timestamp, notes | Application, User |
| Query | id, application_id, created_by, assigned_to, subject, description, priority, deadline, status | Application |
| QueryResponse | id, query_id, created_by, response_text, created_at | Query |
| Inspection | id, application_id, department_id, inspector_id, scheduled_date, status, location, purpose | Application |
| InspectionFinding | id, inspection_id, severity, description, corrective_action, status | Inspection |
| SLAPolicy | id, approval_type_id, duration_days, start_event, escalation_level | ApprovalType |
| SLAInstance | id, application_id, due_date, status, breached, breach_duration | Application |
| IncentiveScheme | id, name, authority, description, eligibility_rules(json), benefit_description, deadline | IncentiveMatch[] |
| IncentiveMatch | id, project_id, incentive_scheme_id, matching_reasons, status | Project, IncentiveScheme |
| ComplianceRequirement | id, project_id, name, authority, frequency, next_due_date, status, linked_approval_id | Project |
| AuditLog | id, actor_id, action, entity_type, entity_id, timestamp, before_data, after_data | User |
| Notification | id, user_id, title, message, type, read, created_at | User |

## 6. Two-developer parallel plan
Split strictly on the frontend/backend boundary so both devs can work at the
same time with almost zero merge conflicts. The only shared surface is the
API contract in §7 — **freeze it in Phase 0** and don't change it silently.

**Phase 0 (both, ~1–2 hrs, together):** init monorepo, write `schema.prisma`
from §5, migrate empty DB, freeze §7, agree on `.env.example` and demo
account passwords.

**Phase 1 (parallel — the bulk of the work):**

*Dev A — Backend, build in this order:*
1. `backend/prisma/schema.prisma`, run migration
2. `backend/prisma/seed.ts` + `rule-engine/rules/*.json` (seed data per §9 of DEVELOPER_GUIDE)
3. `middleware/auth.ts`, `roleGuard.ts`
4. `services/authService.ts` + `routes/auth.ts`
5. `rule-engine/evaluate.ts` (`evaluateProjectAgainstRules`)
6. `services/regulatoryService.ts`, `projectService.ts` + `routes/projects.ts`
7. `services/approvalService.ts`, `dependencyService.ts` + routes
8. `services/documentService.ts` + routes
9. `services/applicationService.ts`, `queryService.ts`, `inspectionService.ts`, `slaService.ts` + routes
10. `services/incentiveService.ts`, `complianceService.ts` + routes
11. `services/analyticsService.ts` + government routes (work-queue, bottlenecks)
12. `routes/admin.ts` (CRUD wrapping the same services)
13. `services/auditService.ts` + wire audit middleware everywhere
14. `services/notificationService.ts` + routes

*Dev B — Frontend, build in this order (use `/frontend/src/mocks/*` fixture
JSON to start immediately, don't wait for Dev A):*
1. `tailwind.config`, design tokens (§8), shadcn/ui init
2. `lib/api.ts` client, auth context, mock fixtures
3. `app/(public)/page.tsx` landing, `/login`, `/register`
4. `app/app/layout.tsx` (applicant sidebar shell) + dashboard
5. `app/app/projects/new` (5-step wizard)
6. `app/app/projects/[id]/overview` — **Project Control Centre**
7. `app/app/projects/[id]/approvals` + `approval-map` (React Flow graph)
8. `app/app/projects/[id]/documents`
9. `app/app/projects/[id]/applications/[appId]` (tabbed workspace)
10. queries, inspections, compliance, renewals, incentives, activity pages
11. `app/government/layout.tsx` + dashboard + work-queue + `applications/[id]`
12. `app/government/sla`, `bottlenecks`, `analytics`
13. `app/admin/layout.tsx` + approvals, rules, dependencies, sla, incentives, audit-log

**Phase 2 (both, ~1 day):** swap Dev B's fixtures for real API calls, run the
full demo storyline (§9) end-to-end, fix breaks.

**Phase 3 (both):** loading/empty/error states, responsive pass, basic
accessibility (labels, keyboard nav, no color-only status), rehearse demo.

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
App boots clean, `migrate` + `seed` work from scratch, every P0 checkbox in
§2 is true, the demo storyline in §9 runs with no console errors, all three
role logins work end-to-end.
