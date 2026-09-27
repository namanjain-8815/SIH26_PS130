Perform a focused FINAL UI, NAVIGATION, AND ROLE-SEMANTICS CORRECTION PASS on the current repository.

IMPORTANT:
- `NEWIMPLEMENTATION.md` and `NEWPROGRESS.md` are the two files to check before doing any work.
- `NEWIMPLEMENTATION.md` defines WHAT must be done.
- `NEWPROGRESS.md` defines WHAT has already been done and WHAT remains.
- Do not begin implementation until both files have been read.
- If `NEWPROGRESS.md` says a task is already completed and verified, do not repeat it unless a regression is found.
- Read `NEWIMPLEMENTATION.md` first — it is the current task contract for this final cleanup.
- Read `NEWPROGRESS.md` second — it is the current progress/handoff state for this cleanup.
- Use the existing `PROGRESS.md` only as historical reference if needed; do not modify it.
- Phases 0–10 are already completed and verified.
- Do NOT re-implement completed phases.
- Do NOT redesign the product from scratch.
- Do NOT add major new features.
- I will manually record the final 3–4 minute SIH demo.
- Your task is only to fix the verified issues below and perform final integration verification.

PROGRESS FILE RULE:
- Treat existing `PROGRESS.md` as READ-ONLY for this task.
- Do NOT modify, overwrite, rename, or delete `PROGRESS.md`.
- After completing this cleanup, create/update `NEWPROGRESS.md`.
- `NEWPROGRESS.md` must contain:
  - fixes completed
  - files changed
  - tests performed and results
  - frontend build/type-check result
  - database/schema status
  - demo-data cleanup performed
  - remaining known issues, if any
  - exact final state for manual 3–4 minute SIH demo
- Do not claim the demo video was recorded.

AUTHORITATIVE PRODUCT CONTEXT:
- MAITRI is Maharashtra's single-window investment facilitation and coordination layer.
- The concerned Department / Competent Authority processes, scrutinizes and decides the application.
- MAITRI/Nodal should monitor, coordinate, facilitate and handle unresolved-query / eligible escalation workflows.
- Do not present the Nodal role as the universal approval authority.
- The product uses one shared government portal with department-aware behavior.
- MIDC and MPCB Competent Authority Officers use the same underlying government portal with different department/jurisdiction context.
- Authorized Representative acts on behalf of Applicant / Investor and may use the same applicant workspace.
- Designated Inspection Officer is focused on inspection work and must not be presented as a generic approval authority.
- Government-side users must never be silently redirected into the Applicant portal.

==================================================
1. CRITICAL: GOVERNMENT NOTIFICATIONS MUST STAY GOVERNMENT-SIDE
==================================================

Current issue:
`frontend/src/app/government/layout.tsx` currently routes Notifications to the applicant notification route.

This causes government users such as:
- MIDC Competent Authority Officer
- MPCB Competent Authority Officer
- MAITRI Nodal Officer
- Designated Inspection Officer

to enter the Applicant UI.

FIX:
- Create/use:
  `/government/notifications`
- Update the government navigation to use that route.
- Reuse the existing notification API/data and UI patterns where possible.
- Keep the notification page inside the government shell.
- Preserve:
  - authenticated government role
  - concerned department/authority context
  - government sidebar/header
  - Prototype / Demonstration indicator

Applicant notifications must remain:
`/app/notifications`

Government notification actions must NEVER route to `/app/notifications`.

If a government notification contains an application reference:
- open the application in government context;
- do not open the Applicant application page.

==================================================
2. CRITICAL: GOVERNMENT APPLICATION REFERENCES MUST STAY GOVERNMENT-SIDE
==================================================

Current issue:
`frontend/src/app/government/sla-monitor/page.tsx`
contains navigation to:
`/app/applications/:id`

This is incorrect for government users.

FIX:
- Remove government-side navigation to `/app/applications/:id`.
- Clicking an Application Reference from any government page must keep the user inside `/government/*`.

Preferred implementation:
Use the existing government Work Queue detail drawer.

Support:
`/government/work-queue?application_id=<id>`

Then:
- read `application_id` from search params;
- locate the matching work-queue item;
- automatically open the existing government application detail drawer.

Do NOT create a duplicate full application-detail portal.
Do NOT duplicate applicant application pages.

Expected behavior:
- MIDC officer → government application context
- MPCB officer → government application context
- MAITRI Nodal Officer → monitoring/coordination context
- Designated Inspection Officer → inspection-focused context

