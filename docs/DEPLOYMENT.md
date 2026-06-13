# Implantação (Deployment)

## Hospedagem

A aplicação é implantada no Cloudflare Workers através do fluxo de publicação do Lovable. Use a ação **Publish** no editor do Lovable; as URLs de preview e produção são provisionadas automaticamente.

## Backend

O Lovable Cloud (Supabase) é provisionado automaticamente. Os itens abaixo são gerenciados pelo Lovable e NÃO devem ser editados manualmente:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/types.ts`
- `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`)
- `supabase/config.toml`

## Ambiente

- A configuração do navegador usa `import.meta.env.VITE_*`.
- As funções de servidor leem `process.env.*` **dentro** de `.handler()` (não no escopo do módulo).

## Provedores de autenticação

- Email / senha — habilitado por padrão.
- Google OAuth — provedor configurado via admin do Lovable Cloud.

## Migrações

As migrações SQL ficam em `supabase/migrations/`. Aplique-as via a ferramenta de migração do Lovable; nunca execute SQL destrutivo contra schemas compartilhados (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
