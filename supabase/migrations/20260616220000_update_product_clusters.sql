-- Migration: Create public.update_product_clusters SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.update_product_clusters(
  _assignments jsonb,
  _model_version text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec jsonb;
  v_model_id uuid;
BEGIN
  FOR v_rec IN SELECT * FROM jsonb_array_elements(_assignments) LOOP
    -- Encontrar o model_id com base no external_product_id (produto_id)
    SELECT id INTO v_model_id 
    FROM public.product_models 
    WHERE external_product_id = (v_rec->>'produto_id');

    IF v_model_id IS NOT NULL THEN
      INSERT INTO public.cluster_current (
        model_id, cluster_id, cluster_label, cluster_characteristics, model_version, inferred_at
      ) VALUES (
        v_model_id,
        (v_rec->>'cluster_id')::integer,
        (v_rec->>'cluster_label')::text,
        (v_rec->'cluster_characteristics'),
        _model_version,
        now()
      )
      ON CONFLICT (model_id) DO UPDATE SET
        cluster_id = EXCLUDED.cluster_id,
        cluster_label = EXCLUDED.cluster_label,
        cluster_characteristics = EXCLUDED.cluster_characteristics,
        model_version = EXCLUDED.model_version,
        inferred_at = now();
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_product_clusters(jsonb, text) TO authenticated;
