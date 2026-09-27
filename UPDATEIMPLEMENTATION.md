# UPDATEIMPLEMENTATION.md
## SIH 2026 · PS 26130 · Gap-Closure Implementation Workflow

### Purpose
This file is the implementation contract for the next improvement cycle after Phases 0–10 and the final UI/navigation cleanup.

The objective is to close the remaining product gaps between the current SIH solution and Problem Statement 26130.

### Required startup workflow
Before doing any work:

1. Read `UPDATEIMPLEMENTATION.md`.
2. Read `UPDATEPROGRESS.md`.
3. Use `PROGRESS.md` only as historical project context; do not modify it.
4. Inspect the existing implementation before changing anything.
5. Do not redo work already marked complete in `UPDATEPROGRESS.md`.

`UPDATEIMPLEMENTATION.md` defines **WHAT should be implemented**.
`UPDATEPROGRESS.md` defines **WHAT has actually been completed, tested, and remains**.

---

# PS 26130 coverage target

After this gap-closure cycle, the solution should cover the core PS requirements as follows:

| Problem Statement capability | Coverage target |
|---|---|
| Customised approval checklist | Existing + New Project Wizard + regulatory analysis |
| Guide applicants through documentation | Existing readiness/document guidance + Contextual Guidance Assistant |
| Pre-validate submissions | Existing readiness check + Document Pre-Validation |
| Reuse verified data | Verified Project Dossier / Data Reuse |
| Coordinate parallel departmental workflows | Parallel Application Orchestration |
| Schedule inspections | Existing inspection workflow + Common Inspection Planner |
| Track service-level timelines | Existing specified-time-limit monitor |
| Issue alerts | Existing role-aware notifications + time-limit alerts |
| Single dashboard for applications/approvals/renewals/incentives | Existing Project Control Centre + Submission Centre |
| Regulatory knowledge engine | Existing rule-driven regulatory engine |
| Risk-based scrutiny | Explainable Scrutiny Priority |
| Common inspection planning | Common Inspection Planner |
| Grievance/support/facilitation | Lightweight Investor Assistance & Facilitation (not a full grievance module) |
| Analytics for identifying delays | Existing stored-event analytics/bottleneck intelligence |
| Easier access to application forms | Prescribed Application Form / Template Download |
| Safer document submission | Document Pre-Validation with explainable failures |
| Application guidance | Contextual Application Guidance Assistant |

Expected outcomes such as reduced approval time, fewer incomplete applications, lower compliance cost and stronger ease of doing business should be treated as **intended product outcomes**, not guaranteed measured results unless supported by real deployment data.

---

## Scope

Do not rebuild the product.

Preserve:
- existing Next.js + Express + Supabase architecture;
- existing shared government portal;
- existing role model and role enum values;
- existing document/query/application/notification workflows;
- existing Phase 0–10 functionality;
- existing Prototype / Demonstration boundaries;
- existing simulated government integration boundary;
- existing BHASHINI future integration seam.

Only implement the gaps listed below.

---

# Priority P0

## 1. New Project / Investor Wizard

### Gap
The current product is heavily centered around the seeded ABC Foods project and does not provide a complete applicant-facing onboarding journey for a new project.

### Required workflow
Create:

`/app/projects/new`

Use a simple 5-step wizard:

1. Applicant Entity
2. Project / Investment Proposal
3. Location & Industrial Context
4. Business / Regulatory Attributes
5. Analyze Applicable Permissions

### Requirements
Step 5 must call the existing regulatory-analysis flow.

The result should show:
- applicable permissions;
- why each permission applies;
- required documents;
- prerequisites;
- permissions that can proceed in parallel;
- potentially applicable incentives.

After completion, land the applicant on the Project Control Centre.

Do not hardcode regulatory logic in the frontend.

Do not remove the ABC Foods demo project.

---

## 2. Verified Project Dossier / Data Reuse

### Gap
Verified reuse is currently strongest for documents. Core project/entity information should also be reused across applications.

### Required behavior
Use existing Organization, Project and ProjectAttribute data.

Show reusable verified information such as:
- Applicant Entity;
- Project / Investment Proposal;
- Sector;
- Investment;
- Employee Count;
- District;
- Industrial Area;
- Project Stage.

