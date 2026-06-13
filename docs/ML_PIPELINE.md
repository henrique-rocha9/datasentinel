# ML Pipeline (MVP)

The MVP ships a mocked pipeline that exercises the full surface without a
real model server.

## Stages
1. **Ingest** — CSV upload via `/admin/ingestion` resolves
   `external_product_id` to `model_id` and writes `product_metrics`.
   Errors are recorded in `import_errors`, batches in `import_batches`.
2. **Aggregate** — `fn_rebuild_aggregates` recomputes `product_aggregates`
   from raw metrics.
3. **Predict** — risk classes (`low | medium | high`) are recorded via
   `fn_record_risk_change`, which also updates `risk_history` and may emit
   alerts and recommendations.
4. **Cluster** — failure-mode clusters tracked via
   `fn_record_cluster_change`.
5. **Investigate** — alerts route to `investigations`; resolution closes
   the underlying alert through the DB trigger.

## ML runs
`/admin/ml` lists `ml_runs`. Triggering a run creates a `success` row with
randomized accuracy/precision/recall in `metadata`. Detail page shows
metrics and artifacts JSON. Replacing the trigger with a real worker is a
post-MVP step.
