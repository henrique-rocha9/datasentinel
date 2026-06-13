# Sentinel — Anomaly Detection & Risk Classification

Sentinel is an industrial product-risk intelligence platform. It ingests product
metrics, classifies risk in real time, clusters failure modes, raises alerts,
and routes them into investigations.

## Modules
1. Foundation — design system, layout primitives, auth scaffolding
2. Auth & Routing — protected routes under `/_authenticated`
3. Database & RLS — schema, policies, security-definer functions, triggers
4. Core UI — Dashboard, Ranking, Product Detail, Investigations
5. Admin & ML Ops — ingestion, ml_runs, system logs, user roles
6. Feedback Loop — typed server functions with role-gated mutations
7. Demo Seed — idempotent SQL seed for presentation
8. Polish — error/loading primitives, a11y, documentation

## Tech Stack
- TanStack Start v1 (React 19, Vite 7)
- Tailwind CSS v4 + shadcn/ui
- Lovable Cloud (Supabase) — Postgres + Auth + RLS
- TanStack Query for data fetching
- `createServerFn` for typed RPC; admin mutations protected by
  `requireSupabaseAuth` + `has_role(uid,'admin')`

## Routes
- `/` — landing
- `/auth` — sign-in / sign-up / Google OAuth
- `/_authenticated/dashboard` — operational dashboard (authed home)
- `/_authenticated/ranking` — model risk ranking
- `/_authenticated/products/:modelId` — product detail
- `/_authenticated/investigations` — board
- `/_authenticated/investigations/:id` — investigation detail
- `/_authenticated/admin/{ingestion,ml,logs,users}` — admin-only

See `ARCHITECTURE.md`, `DATABASE.md`, `ML_PIPELINE.md`, `DEMO_SCRIPT.md`,
`DEPLOYMENT.md`, and `A11Y_KEYBOARD_AUDIT.md` for details.
