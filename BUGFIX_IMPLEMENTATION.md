# BUGFIX_IMPLEMENTATION.md
## SIH 2026 · PS 26130 · Final Document, Identity, Session & Login Corrections

### Purpose

This is a focused bug-fix and usability pass on the current Version-3 solution.

The current Version-3 implementation is already complete. Do not rebuild Version 3 or add unrelated features.

This pass addresses:
- real PDF field extraction in the Document Vault;
- Document Detail Centre;
- editable aggregated extracted data and automatic reuse;
- removal of fake/test document clutter;
- document deletion;
- role-first login;
- applicant/entrepreneur account registration;
- administrator-created officer accounts;
- correct Authorized Representative semantics;
- session lifetime behavior.

### Mandatory startup workflow

Before doing any work:

1. Read `BUGFIX_IMPLEMENTATION.md`.
2. Read `BUGFIX_PROGRESS.md`.
3. Read `VERSION3PROGRESS.md` only as historical/current product context.
4. Inspect the existing implementation before changing anything.
5. Do not repeat anything already marked COMPLETE in `BUGFIX_PROGRESS.md`.

`BUGFIX_IMPLEMENTATION.md` = what must be fixed.
`BUGFIX_PROGRESS.md` = actual work completed/tested and exact next task.

Do not modify the historical progress files.

---

# Critical boundary

## No new external API keys

This bug-fix cycle must remain self-contained.

Do NOT add:
- external OCR API;
- Gemini;
- OpenAI;
- external LLM;
- DigiLocker/API Setu live integration;
- MAITRI live API;
- NSWS live API;
- BHASHINI live API;
- data.gov.in live API.

Local PDF text extraction is allowed and expected.

If a local PDF parsing dependency is not already present, a small server-side package such as `pdf-parse`/equivalent may be added. This is a normal application dependency and does not require an API key.

For scanned/image-only PDFs:
- do not invent extracted values;
- do not falsely reject them;
- return `MANUAL VERIFICATION REQUIRED`.

---

# 1. DOCUMENT VAULT — REAL PDF FIELD EXTRACTION

## Current problem

The current cross-document implementation reads limited raw file bytes / filename hints and can fall back to hardcoded demo values.

That is not sufficient for a real uploaded PDF.

When an applicant uploads an actual text-based PDF, the system must genuinely parse the PDF text and extract configured fields from the contents.

## Required workflow

`Upload PDF`
→ `Local PDF text extraction`
→ `Configured field extraction`
→ `Validation / consistency checks`
→ `Persist extracted fields`
→ `Show extracted details`

Do not depend on filename alone.

Do not use hardcoded ABC Foods values as extraction results for newly uploaded documents.

## Minimum fields

Support extraction where present:
- legal entity / company name;
- applicant / organization name;
- PAN;
- GSTIN;
- CIN;
- project name;
- plot / survey number;
- plot/site area;
- built-up area;
- district;
- industrial area;
- registered address;
- worker count;
- power demand;
- water demand;
- document date;
- expiry date;
- application/reference number;
- relevant form/document reference.

The extractor should be field-pattern/configuration driven so more fields can be added without rewriting the upload flow.

## Extraction confidence/result

For every field, retain:
- extracted value;
- source document;
- extraction status;
- extracted timestamp;
- optional confidence/quality indicator if the local parser can provide one.

Do not present a guessed value as verified.

Use:
- `EXTRACTED`
- `MANUAL_VERIFICATION_REQUIRED`
- `NOT_FOUND`

where appropriate.

---

# 2. DOCUMENT DETAIL CENTRE

## Required feature

Add a dedicated **Document Detail Centre** inside the Document Vault.

Suggested route:

`/app/documents/details`

or a clearly accessible tab from `/app/documents`.

## Purpose

Aggregate extracted details from ALL uploaded documents into one master view.

Example:

### Identity
- Legal Entity Name
- PAN
- GSTIN
- CIN

### Project
- Project Name
- Sector
- Stage

### Site
- Plot Number
- Plot Area
- Built-up Area
- District
- Industrial Area
- Address

### Utilities / Technical
- Power Demand
- Water Demand
- Workers

### Dates / References
- Document Dates
- Expiry Dates
- Application References

For each field show:
- current value;
- source document(s);
- extraction status;
- conflict indicator if documents disagree;
- last updated time.

