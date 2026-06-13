# Database

All tables live in the `public` schema with RLS enabled and explicit
`GRANT`s for `authenticated` and `service_role`.

## Inventory
- `product_families`, `product_models` — catalogue.
- `product_metrics` — raw ingested metrics per model/date.
- `product_aggregates` — rolled-up metrics (rebuilt via `fn_rebuild_aggregates`).

## Risk & clustering
- `risk_current` — current risk class per model.
- `risk_history` — change log (written by `fn_record_risk_change`).
- `cluster_current`, `cluster_history` — failure-mode clusters
  (`fn_record_cluster_change`).
- `recommendations` — generated per risk transition.

## Alerts & investigations
- `alerts` — open/closed escalations.
- `investigations` — workflow records; status transitions to
  `resolved`/`dismissed` auto-close the source alert via
  `tg_investigation_resolves_alert`.
- `investigation_logs` — comments and status changes.

## ML & ops
- `ml_runs` — training/inference runs; metrics & artifacts in `metadata`.
- `import_batches`, `import_errors` — CSV ingestion bookkeeping.
- `system_logs` — audit trail.

## Identity & roles
- `auth.users` (managed by Supabase).
- `public.profiles` — display profile (created by `handle_new_user` trigger).
- `public.user_roles (user_id, role app_role)` — roles live ONLY here.
- `has_role(uid, role)` — SECURITY DEFINER; used by every role-gated policy
  and server function.

## Triggers
- `handle_new_user` on `auth.users` → seeds `profiles` and grants default
  `viewer` role.
- `tg_touch_updated_at` on mutable tables.
- `tg_investigation_resolves_alert` on `investigations`.
