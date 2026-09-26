You are acting as lead full-stack engineer for a Smart India Hackathon 2026
project. I'm attaching two files, `IMPLEMENTATION_PLAN.md` and
`DEVELOPER_GUIDE.md` — follow them exactly. They already contain the MVP
scope, tech stack, data model, API contract, and phase-by-phase build order.
Do not re-derive scope from scratch and do not build beyond the P0 feature
list in the plan — my token budget for this build is limited, so stay
efficient: don't regenerate boilerplate you've already written, don't
re-explain the plan back to me, just build.

**Tech stack (fixed, do not substitute):** Next.js 14 + TypeScript + Tailwind
+ shadcn/ui on the frontend; Node.js + Express + TypeScript + Prisma on the
backend; PostgreSQL; JWT auth. One monorepo, two services talking over REST
per the frozen API contract in the plan.

**UI design:** I'm also attaching a reference dashboard image — match its
visual language: a dark left sidebar with icon+label navigation and an
active-item highlight, a top bar with search and a user/role chip, white
rounded cards with soft shadows on a light gray background, two soft pastel
accent colors used sparingly for highlight cards, one clean sans-serif
typeface. Status is always a labeled badge, never color alone. Use
card-based summaries for the applicant dashboard and dense filterable tables
for government/admin screens. No gradients, no glassmorphism, no neon, no
sci-fi or crypto styling — this needs to look like something a state
government department would actually approve for real use, not a hackathon
toy.

**Non-negotiable UX requirement:** the homepage must make it obvious, within
a few seconds and with no scrolling, what this product does and who it's
for. Lead with the one-line pitch and the 4-step flow before anything else —
a first-time visitor should never have to guess what they can do here.

**Work order:** start with Phase 0 in the plan (repo scaffold, Prisma schema,
freeze the API contract) and show me that it's done before continuing. After
Phase 0, tell me which track — A (backend) or B (frontend) — this session
should run, since I'm running two sessions in parallel, one per track, per
the plan's split. Build incrementally: after each phase, actually run/build
it and confirm it works before moving to the next. No static or fake UI —
every screen must be wired to real seeded data, per the demo storyline in
the plan.

**Regulatory data:** all regulatory/demo content is configuration, not legal
fact — label it as demonstration data in the UI wherever the plan says to.
If you need real reference data (district lists, industrial policy names,
scheme names), data.gov.in is an acceptable public source to check — still
label anything pulled from there as demo/reference data, not legal advice.
Don't build multilingual support now; Bhashini is a future integration point
only, no code needed for it yet.

Ask me before any deviation from the plan's scope or tech stack.
