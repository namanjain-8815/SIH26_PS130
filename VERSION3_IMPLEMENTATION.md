# VERSION3_IMPLEMENTATION.md
## SIH 2026 · Problem Statement 26130
## Gap-Closure Pass Based on Reference Solution Review

### Purpose

This file is the implementation contract for Version 3 improvements to the existing SIH 26130 solution.

The improvements are derived from a full review of the supplied two-part reference video and comparison with the current solution.

The target is NOT to copy the reference solution. The target is to add the missing capabilities that materially strengthen the current solution against Problem Statement 26130.

### Required startup workflow

Before doing any work:

1. Read `VERSION3_IMPLEMENTATION.md`.
2. Read `VERSION3PROGRESS.md`.
3. Treat `UPDATEIMPLEMENTATION.md` and `UPDATEPROGRESS.md` as historical/contextual records for earlier improvement work.
4. Treat `PROGRESS.md` as historical project context only.
5. Do not modify the historical progress files.
6. Inspect existing implementation before making any change.
7. Do not repeat a Version-3 milestone already marked `COMPLETE` and verified in `VERSION3PROGRESS.md`.

`VERSION3_IMPLEMENTATION.md` = WHAT must be implemented.
`VERSION3PROGRESS.md` = WHAT has actually been completed/tested and WHAT remains.

---

# Reference video findings

The reference solution demonstrates capabilities including:

- Know Your Approvals / guided onboarding;
- approval directory and approval discovery;
- incentive/eligibility dashboard;
- statutory documentation guidelines and checklists;
- unified document vault;
- structured document field extraction;
- cross-document verification and discrepancy detection;
- pre-populated application forms;
- normalized master application data;
- department-specific application details;
- application/approval tracker;
- dependency/DAG workflow with parallel processing;
- timeline and alert monitoring;
- statutory renewals management;
- business profile/master data.

The current solution already has strong implementations for several of these:
- regulatory analysis and personalized permissions;
- document vault and reuse;
- readiness validation;
- dependency graph;
- application lifecycle;
- specified-time-limit tracking;
- notifications;
- compliance & renewals;
- incentives;
- government analytics/bottlenecks;
- department-aware government processing.

Do NOT rebuild those existing capabilities.

Version 3 focuses on the genuine gaps below.

---

# Critical external-integration boundary

## NO NEW API KEYS

This Version-3 implementation must require **NO new external API keys**.

Do NOT add:
- Gemini API;
- OpenAI API;
- external LLM/chatbot APIs;
- external OCR APIs;
- MAITRI live APIs;
- NSWS live APIs;
- BHASHINI live APIs;
- DigiLocker live APIs;
- data.gov.in live APIs;
- any paid/external document-analysis service.

All new intelligence must be implemented with:
- existing structured application/project data;
- deterministic business rules;
- configurable metadata;
- local document/text processing already available in the repository;
- manual-verification fallback when reliable automated interpretation is impossible.

The application must remain fully functional without external AI or OCR services.

Official form PDFs may be bundled locally in the repository after source verification; this does not require an API key or live runtime integration.

---

# Implementation priority

Implement in this order:

## P0
1. Generic Project / Know Your Approvals onboarding
2. Approval & Permission Directory
3. Master Business / Project Profile + verified data reuse
4. Common Application Form / pre-populated application
5. Cross-document consistency & discrepancy checker
6. Stronger document guidance/checklists
7. Real parallel application orchestration

## P1
8. Project-level Approval Tracker / Timeline
9. Joint Department Inspection Planner
10. Improved Statutory Renewals Management
11. Contextual Help & Guidance Assistant

Complete one meaningful milestone at a time and update `VERSION3PROGRESS.md` after successful verification.

---

# P0.1 — Generic Project / Know Your Approvals onboarding

## Problem

The current solution is strongly centered on the seeded ABC Foods project and does not provide a complete new-project onboarding experience comparable to a KYA flow.

## Required route

`/app/projects/new`

## 5-step flow

1. Applicant / Entity Profile
2. Project / Investment Proposal
3. Location / Jurisdiction
4. Business & Regulatory Attributes
5. Know Your Approvals / Analysis

Use the existing project creation and ProjectAttribute structures.

Step 5 must call the existing regulatory-analysis API/service.

Show:
- applicable permissions;
- why each applies;
- required documents;
- prerequisites;
- parallel-ready permissions;
- potentially applicable incentives.

After completion:
→ Project Control Centre.

Do not hardcode approval logic in the frontend.

Keep ABC Foods demo data intact.

---

# P0.2 — Approval & Permission Directory

## Problem

The current applicant experience primarily shows approvals already generated for the selected project.

A reusable single-window platform should also let users discover available permissions/services.

## Required route

`/app/approval-directory`

## Required functionality