==================================================
3. AUDIT ALL GOVERNMENT CROSS-PORTAL NAVIGATION
==================================================

Search the complete frontend for accidental government → applicant navigation.

Search for:
- `/app/notifications`
- `/app/applications/`
- `href=`
- `router.push(`
- `router.replace(`
- notification click handlers
- application reference handlers
- SLA monitor links
- bottleneck links
- analytics links
- work queue links

RULE:
Government workflows must stay under `/government/*`.

Do not blindly replace legitimate Applicant links.
Fix only genuine cross-role navigation defects.

==================================================
4. CRITICAL: DESIGNATED INSPECTION OFFICER ROLE CORRECTNESS
==================================================

Current issue:
`frontend/src/app/government/work-queue/page.tsx`

The Inspector currently falls into the generic Competent Authority application-detail action panel.

The review UI shows actions such as:
- Start / Resume Scrutiny
- Raise Query / Seek Info
- Schedule Site Inspection
- Approve Permission
- Reject Application
- Seek Additional Information

This is incorrect for the Designated Inspection Officer.

FIX:
Create a separate Inspector detail state inside the existing government work queue.

For `INSPECTOR`, SHOW:
- Application Reference
- Applicant Entity
- Project / Investment Proposal
- Concerned Department / Authority
- application status
- assigned inspection
- inspection date/time
- site/location
- inspection purpose
- site readiness
- inspection findings
- finding severity
- inspection status/history
- authorized inspection finding actions already supported by the backend

For `INSPECTOR`, DO NOT SHOW:
- Approve Permission
- Reject Application
- Start / Resume Scrutiny
- generic Competent Authority decision controls
- generic statutory approval/rejection controls
- actions implying the Inspector is the approving authority

Keep the existing backend authorization protections.
Do not weaken them.

==================================================
5. INSPECTOR WORK QUEUE MUST BE INSPECTION-FOCUSED
==================================================

Current review issue:
The Designated Inspection Officer is presented with the broad application queue used by Competent Authority Officers.

Fix this using the existing data/services/APIs.

For `INSPECTOR`:
- Prefer assigned/scheduled inspection-related applications.
- Show inspection assignment and status.
- Focus on site verification and findings.
- Keep the shared government shell.

Do NOT:
- create a separate portal;
- invent a new statutory role model;
- give inspection users generic approval powers.

==================================================
6. KEEP MIDC AND MPCB IN ONE SHARED GOVERNMENT PORTAL
==================================================

This is NOT a defect.

Do NOT create separate MIDC and MPCB portals.

Keep:
- same government shell
- same broad navigation
- same shared components

Differentiate through:
- Concerned Department / Authority
- `department_id`
- jurisdiction
- department-filtered data
- department-specific queue
- permitted actions
- department context in the header

Examples:
Competent Authority Officer · Maharashtra Industrial Development Corporation (MIDC)

Competent Authority Officer · Maharashtra Pollution Control Board (MPCB)

==================================================
7. KEEP AUTHORIZED REPRESENTATIVE IN THE APPLICANT WORKSPACE
==================================================

Do NOT create a separate Authorized Representative portal.

Authorized Representative acts on behalf of Applicant / Investor, so the shared applicant workspace is acceptable.

Verify only:
- visible role = Authorized Representative
- no visible legacy role wording
- applicant workflows remain usable

Do not redesign this area.

==================================================
8. REMOVE DEAD SUPPORT CONTROL
==================================================

The Applicant sidebar currently contains a visible Support item without a working feature.

Fix:
- remove the dead Support navigation item.

Do NOT create a new support or grievance module.

==================================================
9. MOVE LOGOUT ABOVE THE USER PROFILE
==================================================

For:
- Applicant layout
- Government layout
- Admin layout

Move Logout immediately above the bottom user/profile block.

Desired structure:

Logout
----------------
Avatar
User Name
Role / Designation

The user profile must remain the bottom-most element.

==================================================
10. DOCUMENT VAULT UPLOAD UX
==================================================

The Document Vault is long and the Upload Document action becomes inconvenient after scrolling.

Fix:
- keep the document list scrollable;
- make the header/action area sticky or otherwise keep Upload Document accessible;
- keep the existing upload modal;
- modal must remain fixed and viewport-centered regardless of scroll;
- do not duplicate upload functionality;
- do not change document business logic unless an actual defect is found.

==================================================
11. CLEAN OBVIOUS DEMO/TEST DUPLICATES
==================================================

