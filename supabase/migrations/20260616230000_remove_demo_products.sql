-- Migration: Remove mock/demo products from the database

DO $$
DECLARE
  v_family_id uuid;
  v_model_ids uuid[];
BEGIN
  -- 1. Obter o ID da família 'DEMO'
  SELECT id INTO v_family_id FROM public.product_families WHERE code = 'DEMO';
  
  IF v_family_id IS NOT NULL THEN
    -- 2. Obter todos os IDs de modelos da família 'DEMO'
    SELECT array_agg(id) INTO v_model_ids FROM public.product_models WHERE family_id = v_family_id;

    IF v_model_ids IS NOT NULL THEN
      -- 3. Deletar logs e investigações relacionadas
      DELETE FROM public.investigation_logs WHERE investigation_id IN (
        SELECT id FROM public.investigations WHERE model_id = ANY(v_model_ids)
      );
      DELETE FROM public.investigations WHERE model_id = ANY(v_model_ids);
      
      -- 4. Deletar recomendações e alertas relacionados
      DELETE FROM public.alert_recommendations WHERE alert_id IN (
        SELECT id FROM public.alerts WHERE model_id = ANY(v_model_ids)
      );
      DELETE FROM public.alerts WHERE model_id = ANY(v_model_ids);
      
      -- 5. Deletar histórico de risco e clusters
      DELETE FROM public.risk_history WHERE model_id = ANY(v_model_ids);
      DELETE FROM public.cluster_history WHERE model_id = ANY(v_model_ids);
      
      -- 6. Deletar dados atuais de risco, clusters e agregados
      DELETE FROM public.risk_current WHERE model_id = ANY(v_model_ids);
      DELETE FROM public.cluster_current WHERE model_id = ANY(v_model_ids);
      DELETE FROM public.product_aggregates WHERE model_id = ANY(v_model_ids);
      
      -- 7. Deletar métricas dos produtos
      DELETE FROM public.product_metrics WHERE model_id = ANY(v_model_ids);
      
      -- 8. Deletar os modelos de produtos
      DELETE FROM public.product_models WHERE family_id = v_family_id;
    END IF;

    -- 9. Deletar a família de produtos
    DELETE FROM public.product_families WHERE id = v_family_id;
  END IF;
END;
$$;
