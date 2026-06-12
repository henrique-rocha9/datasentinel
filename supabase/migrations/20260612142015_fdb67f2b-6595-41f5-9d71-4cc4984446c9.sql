
-- Module 3: investigation lifecycle, single alert-resolution path, ml_runs

-- 1. Extend investigation_status enum (keep legacy 'closed' as alias)
ALTER TYPE public.investigation_status ADD VALUE IF NOT EXISTS 'resolved';
ALTER TYPE public.investigation_status ADD VALUE IF NOT EXISTS 'dismissed';

-- 2. Index on investigations.status for board/filter queries
CREATE INDEX IF NOT EXISTS idx_investigations_status_opened
  ON public.investigations (status, opened_at DESC);

-- 3. Single alert-resolution path: when an investigation tied to an alert
--    transitions to a terminal state (resolved / dismissed / legacy closed),
--    the linked alert is auto-resolved. This is the ONLY write path for
--    alerts.status from application code (alerts has no UPDATE policy).
CREATE OR REPLACE FUNCTION public.tg_investigation_resolves_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.triggering_alert_id IS NOT NULL
     AND NEW.status IN ('resolved','dismissed','closed')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    UPDATE public.alerts
       SET status          = 'resolved',
           resolved_at     = COALESCE(resolved_at, now()),
           acknowledged_by = COALESCE(acknowledged_by, NEW.assigned_analyst_id, NEW.opened_by),
           acknowledged_at = COALESCE(acknowledged_at, now())
     WHERE id = NEW.triggering_alert_id
       AND status <> 'resolved';

    -- close timestamp on the investigation itself
    IF NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_investigations_resolve_alert ON public.investigations;
CREATE TRIGGER tg_investigations_resolve_alert
  BEFORE INSERT OR UPDATE OF status ON public.investigations
  FOR EACH ROW EXECUTE FUNCTION public.tg_investigation_resolves_alert();

-- 4. ml_runs: observability for risk / clustering model executions
DO $$ BEGIN
  CREATE TYPE public.ml_run_type AS ENUM ('risk_inference','clustering','training');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ml_run_status AS ENUM ('pending','running','success','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ml_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type        public.ml_run_type   NOT NULL,
  status          public.ml_run_status NOT NULL DEFAULT 'pending',
  model_version   text,
  triggered_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at      timestamptz,
  finished_at     timestamptz,
  rows_processed  integer NOT NULL DEFAULT 0,
  error_text      text,
  metadata        jsonb   NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ml_runs TO authenticated;
GRANT ALL ON public.ml_runs TO service_role;

ALTER TABLE public.ml_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ml_runs read" ON public.ml_runs;
CREATE POLICY "ml_runs read" ON public.ml_runs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ml_runs admin manage" ON public.ml_runs;
CREATE POLICY "ml_runs admin manage" ON public.ml_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_ml_runs_type_started
  ON public.ml_runs (run_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_runs_status_created
  ON public.ml_runs (status, created_at DESC);

DROP TRIGGER IF EXISTS tg_touch_ml_runs ON public.ml_runs;
CREATE TRIGGER tg_touch_ml_runs
  BEFORE UPDATE ON public.ml_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