Review the current seeded/demo data.

The UI review shows obvious repetition such as:
- repeated test document entries;
- repeated inspection records;
- excessive duplicate notifications;
- repetitive compliance records.

Remove only obvious accidental/test duplication that harms demo quality.

Do NOT remove:
- required ABC Foods scenarios;
- data needed by existing workflows;
- master permission/rule data;
- records needed for Phase 3–10 behavior.

Goal:
A compact, believable SIH demonstration dataset.

Use a safe targeted cleanup.
Do not perform a destructive full database reset.

==================================================
12. BHASHINI
==================================================

Keep the existing BHASHINI architectural seam.

Do not implement live multilingual translation in this pass.
Do not fake translations.
Do not add unrelated language functionality.

==================================================
13. DATA / REGULATORY BOUNDARY
==================================================

Do not add new external government data integration just for this cleanup.

Keep existing regulatory and master data clearly marked as demonstration/configurable where appropriate.

Keep external government connectivity behind the existing adapter and clearly labeled as simulated.

==================================================
14. PROTOTYPE BOUNDARY
==================================================

Preserve:
- Prototype / Demonstration labels
- no official government seal/logo implying authorization
- no claim that this is the official MAITRI portal
- simulated-integration labeling

==================================================
15. VISUAL QUALITY
==================================================

Preserve the current visual direction:
- clean
- modern
- government-adoptable
- rounded cards
- soft shadows
- restrained accents
- readable hierarchy

Do NOT:
- redesign the entire interface;
- add gradients;
- add glassmorphism;
- add neon/sci-fi styling;
- introduce unnecessary animation systems.

==================================================
16. FINAL VERIFICATION
==================================================

After fixes:

A. Run frontend type-check.
B. Run frontend production build.
C. Run full backend test suite.
D. Run affected integration tests.

Manually verify:

APPLICANT:
- Notifications remains Applicant-side.
- Application Reference remains Applicant-side.

AUTHORIZED REPRESENTATIVE:
- Same applicant workspace.
- Correct visible role label.

MIDC COMPETENT AUTHORITY OFFICER:
- Government Work Queue.
- Government Notifications.
- Application Reference opens government detail.
- MIDC jurisdiction remains scoped.

MPCB COMPETENT AUTHORITY OFFICER:
- Government Work Queue.
- Specified Time Limits.
- Government Notifications.
- Application Reference opens government detail.
- MPCB jurisdiction remains scoped.

MAITRI NODAL OFFICER:
- Government Notifications.
- Application Reference opens government monitoring/coordination context.
- No statutory Approve/Reject controls.
- Cross-department monitoring remains available.

DESIGNATED INSPECTION OFFICER:
- Government Notifications.
- Application Reference opens government inspection context.
- Inspection-focused actions only.
- NO Approve Permission.
- NO Reject Application.
- NO generic Competent Authority scrutiny panel.

SYSTEM ADMINISTRATOR:
- Admin shell remains correct.
- Logout appears immediately above the profile block.

GLOBAL:
- government routes do not intentionally open `/app/*`;
- no raw internal role codes appear in production UI;
- department/authority context is correct;
- simulated integrations remain explicitly labeled;
- no obvious duplicate demo/test records remain.

==================================================
17. NEWPROGRESS.MD
==================================================

Do NOT modify `PROGRESS.md`.

Create/update:
`NEWPROGRESS.md`

Record:
- current final integration status;
- exact fixes completed;
- files changed;
- test results;
- frontend build/type-check result;
- database/schema status;
- demo-data cleanup;
- any remaining issue;
- exact final state for manual 3–4 minute demo recording.

Do not state that the demo has been recorded.

==================================================
STRICT SCOPE CONTROL
==================================================

Only fix the issues explicitly listed above.

Do NOT:
- reimplement completed phases;
- create separate MIDC/MPCB portals;
- create a separate Authorized Representative portal;
- change internal role enum values;
- add AI/OCR;
- add fake multilingual functionality;
- add real government integrations;
- add unnecessary schema migrations;
- create a support/grievance system;
- redesign the entire UI.

If an item is already correct, do not modify it unnecessarily.

If a problem can be fixed in a shared component, fix it at the smallest reusable point instead of duplicating components.

SESSION SAFETY:
- If context/session capacity becomes limited, stop starting new work.
- Finish the current safe operation.
- Update `NEWPROGRESS.md`.
- Stop.
- Never leave undocumented work.