---

# 3. DETAIL CENTRE — EDITABLE MASTER VALUES

The applicant must be able to edit values in the Detail Centre.

Important distinction:

The user is editing the **master reusable value**, not modifying the original PDF.

Example:

`Plot Area`
Current extracted values:
- Lease Agreement → 5000 sq.m
- Building Plan → 4800 sq.m

Show:

`CONFLICT DETECTED`

Then allow the applicant to resolve/update the master value after reviewing the source documents.

When a user manually changes a master field:
- mark provenance as `User Override / Manually Confirmed`;
- retain source-document history;
- do not overwrite the original extracted value;
- record an audit event.

The system must distinguish:
- extracted value;
- source document;
- user-confirmed/overridden master value.

---

# 4. AUTOMATIC DATA REUSE FROM DETAIL CENTRE

Once a field is confirmed in the Detail Centre, reuse it automatically across existing workflows.

Required reuse targets:
- Common Application Form;
- application workspaces;
- Project / Investment Proposal profile;
- Submission Centre;
- renewal preparation;
- relevant permission/application prefill.

Example:

`Legal Entity Name = ABC Foods Pvt Ltd`

confirmed in Detail Centre

→ CAF automatically shows:

`ABC Foods Pvt Ltd`
`From Verified Document Detail Centre`

Similarly for:
- PAN;
- GSTIN;
- plot number;
- site area;
- investment where applicable;
- workers;
- power;
- water;
- address.

If a value is disputed/conflicting:
- do not silently propagate one value;
- show `Needs Review` until the applicant resolves it.

---

# 5. RE-EXTRACTION

For an uploaded document:
- provide `Extract Again` / `Re-check Details` where appropriate;
- re-run extraction;
- update extracted fields;
- do not overwrite a manual master override without explicit confirmation;
- invalidate/recalculate consistency checks where source values changed.

---

# 6. DOCUMENT DELETE

## Current problem

The Document Vault has View/Replace actions but no proper Delete action.

## Required behavior

Add a visible `Delete` action for documents owned by the applicant.

Use confirmation:

`Delete document?`

Show:
- document name;
- applications currently using it;
- warning about consequences.

### Safe rules

If the document is not attached to any submitted/approved application:
- allow deletion;
- remove the Document database record;
- remove the stored local file;
- invalidate related caches/derived views;
- record an audit event.

If the document is attached to an active draft application:
- require detach/remove-from-application first or clearly offer that action before deletion.

If the document is attached to a submitted/approved application:
- do not silently destroy the historical record;
- block permanent deletion and explain why;
- provide appropriate replacement/archive behavior using existing versioning if available.

Do not use destructive cascading behavior that can corrupt application history.

---

# 7. REMOVE FAKE / TEST DOCUMENT CLUTTER

The current demo vault has visible test/rehearsal artifacts such as:
- `Test Phase 3 ...`
- `test_phase3_...`

These must not appear in the final applicant Document Vault.

## Required cleanup

1. Remove known test/rehearsal document records from the active ABC Foods demo project.
2. Remove their local stored files where safe.
3. Replace the visible vault contents with a small believable set of synthetic demonstration documents.
4. Use the supplied files in the `PS130_demo_documents` bundle when they are placed in the repository.

Recommended demo documents:
- `01_company_identity_profile.pdf`
- `02_midc_lease_agreement.pdf`
- `03_mpcb_cte_application.pdf`
- `04_factory_form2_filled.pdf`
- `05_electricity_sanction_letter.pdf`
- `06_building_plan_discrepancy_sample.pdf` (only when demonstrating discrepancy detection)

These are SYNTHETIC demonstration documents, not official government forms.

## Test isolation

Existing integration tests must not pollute the visible demo vault with persistent `Test Phase 3` documents.

Tests should:
- use isolated IDs/data;
- clean up after themselves;
- or use a fixture mechanism that cannot become part of the visible demo dataset.

---

# 8. DOCUMENT VAULT UI QUALITY

Keep the existing sticky upload header.

Improve the document rows so each document can expose:
- document type;
- status;
- extracted field count;
- `View Details`;
- `View Extracted Data`;
- `Replace`;
- `Delete`.

Do not make the page visually overloaded.

---

# 9. LOGIN — ROLE FIRST

## Current problem

