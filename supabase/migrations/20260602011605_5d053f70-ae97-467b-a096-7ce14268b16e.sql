
-- Add 'demo' to metric_source for clearly-labeled demo seed data
ALTER TYPE public.metric_source ADD VALUE IF NOT EXISTS 'demo';

-- Update handle_new_user to honor invite metadata role (set by admin invite flow)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_meta_role text;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  v_meta_role := NEW.raw_user_meta_data->>'invited_role';

  IF v_meta_role IN ('admin', 'analyst', 'viewer') THEN
    v_role := v_meta_role::public.app_role;
  ELSE
    v_role := 'viewer'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes to keep dashboard queries fast
CREATE INDEX IF NOT EXISTS idx_risk_current_score_desc ON public.risk_current (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_history_inferred_at ON public.risk_history (inferred_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status_created ON public.alerts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_metrics_source ON public.product_metrics (source);
CREATE INDEX IF NOT EXISTS idx_import_batches_notes ON public.import_batches ((notes));
