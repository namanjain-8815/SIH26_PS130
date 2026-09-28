# VERSION3PROGRESS.md
## SIH 2026 · PS 26130 · Version 3 Gap-Closure Progress

### Usage
`VERSION3_IMPLEMENTATION.md` is the current implementation contract.
`VERSION3PROGRESS.md` is the active handoff/progress record.

Before any work:
1. Read `VERSION3_IMPLEMENTATION.md`.
2. Read this file.
3. Use earlier implementation/progress files only as historical context.
4. Do not modify historical progress files.

---

## Starting state

Previous project phases and earlier UI/role cleanup are already implemented and verified in the historical project records.

The Version-3 cycle is focused on gaps identified from the supplied two-part reference solution video.

Existing strong capabilities that should remain intact:
- personalized permissions/regulatory analysis;
- document vault and reuse;
- readiness validation;
- dependency graph;
- application lifecycle/query workflow;
- inspections;
- specified time limits;
- notifications;
- compliance & renewals;
- incentives & schemes;
- government processing;
- bottleneck analytics;
- audit/RBAC/accessibility.

---

## External credentials

### No new API keys required

This Version-3 cycle must remain self-contained.

No external credentials are required for:
- KYA/project onboarding;
- approval directory;
- verified data reuse;
- common application form;
- local document validation;
- cross-document discrepancy checks;
- parallel orchestration;
- approval tracker;
- joint inspection planning;
- renewals;
- contextual guidance assistant.

Live external integrations are intentionally excluded.

---

# Milestones

## P0.1 — Generic Project / Know Your Approvals onboarding
Status: COMPLETE

Completed outcome:
- Route `/app/projects/new` active and accessible;
- 5-step onboarding wizard:
  1. Applicant / Entity Profile (legal name, structure, sector, verified signatory)
  2. Project Proposal (investment capital, employee count, stage, target date)
  3. Location & Jurisdiction (district, MIDC zone, site coordinates)
  4. Business & Regulatory Attributes (pollution category, water usage KLD, power kVA, land area, waste type, contract labour)
  5. Know Your Approvals / Permissions Engine (live regulatory analysis)
- Live project/attribute capture using existing Prisma/Database models;
- Direct execution of `runRegulatoryAnalysis` via backend regulatory engine;
- Display of personalized clearances roadmap, why each applies, prerequisite chains, parallel readiness indicators, and matched incentive schemes;
- Seamless redirect to Project Control Centre (`/app/projects/:id`).
- Backend integration tests passing (`newProjectWizard.integration.test.ts` - 4/4 passing, all 156 suite tests passing).
- Frontend typecheck passing (`npx tsc --noEmit` - 0 errors).

---

## P0.2 — Approval & Permission Directory
Status: COMPLETE

Completed outcome:
- Dedicated route `/app/approval-directory` implemented and linked from sidebar navigation;
- Full approval catalogue search and multi-dimensional filter bar:
  - Text search by approval name, department, category, or legal purpose;
  - Competent Authority filter (MPCB, MIDC, DISH, Fire Services, FSSAI, MSEDCL, etc.);
  - Category filter (environment, factory, fire, utilities, food_safety, labour, etc.);
  - Project lifecycle stage filter (Pre-Establishment, Pre-Operation, All);
  - Inspection requirement filter (Site Inspection Required vs. Desk Scrutiny);
  - Renewal requirement filter (Periodic Renewal vs. Permanent/One-time);
- Directory cards displaying:
  - Permission name, authority badge, category, prescribed form status;
  - Description, statutory purpose and legal basis;
  - Key statutory indicators: configured SLA timeline, inspection requirements, validity period;
  - Required document checklist with mandatory/optional labels;
  - Mandatory upstream prerequisites with department tags;
  - Applicability rules and criteria;
- `Check Applicability` interactive evaluation:
  - Live evaluation against any selected user project using the backend deterministic regulatory engine;
  - Shows clear Applicable / Not Applicable status with explainable reasons;
  - Displays project status (e.g. In Progress, Completed, Not Started) and quick link to application workspace if already active;
  - Shows prerequisite fulfillment and required document checklist.
- Backend API enriched:
  - `GET /api/approval-types` hydrates document requirements, applicability rules, and prerequisite/dependent relations;
  - `POST /api/approval-types/:id/check-applicability` evaluates applicability for any project profile live.
- Backend integration tests passing (`approvalDirectory.integration.test.ts` - 3/3 passed; full test suite - 159/159 passed).
- Frontend typecheck (`npx tsc --noEmit`) and production build (`npm run build`) passing cleanly with 0 errors.

---

## P0.3 — Master Business / Project Profile + Verified Data Reuse
Status: COMPLETE

Completed outcome:
- Reusable applicant/entity/project master profile service and endpoints:
  - `GET /api/projects/:id/profile` returns structured Master Business Profile:
    - Entity Information (legal name, registration type, PAN, GSTIN, CIN, industry classification);
    - Project Details (project name, stage, target commencement date, description);
    - Location & Jurisdiction (district, taluka, village, MIDC industrial area, survey number, GPS coordinates);
    - Technical & Environmental Parameters (capital investment INR, workforce/employee count, land area sq.m, built-up area sq.m, connected power kVA, water requirement KLD, hazardous waste generation, contract labour deployment);
    - Key Personnel & Authorized Signatories (name, designation, phone, email);
    - Verification provenance metadata (`verified_source`, `verified_at`, `status`);
    - Auto-inferred prefill dictionary mapping key profile attributes for automatic downstream application form reuse.
  - `PATCH /api/projects/:id/profile` allows controlled updates to project parameters, location, and technical attributes while synchronizing existing `Project` and `ProjectAttribute` records without creating duplicate master data tables.
  - `GET /api/projects/:id/control-centre` enriched with verified master profile data.
