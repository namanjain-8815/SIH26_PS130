# Udyog Setu — Industrial Approval & Compliance Intelligence Platform

**SIH 2026 · Problem Statement 26130 · Government of Maharashtra**

> A unified, intelligent Single Window approval and compliance management platform for industrial entrepreneurs, competent authority officers, and MAITRI nodal coordinators — built under the MAITRI Act 2023 & MAITRI Rules 2025 framework.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · React Flow · Recharts |
| **Backend** | Node.js · Express · TypeScript · `@supabase/supabase-js` · `@supabase/server` |
| **Database** | Supabase PostgreSQL (22 tables, HTTPS REST via service secret key) |
| **Auth** | Custom JWT · bcrypt · Express middleware (RBAC with 6 roles) |
| **Storage** | Supabase Storage (private `documents` bucket, 50 MB limit) |
| **PDF Parsing** | `pdf-parse` (local, no external API) |
| **Tests** | Node.js native test runner (`tsx --test`) · 45 suites · 220+ tests |

**Ports:** Backend `:4000` · Frontend `:3000`

---

## Quick Start

### Unified Workspace (Recommended)
```bash
npm install
npm run dev              # Starts backend (:4000) & frontend (:3000) concurrently

# Test suite
npm test                 # All 220+ tests across 45 suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
```

### Manual Separate Setup

#### 1. Backend
```bash
cd backend
cp .env.example .env
# Fill in backend/.env:
# SUPABASE_URL=https://<ref>.supabase.co
# SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# SUPABASE_SECRET_KEY=sb_secret_...
# SUPABASE_JWKS_URL=https://<ref>.supabase.co/auth/v1/.well-known/jwks.json
# JWT_SECRET=your-jwt-secret

npm install

# Initialize schema (run backend/supabase_schema.sql in Supabase SQL Editor for a fresh project)
# Seed all demo accounts, projects, rules, documents, and applications:
npm run seed

npm run dev              # http://localhost:4000
```

#### 2. Frontend
```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api

npm install
npm run dev              # http://localhost:3000
```

---

## Demo Accounts

Password `Demo@123` for all accounts (bcrypt-hashed in seed data).

| Email | Internal Role | Official MAITRI Role | Portal |
|---|---|---|---|
| `entrepreneur@demo.local` | `ENTREPRENEUR` | **Applicant / Investor** | `/app/dashboard` |
| `manager@demo.local` | `MANAGER` | **Authorized Representative** (ABC Foods Pvt Ltd) | `/app/dashboard` |
| `officer@demo.local` | `OFFICER` | **Competent Authority Officer** · MIDC | `/government/work-queue` |
| `pcb.officer@demo.local` | `OFFICER` | **Competent Authority Officer** · MPCB | `/government/work-queue` |
| `nodal@demo.local` | `NODAL` | **MAITRI Nodal Officer** | `/government/work-queue` |
| `inspector@demo.local` | `INSPECTOR` | **Designated Inspection Officer** | `/government/work-queue` |
| `admin@demo.local` | `ADMIN` | **System Administrator** | `/admin/approval-types` |

> **New applicant registration** is also available via the "Create Applicant / Entrepreneur Account" button on the login screen.

---

## Platform Capabilities

### Applicant / Investor Portal (`/app/*`)

| Feature | Route |
|---|---|
| Project Control Centre (readiness %, blockers, next-best-action) | `/app/projects/:id` |
| Know Your Approvals — 5-step onboarding wizard | `/app/projects/new` |
| Master Business & Investment Dossier (verified data, DigiLocker seam) | `/app/projects/:id/profile` |
| Permissions & Approvals Roadmap (category-grouped, dependency DAG) | `/app/approvals` |
| Approval & Permission Directory (full catalogue, check-applicability) | `/app/approval-directory` |
| Approval Dependency Graph (React Flow, parallel readiness, `can_start_now`) | `/app/projects/:id/dependency-graph` |
| Project Submission Centre (parallel orchestration launcher) | `/app/projects/:id/submission-centre` |
| Project-Level Approval Tracker (6-stage pipeline, SLA countdown) | `/app/projects/:id/approval-tracker` |
| Application Workspace (CAF, overview, documents, queries, inspection, timeline) | `/app/applications/:id` |
| Common Application Form (CAF) with pre-population from master profile | `/app/applications/:id?tab=form` |
| Document Vault (upload, replace, reuse, PDF preview, extraction) | `/app/documents` |
| Cross-Document Consistency Audit (discrepancy detection across vault) | `/app/documents` |
| Document Guidance & Statutory Checklist (1-click vault reuse) | `/app/applications/:id?tab=documents` |
| Pre-Submission Readiness Validation (blocking issues, fix shortcuts) | `/app/applications/:id?tab=readiness` |
| Query Management (raise → respond → resolve with auto-transition) | `/app/applications/:id?tab=queries` |
| Site Inspections (confirm readiness, reschedule, findings) | `/app/inspections` |
| Joint Department Inspections (multi-dept coordination, 1-click readiness) | `/app/inspections` |
| Compliance & Renewals Workspace (4-bucket dashboard, prepare renewal) | `/app/compliance` |
| Incentive Schemes & Eligibility Discovery | `/app/incentives` |
| Contextual Guidance Assistant (deterministic, DB-grounded, 9 intent types) | Accessible from all pages |
| DigiLocker Prototype Simulation (consent flow, vault sync, honest disclosure) | `/app/documents`, `/app/projects/:id/profile` |
| Notifications (role-aware, unread badge, mark-all-read) | `/app/notifications` |
| Settings (profile, organization, notification toggles, security) | `/app/settings` |

