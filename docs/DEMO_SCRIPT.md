# Script de Demonstração

Execute a migração de seed da demo uma vez; ela é idempotente (sentinel: `product_families.code = 'DEMO'`).

## Roteiro de 5 minutos

1. **Faça login** em `/auth`. Use uma conta de admin (novos usuários por padrão recebem `viewer`; promova via `/admin/users`).
2. **Dashboard** (`/dashboard`) — mostre os cards de KPI (produtos monitorados, alertas abertos, investigações) e o feed de alertas recentes.
3. **Ranking** (`/ranking`) — ordene os 6 modelos de demonstração por risco.
4. **Detalhe do produto** (`/products/<modelId>`) — abra um modelo de alto risco, revise os agregados e o histórico de risco.
5. **Investigações** (`/investigations`) — mostre as investigações abertas e em andamento criadas pela migração.
6. **Detalhe da investigação** — adicione um comentário, mude o status para `resolved`, confirme que o alerta vinculado é encerrado automaticamente (trigger do banco).
7. **Admin → Ingestão** — faça upload de um CSV de exemplo; mostre o relatório de lote + erros.
8. **Admin → ML** — dispare uma execução simulada; abra a página de detalhe para inspecionar o JSON de métricas/artefatos.
9. **Admin → Logs** — filtre o system_logs por ação.
10. **Admin → Usuários** — altere o papel de um usuário.

## Reset

Executar a migração de seed novamente não tem efeito (no-op). Para forçar um reset, limpe manualmente as linhas da família `DEMO` e execute novamente.