- Dedicated applicant-facing UI:
  - Route `/app/projects/:id/profile` providing a responsive 5-tab Master Business & Investment Dossier:
    1. Entity & Registration (with PAN/GSTIN/CIN tags and verified provenance badges);
    2. Project Proposal (stage, timelines, description);
    3. Location & Site (district, MIDC zone, survey numbers, GPS);
    4. Technical & Utilities (power, water, waste, land, labour);
    5. Authorized Personnel (signatory contact details).
  - Inline controlled editing and instant sync with backend attributes;
  - Prominent badge indicators showcasing "Verified Data Source: MAITRI Investor Registration" and "Active Reusable Dossier";
  - Linked directly from Project Control Centre header (`Master Business Profile`) and via a dedicated "Master Business & Investment Dossier" card in `/app/projects/[id]`.
- Integration and build validation:
  - Integration tests in `masterProfile.integration.test.ts` (3/3 passing, full 162-test backend suite passing).
  - Frontend typecheck and production build passing cleanly.

---

## P0.4 — Common Application Form / Pre-Populated Application
Status: COMPLETE

Completed outcome:
- Backend Common Application Form service and endpoints:
  - `GET /api/applications/:id/form`:
    - Aggregates master business/project profile data (`Organization`, `Project`, `ProjectAttribute`);
    - Pre-populates common applicant & entity fields with explicit source label `From Verified Project Profile` and verification provenance;
    - Pre-populates common project & investment proposal fields with source label `From Verified Project Profile`;
    - Pre-populates location & site jurisdiction fields (district, MIDC zone, survey/plot);
    - Evaluates department-specific supplemental parameters tailored to the competent authority (e.g., MPCB Water/Effluent/Fuel/Chimney; DISH Power kW/Builtup/Shifts; Fire NOC Static Tank/Height; MSEDCL Contract Demand kVA/feeder; MIDC Water connection size; FSSAI category/capacity; or General narrative);
    - Evaluates document checklist and attached files;
    - Supplies matching statutory prescribed template metadata if available;
    - Emits lock flag if application has already been submitted or is undergoing statutory review.
  - `PATCH /api/applications/:id/form`:
    - Persists department-specific supplemental values under application-scoped attributes (`app:${applicationId}:${field_key}`) in `ProjectAttribute` without mutating or corrupting shared master business data;
    - Automatically advances status from `NOT_STARTED` / `READY_TO_START` to `IN_PREPARATION`;
    - Records immutable `ApplicationEvent` (`form_saved`).
  - `POST /api/applications/:id/form/submit`:
    - Validates mandatory department fields and mandatory document attachments;
    - Transitions application status to `SUBMITTED`, starts SLA timeline tracking, records audit events, triggers simulated government gateway synchronization, and dispatches role-aware notifications.
- Reusable Frontend Single-Window Common Application Form (CAF) UI:
  - Component `CommonApplicationFormView` (`frontend/src/components/applications/CommonApplicationFormView.tsx`):
    - 6-step guided application workflow:
      1. Applicant & Entity (with `From Verified Project Profile` badge);
      2. Project Proposal (investment, sector, workforce with `From Verified Project Profile` badge);
      3. Location & Site Jurisdiction (district, MIDC plot, coordinates);
      4. Department Details (authority-specific technical parameters with inline validation and unit indicators);
      5. Attachments (mandatory & optional document checklist + statutory prescribed template download/upload);
      6. Review & Submit (readiness diagnostic, applicant legal undertaking declaration, and submission action).
    - Integrated Draft Saving with responsive success alerts;
    - Official read-only locked state banner for submitted applications.
  - Application Workspace Integration (`/app/applications/:id`):
    - Prominent `Application Form (CAF)` tab in workspace navigation;
    - "Unified Common Application Form" callout card in Overview tab with direct one-click access;
    - "Fill Application Form (CAF)" header action button for submittable applications.
- Testing and verification:
  - Dedicated integration test suite `commonApplicationForm.integration.test.ts` (3/3 passing).
  - Full backend test suite passing (38 suites, 165 tests passing, 0 failures).
  - Next.js production build (`npm run build`) passing cleanly with 30/30 pages compiled.

---

## P0.5 — Cross-Document Consistency & Discrepancy Checker
Status: COMPLETE

Completed outcome:
- Local deterministic document cross-verification service (`crossDocumentConsistencyService.ts`):
  - Ingests application-attached documents and vault documents with local text extraction;
  - Extracts key statutory parameters: Entity / Company Name, PAN, GSTIN, Plot Number, Plot Area (sq.m), Power Demand (kVA/HP), Water Demand (KLD);
  - Performs pairwise cross-document field comparison across uploaded deeds, plans, NOCs, and statutory forms;
  - Evaluates statutory tolerance thresholds (e.g. 2.0% allowable tolerance on surveyed/architectural plot area vs. registered lease deed);
  - Computes status: `PASS` (all extracted fields aligned), `DISCREPANCY` (variance exceeds tolerance threshold), or `MANUAL_REVIEW` (scanned image or unextractable text fallback);
  - Safe fallback: image-only or unreadable documents flag "Manual Verification Required" without rejecting or claiming legal invalidity;
  - Structured discrepancy reporting includes: compared documents, differing field, extracted values, computed variance %, applied statutory tolerance %, and explainable recommended action.
- Backend API endpoints:
  - `GET /api/projects/:id/document-consistency`: Project-level consistency audit across all vault documents;
  - `GET /api/applications/:id/document-consistency`: Application-scoped cross-document consistency audit;
  - Integrated into `runReadinessCheck` (`GET /api/applications/:id/readiness-check`): blocking issues flagged if a critical discrepancy is detected.
