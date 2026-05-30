
-- Pin search_path on the touch trigger.
ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;

-- Revoke public execute on internal helpers; keep service_role.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_metrics_aggregate_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_rebuild_aggregates(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_record_risk_change(uuid, public.risk_level, numeric, numeric, numeric, numeric, numeric, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_record_cluster_change(uuid, integer, text, jsonb, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_touch_updated_at()            FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies, which evaluate as the calling role, so
-- authenticated must keep EXECUTE. Revoke from anon only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