### Government Portal (`/government/*`)

| Feature | Route |
|---|---|
| Competent Authority Work Queue (dept-scoped, scrutiny modals) | `/government/work-queue` |
| MAITRI Nodal Officer Panel (coordination notes, escalation) | `/government/work-queue` |
| Specified Time Limit Monitor (MAITRI Rules 2025, evaluate & escalate) | `/government/sla-monitor` |
| Joint Inspection Planner (multi-dept scheduling & atomic rescheduling) | `/government/inspections` |
| Scrutiny Analytics (dept performance, KPI cards, Recharts) | `/government/analytics` |
| Process Bottlenecks & Delay Intelligence (delay origin attribution) | `/government/bottlenecks` |

### System Administrator Console (`/admin/*`)

| Feature | Route |
|---|---|
| Permissions / Approvals Catalogue (CRUD, statutory references) | `/admin/approval-types` |
| Applicability & Eligibility Rules (toggle active/inactive, CRUD) | `/admin/rules` |
| Permission Dependencies (prerequisite chains, CRUD) | `/admin/dependencies` |
| Specified Time Limit Policies (duration, escalation paths) | `/admin/sla-policies` |
| Incentive Schemes Master Data (CRUD) | `/admin/incentive-schemes` |
| Officer Account Management (create officers with dept binding) | `/admin/users` |
| Audit Trail & System Logs (JSON before/after diffs) | `/admin/audit-log` |

---

## Project Architecture

### Backend (`backend/src/`)
```
adapters/                    # GovernmentIntegrationAdapter (simulated), SupabaseStorageAdapter, LocalStorageAdapter
assets/prescribed-forms/     # Bundled official PDFs: MPCB Consent, Labour Dept Form 2, FSSAI Form B
lib/
  errors.ts                  # Standardized HTTP error classes
  jwt.ts                     # JWT signing & verification (includes department_id)
  supabase.ts                # Supabase client (SUPABASE_SECRET_KEY)
  supabaseDb.ts              # Type-safe ORM/query adapter with relation hydration
middleware/
  auth.ts                    # requireAuth (JWT verification + user hydration)
  roleGuard.ts               # requireRole (multi-role RBAC guard)
  auditLogger.ts             # Audit middleware
  errorHandler.ts            # Central Express error handler
routes/                      # 18 route modules (admin, applications, approvalTypes, auth,
                             #   compliance, digilocker, documents, facilitation, government,
                             #   guidance, incentives, inspections, notifications,
                             #   projectApprovals, projects, queries, sla, index)
rule-engine/
  evaluate.ts                # Declarative condition evaluator (eq, num_gt, num_gte, in, contains…)
  types.ts                   # Rule engine types
services/                    # 26 domain services
  analyticsService.ts        # Dept performance, bottlenecks, work queue
  applicationService.ts      # Full application lifecycle, CAF, parallel orchestration, readiness
  approvalService.ts         # Approval types, applicability check, dependencies
  approvalTrackerService.ts  # 6-stage pipeline tracker, SLA synthesis
  authService.ts             # Login, registration, getCurrentUser
  complianceService.ts       # Renewals workspace, prepare-renewal, compliance recording
  crossDocumentConsistencyService.ts  # Pairwise document discrepancy detection
  dependencyService.ts       # Prerequisite graph traversal
  digiLockerSimulationService.ts      # DigiLocker prototype simulation & provider seam
  documentDetailCentreService.ts      # Aggregated cross-doc field extraction & master values
  documentGuidanceService.ts  # Statutory guidance specs, 1-click vault reuse detection
  documentService.ts         # Upload, replace, delete, verify, PDF streaming
  documentValidatorService.ts # Pre-validation rules engine
  facilitationService.ts     # MAITRI Single Window facilitation & assistance
  guidanceAssistantService.ts # Deterministic 9-intent contextual guidance engine
  incentiveService.ts        # Incentive match & status updates
  inspectionService.ts       # Individual + joint inspection scheduling & findings
  notificationService.ts     # Role-aware notification dispatch
  pdfExtractionService.ts    # 18-pattern regex PDF field extractor
  prescribedFormService.ts   # Official form catalogue, binary PDF streaming
  projectService.ts          # Project CRUD, control centre, master profile, KYA
  queryService.ts            # Query raise → respond → resolve lifecycle
  regulatoryService.ts       # Regulatory analysis runner
  scrutinyPriorityService.ts # Application priority scoring for work queue
  slaService.ts              # Specified Time Limit computation & evaluation engine
types/
  database.ts                # All 22 DB model interfaces & enum constants
  express.d.ts               # Express User request type extension
seed.ts                      # Complete database seeding (accounts, projects, documents, rules)
```