- Frontend UI components and integrations:
  - Component `CrossDocumentConsistencyCard` (`frontend/src/components/documents/CrossDocumentConsistencyCard.tsx`):
    - Overall status banner (`All Documents Consistent`, `Cross-Document Discrepancies Detected`, `Manual Verification Required`);
    - Key metrics strip (Consistent Pairs, Discrepancies, Pending Verification);
    - Pairwise discrepancy comparison cards showing source documents, conflicting values, variance %, tolerance threshold, and clear recommended action;
    - Manual review notices for unreadable or scanned documents without false rejection;
    - Re-audit trigger with loading states.
  - Integrated into Application Workspace (`/app/applications/:id`):
    - Readiness Tab: renders `CrossDocumentConsistencyCard` alongside the evaluation matrix;
    - Documents Tab: renders audit panel for attached documents with quick re-evaluation.
  - Integrated into Document Vault (`/app/documents`):
    - "Consistency Audit" header toggle button;
    - Project-wide cross-document consistency audit panel.
- Verification and test results:
  - Dedicated integration tests `crossDocumentConsistency.integration.test.ts` (4/4 passed).
  - Full backend test suite passing (39 suites, 169 tests passed, 0 failures).
  - Next.js production build (`npm run build`) passing cleanly with 30/30 pages compiled.

---

## P0.6 — Stronger Document Guidance & Checklist
Status: COMPLETE

Completed outcome:
- Statutory Document Guidance & Checklist service (`documentGuidanceService.ts`):
  - Comprehensive statutory guidance specification across all clearances:
    - Detailed statutory purpose (legal rationale under Water Act, Air Act, Factories Act, Maharashtra Fire Act, Companies Act, etc.);
    - Prescribed formats and maximum size bounds (PDF, CAD/DWG, scaled drawings);
    - Competent issuing authorities (MIDC, MPCB, DISH, Fire Services, COA Architects, RoC, etc.);
    - Statutory validity rules and expiry policies (e.g. permanent deeds, 1-year annual renewals, 3-year building plan validity);
    - Prescribed form and template linking (direct binding to statutory formats with download endpoints).
  - Clearance-level and application-level evaluation:
    - Application document guidance: categorizes documents into Mandatory vs. Optional/Conditional with condition rules;
    - Attachment state detection: attached file name, verification status (`VERIFIED`, `PENDING`, `REJECTED`, `EXPIRED`), expiry dates;
    - 1-Click Vault Reuse: automatically detects existing verified or unrejected copies in the project's Document Vault and enables 1-click attachment (`can_one_click_reuse: true`);
    - Real-time metrics: readiness percentage, mandatory count, attached count, missing mandatory count, reusable vault count.
  - Project-level clearance guidance grouping:
    - Groups document requirements by clearance/approval type for the entire investor project;
    - Computes completion rate and vault fulfillment per clearance.
  - Readiness check integration:
    - `runReadinessCheck` in `applicationService.ts` detects missing mandatory documents that have reusable vault copies and adds actionable guidance warnings;
    - Emits structured `document_summary` (total, attached, missing, reusable from vault).
- Backend API endpoints:
  - `GET /api/applications/:id/document-checklist`: Application-specific document guidance and checklist with 1-click vault reuse status;
  - `GET /api/projects/:id/document-checklist`: Project-wide document guidance grouped by clearance type with vault satisfaction rate.
- Frontend UI components and integrations:
  - Component `DocumentGuidanceChecklist` (`frontend/src/components/documents/DocumentGuidanceChecklist.tsx`):
    - Overall header metrics banner with SLA timeline, readiness %, and progress bar;
    - Multi-dimensional filter tabs: All Documents, Mandatory, Optional/Conditional, Reusable in 1-Click, Missing Mandatory;
    - Rich document cards with mandatory badges, statutory purpose callouts, technical specification bars (format/size, issuing authority, validity rule);
    - Attached document status badges with file info and replace/detach actions;
    - 1-Click Vault Reuse button with instant loading feedback;
    - Official statutory template download button with source labels;
    - Integrated in Application Workspace (`/app/applications/:id`) under the Documents tab.
  - Component `ClearanceDocumentGuidanceView` (`frontend/src/components/documents/ClearanceDocumentGuidanceView.tsx`):
    - Two-column clearance browser with instant search;
    - Left column: clearance cards with competent authority badge, mandatory/optional counts, and vault satisfaction %;
    - Right column: detailed statutory guidance, issuing authority, format specifications, and "Upload to Vault" action;
    - Integrated in Document Vault (`/app/documents`) with top view switcher tab ("Uploaded Vault Documents" vs. "Statutory Guidance by Clearance").
- Verification and test results:
  - Dedicated integration test suite `documentGuidance.integration.test.ts` (5/5 passed).
  - Full backend test suite passing (40 suites, 174 tests passed, 0 failures).
  - Next.js production build (`npm run build`) passing cleanly with 30/30 pages compiled.

---

## P0.7 — Real Parallel Application Orchestration
Status: COMPLETE

Completed outcome:
- Backend orchestration service and idempotent endpoint:
  - `startEligibleApplications(projectId)` in `backend/src/services/applicationService.ts`:
    - Evaluates all `ProjectApproval` records for the project;
    - Traverses `ApprovalDependency` prerequisite rules (`dependency_type: 'PREREQUISITE'`);
    - Identifies startable clearances whose prerequisites are completed (`COMPLETED`);
    - Detects already existing workspaces (`already_active`) to prevent duplicate application creation;
    - Safely instantiates missing application workspaces via `createApplication(pa.id)` in `IN_PREPARATION` status;
    - Preserves statutory review integrity: does not bypass document attachment requirements and does not auto-submit to government authorities;
    - Accurately tracks clearances blocked by pending upstream prerequisites with specific required approvals listed.
  - Endpoint `POST /api/projects/:id/start-eligible-applications` in `backend/src/routes/projects.ts`.
