# Industrial Approval & Compliance Intelligence Platform
SIH 2026 — Problem Statement 26130 — Govt. of Maharashtra

Full-stack production platform for industrial regulatory intelligence, approval dependency graphing, dynamic readiness evaluation, SLA monitoring, and incentive matching.

## Tech Stack
```
/backend    Express + TypeScript + @supabase/supabase-js + @supabase/server (port 4000)
/frontend   Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui (port 3000)
/database   Supabase PostgreSQL (connected via HTTPS REST API using service secret key)
```

## Quick Start

### Unified Workspace (Recommended)
Run both backend and frontend concurrently from the root directory:
```bash
npm install
npm run dev              # Starts backend on :4000 & frontend on :3000

# Run complete test suite:
npm test                 # Run all 32 unit & integration tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
```

### Manual Separate Setup

#### 1. Backend Setup
```bash
cd backend
cp .env.example .env

# Configure backend/.env with your Supabase credentials:
# SUPABASE_URL=https://<your-project-ref>.supabase.co
# SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# SUPABASE_SECRET_KEY=sb_secret_...
# SUPABASE_JWKS_URL=https://<your-project-ref>.supabase.co/auth/v1/.well-known/jwks.json
# JWT_SECRET=your-jwt-secret

npm install

# Initialize schema (execute backend/supabase_schema.sql in Supabase SQL Editor if fresh)
# Seed all demo accounts, projects, rules, and mock applications:
npm run seed

# Start API server
npm run dev            # http://localhost:4000
```

#### 2. Frontend Setup
```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api

npm install
npm run dev            # http://localhost:3000
```

## Demo Accounts
Password `Demo@123` for all (bcrypt-hashed in seed):
| Email | Role | Portal Landing |
|---|---|---|
| `entrepreneur@demo.local` | ENTREPRENEUR | `/app/dashboard` |
| `manager@demo.local` | MANAGER | `/app/dashboard` |
| `officer@demo.local` | OFFICER (MIDC) | `/government/work-queue` |
| `pcb.officer@demo.local` | OFFICER (MPCB) | `/government/work-queue` |
| `nodal@demo.local` | NODAL | `/government/work-queue` |
| `inspector@demo.local` | INSPECTOR | `/government/work-queue` |
| `admin@demo.local` | ADMIN | `/admin/approval-types` |

## Key Capabilities Implemented
- **Project Control Centre:** Aggregated readiness metrics, SLA alerts, open queries, pending inspections, and bottleneck analysis derived from real DB rows.
- **Rule Engine & Regulatory Analyzer:** Declarative condition evaluation (`{field, operator, value}`) determining applicable approvals, mandatory documents, and incentive matches.
- **Approval Dependency Graph:** Topological prerequisite mapping with "can start now" resolution and interactive React Flow visualization.
- **Document Vault & Multi-Use Tracker:** Central repository tracking verification statuses, document reuse counts across applications, and upcoming expiries.
- **Government Workflow & SLA Monitoring:** Officer work queue, status update workflows, SLA breach tracking, and bottleneck analytics.
- **Admin Configuration Portal:** Dynamic CRUD management for approval types, applicability rules, dependencies, SLA policies, and incentive schemes.