Search and filter by:
- permission name;
- authority;
- sector;
- project stage;
- category;
- location/jurisdiction;
- inspection requirement;
- renewal requirement.

Each directory item should show:
- permission/approval name;
- issuing department / competent authority;
- description;
- applicability summary;
- configured processing timeline;
- renewal frequency where configured;
- document requirements;
- prerequisites;
- relevant project applicability where a project is selected.

Provide:
`Check Applicability`

which uses the existing regulatory engine/project context.

Do not create duplicate approval master data.

Reuse the existing approval-type catalogue.

---

# P0.3 — Master Business / Project Profile + Verified Data Reuse

## Problem

The current solution reuses documents effectively, but core business/project information is not presented as a reusable master profile.

## Required

Create an applicant-facing:

`Business Profile`

and/or:

`Verified Project Information`

using existing Organization, Project and ProjectAttribute data.

Show reusable values:
- legal entity name;
- entity type;
- PAN/GSTIN fields where already available/configured;
- project name;
- sector;
- investment;
- employees;
- district;
- industrial area;
- address;
- project stage.

Requirements:
- clearly indicate verified/source data;
- allow controlled editing through the existing data flow;
- applications should reuse these values automatically;
- avoid asking the same information repeatedly.

Do not duplicate master data into unrelated tables.

---

# P0.4 — Common Application Form / Pre-Populated Application

## Problem

The reference solution has a unified application form using normalized master data to populate department applications.

The current solution has application workspaces but not a strong reusable common form layer.

## Required workflow

For an application:

`Master Applicant/Project Data`
→ `Common Application Form`
→ `Department Details`
→ `Required Attachments`
→ `Review`
→ `Submit`

Create a reusable application form experience inside the existing application workspace.

Do not replace the current application lifecycle.

The form should automatically pre-populate:
- applicant/entity details;
- project details;
- location;
- investment;
- sector;
- employee count;
- other existing project attributes where applicable.

Show source labels such as:
`From Verified Project Profile`

Allow the applicant to review before submission.

Where a department-specific field is required:
- render it as an additional field;
- keep it separate from shared master data;
- save through the existing application flow.

Do not invent statutory fields unsupported by existing configuration.

---

# P0.5 — Cross-Document Consistency & Discrepancy Checker

## Problem

The current readiness checker primarily checks completeness.
The reference solution also checks consistency across multiple submitted documents.

Implement a local deterministic version.

## Workflow

`Documents`
→ `Extract reliable text/fields`
→ `Compare configured cross-document fields`
→ `PASS / DISCREPANCY / MANUAL REVIEW`

Potential checks:
- applicant/entity name consistency;
- project name consistency;
- plot/area values;
- application/reference numbers;
- relevant dates;
- configured form/template identity;
- other fields explicitly configured for cross-document comparison.

Example:

`Lease Deed: 5000 sq.m`
`Architectural Plan: 4800 sq.m`

Result:

`Discrepancy detected`

`Difference: 4.0%`

`Configured tolerance: 2.0%`

`Action: Review source documents before submission`

The system should identify:
- which documents disagree;
- which field differs;
- both extracted values;
- tolerance used;
- recommended action.

## Technical boundary

Use local text extraction/configured parsing when reliably available.

For unreadable/image-only documents:
`Manual verification required`

Do not fabricate extracted values.

Do not reject a document purely because automated interpretation is uncertain.

Do not claim legal invalidity.

A clearly configured discrepancy may block readiness/submission until resolved.

---

# P0.6 — Stronger Document Guidance & Checklist

## Problem

The reference solution presents statutory document guidelines grouped by approval/clearance type.

Improve the current Document Vault and Application Workspace.

For each permission/application show:

`Required Documents`
`Optional Documents`
`Document Guidance`

Each document requirement can show:
- purpose;
- format;
- mandatory/optional;
- expiry requirement;
- issuing authority where configured;
- sample/template where configured;
- validation state;
- reuse availability.

Integrate with the current readiness check.

Do not create duplicate document storage.

---

# P0.7 — Real Parallel Application Orchestration

## Problem

The current dependency graph identifies `can_start_now`, but parallel readiness needs to become operational.

Add:

`Start Eligible Applications`

Behavior:
- identify currently startable ProjectApproval records;
- exclude existing applications;
- create missing application workspaces;
- preserve prerequisites;
- do not bypass required documents;
- do not auto-submit.

Show:
- number of workflows started;
- applications created;
- dependencies still blocking other applications.

Avoid duplicate application creation.

Reuse existing application/project-approval/dependency services.

---


---

# P0.8 — Prescribed Application Forms / Templates: Verify, Correct, and Make Source-Grounded

## Current repository finding

The current solution ALREADY contains a prescribed-form/template feature:
- `backend/src/services/prescribedFormService.ts`
- `backend/src/routes/approvalTypes.ts`
- `frontend/src/components/forms/PrescribedFormCard.tsx`
- prescribed-form integration tests
- prescribed forms exposed in approval/application views.