- Reusable Frontend Parallel Orchestration UI & Modal:
  - Component `ParallelOrchestrationModal` (`frontend/src/components/orchestration/ParallelOrchestrationModal.tsx`):
    - Stat pills: Started Now, Already Active, Prerequisite Blocked;
    - Statutory safety guarantee notice highlighting that applications start in `IN_PREPARATION` and require applicant declaration;
    - Newly initiated clearances list with application numbers and direct "Fill Form (CAF) →" links;
    - Blocked clearances list displaying exact upstream prerequisites;
    - Active clearances list with links to application workspaces.
  - Integrated across multiple key investor touchpoints:
    - Approvals Roadmap (`/app/approvals`);
    - Project Submission Centre (`/app/projects/:id/submission-centre`);
    - Dependency Graph (`/app/projects/:id/dependency-graph`);
    - Project Control Centre (`/app/projects/:id`).
- Verification & Test Results:
  - Integration tests in `backend/src/tests/integration/parallelOrchestration.integration.test.ts` (2/2 passing).
  - Full backend test suite passing (40 suites, 174 tests passing, 0 failures).
  - Next.js production build (`npm run build`) passing cleanly with 30/30 pages compiled.

---

## P0.8 — Prescribed Application Forms / Templates: Verified, Source-Grounded, and Corrected
Status: COMPLETE

Completed outcome:
- Full audit and grounding of prescribed application forms & templates:
  - Bundled verified official government documents locally without external runtime downloads:
    - `MPCB_Combined_Consent_Application_Form.pdf` (251 KB) — Official MPCB Combined Consent Application under Water Act 1974, Air Act 1981, and Hazardous Wastes Rules;
    - `Maharashtra_Labour_Department_Form_2.pdf` (62 KB) — Official bilingual (English & Marathi) Form 2 under Maharashtra Factories Rules 1963 for factory registration, license grant/renewal, and occupier/manager declaration;
    - `FSSAI_Licensing_Regulations_Form_B.pdf` (1.25 MB) — Official statutory Form B application under FSSAI Licensing and Registration Regulations 2011;
  - Stored and exposed official source citations & statutory URLs:
    - MPCB: `https://www.mpcb.gov.in/sites/default/files/consent-management/consent-water-air-act/Combied-consentformNew_31012012.pdf`
    - Labour Dept / DISH: `https://mahakamgar.maharashtra.gov.in/Site/Upload/Pdf/form-2.pdf`
    - FSSAI Compendium: `https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Licensing_Regulations_04_08_2021.pdf`
    - FoSCoS Online Application: `https://foscos.fssai.gov.in/apply-for-lic-and-reg`
    - MIDC Online Water Portal: `https://services.midcindia.org/services/FillFormAnon.aspx?AMId=528` and user manual `https://services.midcindia.org/services/AttachmentTemplates/MIDCUpload/Online_Water_Connection_Application_End_User_Manual.pdf`
  - Explicit provenance metadata & category categorization:
    - `VERIFIED_OFFICIAL_DOCUMENT`: for official government documents (MPCB Consent, Labour Dept Form 2, FSSAI Form B);
    - `OFFICIAL_ONLINE_PORTAL`: for online-only single-window workflows (MIDC Water Connection AMId=528, FoSCoS);
    - `CONFIGURABLE_DEMONSTRATION`: for baseline model templates (MIDC Fire Safety Annexure-A, MSEDCL HT Power Form A-1) so users and evaluators are never misled into treating demo worksheets as enacted statutes.
- Backend implementation:
  - `prescribedFormService.ts`: structured catalogue with `file_path`, `provenance_status`, `is_online_application`, `official_online_url`, and `online_portal_name`.
  - `GET /api/prescribed-forms/:id/download`: streams verified binary PDFs directly from the repository assets directory when available, with fallback to structured template content.
  - `GET /api/prescribed-forms`, `GET /api/prescribed-forms/:id`, `GET /api/approval-types/:id/prescribed-form`.
- Frontend UI components:
  - Enhanced `PrescribedFormCard.tsx`:
    - Provenance badges: `Verified Official Document` (green shield), `Official Online Portal` (blue globe), `Demonstration / Configurable Form` (amber);
    - Competent authority tags;
    - Direct links to official government gazette sources and statutory PDFs;
    - `Open Online Application` action for online portals (MIDC, FoSCoS);
    - `Download Form (PDF)` button downloading verified official PDFs;
    - `Upload Completed Form` action triggering document pre-validation.
- Verification & Test Results:
  - Dedicated integration tests `prescribedForms.integration.test.ts` (5/5 passed).
  - Full backend test suite passing (40 suites, 175 tests passed, 0 failures).
  - Next.js production build (`npm run build`) passing cleanly with 30/30 pages compiled.

---

## P1.9 — Project-level Approval Tracker / Timeline
Status: COMPLETE

Completed outcome:
- Project-level Approval Tracker & Lifecycle Service:
  - Developed `approvalTrackerService.ts` synthesizing an end-to-end statutory clearance journey for any project:
    - Visual 6-stage statutory lifecycle pipeline:
      1. Project Onboarding & Profile Setup;
      2. Permissions Identification & Readiness;
      3. Parallel Workspace & CAF Preparation;
      4. Joint Inspections & Scrutiny;
      5. Clearance Decisions & Grants;
      6. Post-Establishment Compliance & Renewals.
    - Clearance metrics (total permissions, completed, in progress, blocked by prerequisites, ready to start now);
    - Configured statutory SLA days, elapsed days, days remaining, and real SLA health (`ON_TRACK`, `AT_RISK`, `BREACHED`);
    - Consolidated event timeline synthesizing all chronological events from immutable `ApplicationEvent` audit records;
    - Zero fabricated savings metrics: strictly derives from stored timestamps and statutory configurations.
  - Backend route:
    - `GET /api/projects/:id/approval-tracker` providing full project journey payload with authenticated access.