The login page immediately shows all demo credentials/buttons together.

Change it to a role-first flow.

### Step 1

Ask:

`Who are you logging in as?`

Show categories:

1. `Applicant / Investor / Entrepreneur`
2. `Authorized Representative`
3. `Government Official`
4. `System Administrator`

### Step 2

After selecting a category, show only the relevant demo login choices.

Applicant:
- Applicant / Investor / Entrepreneur demo

Authorized Representative:
- Authorized Representative demo
- explicitly show who they represent:
  `Representing: ABC Foods Pvt Ltd`

Government Official:
- Competent Authority Officer · MIDC
- Competent Authority Officer · MPCB
- MAITRI Nodal Officer
- Designated Inspection Officer

System Administrator:
- System Administrator demo

Keep actual login via email/password.

Do not expose internal role enum codes.

---

# 10. APPLICANT / INVESTOR / ENTREPRENEUR TERMINOLOGY

For the `ENTREPRENEUR` internal role, use the visible label:

`Applicant / Investor / Entrepreneur`

Use this consistently on:
- login;
- header;
- profile;
- dashboards;
- notifications;
- forms;
- navigation;
- role chips.

Do not expose the internal enum value.

This should be treated as the primary applicant-side category for this prototype.

---

# 11. AUTHORIZED REPRESENTATIVE SEMANTICS

Do NOT remove the Authorized Representative role.

It is not the same as Applicant / Investor / Entrepreneur.

Correct semantics:

`Applicant / Investor / Entrepreneur`
= entrepreneur/investor/business principal applying through the system.

`Authorized Representative`
= a person authorized to act on behalf of that Applicant / Investor / Entrepreneur.

Keep the existing internal role model.

For the demo Authorized Representative account, visibly show:

`Authorized Representative`
`Representing: ABC Foods Pvt Ltd`

On relevant profile/header/context areas, show the represented applicant entity.

Do not create a separate portal.

The Authorized Representative may continue using the shared applicant workspace, but the UI must clearly indicate whom the representative is acting for.

---

# 12. NEW ENTREPRENEUR ACCOUNT CREATION

The login page must include:

`Create Applicant / Entrepreneur Account`

Implement a real registration flow.

Suggested fields:
- full name;
- email;
- password;
- organization/legal entity name;
- entity type;
- sector;
- contact number where supported.

On registration:
- create a new Organization;
- create the user with applicant/entrepreneur role;
- hash the password;
- prevent duplicate email accounts;
- log the user in or redirect to login;
- do not create government permissions automatically until a project is created/analyzed.

Keep this as a lightweight prototype registration.

No external identity provider is required.

---

# 13. ADMIN — CREATE OFFICER ACCOUNT

The System Administrator must have an account-management area.

Suggested:
`/admin/users`

Allow Admin to create:
- Competent Authority Officer;
- optionally Designated Inspection Officer where required by the existing role model.

For a Competent Authority Officer require:
- name;
- email;
- password;
- department/authority.

Department is mandatory for department-bound officers.

For Inspector:
- name;
- email;
- password;
- department/authority.

Apply existing authorization:
- only ADMIN can create government accounts;
- applicant/government non-admin users cannot access this function.

Do not allow the admin UI to expose raw role enum codes.
Use official visible role labels.

After creation:
- new officer can log in using the new credentials;
- department context appears correctly;
- existing jurisdiction filtering applies.

---

# 14. SESSION BEHAVIOR

## Current problem

The frontend stores JWT in `localStorage`, so closing the browser/tab can leave the user logged in.

Required behavior:

`Login`
→ session starts

`Logout`
→ session ends

`Close tab/browser`
→ session ends

## Implementation

Use a session-scoped browser storage mechanism such as `sessionStorage` for the frontend token instead of persistent `localStorage`.

Update all token access in:
- auth context;
- API client;
- logout;
- auth initialization.

On browser/tab close, no token should remain available to restore the session.

On explicit logout:
- remove the session token;
- clear current auth state;
- redirect to `/login`.

Do not store authentication tokens in persistent local storage.

Keep JWT backend validation and expiry.

Add/adjust tests for:
- login;
- logout;
- unauthenticated reload;
- session restoration within the same session;
- no persisted token after closing the browsing session.

---

# 15. DO NOT CHANGE EXISTING ROLE/PORTAL ARCHITECTURE