Therefore:
**Do NOT reimplement the download-template feature from scratch.**

## Critical correction

The current service contains embedded PDF-like `template_content` strings and labels some entries as `Statutory Prescribed Format`.

These must NOT be treated as official government forms unless their exact file has been verified against an authoritative government source.

Do not invent or paraphrase statutory application forms and label them official.

## Required implementation

1. Audit all existing prescribed forms.
2. For each form determine:
   - exact authority;
   - exact form name;
   - official source;
   - source URL;
   - whether an authoritative downloadable file is available;
   - whether the current file is only a demonstration template.
3. Replace any unverified "Statutory Prescribed Format" embedded content with:
   - a verified official file supplied in the repository, OR
   - a clearly labeled `Demonstration / Configurable Form`, OR
   - an `Official online application` link when the authority provides an online form instead of a downloadable template.
4. Keep provenance visible:
   - Authority
   - Official source
   - Form name
   - Version/date when available
   - `Official source` or `Demonstration / Configurable Form`
5. Preserve:
   - `Download Form`
   - `Upload Completed Form`
   - existing document pre-validation integration.
6. Do not fabricate government forms.
7. Do not silently download from external websites at runtime.
8. Prefer storing verified form PDFs in the repository for the SIH prototype, while also storing their official source/reference URL as metadata.
9. For an official online-only application, provide `Open Official Application` instead of pretending a PDF template exists.

## Initial verified sources to support

Use official sources only:

### MPCB — Common Consent Application Form
Official MPCB PDF:
`https://www.mpcb.gov.in/sites/default/files/consent-management/consent-water-air-act/Combied-consentformNew_31012012.pdf`

MPCB's FAQ states that prescribed consent application forms are available for download from its website. Use the official PDF and mark the historical/version context accurately; do not claim it is a newly revised 2026 form unless the source says so.

### Maharashtra Labour Department — Factory Form 2
Official Maharashtra Labour Department PDF:
`https://mahakamgar.maharashtra.gov.in/Site/Upload/Pdf/form-2.pdf`

Use this for the Factory Licence / registration application where appropriate.

### FSSAI — Form B
Official FSSAI licensing regulations PDF:
`https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Licensing_Regulations_04_08_2021.pdf`

Use the Form B section as the source/reference. Do not extract and fabricate a replacement PDF. Where current FoSCoS uses an online form, support an `Official online application` reference as well:
`https://foscos.fssai.gov.in/apply-for-lic-and-reg`

### MIDC Water Connection
MIDC currently exposes an official online Water Connection application and supporting-document workflow rather than a single static PDF application template.

Official online form:
`https://services.midcindia.org/services/FillFormAnon.aspx?AMId=528`

Official MIDC user manual:
`https://services.midcindia.org/services/AttachmentTemplates/MIDCUpload/Online_Water_Connection_Application_End_User_Manual.pdf`

Model this as:
`Official online application`
rather than generating a fake statutory PDF.

## User-supplied official templates

If a verified official PDF is not safely retrievable from an authoritative source, the implementation should accept a repository-supplied form file and store its official source URL/reference as metadata.

The agent must never invent the contents of such a form.

---

# P1.8 — Project-level Approval Tracker / Timeline

## Problem

The current solution has application timelines and specified-time-limit monitoring, but the reference solution presents a project-level approval tracker showing the overall journey.

Add:

`/app/projects/:id/approval-tracker`

Show:
- total permissions;
- completed;
- in progress;
- blocked;
- ready to start;
- current stage;
- elapsed processing time;
- configured time-limit status;
- upcoming action;
- next milestone;
- application references.

Provide a visual stage tracker:

`Project Setup → Permissions → Parallel Processing → Inspection → Decisions → Compliance`

Also show a consolidated timeline from existing application events.

Do not invent "time saved" metrics unless they can be computed from actual stored comparison data.

If no valid baseline exists, do not display a fabricated savings number.

---

# P1.9 — Joint Department Inspection Planner

## Problem

The current inspection capability schedules individual inspections.
The reference solution suggests common/joint department inspection planning.

Add a lightweight joint planning layer.

Use existing inspection/application/department data.

Support:
- group inspections for the same project/site;
- multiple concerned departments/authorities;
- assigned inspection officers;
- shared site/date/time;
- status;
- findings;
- reschedule;
- conflict warning.

Prefer grouping existing inspection records rather than introducing a large new inspection architecture.

Only add schema if grouping genuinely cannot be represented safely with current data.

Inspector permissions remain inspection-only.

Competent Authority decision rights remain unchanged.

---

# P1.10 — Improved Statutory Renewals Management

Enhance the existing Compliance & Renewals workspace.

Add a clear dashboard:

