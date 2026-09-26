# Project Progress

## Current Phase
Backend Track — Milestone B1 (Seed Data) ? B3+ (Services) in progress

## Overall Status
Phase 0 scaffold verified. Backend has full skeleton: all 15 services, 15 route files, middleware, rule-engine evaluator, Prisma schema. Most services have stub/TODO implementations. Auth service is complete. Seed has only org + dept + users (demo project data is TODO). This session implements B1 (full seed) + B3+ (complete services).

## Completed
- [B0] Schema verified (22 tables, all enums, all relations)
- [B0] All 15 service stubs exist (authService complete; rest partial stubs)
- [B0] All 15 route files wired in routes/index.ts
- [B0] Middleware: auth.ts, roleGuard.ts, auditLogger.ts, errorHandler.ts
- [B0] Rule engine: evaluate.ts complete (AND-group condition matcher)
- [B0] lib: errors.ts, jwt.ts, prisma.ts
- [B0] npm install completed

## In Progress
- [B1] Full seed data implementation
- [B3] Implementing all service TODO stubs

## Pending
- [B1] seed.ts with full ABC Foods demo data
- [B2] Auth route smoke test
- [B3] projectService.getControlCentre()
- [B3] dependencyService.getDependencyGraph() + getCanStartNow()
- [B3] approvalService.getProjectApprovalDetail()
- [B4] applicationService.runReadinessCheck()
- [B5-B14] All remaining service implementations
- [B15] TypeScript build + migration + seed smoke test

## Current Backend Module
B1 — Seed Data (primary) + B3-B14 service implementations

## Last Completed Task
B0 — Baseline scaffold verification

## Current Task
Implementing full seed.ts + all service implementations

## Next Recommended Task
After this session: run `npx prisma migrate dev --name init` then `npm run seed`, then `npm run dev`, smoke test all endpoints

## Files Changed In This Iteration
- PROGRESS.md (this file — created)
- backend/prisma/seed.ts (full rewrite)
- backend/src/services/projectService.ts
- backend/src/services/dependencyService.ts
- backend/src/services/approvalService.ts
- backend/src/services/applicationService.ts
- backend/src/services/documentService.ts
- backend/src/services/queryService.ts
- backend/src/services/inspectionService.ts
- backend/src/services/slaService.ts
- backend/src/services/incentiveService.ts
- backend/src/services/complianceService.ts
- backend/src/services/analyticsService.ts
- backend/src/services/notificationService.ts
- backend/src/services/auditService.ts

## Database Status
- schema: verified — 22 tables match plan
- migrations: PENDING (user must create .env with DATABASE_URL first)
- seed: being implemented this session

## API Status
- implemented: /health, /api/auth/login, /api/auth/me, /api/projects CRUD, /api/projects/:id/regulatory-analysis, /api/projects/:id/approvals
- pending: /api/projects/:id/control-centre, /api/projects/:id/dependency-graph, /api/project-approvals/:id, /api/applications/:id/readiness-check, all government + admin endpoints
- changed: none (contract frozen)

## Tests / Validation
- TypeScript build: PENDING (after npm install)
- Prisma validate: PENDING (needs DB)
- Seed: PENDING (needs DB)
- API smoke tests: PENDING

## Known Issues
- No .env file exists — user must cp .env.example .env and set DATABASE_URL + JWT_SECRET
- PostgreSQL must be running before migrations/seed

## Important Architectural Decisions
- Seed uses fixed UUIDs (e.g., "proj-abc-foods") for idempotent upserts
- SLA computed from submitted_at + SLAPolicy.duration_days; at-risk = <20% time remaining
- Dependency graph: nodes = ProjectApproval rows, edges = ApprovalDependency rows
- Control centre aggregates real DB rows — no hardcoded numbers
- All labeling: "Configured SLA", "Potentially applicable", "Simulated integration"

## Do NOT Touch
- frontend/**
- frozen API contract (document changes in API_CHANGELOG.md if needed)

## Handoff Notes
- User must set up PostgreSQL, create .env, then run migrations + seed
- Demo password all accounts: Demo@123
- Main demo project fixed ID: "proj-abc-foods"