Application workspaces should consume these values instead of asking the applicant to repeatedly enter the same information.

Clearly indicate the source of reused information.

Avoid duplicating the same data across unnecessary tables.

---

## 3. Parallel Application Orchestration

### Gap
The dependency graph identifies permissions that can start now, but parallel readiness is mostly visual.

### Required behavior
Add a project-level action such as:

`Start Eligible Applications`

Behavior:
- identify ProjectApproval records that can start now;
- exclude already-started/completed applications;
- create missing application workspaces;
- preserve prerequisite/dependency rules;
- do not bypass required documents;
- do not auto-submit applications to departments;
- do not create duplicate applications.

Show the started workflows clearly.

Reuse the current application/project-approval services and data.

---

## 4. Investor Assistance & Facilitation

### Gap
The product has Incentives & Schemes but does not have a dedicated investor assistance/facilitation workflow.

### Applicant route
Create:

`/app/assistance`

Allow:
- category;
- subject;
- description;
- optional project;
- optional application;
- priority.

Categories:
- Approval Guidance
- Documentation Help
- Application Processing Help
- Incentive / Scheme Guidance
- Compliance & Renewal Help
- General Facilitation

Show:
- request reference;
- status;
- responsible/concerned desk where available;
- timeline/history.

### Government/Nodal workflow
Add a `Facilitation Requests` section to the existing government shell.

MAITRI Nodal Officer should be able to:
- view requests;
- filter them;
- claim/assign where already supported by authorization;
- add coordination notes;
- update/resolve requests;
- notify the applicant.

Do not create a full grievance or dispute-management module.

Use:
- Investor Assistance
- Facilitation Request
- MAITRI Nodal Officer

Do not make the Nodal role the universal approval authority.

Use existing audit and notification patterns.

### Database
Only add schema when existing tables genuinely cannot support the workflow.

If schema changes are necessary:
- inspect current schema first;
- update `backend/supabase_schema.sql`;
- keep live Supabase synchronized where write access is available;
- update backend access code in the same milestone.

---

## 5. Dynamic Compliance Generation

### Gap
Compliance currently works well for the seeded project, but compliance obligations should be derived dynamically from applicable permissions and configured renewal/periodic rules.

### Required pipeline

`Project Profile`
→ `Applicable Permission`
→ `Application`
→ `Compliance Obligation`
→ `Renewal / Due Date`

When regulatory analysis identifies a permission:
- inspect configured renewal/periodic requirements;
- create or update the corresponding compliance obligation;
- associate it with the project;
- avoid duplicates;
- preserve existing completed/complied records where appropriate;
- calculate the next due date from configured frequency.

Do not hardcode ABC Foods-specific compliance rows.

---


---

# Additional P0/P1 Gap-Closure Features

## 6. Contextual Application Guidance Assistant

### Why
The PS requires guiding applicants through documentation and application processing. A lightweight contextual assistant is meaningful, but a generic open-ended chatbot is unnecessary.

### Required approach
Implement a **Contextual Application Guidance Assistant**, not a general-purpose AI chatbot.

It should appear as a small assistant panel/drawer on relevant applicant screens, especially:
- Project / Investment Proposal setup;
- Permission / Approval detail;
- Application Workspace;
- Documents;
- Readiness Check;
- Submission Centre.

It should answer using existing structured application/project metadata and configured help text.

Supported questions/intents should include:
- What is this permission?
- Why is this required?
- Which documents are required?
- Which document is missing?
- What should I do next?
- Why is my application not ready?
- What does this query mean?
- What happens after submission?
- Which permissions can I start now?
- When is the configured service timeline due?
- How can I respond to a query?
- Which form/template should I download?

### Implementation rules
- Prefer deterministic/contextual responses from existing data.
- No external LLM/API key is required.
- Do not present it as an autonomous legal adviser.
- Do not invent statutory requirements.
- Clearly distinguish demonstration/configurable information.
- Keep an optional future seam for an external language/LLM service, but do not integrate one now.
- The assistant must link to the relevant screen/action rather than only returning text.

### Priority
P1 enhancement. It is useful, but the core platform must remain fully usable without it.

---

## 7. Document Pre-Validation / Document Checker