Keep:
- shared government shell;
- department-aware MIDC/MPCB officers;
- MAITRI Nodal coordination role;
- Designated Inspection Officer inspection role;
- shared applicant workspace for Authorized Representative;
- existing backend authorization.

Do not create separate MIDC/MPCB portals.

Do not make Authorized Representative a new authority type.

---

# 16. DATABASE

Before schema changes:
1. inspect the current database structure;
2. reuse existing tables/relations;
3. make the smallest safe schema change.

A small schema extension is acceptable for persistent extracted document details and provenance if current tables cannot support it.

Prefer a structure that can store:
- document_id;
- field_key;
- extracted_value;
- extraction_status;
- source/provenance;
- extracted_at;
- user_override_value;
- override_at;
- override_actor.

Do not store sensitive data unnecessarily.

If schema changes are necessary:
- update `backend/supabase_schema.sql`;
- synchronize the connected Supabase database where supported;
- update backend types/services/routes in the same milestone;
- add integration tests.

---

# 17. VERIFY WITH SUPPLIED DEMO PDFs

Use the supplied `PS130_demo_documents` PDFs as integration fixtures.

Expected extraction examples:

`01_company_identity_profile.pdf`
→ legal name, CIN, PAN, GSTIN, address

`02_midc_lease_agreement.pdf`
→ plot 42, 5,000 sq.m, district, industrial area

`03_mpcb_cte_application.pdf`
→ project, plot 42, 5,000 sq.m, 500 kVA, 50 KLD, pollution category

`04_factory_form2_filled.pdf`
→ workers 80, power 500 kVA, water 50 KLD, built-up 3,200 sq.m

`05_electricity_sanction_letter.pdf`
→ plot 42, 500 kVA, 11 kV

`06_building_plan_discrepancy_sample.pdf`
→ plot 42, 4,800 sq.m

When all are uploaded:
- Detail Centre should aggregate the fields;
- consistent values should be reusable;
- the 5,000 vs 4,800 sq.m difference should be clearly flagged by the consistency engine;
- the user should be able to resolve the master value.

---

# 18. VERIFICATION

After each meaningful milestone:
- run relevant backend tests;
- run affected integration tests;
- run frontend type-check;
- run frontend production build where appropriate;
- manually verify the affected workflow;
- update `BUGFIX_PROGRESS.md`.

Final verification must include:

### Document Vault
- upload real text-based PDF;
- extract actual content;
- display extracted fields;
- open Document Detail Centre;
- edit a master field;
- verify reuse in CAF/profile/submission/renewal;
- show source provenance;
- detect document conflicts;
- delete an unused document;
- protect submitted/approved historical documents;
- no Test Phase 3 documents visible.

### Login
- role selection appears before credentials;
- relevant demo choices appear after selection;
- Applicant / Investor / Entrepreneur wording is consistent;
- Authorized Representative shows represented organization;
- Government Official reveals government roles;
- System Administrator is separate.

### Registration
- new Applicant / Entrepreneur account can be created;
- duplicate email is blocked;
- new account can log in.

### Admin
- admin can create department-bound Competent Authority Officer;
- officer can log in;
- department context is correct;
- non-admin cannot create officer accounts.

### Session
- login persists during the active session;
- logout ends session;
- closing tab/browser ends frontend session;
- no persistent auth token remains in localStorage.

### Regression
Run the complete backend suite and frontend production build.
Do not mark the bug-fix cycle complete if existing workflows regress.

---

# 19. BUGFIX_PROGRESS.md

Do NOT modify:
- `PROGRESS.md`
- `UPDATEPROGRESS.md`
- `VERSION3PROGRESS.md`

Use `BUGFIX_PROGRESS.md` as the active handoff record.

After every meaningful milestone record:
- milestone/status;
- exact implementation;
- files changed;
- API/schema changes;
- tests;
- build status;
- manual verification;
- remaining issues;
- exact next task.

Never mark a milestone complete without testing.

---

# 20. SESSION SAFETY

If context/session capacity becomes limited:
1. stop starting new work;
2. finish or safely stop the current safe operation;
3. update `BUGFIX_PROGRESS.md`;
4. record the exact next task/file/action;
5. stop.

Never leave undocumented work.

The goal is a reliable final SIH prototype, not a broad redesign.
