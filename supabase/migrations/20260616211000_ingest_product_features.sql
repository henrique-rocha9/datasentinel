-- Migration: Create public.ingest_product_features SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.ingest_product_features(
  _produto_id text,
  _media_score_risco numeric,
  _media_defeitos numeric,
  _percentual_os_altas numeric,
  _risco_produto integer,
  _total_os_log numeric,
  _batch_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
  v_model_id uuid;
  v_total_os integer;
  v_risk_class public.risk_level;
BEGIN
  -- 1. Obter ou criar uma família de produtos padrão (DEMO se disponível)
  SELECT id INTO v_family_id FROM public.product_families LIMIT 1;
  IF v_family_id IS NULL THEN
    INSERT INTO public.product_families (code, name, description)
    VALUES ('IMPORT', 'Produtos Importados', 'Família padrão para produtos importados via CSV')
    RETURNING id INTO v_family_id;
  END IF;

  -- 2. Obter ou criar o modelo do produto
  SELECT id INTO v_model_id FROM public.product_models WHERE external_product_id = _produto_id;
  IF v_model_id IS NULL THEN
    INSERT INTO public.product_models (family_id, external_product_id, name, sku, state_code, warranty_default)
    VALUES (v_family_id, _produto_id, 'Produto ' || _produto_id, _produto_id || '-SKU', 'SP', 'unknown')
    RETURNING id INTO v_model_id;
  END IF;

  -- 3. Calcular total_os a partir de total_os_log
  v_total_os := round(exp(_total_os_log) - 1)::integer;
  IF v_total_os < 0 THEN
    v_total_os := 0;
  END IF;

  -- 4. Upsert em product_aggregates
  INSERT INTO public.product_aggregates (
    model_id, total_os, sum_defects, avg_defects, high_os_percentage, total_os_log, updated_at
  ) VALUES (
    v_model_id,
    v_total_os,
    round(_media_defeitos * v_total_os)::bigint,
    _media_defeitos,
    _percentual_os_altas * 100,
    _total_os_log,
    now()
  )
  ON CONFLICT (model_id) DO UPDATE SET
    total_os           = EXCLUDED.total_os,
    sum_defects        = EXCLUDED.sum_defects,
    avg_defects        = EXCLUDED.avg_defects,
    high_os_percentage = EXCLUDED.high_os_percentage,
    total_os_log       = EXCLUDED.total_os_log,
    updated_at         = now();

  -- 5. Mapear risco_produto para risk_level
  v_risk_class := CASE _risco_produto
    WHEN 0 THEN 'low'::public.risk_level
    WHEN 1 THEN 'medium'::public.risk_level
    ELSE 'high'::public.risk_level
  END;

  -- 6. Gravar histórico e registrar alteração de risco atual
  PERFORM public.fn_record_risk_change(
    v_model_id,
    v_risk_class,
    _media_score_risco,
    CASE WHEN _risco_produto = 0 THEN 1.0 ELSE 0.0 END,
    CASE WHEN _risco_produto = 1 THEN 1.0 ELSE 0.0 END,
    CASE WHEN _risco_produto = 2 THEN 1.0 ELSE 0.0 END,
    0.95,
    'import-v1',
    NULL
  );

END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_product_features(text, numeric, numeric, numeric, integer, numeric, uuid) TO authenticated;
