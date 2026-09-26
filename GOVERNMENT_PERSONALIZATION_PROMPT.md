# Government Terminology Personalization Prompt — SIH PS 26130

You are continuing development on the existing SIH 2026 Problem Statement 26130 repository.
Read `IMPLEMENTATION_PLAN.md` and `PROGRESS.md` first. The repository already has Phases 0–3
implemented and verified. **Do not rebuild, re-scope, or break Phase 0–3.** The goal is to
personalize the existing web app so its visible fields, role names, authority context, and
future government workflows use Maharashtra/MAITRI-aligned terminology.

## 1. Primary objective
Personalize the existing application — **do not redesign the product from scratch**.
Keep the same features, pages, API contract, data model, route structure, and shared government
portal. Change mainly:
- visible role names;
- visible field/menu/action labels;
- department/authority wording;
- government-side permission semantics;
- future-phase planning terminology;
- demo wording so the prototype is clearly differentiated from the official MAITRI portal.

## 2. Official role mapping
Keep the current internal enum codes unless a real database migration is later proven necessary.
Use these labels everywhere in visible UI:

| Internal code | Visible label | Use |
|---|---|---|
| `ENTREPRENEUR` | **Applicant / Investor** | Applicant/investor journey. |
| `MANAGER` | **Authorized Representative** | Duly authorised person acting for the entrepreneur/investor. |
| `OFFICER` | **Competent Authority Officer** | Department/authority-side application scrutiny and decision. |
| `NODAL` | **MAITRI Nodal Officer** | Nodal Agency coordination, monitoring, investor facilitation, unresolved queries. |
| `INSPECTOR` | **Designated Inspection Officer** | Assigned inspection/site-verification workflow only. |
| `ADMIN` | **System Administrator** | Platform configuration/administration, not an approval authority. |

For `OFFICER`, always render department context. Example:
**Competent Authority Officer · Maharashtra Pollution Control Board (MPCB)**.
Do not expose “PCB Officer”. Do not expose the raw enum codes in the UI.

## 3. Official terminology to use in the UI
Prefer:
- `Project` → **Project / Investment Proposal** (database/API remains unchanged)
- `Organization` → **Applicant Entity** where that improves clarity
- `Department` → **Concerned Department / Authority**
- `Approval` → **Permission / Approval** where the context includes NOCs, registrations, clearances, consents, licences, etc.
- `Approvals & Licences` → **Permissions, Approvals & Registrations**
- `Approval Roadmap` → **Permissions & Approvals Roadmap**
- `Approval Dependencies` → **Permission Dependencies**
- `Government Work Queue` → **Competent Authority Work Queue**
- `Officer Actions` → **Application Processing Actions** / **Competent Authority Actions**
- `Authority` → **Issuing Department / Competent Authority**
- `SLA` → **Specified Time Limit** when representing the statutory concept; **Configured Service Timeline** for demo/configuration values
- `Query` remains **Query**; applicant helper copy can say **Clarification / Query**
- `Compliance Calendar` → **Compliance & Renewals**
- `Approval Types` → **Permissions / Approvals Catalogue**
- `SLA Policies` → **Specified Time Limit Policies**

Use “scrutiny” and “decision” on government-side screens where the action is actually review/decision making.
Use “Raise Query / Seek Additional Information” instead of generic “Send Back for Revision” when the action means requesting
additional information.

## 4. Authority semantics — important
The Maharashtra MAITRI framework distinguishes:
- **Applicant / Investor**: submits the application.
- **Competent Authority**: scrutinizes/examines the application, may seek additional information through a query, and takes the decision.
- **MAITRI / Nodal Agency**: coordinates between applicant, Competent Authority, committees and departments, monitors applications,
  facilitates investors, and handles unresolved queries/coordination.
- **Empowered Committee**: escalation/decision entity for eligible delayed applications; do not create it as a normal day-to-day login role.
- **Supervisory Committee**: oversight entity; do not create it as a normal day-to-day login role.
- **Designated Inspection Officer**: keep as an implementation role for inspection tasks. Do not claim that “Inspector” is a generic statutory
  MAITRI role because the Act/Rules do not provide that generic role label.

