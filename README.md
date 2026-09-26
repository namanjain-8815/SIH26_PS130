# Industrial Approval & Compliance Intelligence Platform
SIH 2026 · Problem Statement 26130 · Govt. of Maharashtra

Pre-built scaffold for the project described in `IMPLEMENTATION_PLAN.md` and
`DEVELOPER_GUIDE.md` — **keep both of those files in this root** alongside
this one; the agent/dev reads them for scope, data model and the API
contract. This scaffold implements **Phase 0** from the plan: repo layout,
the full Prisma schema, the frozen API contract as working route + service
files, auth boilerplate, and the rule-engine evaluator. Everything else (the
P0 feature list, seed data, UI screens) is Phase 1+ work for the agent.

## Structure
```
/backend    Express + TypeScript + Prisma API (port 4000)
/frontend   Next.js 14 + TypeScript + Tailwind + shadcn/ui (port 3000)
```
See `DEVELOPER_GUIDE.md` §3 for the full folder-by-folder breakdown.

## Quick start
```bash
# 1. Postgres — either run the bundled docker-compose or point DATABASE_URL
#    at any Postgres 14+ instance (see docker-compose.yml, optional)
docker compose up -d

# 2. Backend
cp backend/.env.example backend/.env      # adjust DATABASE_URL / JWT_SECRET if needed
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev            # http://localhost:4000

# 3. Frontend (new terminal)
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev            # http://localhost:3000
```

## Demo accounts
Password `Demo@123` for all (bcrypt-hashed in `backend/prisma/seed.ts`):
`entrepreneur@demo.local`, `manager@demo.local`, `officer@demo.local`,
`nodal@demo.local`, `inspector@demo.local`, `admin@demo.local`

## What's already wired
- Full Prisma schema (`backend/prisma/schema.prisma`) matching plan §5, with
  the compound-unique keys needed for idempotent upserts
- Express app with CORS, JSON body parsing, JWT auth middleware, role guard,
  centralized error handler
- **Every route from the frozen API contract (plan §7) is registered** and
  calls into a matching service function — nothing is missing, nothing
  guessed at a different path
- `authService` fully implemented (login, get current user)
- `regulatoryService.runRegulatoryAnalysis` fully implemented: loads the
  project profile, runs the rule engine against `ApplicabilityRule` rows,
  upserts `ProjectApproval` rows, resolves required documents +
  dependencies, and reuses the *same* evaluator against
  `IncentiveScheme.eligibility_rules` for incentive matching (plan §13 + §23)
- Rule-engine condition evaluator (`rule-engine/evaluate.ts`) implemented per
  DEVELOPER_GUIDE §5 — a dumb, predictable `{field, operator, value}`
  AND-group matcher. Do not add a scripting language to it; put complexity
  in the seeded rule data instead
- `MockGovernmentAdapter` / `GovernmentIntegrationAdapter` interface,
  `LocalStorageAdapter` for documents (swap either later, plan §16, §29, §37)
- Generic admin CRUD helper wired for approval-types/rules/dependencies/
  sla-policies/incentive-schemes, all behind `requireRole('ADMIN')`, all
  audit-logged
- Frontend shell: Tailwind config carrying the exact design tokens from plan
  §8 (dark sidebar, mint/lavender accent, status badges, `rounded-2xl`
  cards, no gradients), API client, auth context, shared TS types

## What's still TODO (the actual hackathon build)
Every function marked `TODO:` in `backend/src/services/*.ts` — this is the
P0 feature list in `IMPLEMENTATION_PLAN.md` §44: Project Control Centre
aggregation, approval detail view, dependency graph + "can start now",
readiness pre-validation, SLA computation, bottleneck analytics. Plus **all**
frontend pages/components (only the root layout + `lib/` exist so far) and
the seed data for the ABC Foods demo journey (plan §42-43) — `seed.ts` only
creates the org/department/demo-user rows, clearly marked where the rest
goes.

Hand this repo + `AGENT_INITIAL_PROMPT.md` to your coding agent to continue
from here. Nothing in this scaffold has been `npm install`'d or compiled —
it was generated without network access, so treat the first build as the
agent's first checkpoint (plan §48: "after each major stage, run/build/test,
fix errors").
