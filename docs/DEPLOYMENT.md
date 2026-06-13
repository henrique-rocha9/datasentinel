# Deployment

## Hosting
The app deploys to Cloudflare Workers via Lovable's publish flow. Use the
**Publish** action in the Lovable editor; preview and production URLs are
provisioned automatically.

## Backend
Lovable Cloud (Supabase) is provisioned automatically. The following are
managed by Lovable and must NOT be edited by hand:
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/types.ts`
- `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`)
- `supabase/config.toml`

## Environment
- Browser config uses `import.meta.env.VITE_*`.
- Server functions read `process.env.*` **inside** `.handler()` (not at
  module scope).

## Auth providers
- Email / password — enabled by default.
- Google OAuth — provider configured via Lovable Cloud admin.

## Migrations
SQL migrations live under `supabase/migrations/`. Apply them via the
Lovable migration tool; never run destructive SQL against shared schemas
(`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