Never make MAITRI/Nodal appear to be the approving authority for every permission.
A concerned Department/Competent Authority should visibly own the scrutiny and decision for its application.

## 5. Keep the existing architecture
Do NOT change:
- Next.js + TypeScript + Tailwind/shadcn UI architecture;
- Express/TypeScript backend;
- Supabase/PostgreSQL architecture;
- existing REST endpoint paths solely to rename terminology;
- Phase-3 workflow logic;
- shared government portal shell;
- seeded-demo architecture;
- adapter boundary for government integrations.

Prefer a centralized presentation mapping such as a `ROLE_LABELS`/`ROLE_META` object rather than changing the database enum.
Prefer additive API fields over breaking changes if a display label is ever needed from the backend.

## 6. Department-aware behavior
Use the existing `department_id` and department records.
Government screens must show **Concerned Department / Authority** and the department's actual name.
MPCB example:
**Maharashtra Pollution Control Board (MPCB)**.
Do not create a separate PCB portal. Keep the shared government shell with department-aware data and permissions.

## 7. Prototype boundary
The project is a prototype/solution for SIH. Do NOT make it look like the official MAITRI portal or claim that it is an official
Government of Maharashtra service.
Keep the existing product brand if desired, but add a visible **Prototype / Demonstration** indicator and use copy such as
**“Maharashtra Industrial Approvals — Prototype.”**
Do not use an official government seal/logo in a way that implies authorization.

All external government calls remain behind the existing adapter and must be labeled **Simulated integration** unless a real authorized
integration has been implemented.

## 8. Source usage rules
Use the following source hierarchy:
1. **Maharashtra Industry, Trade and Investment Facilitation Act, 2023** — primary source for statutory role terminology and permission semantics.
2. **Maharashtra Industry, Trade and Investment Facilitation Rules, 2025** — primary source for application/query/time-limit workflow terminology.
3. **Government of Maharashtra / Industries, Investment and Services Department MAITRI pages** — current institutional naming and portal context.
4. **NSWS** — secondary vocabulary reference only; do not replace Maharashtra role names with central-government labels.
5. **BHASHINI** — future multilingual integration reference only; do not add multilingual functionality now.
6. **data.gov.in** — reference/master-data source only; never use it as a substitute for statutory approval rules.

Regulatory/demo content must remain labeled **demonstration/configurable data** unless backed by an authoritative integrated source.

## 9. Implementation order
Work only from Phase 4 onward.

### Phase 4 first
- create centralized role-label mapping;
- replace visible legacy role names;
- personalize government/applicant field and menu labels;
- add department/authority context badges;
- add prototype/demonstration wording where needed;
- preserve Phase-3 behavior and tests.

### Phase 5 next
- enforce department-aware Competent Authority Officer permissions;
- align query/decision actions with scrutiny and additional-information semantics;
- align MPCB with the same government shell;
- keep MAITRI Nodal Officer focused on coordination and monitoring.

### Phase 6 onward
Follow the personalized `IMPLEMENTATION_PLAN.md` phases exactly.

## 10. Data/schema caution
Do not change the database just to rename visible role labels.
Only introduce schema changes when a real feature requires them. When a schema change is unavoidable,
keep repository schema/migrations and the backend data-access layer synchronized.

## 11. Verification and documentation
After each completed phase:
1. run the relevant backend tests;
2. run the frontend production build/type-check;
3. verify the key role-based journeys manually;
4. ensure no raw role codes remain visible in the UI;
5. update `PROGRESS.md` with what was completed, test results, and any schema/API changes;
6. update `IMPLEMENTATION_PLAN.md` only when the plan itself needs to record a verified change.

Do not mark a feature complete before it is actually tested.
Do not fabricate government integrations, regulatory facts, official designations, or statutory timelines.
