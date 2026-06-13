# Pipeline de ML (MVP)

O MVP entrega um pipeline simulado que exercita toda a superfície sem um servidor de modelo real.

## Etapas

1. **Ingestão** — o upload de CSV via `/admin/ingestion` resolve `external_product_id` para `model_id` e grava em `product_metrics`. Erros são registrados em `import_errors`, lotes em `import_batches`.
2. **Agregação** — `fn_rebuild_aggregates` recalcula `product_aggregates` a partir das métricas brutas.
3. **Predição** — as classes de risco (`low | medium | high`) são registradas via `fn_record_risk_change`, que também atualiza `risk_history` e pode emitir alertas e recomendações.
4. **Clusterização** — clusters de modos de falha rastreados via `fn_record_cluster_change`.
5. **Investigação** — alertas são roteados para `investigations`; a resolução encerra o alerta subjacente através do trigger do banco.

## Execuções de ML

`/admin/ml` lista `ml_runs`. Disparar uma execução cria uma linha `success` com acurácia/precisão/recall randomizados em `metadata`. A página de detalhe mostra o JSON de métricas e artefatos. Substituir o disparo por um worker real é uma etapa pós-MVP.