### Why
The PS explicitly aims to reduce incomplete applications. A document checker directly supports that objective.

### Required workflow
When an applicant selects a file for a required document:
1. run technical validation;
2. run configurable document-type checks;
3. show exact validation issues;
4. only allow attachment/submission when the file passes the configured minimum checks.

### Technical validation
Check where applicable:
- supported file type;
- file size;
- readable/non-corrupt file;
- page count constraints;
- required extension/format;
- optional expiry-date presence.

### Content/configurable validation
For documents with configured validation rules, check available text/content for:
- expected document type;
- applicant/entity name;
- project/reference identifiers where applicable;
- required keywords/sections;
- configured form/template identity;
- expiry date when relevant;
- obvious mismatch between selected document type and uploaded content.

### Failure UX
Do not only say "invalid document".

Show:
`Document not accepted`

and exact reasons, for example:
- `Expected: Company PAN Card`
- `Detected: Lease Agreement`
- `Project name does not match the current Project / Investment Proposal`
- `Required section "Declaration" not found`
- `Document is expired`
- `PDF could not be read`

Allow:
`Choose another file`

### Important safety rule
Do not pretend semantic validation is perfect.

If the system cannot reliably determine correctness:
- mark `Manual verification required`;
- do not claim the document is legally invalid.

For scanned/image-only documents, do not add OCR as a hidden requirement. Treat them according to the configured validation capability and return `Manual verification required` when necessary.

### Implementation
- Reuse existing Document Vault and readiness logic.
- Prefer deterministic/configurable rules.
- Keep accepted files in the normal vault flow.
- A file that clearly fails configured validation should not be attached to the application.
- Preserve the applicant's ability to replace/re-upload the file.

### Priority
P0 because it directly addresses incomplete/incorrect submissions.

---

## 8. Prescribed Application Form / Template Download

### Why
NSWS provides approval-specific application forms and prescribed templates, including cases where users download a format, complete it, and upload it. This is a useful single-window convenience for your solution.

### Required workflow
In each applicable Permission / Approval and Application Workspace, show:

`Prescribed Form / Template`

with:
- form/template name;
- document type;
- source;
- version/date when configured;
- `Download Form`;
- `Upload Completed Form`.

### Admin/configuration
Add configurable metadata to the existing permission/approval catalogue only when necessary:
- form/template resource;
- form/template type;
- source URL or repository path;
- source label;
- version/effective date.

Do not fabricate official government forms.

For demonstration forms, label:
`Demonstration / Configurable Form`

For real official forms, store the authoritative source/reference.

### Upload flow
- applicant downloads the prescribed form;
- fills it externally;
- uploads the completed form;
- document checker validates the file against the configured form/template;
- successful validation attaches it to the application;
- readiness check recognizes the completed prescribed form.

### Priority
P1 enhancement.

---

# Priority P1

## 9. Explainable Scrutiny Priority

### Gap
Priority values exist, but there is no strong explainable review-complexity mechanism.

### Required behavior
Add a transparent `Scrutiny Priority` or `Review Complexity` indicator using existing data.

Possible signals:
- missing required documents;
- prerequisite count;
- number of concerned authorities;
- inspection requirement;
- open queries;
- specified-time-limit risk;
- high/critical inspection findings.

Show:
- Low / Medium / High;
- `Why?`;
- 2–4 contributing factors.

Do not present this as a statutory or legally binding risk score.

Prefer computed values over unnecessary schema changes.

---

## 10. Common Inspection Planner

Enhance current inspection functionality with a lightweight planner.

Government-side:
- list/calendar view;
- date filter;
- inspector filter;
- department filter;
- scheduled inspections;
- assigned officer;
- location;
- status;
- basic assignment conflict warning;
- reschedule support.

Designated Inspection Officer:
- assigned inspections;
- upcoming visits;
- site details;
- findings;
- completion.

Do not create a separate inspection portal.

---

## 11. Project Submission Centre

Create a project-level submission view:

`/app/projects/:id/submission-centre`

Show:
- applications ready to submit;
- applications blocked by prerequisites;
- missing documents;
- reused verified documents;
- concerned department/authority;
- configured service timeline;
- application reference;
- current status.

Provide an explicit:
`Review & Submit`

Do not auto-submit.

Do not implement a real payment gateway.