- Action Required
- Due Soon
- Healthy / On Track
- Overdue

For each renewal:
- permission/clearance;
- authority;
- due date;
- days remaining;
- status;
- source application/reference;
- required renewal documents;
- related compliance requirement.

Provide:
`Prepare Renewal`

which opens the existing application/document workflow with reused project information.

Do not auto-submit renewal applications.

Do not invent statutory renewal periods; use configured data.

---

# P1.11 — Contextual Help & Guidance Assistant

## Important

This is NOT an AI chatbot.

No Gemini, no OpenAI, no external LLM and no API key.

Implement a small deterministic contextual assistant.

It can appear on:
- Project Wizard;
- Approval Directory;
- Permission Detail;
- Application Form;
- Documents;
- Readiness;
- Approval Tracker.

Supported actions/questions:
- Why is this permission required?
- What documents are needed?
- Why is this application blocked?
- What should I do next?
- Which approvals can start now?
- Which document failed validation?
- Which form should I use?
- What is the configured time limit?
- How do I respond to this query?

Responses must come from:
- current project;
- current application;
- permission metadata;
- document requirements;
- readiness results;
- dependency state;
- query state;
- configured time-limit data.

Prefer clickable suggested questions over free-form NLP.

If free-form input is implemented, use simple keyword/intention matching against deterministic answer templates.

Do not fabricate answers.

The application must remain fully usable without this assistant.

---

# Features intentionally NOT copied from the reference

The following must NOT be implemented because they would require external integration, introduce unnecessary dependency, or exceed current scope:

- live DigiLocker verification;
- live MAITRI integration;
- live NSWS integration;
- live BHASHINI translation;
- live data.gov.in service integration;
- external OCR API;
- external AI/LLM chatbot;
- external document intelligence platform.

The reference video may show such concepts, but this implementation must remain self-contained and API-key-free.

---

# Existing features that must remain intact

Do not rebuild or remove:
- personalized permissions analysis;
- regulatory rule engine;
- why-required explanations;
- dependency graph;
- document vault;
- readiness check;
- application lifecycle;
- query lifecycle;
- inspection workflow;
- specified-time-limit engine;
- notifications;
- compliance & renewals;
- incentives & schemes;
- government work queue;
- department-aware authorization;
- bottleneck analytics;
- audit logging;
- accessibility/RBAC safeguards;
- shared MIDC/MPCB government shell.

---

# Database rules

Before schema changes:
1. inspect current schema and relations;
2. reuse existing tables;
3. avoid duplicate master data.

Only add schema where genuinely required.

If schema changes are required:
- update `backend/supabase_schema.sql`;
- synchronize the connected Supabase database where supported;
- update backend service/data-access code in the same milestone;
- add/adjust integration tests.

Do not perform destructive resets.

---

# Implementation rules

For every milestone:
1. inspect current implementation;
2. implement the smallest robust solution;
3. test it;
4. fix failures;
5. update `VERSION3PROGRESS.md`;
6. continue to the next milestone only after verification.

Do not implement later milestones early unless required by a dependency.

---

# Verification

After each milestone:
- run affected backend tests;
- run affected integration tests;
- run frontend type-check;
- run frontend production build where applicable;
- verify the affected user journey.

Final verification must cover:

### Applicant / Investor
- create a new project;
- run Know Your Approvals;
- search approval directory;
- view/reuse verified profile data;
- complete pre-populated application form;
- run document validation;
- detect a configured cross-document discrepancy;
- start eligible parallel applications;
- view approval tracker;
- prepare a renewal;
- use contextual guidance.

### Authorized Representative
- shared applicant workspace remains usable.

### Competent Authority Officer
- existing department-aware work queue and processing remain intact.

### MAITRI Nodal Officer
- existing monitoring/coordination remains intact;
- facilitation workflow remains intact if already implemented.

### Designated Inspection Officer
- inspection-focused permissions remain intact;
- joint inspection assignment, where assigned, works;
- no statutory approval/rejection controls.

### MIDC / MPCB
- same government shell;
- correct department context;
- correct jurisdiction.

---

# VERSION3PROGRESS.md rules

Do not modify:
- `PROGRESS.md`
- `UPDATEPROGRESS.md`

Use `VERSION3PROGRESS.md` as the active progress record.

After each completed milestone record:
- milestone;
- status;
- files changed;
- API changes;
- schema changes;
- test results;
- frontend build result;
- manual verification result;
- remaining issues;
- exact next task.

Never mark a milestone complete before it is tested.

---

# Session safety

If session/context capacity becomes limited:
1. stop starting new work;
2. finish or safely stop the current operation;
3. update `VERSION3PROGRESS.md`;
4. record the exact next file/task/action;
5. stop.

Never leave undocumented work.

The goal is a stronger, more complete PS 26130 solution without unnecessary external dependencies or feature bloat.
