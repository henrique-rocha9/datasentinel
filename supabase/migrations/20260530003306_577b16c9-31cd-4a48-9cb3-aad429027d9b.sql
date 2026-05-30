
-- ============================================================================
-- DataSentinel — Module 1: Database Foundation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS (stable, code-driven)
-- ----------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.risk_transition AS ENUM (
  'low_to_medium', 'low_to_high', 'medium_to_high',
  'medium_to_low', 'high_to_medium', 'high_to_low'
);
CREATE TYPE public.alert_severity AS ENUM ('medium', 'high', 'critical');
CREATE TYPE public.alert_status AS ENUM ('open', 'acknowledged', 'resolved');
CREATE TYPE public.investigation_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE public.investigation_log_type AS ENUM (
  'comment', 'status_change', 'assignment', 'attachment'
);
CREATE TYPE public.metric_source AS ENUM ('manual', 'import', 'api');
CREATE TYPE public.import_kind AS ENUM ('products', 'metrics');
CREATE TYPE public.import_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- ----------------------------------------------------------------------------
-- LOOKUP TABLES (data-driven values — extensible without migrations)
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_states (
  code           text PRIMARY KEY,
  label_pt       text NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.warranty_statuses (
  code           text PRIMARY KEY,
  label_pt       text NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Seed common Brazilian state codes and warranty statuses (extend later via INSERT).
INSERT INTO public.product_states (code, label_pt) VALUES
  ('SP', 'São Paulo'), ('RJ', 'Rio de Janeiro'), ('MG', 'Minas Gerais'),
  ('RS', 'Rio Grande do Sul'), ('PR', 'Paraná'), ('SC', 'Santa Catarina'),
  ('BA', 'Bahia'), ('GO', 'Goiás'), ('DF', 'Distrito Federal'),
  ('PE', 'Pernambuco'), ('CE', 'Ceará'), ('PA', 'Pará'),
  ('AM', 'Amazonas'), ('ES', 'Espírito Santo'), ('MT', 'Mato Grosso'),
  ('MS', 'Mato Grosso do Sul'), ('AL', 'Alagoas'), ('PB', 'Paraíba'),
  ('RN', 'Rio Grande do Norte'), ('PI', 'Piauí'), ('MA', 'Maranhão'),
  ('SE', 'Sergipe'), ('TO', 'Tocantins'), ('RO', 'Rondônia'),
  ('AC', 'Acre'), ('AP', 'Amapá'), ('RR', 'Roraima');

INSERT INTO public.warranty_statuses (code, label_pt) VALUES
  ('in_warranty',     'Em garantia'),
  ('out_of_warranty', 'Fora de garantia'),
  ('extended',        'Garantia estendida'),
  ('unknown',         'Não informado');

-- ----------------------------------------------------------------------------
-- AUTH-LINKED TABLES: profiles + user_roles
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  job_title    text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- has_role: SECURITY DEFINER avoids recursion when used inside RLS on user_roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile + default viewer role on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- PRODUCT HIERARCHY
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_families (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_models (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id            uuid NOT NULL REFERENCES public.product_families(id) ON DELETE RESTRICT,
  external_product_id  text NOT NULL UNIQUE,
  name                 text NOT NULL,
  sku                  text,
  state_code           text REFERENCES public.product_states(code) ON DELETE RESTRICT,
  warranty_default     text REFERENCES public.warranty_statuses(code) ON DELETE RESTRICT,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_models_family       ON public.product_models(family_id);
CREATE INDEX idx_product_models_state        ON public.product_models(state_code);

-- ----------------------------------------------------------------------------
-- METRICS (append-only) + AGGREGATES (maintained by trigger)
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_metrics (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id               uuid NOT NULL REFERENCES public.product_models(id) ON DELETE RESTRICT,
  submitted_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at           timestamptz NOT NULL DEFAULT now(),
  defect_count           integer  NOT NULL CHECK (defect_count >= 0),
  parts_replaced         integer  NOT NULL CHECK (parts_replaced >= 0),
  retrabalho             integer  NOT NULL CHECK (retrabalho >= 0),
  resolution_time_hours  numeric(10,2) NOT NULL CHECK (resolution_time_hours >= 0),
  warranty_status        text NOT NULL REFERENCES public.warranty_statuses(code) ON DELETE RESTRICT,
  state_code             text NOT NULL REFERENCES public.product_states(code) ON DELETE RESTRICT,
  is_high_os             boolean NOT NULL DEFAULT false,
  raw_payload            jsonb,
  source                 public.metric_source NOT NULL DEFAULT 'manual',
  import_batch_id        uuid
);

CREATE INDEX idx_metrics_model_submitted ON public.product_metrics(model_id, submitted_at DESC);
CREATE INDEX idx_metrics_submitted_at    ON public.product_metrics(submitted_at DESC);
CREATE INDEX idx_metrics_import_batch    ON public.product_metrics(import_batch_id);

CREATE TABLE public.product_aggregates (
  model_id              uuid PRIMARY KEY REFERENCES public.product_models(id) ON DELETE CASCADE,
  total_os              integer NOT NULL DEFAULT 0,
  sum_defects           bigint  NOT NULL DEFAULT 0,
  sum_retrabalho        bigint  NOT NULL DEFAULT 0,
  sum_resolution_hours  numeric(16,2) NOT NULL DEFAULT 0,
  parts_replaced_total  bigint  NOT NULL DEFAULT 0,
  high_os_count         integer NOT NULL DEFAULT 0,
  avg_defects           numeric(12,4) NOT NULL DEFAULT 0,
  avg_retrabalho        numeric(12,4) NOT NULL DEFAULT 0,
  avg_resolution_time   numeric(12,4) NOT NULL DEFAULT 0,
  high_os_percentage    numeric(7,4)  NOT NULL DEFAULT 0,
  total_os_log          numeric(12,6) NOT NULL DEFAULT 0,
  last_metric_at        timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aggregates_total_os ON public.product_aggregates(total_os DESC);

-- Incremental aggregate update on each metric insert. O(1) per row.
CREATE OR REPLACE FUNCTION public.tg_metrics_aggregate_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_high  integer;
BEGIN
  INSERT INTO public.product_aggregates AS pa (model_id) VALUES (NEW.model_id)
  ON CONFLICT (model_id) DO NOTHING;

  UPDATE public.product_aggregates
  SET total_os             = total_os + 1,
      sum_defects          = sum_defects + NEW.defect_count,
      sum_retrabalho       = sum_retrabalho + NEW.retrabalho,
      sum_resolution_hours = sum_resolution_hours + NEW.resolution_time_hours,
      parts_replaced_total = parts_replaced_total + NEW.parts_replaced,
      high_os_count        = high_os_count + CASE WHEN NEW.is_high_os THEN 1 ELSE 0 END,
      last_metric_at       = GREATEST(COALESCE(last_metric_at, NEW.submitted_at), NEW.submitted_at),
      updated_at           = now()
  WHERE model_id = NEW.model_id
  RETURNING total_os, high_os_count INTO v_total, v_high;

  UPDATE public.product_aggregates
  SET avg_defects         = sum_defects::numeric / NULLIF(v_total, 0),
      avg_retrabalho      = sum_retrabalho::numeric / NULLIF(v_total, 0),
      avg_resolution_time = sum_resolution_hours / NULLIF(v_total, 0),
      high_os_percentage  = (v_high::numeric * 100) / NULLIF(v_total, 0),
      total_os_log        = ln(v_total + 1)
  WHERE model_id = NEW.model_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_metrics_after_insert
  AFTER INSERT ON public.product_metrics
  FOR EACH ROW EXECUTE FUNCTION public.tg_metrics_aggregate_after_insert();

-- Full rebuild helper (importer safety net + drift repair).
CREATE OR REPLACE FUNCTION public.fn_rebuild_aggregates(_model_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_high  integer;
  v_sd    bigint;
  v_sr    bigint;
  v_srh   numeric;
  v_sp    bigint;
  v_last  timestamptz;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_high_os),
         COALESCE(SUM(defect_count),0), COALESCE(SUM(retrabalho),0),
         COALESCE(SUM(resolution_time_hours),0), COALESCE(SUM(parts_replaced),0),
         MAX(submitted_at)
    INTO v_total, v_high, v_sd, v_sr, v_srh, v_sp, v_last
  FROM public.product_metrics WHERE model_id = _model_id;

  INSERT INTO public.product_aggregates (model_id) VALUES (_model_id)
  ON CONFLICT (model_id) DO NOTHING;

  UPDATE public.product_aggregates
  SET total_os             = v_total,
      sum_defects          = v_sd,
      sum_retrabalho       = v_sr,
      sum_resolution_hours = v_srh,
      parts_replaced_total = v_sp,
      high_os_count        = v_high,
      avg_defects          = COALESCE(v_sd::numeric / NULLIF(v_total,0), 0),
      avg_retrabalho       = COALESCE(v_sr::numeric / NULLIF(v_total,0), 0),
      avg_resolution_time  = COALESCE(v_srh / NULLIF(v_total,0), 0),
      high_os_percentage   = COALESCE((v_high::numeric * 100) / NULLIF(v_total,0), 0),
      total_os_log         = ln(v_total + 1),
      last_metric_at       = v_last,
      updated_at           = now()
  WHERE model_id = _model_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- ML CURRENT-STATE + CHANGE-LOG
-- ----------------------------------------------------------------------------
CREATE TABLE public.risk_current (
  model_id      uuid PRIMARY KEY REFERENCES public.product_models(id) ON DELETE CASCADE,
  risk_class    public.risk_level NOT NULL,
  risk_score    numeric(6,4) NOT NULL,
  prob_low      numeric(5,4) NOT NULL,
  prob_medium   numeric(5,4) NOT NULL,
  prob_high     numeric(5,4) NOT NULL,
  confidence    numeric(5,4) NOT NULL,
  model_version text NOT NULL,
  inferred_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_risk_current_class_score ON public.risk_current(risk_class, risk_score DESC);

CREATE TABLE public.cluster_current (
  model_id                uuid PRIMARY KEY REFERENCES public.product_models(id) ON DELETE CASCADE,
  cluster_id              integer NOT NULL,
  cluster_label           text NOT NULL,
  cluster_characteristics jsonb,
  model_version           text NOT NULL,
  inferred_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cluster_current_id ON public.cluster_current(cluster_id);

CREATE TABLE public.risk_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id         uuid NOT NULL REFERENCES public.product_models(id) ON DELETE CASCADE,
  previous_class   public.risk_level,
  new_class        public.risk_level NOT NULL,
  previous_score   numeric(6,4),
  new_score        numeric(6,4) NOT NULL,
  transition       public.risk_transition,
  source_metric_id uuid REFERENCES public.product_metrics(id) ON DELETE SET NULL,
  model_version    text NOT NULL,
  inferred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_risk_history_model      ON public.risk_history(model_id, inferred_at DESC);
CREATE INDEX idx_risk_history_transition ON public.risk_history(transition);

CREATE TABLE public.cluster_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id         uuid NOT NULL REFERENCES public.product_models(id) ON DELETE CASCADE,
  previous_cluster integer,
  new_cluster      integer NOT NULL,
  previous_label   text,
  new_label        text NOT NULL,
  model_version    text NOT NULL,
  inferred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cluster_history_model ON public.cluster_history(model_id, inferred_at DESC);

-- ----------------------------------------------------------------------------
-- ALERTS + RECOMMENDATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id          uuid NOT NULL REFERENCES public.product_models(id) ON DELETE CASCADE,
  risk_history_id   uuid REFERENCES public.risk_history(id) ON DELETE SET NULL,
  severity          public.alert_severity NOT NULL,
  title             text NOT NULL,
  message           text NOT NULL,
  status            public.alert_status NOT NULL DEFAULT 'open',
  acknowledged_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at   timestamptz,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_status_sev_created ON public.alerts(status, severity, created_at DESC);
CREATE INDEX idx_alerts_model              ON public.alerts(model_id);
CREATE INDEX idx_alerts_open_recent
  ON public.alerts(created_at DESC) WHERE status = 'open';

CREATE TABLE public.alert_recommendations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id            uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  recommendation_text text NOT NULL,
  category            text,
  priority            integer NOT NULL DEFAULT 0,
  generated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_alert_recs_alert ON public.alert_recommendations(alert_id);

-- ----------------------------------------------------------------------------
-- INVESTIGATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.investigations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id             uuid NOT NULL REFERENCES public.product_models(id) ON DELETE RESTRICT,
  opened_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_analyst_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason               text NOT NULL,
  description          text,
  status               public.investigation_status NOT NULL DEFAULT 'open',
  triggering_alert_id  uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  opened_at            timestamptz NOT NULL DEFAULT now(),
  closed_at            timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investigations_assignee_status ON public.investigations(assigned_analyst_id, status);
CREATE INDEX idx_investigations_model_opened    ON public.investigations(model_id, opened_at DESC);

CREATE TABLE public.investigation_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  author_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  log_type         public.investigation_log_type NOT NULL,
  content          text,
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investigation_logs_inv ON public.investigation_logs(investigation_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- IMPORT BATCHES + ERRORS
-- ----------------------------------------------------------------------------
CREATE TABLE public.import_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_filename text,
  source_kind     public.import_kind NOT NULL,
  row_count       integer NOT NULL DEFAULT 0,
  success_count   integer NOT NULL DEFAULT 0,
  error_count     integer NOT NULL DEFAULT 0,
  status          public.import_status NOT NULL DEFAULT 'pending',
  started_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  notes           text
);
CREATE INDEX idx_import_batches_status ON public.import_batches(status, started_at DESC);

CREATE TABLE public.import_errors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id       uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number     integer,
  raw_row        jsonb,
  error_message  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_import_errors_batch ON public.import_errors(batch_id);

-- ----------------------------------------------------------------------------
-- SYSTEM LOGS (audit trail)
-- ----------------------------------------------------------------------------
CREATE TABLE public.system_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  metadata    jsonb,
  ip          inet,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_logs_created ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_actor   ON public.system_logs(actor_id);

-- ----------------------------------------------------------------------------
-- ML WRITE FUNCTION — call from server code via supabaseAdmin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_record_risk_change(
  _model_id          uuid,
  _new_class         public.risk_level,
  _new_score         numeric,
  _prob_low          numeric,
  _prob_medium       numeric,
  _prob_high         numeric,
  _confidence        numeric,
  _model_version     text,
  _source_metric_id  uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_class  public.risk_level;
  v_prev_score  numeric;
  v_transition  public.risk_transition;
  v_severity    public.alert_severity;
  v_alert_id    uuid;
  v_history_id  uuid;
  v_model_ext   text;
BEGIN
  SELECT risk_class, risk_score INTO v_prev_class, v_prev_score
  FROM public.risk_current WHERE model_id = _model_id;

  INSERT INTO public.risk_current AS rc
    (model_id, risk_class, risk_score, prob_low, prob_medium, prob_high,
     confidence, model_version, inferred_at)
  VALUES
    (_model_id, _new_class, _new_score, _prob_low, _prob_medium, _prob_high,
     _confidence, _model_version, now())
  ON CONFLICT (model_id) DO UPDATE
    SET risk_class    = EXCLUDED.risk_class,
        risk_score    = EXCLUDED.risk_score,
        prob_low      = EXCLUDED.prob_low,
        prob_medium   = EXCLUDED.prob_medium,
        prob_high     = EXCLUDED.prob_high,
        confidence    = EXCLUDED.confidence,
        model_version = EXCLUDED.model_version,
        inferred_at   = EXCLUDED.inferred_at;

  IF v_prev_class IS DISTINCT FROM _new_class THEN
    v_transition := CASE
      WHEN v_prev_class IS NULL AND _new_class = 'medium' THEN 'low_to_medium'::public.risk_transition
      WHEN v_prev_class IS NULL AND _new_class = 'high'   THEN 'low_to_high'::public.risk_transition
      WHEN v_prev_class = 'low'    AND _new_class = 'medium' THEN 'low_to_medium'
      WHEN v_prev_class = 'low'    AND _new_class = 'high'   THEN 'low_to_high'
      WHEN v_prev_class = 'medium' AND _new_class = 'high'   THEN 'medium_to_high'
      WHEN v_prev_class = 'medium' AND _new_class = 'low'    THEN 'medium_to_low'
      WHEN v_prev_class = 'high'   AND _new_class = 'medium' THEN 'high_to_medium'
      WHEN v_prev_class = 'high'   AND _new_class = 'low'    THEN 'high_to_low'
    END;

    INSERT INTO public.risk_history
      (model_id, previous_class, new_class, previous_score, new_score,
       transition, source_metric_id, model_version)
    VALUES
      (_model_id, v_prev_class, _new_class, v_prev_score, _new_score,
       v_transition, _source_metric_id, _model_version)
    RETURNING id INTO v_history_id;

    -- Only escalations generate alerts.
    IF v_transition IN ('low_to_medium','medium_to_high','low_to_high') THEN
      v_severity := CASE v_transition
        WHEN 'low_to_high'    THEN 'critical'::public.alert_severity
        WHEN 'medium_to_high' THEN 'high'
        WHEN 'low_to_medium'  THEN 'medium'
      END;

      SELECT external_product_id INTO v_model_ext
      FROM public.product_models WHERE id = _model_id;

      INSERT INTO public.alerts (model_id, risk_history_id, severity, title, message)
      VALUES (
        _model_id, v_history_id, v_severity,
        format('Risco %s para o produto %s', _new_class, v_model_ext),
        format('Produto %s mudou de %s para %s.', v_model_ext, v_prev_class, _new_class)
      )
      RETURNING id INTO v_alert_id;

      -- Deterministic v1 recommendations.
      INSERT INTO public.alert_recommendations (alert_id, recommendation_text, category, priority)
      VALUES
        (v_alert_id, 'Abrir investigação técnica', 'investigation', 10),
        (v_alert_id, 'Revisar histórico de defeitos', 'analysis',      20),
        (v_alert_id, 'Revisar especificações de engenharia', 'analysis', 30),
        (v_alert_id, 'Priorizar monitoramento contínuo', 'monitoring', 40),
        (v_alert_id, 'Revisar componentes do fornecedor', 'supplier',   50);
    END IF;
  END IF;

  RETURN v_history_id;
END;
$$;

-- Cluster change recorder (no alert generation).
CREATE OR REPLACE FUNCTION public.fn_record_cluster_change(
  _model_id      uuid,
  _new_cluster   integer,
  _new_label     text,
  _characteristics jsonb,
  _model_version text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_cluster integer;
  v_prev_label   text;
  v_history_id   uuid;
BEGIN
  SELECT cluster_id, cluster_label INTO v_prev_cluster, v_prev_label
  FROM public.cluster_current WHERE model_id = _model_id;

  INSERT INTO public.cluster_current AS cc
    (model_id, cluster_id, cluster_label, cluster_characteristics, model_version, inferred_at)
  VALUES (_model_id, _new_cluster, _new_label, _characteristics, _model_version, now())
  ON CONFLICT (model_id) DO UPDATE
    SET cluster_id              = EXCLUDED.cluster_id,
        cluster_label           = EXCLUDED.cluster_label,
        cluster_characteristics = EXCLUDED.cluster_characteristics,
        model_version           = EXCLUDED.model_version,
        inferred_at             = EXCLUDED.inferred_at;

  IF v_prev_cluster IS DISTINCT FROM _new_cluster THEN
    INSERT INTO public.cluster_history
      (model_id, previous_cluster, new_cluster, previous_label, new_label, model_version)
    VALUES (_model_id, v_prev_cluster, _new_cluster, v_prev_label, _new_label, _model_version)
    RETURNING id INTO v_history_id;
  END IF;

  RETURN v_history_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
ALTER TABLE public.product_states          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_statuses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_families        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_models          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_metrics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_aggregates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_current            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_current         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_recommendations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs             ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- GRANTS — authenticated + service_role, no anon
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.product_states, public.warranty_statuses,
                public.product_families, public.product_models,
                public.product_aggregates, public.risk_current,
                public.cluster_current, public.risk_history,
                public.cluster_history, public.alerts,
                public.alert_recommendations, public.profiles,
                public.user_roles, public.investigations,
                public.investigation_logs, public.product_metrics
  TO authenticated;

GRANT INSERT ON public.product_metrics, public.investigations,
                public.investigation_logs TO authenticated;
GRANT UPDATE ON public.investigations, public.profiles TO authenticated;

GRANT ALL ON
  public.product_states, public.warranty_statuses,
  public.profiles, public.user_roles,
  public.product_families, public.product_models,
  public.product_metrics, public.product_aggregates,
  public.risk_current, public.cluster_current,
  public.risk_history, public.cluster_history,
  public.alerts, public.alert_recommendations,
  public.investigations, public.investigation_logs,
  public.import_batches, public.import_errors, public.system_logs
  TO service_role;

-- ----------------------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------------------

-- Reference data: anyone authenticated can read; admins manage.
CREATE POLICY "read product_states" ON public.product_states
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage product_states" ON public.product_states
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read warranty_statuses" ON public.warranty_statuses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage warranty_statuses" ON public.warranty_statuses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- profiles
CREATE POLICY "profiles read all" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles: users read own; admins manage all.
CREATE POLICY "user_roles read own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- product_families / product_models: all roles read; admins manage.
CREATE POLICY "product_families read" ON public.product_families
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_families admin write" ON public.product_families
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "product_models read" ON public.product_models
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_models admin write" ON public.product_models
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- product_metrics: all roles read; analyst/admin insert.
CREATE POLICY "product_metrics read" ON public.product_metrics
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_metrics analyst insert" ON public.product_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "product_metrics admin manage" ON public.product_metrics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- product_aggregates: read-only to roles; service_role writes via trigger.
CREATE POLICY "product_aggregates read" ON public.product_aggregates
  FOR SELECT TO authenticated USING (true);

-- ML state + history: read-only.
CREATE POLICY "risk_current read"     ON public.risk_current     FOR SELECT TO authenticated USING (true);
CREATE POLICY "cluster_current read"  ON public.cluster_current  FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_history read"     ON public.risk_history     FOR SELECT TO authenticated USING (true);
CREATE POLICY "cluster_history read"  ON public.cluster_history  FOR SELECT TO authenticated USING (true);

-- Alerts: read-only to all roles; acknowledgement is an admin/analyst future feature
-- (will be added when the Alert Center UI ships in Module 9).
CREATE POLICY "alerts read"               ON public.alerts                FOR SELECT TO authenticated USING (true);
CREATE POLICY "alert_recommendations read" ON public.alert_recommendations FOR SELECT TO authenticated USING (true);

-- Investigations: read all; analyst+admin can insert; analyst can update only
-- where they are the assigned analyst; admins can do anything.
CREATE POLICY "investigations read" ON public.investigations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "investigations insert analyst/admin" ON public.investigations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "investigations update assigned analyst" ON public.investigations
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'analyst') AND assigned_analyst_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'analyst') AND assigned_analyst_id = auth.uid())
  );
CREATE POLICY "investigations admin delete" ON public.investigations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- investigation_logs: read all; insert if user is assigned analyst on parent OR admin.
CREATE POLICY "investigation_logs read" ON public.investigation_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "investigation_logs insert" ON public.investigation_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.investigations i
      WHERE i.id = investigation_id AND i.assigned_analyst_id = auth.uid()
    )
  );
CREATE POLICY "investigation_logs admin manage" ON public.investigation_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Imports + system logs: admin-only.
CREATE POLICY "import_batches admin" ON public.import_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "import_errors admin" ON public.import_errors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "system_logs admin read" ON public.system_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- updated_at maintenance for tables with explicit update paths
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER tg_touch_profiles          BEFORE UPDATE ON public.profiles          FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_touch_product_families  BEFORE UPDATE ON public.product_families  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_touch_product_models    BEFORE UPDATE ON public.product_models    FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_touch_investigations    BEFORE UPDATE ON public.investigations    FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