- Dedicated Applicant Interface:
  - Created `/app/projects/[id]/approval-tracker`:
    - Responsive 6-stage interactive pipeline with live status badges (`Completed`, `In Progress`, `Upcoming`, `Blocked`);
    - KPI cards: Overall Completion %, Clearances In Progress, Ready to Start, Statutory SLA Status;
    - Interactive Clearance Health & SLA Countdown Table:
      - Approval name & competent authority;
      - Category & priority;
      - Status pill & CAF status;
      - Statutory SLA progress bar with color-coded countdown days remaining;
      - Missing prerequisites tags;
      - Direct action button ("Continue Form", "Start Workspace", "Review");
    - Consolidated Multi-Department Timeline:
      - Chronological event cards with department badges, actor name & role, timestamp, and notes.
    - Prominently linked from Project Control Centre header (`Approval Tracker & SLA Timeline`).
- Verification & Test Results:
  - Dedicated integration tests `approvalTracker.integration.test.ts` (3/3 passed).
  - Full backend test suite passing (41 suites, 178 tests passed, 0 failures).
  - Next.js production build (`npm run build`) passing cleanly with 30/30 pages compiled.

---

## P1.10 — Joint Department Inspection Planner
Status: COMPLETE

Completed outcome:
- Backend Joint Inspection Services & Grouping Architecture:
  - Preserved existing database schema without redundant tables; grouped individual inspection records by `project_id` and scheduled date/location.
  - Implemented `listJointInspectionPlans(filters)`:
    - Filters by project, district, date range, and status;
    - Aggregates participating departments, approval types, and applications;
    - Detects scheduling conflicts (concurrent site visits assigned to the same officer on the same date, unassigned officers);
    - Synthesizes consolidated site findings across all participating clearances (counts of Critical, High, Medium, Low observations).
  - Implemented `getProjectJointInspections(projectId)`:
    - Returns active joint plans, clearances requiring inspection (with application details and latest inspection status), and coordination opportunities for unscheduled or disparate visits.
  - Implemented `scheduleJointInspection(data)`:
    - Coordinates multiple department clearances onto a shared site verification date and location;
    - Assigns designated officers per department;
    - Emits `joint_inspection_coordinated` audit event and notifies the applicant.
  - Implemented `rescheduleJointInspection(data, actorId)`:
    - Atomically updates scheduled date and location across all participating department inspections in a single transaction;
    - Emits `joint_inspection_rescheduled` audit logs.
  - Implemented `confirmJointReadiness(data, actorId)`:
    - Allows applicant to confirm site readiness across all participating clearances in 1 click;
    - Emits `joint_site_readiness_confirmed` audit logs.
- Backend API Endpoints:
  - `GET /api/inspections/joint-plans` (supports `project_id`, `district`, `status`, `date_from`, `date_to`)
  - `GET /api/projects/:id/joint-inspections` (project-scoped joint coordination data)
  - `POST /api/inspections/joint-schedule` (multi-department scheduling guard for OFFICER, INSPECTOR, ADMIN, NODAL)
  - `POST /api/inspections/joint-reschedule` (atomic joint date/location synchronization)
  - `POST /api/inspections/joint-readiness` (applicant joint site readiness confirmation)
- Applicant Single-Window UI (`/app/inspections`):
  - Added "Coordinated Joint Visits" primary view alongside individual inspections;
  - Displays multi-department cards with participating authorities, assigned officers, and shared date/time;
  - 1-click "Confirm Site Readiness for All Departments" action;
  - Consolidated findings panel with severity badges and required corrective actions.
- Government Joint Planner UI (`/government/inspections`):
  - Dual-mode tab switcher: "Coordinated Joint Plans" vs. "Individual Clearance Visits";
  - Coordinated Joint Plans cards displaying project details, jurisdiction, scheduled date/time, and conflict alert banners;
  - Participating Department Clearances table with designated officer contacts and direct links to work queue dossiers;
  - Consolidated Findings summary with severity chips (Critical, High, Medium, Low) and expandable technical observations;
  - "Schedule Joint Visit" modal: project picker, eligible clearances checklist with inspector assignments, date/time, site location, and coordination objective;
  - "Reschedule Coordinated Visit" modal: atomic multi-department date synchronization with justification logging.
- Verification & Test Results:
  - Dedicated integration tests in `jointInspection.integration.test.ts` (6/6 passed):
    - Lists grouped joint inspection plans with conflict detection;
    - Returns project joint coordination status and eligible clearances;
    - Schedules multi-department joint visit with audit logging and applicant notification;
    - Atomically reschedules joint visits across all participating clearances;
    - Confirms applicant joint site readiness;
    - Enforces authentication and authorization guards.
  - Full backend test suite passing (42 suites, 184 tests passed, 0 failures).
  - Next.js production build (`npm run build`) passing cleanly with 30/30 pages compiled.

---

## P1.11 — Improved Statutory Renewals Management
Status: COMPLETE

Completed outcome:
- Backend Renewals Workspace & Preparation Architecture:
  - Preserved configured statutory periods without inventing renewal cycles.
  - Implemented `getProjectRenewalsWorkspace(projectId)` in `complianceService.ts`:
    - Classifies renewals into 4 distinct buckets: `Action Required` (due in <= 30d or overdue), `Due Soon` (due in 31-90d), `Healthy / On Track` (> 90d or completed), and `Overdue`;
    - Computes summary metrics (`total`, `action_required`, `due_soon`, `healthy`, `overdue`, `completed`);
    - Hydrates each renewal with linked `ApprovalType` specifications, configured renewal period, and competent authority;
    - Resolves linked source clearance `Application` (application number, status, initial grant date);
    - Evaluates required renewal documents against project Document Vault (checks availability and verified status for 1-click reuse).
  - Implemented `getRenewalDetail(complianceId)`:
    - Returns comprehensive renewal specifications, authority, statutory frequency, source clearance dossier, and reusable profile fields.
  - Implemented `prepareRenewal(complianceId, actorId)`:
    - Prepares renewal application workspace in `IN_PREPARATION` status linked to the project approval;
    - Auto-attaches matching verified documents from the project's Document Vault into `ApplicationDocument` with `VALID` status;
    - Reuses master project business attributes (legal name, address, pollution category, employee count, capital investment);
    - Records `renewal_prepared` application event and system audit log;
    - Strictly avoids auto-submitting renewal applications, honoring statutory applicant review requirements.
