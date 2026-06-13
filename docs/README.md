# Datasentinel — Detecção de Anomalias e Classificação de Risco

Datasentinel é uma plataforma de inteligência de risco para produtos industriais. Ela ingere métricas de produtos, classifica o risco em tempo real, agrupa modos de falha, gera alertas e os direciona para investigações.

## Módulos

1. Fundação — sistema de design, primitivas de layout, estrutura de autenticação
2. Autenticação & Roteamento — rotas protegidas sob `/_authenticated`
3. Banco de Dados & RLS — schema, políticas, funções security-definer, triggers
4. UI Principal — Dashboard, Ranking, Detalhe do Produto, Investigações
5. Admin & ML Ops — ingestão, ml_runs, logs do sistema, papéis de usuário
6. Loop de Feedback — funções de servidor tipadas com mutações protegidas por papel
7. Seed de Demonstração — seed SQL idempotente para apresentação
8. Polimento — primitivas de erro/carregamento, a11y, documentação

## Stack Tecnológica

- TanStack Start v1 (React 19, Vite 7)
- Tailwind CSS v4 + shadcn/ui
- Lovable Cloud (Supabase) — Postgres + Auth + RLS
- TanStack Query para busca de dados
- `createServerFn` para RPC tipado; mutações de admin protegidas por `requireSupabaseAuth` + `has_role(uid,'admin')`

## Rotas

- `/` — landing
- `/auth` — login / cadastro / OAuth do Google
- `/_authenticated/dashboard` — dashboard operacional (home autenticada)
- `/_authenticated/ranking` — ranking de risco dos modelos
- `/_authenticated/products/:modelId` — detalhe do produto
- `/_authenticated/investigations` — quadro
- `/_authenticated/investigations/:id` — detalhe da investigação
- `/_authenticated/admin/{ingestion,ml,logs,users}` — somente admin

Veja `ARCHITECTURE.md`, `DATABASE.md`, `ML_PIPELINE.md`, `DEMO_SCRIPT.md`, `DEPLOYMENT.md` e `A11Y_KEYBOARD_AUDIT.md` para mais detalhes.