### Frontend (`frontend/src/app/`)
```
login/                       # Role-first login with category-driven demo credential reveal
app/
  dashboard/                 # Project Control Centre (readiness %, blockers, next-best-action)
  projects/
    new/                     # Know Your Approvals 5-step wizard
    [id]/
      page.tsx               # Project detail & parallel orchestration launcher
      profile/               # Master Business & Investment Dossier (5-tab)
      dependency-graph/      # React Flow approval dependency DAG
      submission-centre/     # Parallel application orchestration centre
      approval-tracker/      # 6-stage pipeline tracker & SLA countdown table
  approvals/                 # Permissions & Approvals Roadmap
  approval-directory/        # Full approval catalogue with check-applicability
  applications/[id]/         # Application Workspace (CAF, documents, queries, inspection, timeline)
  documents/                 # Document Vault + Cross-Doc Consistency + DigiLocker Seam
  compliance/                # Renewals Workspace (4-bucket dashboard, prepare-renewal)
  inspections/               # Individual + joint coordinated site inspections
  incentives/                # Incentive Schemes & Eligibility Discovery
  notifications/             # Role-aware notification feed
  assistance/                # MAITRI Nodal facilitation contact
  settings/                  # Profile, org, notifications, security
government/
  work-queue/                # Competent Authority Work Queue + MAITRI Nodal Panel
  sla-monitor/               # Specified Time Limit Monitor (MAITRI Rules 2025)
  inspections/               # Government Joint Inspection Planner
  analytics/                 # Scrutiny Analytics & KPI dashboard
  bottlenecks/               # Process Bottlenecks & Delay Intelligence
admin/
  approval-types/            # Permissions Catalogue CRUD
  rules/                     # Applicability & Eligibility Rules
  dependencies/              # Permission Dependency Chains
  sla-policies/              # Specified Time Limit Policies
  incentive-schemes/         # Incentive Schemes Master Data
  users/                     # Officer Account Management
  audit-log/                 # Audit Trail with JSON diffs
```

---

## Test Suite

```
Backend Test Runner: Node.js native (tsx --test)

Total suites:  45
Total tests:   220
Passed:        220
Failed:        0

Coverage areas:
  Unit Tests (rule engine, DAG logic, SLA engine, DB adapter)
  Integration Tests (live Supabase — auth, projects, applications, documents,
    queries, inspections, joint inspections, renewals, guidance assistant,
    DigiLocker simulation, analytics, admin, RBAC enforcement)
```

---

## Database

| Status | Details |
|---|---|
| **Connection** | ✅ Supabase HTTPS REST API (`@supabase/supabase-js`, service secret key) |
| **Schema** | ✅ 22 tables applied (`backend/supabase_schema.sql`) |
| **Seed** | ✅ Complete — `npm run seed` populates all demo accounts, projects, documents, rules, SLA policies, incentive schemes, and applications |
| **Storage** | ✅ Supabase Storage private bucket (`documents`) with 7 seeded demo PDFs |
| **Migrations** | Zero schema migrations required across all 11+ development phases |

---

## TypeScript & Build Status

| | Status |
|---|---|
| **Backend TypeScript** | ✅ Zero errors (`npx tsc --noEmit`) |
| **Frontend TypeScript** | ✅ Zero errors (`npx tsc --noEmit`) |
| **Frontend Production Build** | ✅ 31 routes compiled & statically optimized (`npm --prefix frontend run build`) |
| **Backend Production Build** | ✅ Zero errors (`npm --prefix backend run build`) |

---

## Disclaimer

> **PROTOTYPE / DEMONSTRATION DATA.** This is an SIH 2026 Problem Statement 26130 solution prototype submitted by Team [Team Name]. It is **not** an official Government of Maharashtra service. Demo data is synthetic. External integrations (DigiLocker via API Setu, BHASHINI language services, government gateway APIs) are explicitly labeled as simulated or future seams and are not live in this build.