- Backend API Endpoints:
  - `GET /api/projects/:id/renewals-workspace` (returns 4-bucket dashboard metrics and enriched renewal items)
  - `GET /api/compliance/:id/detail` (comprehensive renewal specifications and dossier)
  - `POST /api/compliance/:id/prepare-renewal` (prepares renewal workspace with reused data and vault attachments)
- Frontend Renewals & Compliance Workspace (`/app/compliance`):
  - 4-card interactive KPI strip (Action Required, Due Soon, Healthy / On Track, Overdue) with 1-click filtering;
  - Category filter tabs toolbar (`All`, `Action Required`, `Due Soon`, `Healthy`, `Overdue`);
  - Comprehensive statutory renewal cards with left-border color accents, status badges, countdown days remaining, linked source application link, and vault-ready document count;
  - "Prepare Renewal" action button that invokes `prepareRenewalMutation`;
  - "Prepare Renewal Outcome" modal displaying summary of reused master profile attributes, auto-attached vault documents, and a direct button "Open Application Form & Review" (`/app/applications/:id`);
  - "Renewal Details" modal presenting full statutory specifications, authority, source clearance dossier, and required renewal documents checklist;
  - "Record Compliance" button for recording periodic returns/filings and auto-scheduling subsequent cycles.
- Verification & Test Results:
  - Dedicated integration tests in `renewals.integration.test.ts` (6/6 passed):
    - Returns 4-bucket classification and summary metrics;
    - Enriches renewals with linked source clearance, required documents, and vault reuse indicators;
    - Returns detailed renewal specifications and project dossier;
    - Prepares renewal workspace with reused data without auto-submitting;
    - Marks compliance completed and auto-schedules next periodic cycle;
    - Enforces authentication guards across all renewal endpoints.
  - Full backend test suite passing (43 suites, 190 tests passed, 0 failures).
  - Next.js production build (`npm run build`) passing cleanly with 30/30 pages compiled.

---

## P1.12 — Contextual Help & Guidance Assistant
Status: COMPLETE

Completed outcome:
- Backend `guidanceAssistantService.ts` providing 100% deterministic, database-grounded statutory guidance across all nine canonical regulatory questions:
  1. "Why is this permission required?" (evaluates applicability rules, project attributes, and statutory triggers);
  2. "What documents are needed?" (lists mandatory vs optional requirements, distinguishing vault-reused files);
  3. "Why is this application blocked?" (identifies unmet prerequisite clearances and blockers);
  4. "What should I do next?" (evaluates application lifecycle stage and suggests the exact next step);
  5. "Which approvals can start now?" (computes parallel eligibility via topological dependency graph);
  6. "Which document failed validation?" (identifies rejected, expired, or invalid uploads);
  7. "Which form should I use?" (links official prescribed forms and offline/online submission modes);
  8. "What is the configured time limit?" (reflects statutory SLA limits, escalation levels, and due dates);
  9. "How do I respond to this query?" (guidance on responding to official departmental queries);
- Deterministic free-form keyword and intent matcher resolving un-enumerated user questions into grounded statutory answers without external LLM or cloud API keys;
- Route `GET /api/guidance/contextual` mounted at `/api/guidance/contextual` with authentication guards;
- Dedicated integration tests in `guidanceAssistant.integration.test.ts` (6/6 passed):
  - Returns page-aware context and suggested questions for active application workspace;
  - Grounded answer for "Why is this permission required?" reflects database applicability reasons;
  - Grounded answer for "What documents are needed?" lists active statutory requirements;
  - Grounded answer for "What is the configured time limit?" reflects statutory SLA rules;
  - Keyword search / intention matching maps free-form text to deterministic answers without external LLM;
  - Enforces authentication guard on contextual guidance endpoint;
- Frontend types `GuidanceAction`, `GuidanceQuestionAnswer`, `ContextualGuidancePayload` exported in `frontend/src/types/api.ts`;
- Frontend API client `guidanceApi.getContextual` added in `frontend/src/lib/api.ts`;
- Upgraded `ApplicationGuidanceAssistant.tsx`:
  - Context-aware page and proposal detection (resolving active screen, active project proposal, and clearance);
  - Quick suggested question chips ribbon dynamically populated from the active database state;
  - Instant zero-latency responses for pre-computed contextual questions, with asynchronous fallback for free-text search;
  - Rich grounded answer bubbles with statutory shields, markdown formatting, direct action links, and follow-up suggestion chips;
  - Pre-filled bridge to Single Window Nodal Facilitation Officer (`/app/assistance`);
  - Verified with Next.js production build (`npm run build`) passing with 0 errors.

---

## P1.X — DigiLocker Verification — Prototype Simulation
Status: COMPLETE

Completed outcome:
- Explicit prototype simulation demonstrating consent-based verified government-document retrieval and multi-application reuse without live external integrations;
- Starts in an initial **unconnected state** with a prominent **`Connect DigiLocker`** action button;
- Interactive **3-second loading animation (`3000ms`)** with real-time progressive milestone indicators (*Requesting citizen consent* → *Querying MCA21 & Income Tax registers* → *Ingesting verified documents into Document Vault*);
- Categorized display of available documents in DigiLocker:
  - **Company & Enterprise Documents:** Company PAN Card, Certificate of Incorporation & MoA (MCA21), MIDC Plot Lease Deed, Udyam MSME Certificate;
  - **User & Representative Credentials:** Authorized Signatory Aadhaar e-KYC (Masked `XXXX-XXXX-4921`), Certified Board Resolution;
