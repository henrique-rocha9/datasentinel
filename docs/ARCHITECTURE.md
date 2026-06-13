# Architecture

## Layers
- **UI / Routes** — `src/routes/**` (file-based). Authenticated routes live
  under the `_authenticated` layout, which gates access via `supabase.auth.getUser()`.
- **Shell** — `src/components/shell/AppShell` provides landmarks
  (`<aside>`, `<header>`, `<main>`), skip link, sidebar nav and topbar.
- **Feedback primitives** — `EmptyState`, `TableSkeleton`, `RouteError`
  used by all data routes.
- **Auth** — `src/hooks/use-auth.tsx` exposes `user`, `session`, `roles`,
  `hasRole`. Roles come from `public.user_roles`, not the profile.
- **Server functions** — `src/lib/*.functions.ts`, typed RPC built with
  `createServerFn` from `@tanstack/react-start`. All gated by
  `requireSupabaseAuth`; admin mutations additionally check `has_role`.
- **Database** — Supabase (Postgres) with RLS on every public table.
  See `DATABASE.md`.

## Data flow
1. Browser uses the publishable Supabase client for reads constrained by RLS.
2. Mutations go through server functions (`useServerFn` + `useMutation`).
3. Server functions delegate to existing security-definer functions
   (`fn_record_risk_change`, `fn_record_cluster_change`,
   `fn_rebuild_aggregates`) instead of writing directly.
4. Alert auto-resolution happens via the `tg_investigation_resolves_alert`
   trigger when an investigation moves to `resolved`/`dismissed`.

## Error & loading boundaries
- Root: `__root.tsx` defines `notFoundComponent` and `errorComponent`.
- Router: `getRouter` registers `defaultErrorComponent` (using
  `RouteError`) and `defaultNotFoundComponent`.
- Data routes use `TableSkeleton` while loading and `EmptyState` when empty.

## Security
- RLS enabled on every public table.
- Role checks always via `has_role(uid, role)` security-definer function.
- Admin route guard: `/_authenticated/admin` redirects non-admins.
