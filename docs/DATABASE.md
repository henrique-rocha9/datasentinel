Banco de Dados

Todas as tabelas vivem no schema `public` com RLS habilitado e `GRANT`s explícitos para `authenticated` e `service_role`.

## Inventário

- `product_families`, `product_models` — catálogo.
- `product_metrics` — métricas brutas ingeridas por modelo/data.
- `product_aggregates` — métricas agregadas (reconstruídas via `fn_rebuild_aggregates`).

## Risco & clusterização

- `risk_current` — classe de risco atual por modelo.
- `risk_history` — log de alterações (escrito por `fn_record_risk_change`).
- `cluster_current`, `cluster_history` — clusters de modos de falha (`fn_record_cluster_change`).
- `recommendations` — geradas a cada transição de risco.

## Alertas & investigações

- `alerts` — escalonamentos abertos/encerrados.
- `investigations` — registros de fluxo de trabalho; transições de status para `resolved`/`dismissed` encerram automaticamente o alerta de origem via `tg_investigation_resolves_alert`.
- `investigation_logs` — comentários e mudanças de status.

## ML & operações

- `ml_runs` — execuções de treinamento/inferência; métricas e artefatos em `metadata`.
- `import_batches`, `import_errors` — controle de ingestão de CSV.
- `system_logs` — trilha de auditoria.

## Identidade & papéis

- `auth.users` (gerenciado pelo Supabase).
- `public.profiles` — perfil de exibição (criado pelo trigger `handle_new_user`).
- `public.user_roles (user_id, role app_role)` — os papéis vivem APENAS aqui.
- `has_role(uid, role)` — SECURITY DEFINER; usado por toda política e função de servidor protegida por papel.

## Triggers

- `handle_new_user` em `auth.users` → cria registro em `profiles` e concede o papel padrão `viewer`.
- `tg_touch_updated_at` nas tabelas mutáveis.
- `tg_investigation_resolves_alert` em `investigations`.