---


### Coverage note
After implementing the P0/P1 milestones in this file, all mandatory capabilities explicitly listed in the PS are represented either by existing verified functionality or by a planned gap-closure milestone above. Optional capabilities such as full grievance escalation remain intentionally lightweight/out of scope. Expected outcomes are product goals, not guaranteed measured results without real deployment data.

# Architecture and product boundaries

Do not change:
- internal role enum values;
- shared MIDC/MPCB government portal model;
- Authorized Representative shared applicant workspace;
- existing notification architecture;
- existing document/query/application workflow unless needed for a verified gap fix;
- existing BHASHINI seam;
- Prototype / Demonstration labeling.

Do not add:
- live government API integrations;
- fake regulatory facts;
- fake translations;
- unrelated AI/OCR;
- unnecessary new frameworks/services;
- separate portals for each department;
- full grievance-management functionality.

---

# Implementation order

Work in this order:

1. New Project / Investor Wizard
2. Verified Project Dossier / Data Reuse
3. Parallel Application Orchestration
4. Investor Assistance & Facilitation
5. Dynamic Compliance Generation
6. Document Pre-Validation / Document Checker
7. Contextual Application Guidance Assistant
8. Prescribed Application Form / Template Download
9. Explainable Scrutiny Priority
10. Common Inspection Planner
11. Project Submission Centre

Complete one meaningful milestone at a time.

After each milestone:
- run the relevant tests;
- fix failures;
- update `UPDATEPROGRESS.md`;
- only then continue.


### External credential rule
No new external API keys are required by this gap-closure cycle.

Do not request or introduce credentials for:
- MAITRI;
- NSWS;
- data.gov.in;
- BHASHINI;
- external LLM/chatbot providers.

The contextual assistant and document checker must use deterministic/local/configured logic unless a future phase explicitly authorizes an external integration.

# Database workflow

Before schema changes:
- inspect existing tables and relations;
- reuse existing structures where possible.

If schema is genuinely required:
- update `backend/supabase_schema.sql`;
- synchronize the connected Supabase project where possible;
- update backend services/data-access in the same milestone.

Frontend must continue using the backend API.

---

# Verification workflow

At minimum, run:
1. frontend type-check;
2. frontend production build;
3. full backend test suite;
4. affected integration tests.

Manually verify:

### Applicant / Investor

- create a new project with the wizard;
- verify contextual assistant guidance on project/application/document screens;
- upload a clearly incorrect document and verify explainable validation failure;
- upload a valid configured document and verify successful attachment;
- download a configured application form/template;
- upload the completed form/template and verify attachment/readiness;
- verify no external API key is required for these features;

- complete the wizard;
- generate applicable permissions;
- understand why each permission applies;
- see verified project information reused;
- start eligible parallel applications;
- see compliance obligations generated;
- create/view Investor Assistance request;
- use Submission Centre.

### Authorized Representative
- shared applicant workspace remains usable;
- correct visible role label.

### Competent Authority Officer
- department-scoped queue;
- scrutiny-priority information;
- permitted processing actions.

### MAITRI Nodal Officer
- facilitation request monitoring/coordination;
- cross-department monitoring;
- no universal approval powers.

### Designated Inspection Officer
- inspection planner/workload;
- assigned inspections;
- findings;
- no statutory approval/rejection controls.

### MIDC / MPCB
- same government shell;
- correct department context;
- correct jurisdiction.

---

# UPDATEPROGRESS.md rules

Do not modify `PROGRESS.md`.

Use `UPDATEPROGRESS.md` as the active handoff record for this improvement cycle.

After every meaningful milestone, record:
- current priority/milestone;
- completed items;
- current/in-progress item;
- remaining items;
- files changed;
- API/schema changes;
- tests/results;
- blockers;
- exact next task.

Never mark a task complete before it is tested.

If a task cannot be safely completed, mark it `IN PROGRESS` and record the exact next action.

---

# Session safety

If context/session capacity becomes limited:
1. stop starting new work;
2. finish the current safe operation;
3. update `UPDATEPROGRESS.md`;
4. record exact next task/file/action;
5. stop.

Never leave undocumented work.

The goal is to close genuine PS 26130 product gaps, not to increase feature count without purpose.
