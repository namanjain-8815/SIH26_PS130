# Developer Guide

Companion to `IMPLEMENTATION_PLAN.md` — read that first for scope/architecture.
This file is "how do I actually build and run this."

## 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ (local install, or a free hosted instance — Supabase, Neon, Railway all work; you only need the connection string, not their auth/storage products)
- npm or pnpm
- git

## 2. Setup
```bash
git clone <repo-url>
cd project

cp backend/.env.example backend/.env    # set DATABASE_URL, JWT_SECRET
cp frontend/.env.example frontend/.env  # set NEXT_PUBLIC_API_URL=http://localhost:4000/api

cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev          # http://localhost:4000

# new terminal
cd frontend
npm install
npm run dev           # http://localhost:3000
```

**Demo accounts** (password `Demo@123` for all, bcrypt-hashed in the seed
script — never store the plaintext password anywhere except this doc and the
seed source):
`entrepreneur@demo.local`, `manager@demo.local`, `officer@demo.local`,
`nodal@demo.local`, `inspector@demo.local`, `admin@demo.local`

## 3. Folder structure
```
/backend
  /src
    /routes        Express routers — thin, call services only
    /services       business logic, one file per module (see plan §4)
    /rule-engine     evaluateProjectAgainstRules() + rules/*.json
    /middleware      auth.ts, roleGuard.ts, auditLogger.ts, errorHandler.ts
    /adapters        GovernmentIntegrationAdapter, MockGovernmentAdapter, StorageAdapter
  /prisma
    schema.prisma
    seed.ts
/frontend
  /src
    /app             Next.js App Router pages (routes mirror plan §6)
    /components
      /ui             shadcn primitives
      /feature        domain components (ApprovalCard, ReadinessGauge, etc.)
    /lib              api client, auth context, utils
    /mocks            fixture JSON used before an endpoint exists
```

## 4. Conventions
- TypeScript strict mode, both sides
- One Express router file per resource; **no Prisma calls inside route
  files** — routes call a service, services call Prisma
- Branch naming: `dev-a/<feature>` for backend, `dev-b/<feature>` for
  frontend; commit prefix `[A]`/`[B]`
- Merge to `main` at least twice a day — the API contract is the only shared
  surface, so drift is the main risk of working in parallel
- **Any change to an endpoint's request/response shape must be flagged to
  the other dev immediately** — it's the interface contract between you

## 5. How the rule engine works (read this before touching regulatory logic)
- Rules are **data**, not code: seeded rows in `ApplicabilityRule`
  (`rule-engine/rules/*.json` at seed time), each a simple AND-group of
  `{field, operator, value}` conditions against the project profile
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
- **Migration drift in dev** → `npx prisma migrate reset` then `npm run seed`
  (dev DB only, never run reset against anything with real data)
- **Seed script must be idempotent** — use upserts, not raw inserts, so it's
  safe to re-run
- **Dashboard numbers look wrong** → they must always be derived from actual
  rows (see plan §10 "definition of done" — no hardcoded counts anywhere)

## 8. Demo prep
Walk `IMPLEMENTATION_PLAN.md` §9 end-to-end before presenting. If a step
breaks, fix the underlying data/logic — don't patch the UI to fake it.