- Multi-application form reuse showcase mapping verified attributes directly into the Common Application Form (CAF) and clearance applications;
- Document Vault integration tagging retrieved files with `DigiLocker Verified` provenance pills in vault tables;
- Reset simulation action (`POST /api/projects/:id/digilocker/reset`) allowing evaluators to re-run the 3-second simulation repeatedly;
- Honest Prototype Disclosure prominently displayed with the explicit statement:
  > *"DigiLocker connection using API Setu is future integration."*
- Zero external credentials, zero API Setu / DigiLocker API keys, and zero cloud OAuth dependencies added;
- Dedicated backend service `digiLockerSimulationService.ts` containing the `DigiLockerProviderSeam` future integration contract;
- Endpoints `GET /api/projects/:id/digilocker/status`, `POST /api/projects/:id/digilocker/simulate`, and `POST /api/projects/:id/digilocker/reset` protected by authentication guards;
- Integration test suite `digiLockerSimulation.integration.test.ts` (7/7 passing);
- Mounted in Document Vault (`/app/documents`) and Master Business & Investment Dossier (`/app/projects/[id]/profile`);
- Production build verified (`npm run build` exiting 0, 30/30 pages compiled).

---

## Current milestone

All Milestones Complete (P0.1 - P0.8, P1.9 - P1.12, P1.X DigiLocker Simulation)

## Current task

All Version 3 gap-closure milestones from `VERSION3_IMPLEMENTATION.md` and the P1.X DigiLocker Prototype Simulation have been fully implemented, integrated, tested, and verified.

## Remaining work

None. All milestones in the Version 3 milestone roadmap plus the DigiLocker prototype simulation are complete and operational.

## Files changed

- `backend/src/services/approvalService.ts` (enriched `listApprovalTypes` & `getApprovalType`, added `checkApprovalApplicability`)
- `backend/src/routes/approvalTypes.ts` (added `POST /api/approval-types/:id/check-applicability`, updated prescribed-form streaming download)
- `backend/src/tests/integration/approvalDirectory.integration.test.ts` (P0.2 approval directory integration tests)
- `frontend/src/app/app/approval-directory/page.tsx` (created Approval & Permission Directory interface)
- `backend/src/services/masterProfileService.ts` (master profile normalization, provenance metadata, and sync)
- `backend/src/routes/projects.ts` (master profile, parallel orchestration, and approval tracker endpoints)
- `backend/src/tests/integration/masterProfile.integration.test.ts` (P0.3 master profile integration tests)
- `frontend/src/app/app/projects/[id]/profile/page.tsx` (reusable Master Business & Investment Dossier, integrated DigiLocker simulation card)
- `backend/src/services/applicationService.ts` (common application form aggregation, department supplemental values, safe parallel application orchestration)
- `backend/src/routes/applications.ts` (form GET/PATCH/submit endpoints)
- `backend/src/tests/integration/commonApplicationForm.integration.test.ts` (P0.4 CAF integration tests)
- `frontend/src/components/applications/CommonApplicationFormView.tsx` (unified CAF component)
- `backend/src/services/crossDocumentConsistencyService.ts` (local cross-document discrepancy checker)
- `backend/src/tests/integration/crossDocumentConsistency.integration.test.ts` (P0.5 cross-document consistency tests)
- `frontend/src/components/documents/CrossDocumentConsistencyCard.tsx` (consistency audit UI card)
- `backend/src/services/documentGuidanceService.ts` (statutory guidance specs, 1-click vault reuse detection, clearance grouping)
- `backend/src/tests/integration/documentGuidance.integration.test.ts` (P0.6 document guidance integration tests)
- `frontend/src/components/documents/DocumentGuidanceChecklist.tsx` (document guidance checklist with 1-click vault reuse)
- `frontend/src/components/documents/ClearanceDocumentGuidanceView.tsx` (clearance document guidance browser)
- `backend/src/tests/integration/parallelOrchestration.integration.test.ts` (P0.7 parallel orchestration integration tests)
- `frontend/src/components/orchestration/ParallelOrchestrationModal.tsx` (reusable parallel orchestration outcome modal)
- `frontend/src/app/app/projects/[id]/submission-centre/page.tsx` (wired parallel orchestration modal)
- `frontend/src/app/app/projects/[id]/dependency-graph/page.tsx` (wired dynamic project support and orchestration modal)
- `frontend/src/app/app/approvals/page.tsx` (wired reusable parallel orchestration modal)
- `frontend/src/app/app/projects/[id]/page.tsx` (wired parallel orchestration button, modal, and approval tracker link)
- `backend/src/assets/prescribed-forms/` (bundled official verified PDFs for MPCB Consent, Labour Dept Form 2, and FSSAI Form B)
- `frontend/public/prescribed-forms/` (bundled static access copies)
- `backend/src/services/prescribedFormService.ts` (source-grounded form catalogue, official URLs, online portal integration, and binary asset streaming)
- `frontend/src/components/forms/PrescribedFormCard.tsx` (enhanced with provenance badges, official source links, and online portal triggers)
- `backend/src/tests/integration/prescribedForms.integration.test.ts` (P0.8 prescribed forms integration tests)
- `backend/src/services/approvalTrackerService.ts` (P1.9 project-level approval tracker, 6-stage lifecycle, and timeline synthesis)
- `backend/src/tests/integration/approvalTracker.integration.test.ts` (P1.9 approval tracker integration tests)
- `frontend/src/types/api.ts` (P1.9 approval tracker & P1.10 joint inspection & P1.11 statutory renewals & P1.12 guidance & P1.X digilocker types)
- `frontend/src/lib/api.ts` (P1.9 approval tracker & P1.10 joint inspection & P1.11 statutory renewals & P1.12 guidance & P1.X digilocker API client functions)
- `frontend/src/app/app/projects/[id]/approval-tracker/page.tsx` (P1.9 visual 6-stage pipeline tracker, clearance table, and consolidated timeline)
- `backend/src/services/inspectionService.ts` (P1.10 joint inspection plans, multi-department coordination, conflict detection, consolidated findings, and readiness)
- `backend/src/routes/inspections.ts` (P1.10 joint inspection endpoints)
- `backend/src/tests/integration/jointInspection.integration.test.ts` (P1.10 joint inspection integration tests)
- `frontend/src/app/app/inspections/page.tsx` (P1.10 applicant coordinated joint visits view, readiness confirmation, and findings)
- `frontend/src/app/government/inspections/page.tsx` (P1.10 government joint inspection planner, scheduling & atomic rescheduling modals)
- `frontend/src/types/index.ts` (added optional organization to Project interface)
- `backend/src/services/complianceService.ts` (P1.11 4-bucket renewals workspace, renewal detail hydration, and Prepare Renewal flow with reused project data)
- `backend/src/routes/compliance.ts` (P1.11 renewals workspace, renewal detail, and prepare-renewal endpoints)
- `backend/src/tests/integration/renewals.integration.test.ts` (P1.11 renewals integration tests)
- `frontend/src/app/app/compliance/page.tsx` (P1.11 4-bucket renewals dashboard, Prepare Renewal outcome modal, and renewal dossier modal)
- `backend/src/services/guidanceAssistantService.ts` (P1.12 deterministic statutory guidance service answering 9 canonical questions and intent matching)
- `backend/src/routes/guidance.ts` (P1.12 GET /api/guidance/contextual endpoint)
- `backend/src/tests/integration/guidanceAssistant.integration.test.ts` (P1.12 guidance assistant integration tests)
- `frontend/src/components/guidance/ApplicationGuidanceAssistant.tsx` (P1.12 upgraded live database-grounded Guidance Assistant with question chips and direct actions)
- `backend/src/services/digiLockerSimulationService.ts` (P1.X DigiLocker prototype simulation service & future provider seam)
- `backend/src/routes/digilocker.ts` (P1.X DigiLocker simulation status & simulate endpoints)
- `backend/src/tests/integration/digiLockerSimulation.integration.test.ts` (P1.X DigiLocker prototype simulation integration tests)
- `frontend/src/components/documents/DigiLockerVerificationCard.tsx` (P1.X interactive DigiLocker simulated verification card with honest prototype disclosure)
- `frontend/src/app/app/documents/page.tsx` (P1.X integrated DigiLocker simulation card into Document Vault)

