# Developer Guide

Companion to `IMPLEMENTATION_PLAN.md` — read that first for scope/architecture.
This file is "how do I actually build and run this."

## 1. Prerequisites
- Node.js 18+
- Supabase account (or local PostgreSQL instance with Supabase API)
- npm or pnpm
- git

## 2. Setup
```bash
git clone <repo-url>
cd project

# Backend environment configuration
cp backend/.env.example backend/.env
# In backend/.env, set:
# SUPABASE_URL=https://<your-project-ref>.supabase.co
# SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# SUPABASE_SECRET_KEY=sb_secret_...
# SUPABASE_JWKS_URL=https://<your-project-ref>.supabase.co/auth/v1/.well-known/jwks.json
# JWT_SECRET=your-jwt-secret

# Frontend environment configuration
cp frontend/.env.local.example frontend/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Root workspace setup (runs both frontend & backend concurrently)
npm install
npm run dev              # Starts backend on :4000 & frontend on :3000

# Or run separately:
cd backend && npm install && npm run seed && npm run dev
cd frontend && npm install && npm run dev

# Testing:
npm test                 # Run all 32 unit + integration tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
```

**Demo accounts** (password `Demo@123` for all, bcrypt-hashed in the seed
script — never store the plaintext password anywhere except this doc and the
seed source):
- `entrepreneur@demo.local` (ENTREPRENEUR)
- `manager@demo.local` (MANAGER)
- `officer@demo.local` (OFFICER / MIDC)
- `pcb.officer@demo.local` (OFFICER / PCB)
- `nodal@demo.local` (NODAL)
- `inspector@demo.local` (INSPECTOR)
- `admin@demo.local` (ADMIN)

## 3. Folder structure
```
/backend
  /src
    /adapters        GovernmentIntegrationAdapter, MockGovernmentAdapter, StorageAdapter
    /lib             supabase.ts (client), supabaseDb.ts (ORM adapter), jwt.ts, errors.ts
    /middleware      auth.ts, roleGuard.ts, auditLogger.ts, errorHandler.ts
    /routes          Express routers — thin, call services only
    /rule-engine     evaluate.ts + types.ts
    /services        business logic, one file per module
    /types           database.ts (models & enums), express.d.ts
    app.ts           Express application setup
    index.ts         HTTP server entrypoint
    seed.ts          Full database seed script
  supabase_schema.sql Full PostgreSQL DDL schema for Supabase
/frontend
  /src
    /app             Next.js App Router pages
      /app           Applicant portal (dashboard, approvals, projects, etc.)
      /government    Government officer portal (work queue, SLA monitor, analytics)
      /admin         Admin portal (approval types, rules, dependencies, audit log)
      /login         Split-pane authentication page
    /components
      /ui            StatusBadge, Skeleton, EmptyState, ErrorState
    /lib             api.ts (typed API client), auth-context.tsx, utils.ts
    /types           Frontend domain types & API payloads
```

## 4. Conventions
- TypeScript strict mode, both sides
- One Express router file per resource; **no direct DB queries inside route
  files** — routes call a service, services call the data access layer (`supabaseDb`)
- Branch naming: `dev-a/<feature>` for backend, `dev-b/<feature>` for
  frontend; commit prefix `[A]`/`[B]`
- Merge to `main` at least twice a day — the API contract is the only shared
  surface, so drift is the main risk of working in parallel
- **Any change to an endpoint's request/response shape must be flagged to
  the other dev immediately** — it's the interface contract between you

## 5. How the rule engine works (read this before touching regulatory logic)
- Rules are **data**, not code: seeded rows in `ApplicabilityRule`,
  each a simple AND-group of `{field, operator, value}` conditions against the project profile
- `evaluateProjectAgainstRules(project, rules)` returns
  `{applicableApprovals, reasons, requiredDocuments, dependencies, incentives, warnings}`
- Every applicable approval must carry a human-readable `reason` string —
  never surface an approval with no explanation
- **To add a new approval type:** add a row to `ApprovalType`, its
  `ApplicabilityRule` condition object, its `DocumentRequirement`s, and any
  `ApprovalDependency` rows. No UI or route code changes needed — this is
  the whole point of keeping it data-driven.
- Resist adding a scripting/expression language to the evaluator — keep it a
  dumb, predictable condition matcher. Complexity belongs in the data, not
  the engine.

## 6. Labeling rules (don't skip these — they're in the problem statement)
- Regulatory content the app didn't pull from an authoritative integrated
  source is **demonstration/configurable data** — say so in the UI
- SLA copy: "Configured SLA" / "Configured service timeline", never
  "legally guaranteed"
- Incentive copy: "Potentially applicable based on current project
  information", never "You are guaranteed this benefit"
- Anything from `MockGovernmentAdapter`: label as **simulated integration**

## 7. Troubleshooting
- **CORS errors** → confirm Express `cors()` allows `http://localhost:3000`
- **Database resets in dev** → re-run `npm run seed` (upserts are idempotent)
- **Seed script is idempotent** → uses upserts and fixed IDs, so re-running is always safe
- **Dashboard numbers look wrong** → they must always be derived from actual
  rows (see plan §10 "definition of done" — no hardcoded counts anywhere)

## 8. Demo prep
Walk `IMPLEMENTATION_PLAN.md` §9 end-to-end before presenting. If a step
breaks, fix the underlying data/logic — don't patch the UI to fake it.