## API changes

- `POST /api/approval-types/:id/check-applicability` (evaluates project profile against approval rules)
- `GET /api/approval-types` (hydrates document_requirements, applicability_rules, dependent_on, prerequisite_for)
- `GET /api/projects/:id/profile` (returns master business & project profile with provenance)
- `PATCH /api/projects/:id/profile` (updates project and business attributes with atomic synchronization)
- `GET /api/applications/:id/form` (aggregates master business profile and department supplemental parameters)
- `PATCH /api/applications/:id/form` (persists department-scoped application values)
- `POST /api/applications/:id/form/submit` (validates and submits application)
- `GET /api/projects/:id/document-consistency` (cross-document consistency audit across vault documents)
- `GET /api/applications/:id/document-consistency` (application-scoped consistency audit)
- `GET /api/applications/:id/document-checklist` (application document guidance with 1-click vault reuse)
- `GET /api/projects/:id/document-checklist` (project document guidance grouped by clearance)
- `POST /api/projects/:id/start-eligible-applications` (initiates eligible clearances in parallel)
- `GET /api/projects/:id/approval-tracker` (synthesizes visual 6-stage pipeline, SLA metrics, and consolidated event timeline)
- `GET /api/inspections/joint-plans` (lists grouped multi-department joint inspection plans with conflict detection)
- `GET /api/projects/:id/joint-inspections` (returns project joint visits, inspection-eligible clearances, and opportunities)
- `POST /api/inspections/joint-schedule` (schedules coordinated multi-department site verification)
- `POST /api/inspections/joint-reschedule` (atomically reschedules date and location across participating departments)
- `POST /api/inspections/joint-readiness` (confirms applicant site readiness across all participating clearances)
- `GET /api/projects/:id/renewals-workspace` (4-bucket statutory renewals dashboard metrics and enriched items)
- `GET /api/compliance/:id/detail` (comprehensive renewal specifications and dossier)
- `POST /api/compliance/:id/prepare-renewal` (prepares renewal workspace with reused data and vault attachments)
- `GET /api/guidance/contextual` (live database-grounded statutory answers, suggested questions, and intent matcher)
- `GET /api/projects/:id/digilocker/status` (P1.X simulated DigiLocker verification status)
- `POST /api/projects/:id/digilocker/simulate` (P1.X executes simulated verification and vault credential synchronization)

## Schema changes

None required. Reused existing database models without creating redundant tables.

## Tests

- Full backend suite: 45 suites, 202 tests passing (0 failures, 0 skipped).
- `frontend`: `npm run build` (production build compiled successfully, 30/30 pages statically generated).

## Blockers

None. All milestones completed successfully.

---

# Completion criteria

A milestone becomes `COMPLETE` only after:
- implementation is finished;
- affected backend/integration tests pass;
- frontend type-check/build passes where relevant;
- affected user journey is manually verified;
- this file is updated with results;
- exact next milestone is recorded.

---

# Session safety

If context/session capacity becomes limited:
- stop starting new work;
- complete or safely stop the current operation;
- update this file;
- record the exact next task/file/action;
- stop.

Never leave undocumented work.

