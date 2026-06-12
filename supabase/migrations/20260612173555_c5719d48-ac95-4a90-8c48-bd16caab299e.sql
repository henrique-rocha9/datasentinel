
DO $seed$
DECLARE
  v_family_id uuid;
  v_model_id uuid;
  v_ext text;
  v_name text;
  v_state text;
  v_warranty text;
  v_risk public.risk_level;
  v_score numeric;
  v_pl numeric; v_pm numeric; v_ph numeric;
  v_cluster int;
  v_cluster_label text;
  v_alert_id uuid;
  v_inv_id uuid;
  v_inv_count int := 0;
  v_i int;
  v_defects int;
  v_parts int;
  v_retra int;
  v_hours numeric;
  v_high bool;
  i int;
  v_models text[] := ARRAY['DEMO-001','DEMO-002','DEMO-003','DEMO-004','DEMO-005','DEMO-006'];
  v_names  text[] := ARRAY['Inversor Solar 5kW','Bateria Lítio 10kWh','Painel Fotovoltaico 550W','Controlador MPPT 60A','String Box 1000V','Microinversor 300W'];
  v_states text[] := ARRAY['SP','MG','RS','PR','BA','SC'];
  v_risks  text[] := ARRAY['high','medium','low','high','medium','low'];
  v_clusters int[] := ARRAY[2,1,0,2,1,0];
  v_clabels  text[] := ARRAY['Crítico','Atenção','Estável','Crítico','Atenção','Estável'];
  v_inv_statuses text[] := ARRAY['open','in_progress'];
BEGIN
  IF EXISTS (SELECT 1 FROM public.product_families WHERE code = 'DEMO') THEN
    RAISE NOTICE 'Demo seed already present, skipping.';
    RETURN;
  END IF;

  INSERT INTO public.product_families (code, name, description)
  VALUES ('DEMO', 'Demo — Energia Solar', 'Família de produtos para demonstração do MVP')
  RETURNING id INTO v_family_id;

  FOR i IN 1..array_length(v_models,1) LOOP
    v_ext := v_models[i];
    v_name := v_names[i];
    v_state := v_states[i];
    v_warranty := CASE WHEN i % 2 = 0 THEN 'in_warranty' ELSE 'extended' END;

    INSERT INTO public.product_models (family_id, external_product_id, name, sku, state_code, warranty_default)
    VALUES (v_family_id, v_ext, v_name, v_ext || '-SKU', v_state, v_warranty)
    RETURNING id INTO v_model_id;

    FOR v_i IN 0..29 LOOP
      v_defects := (random()*8)::int + CASE WHEN v_risks[i]='high' THEN 5 WHEN v_risks[i]='medium' THEN 2 ELSE 0 END;
      v_parts   := (random()*4)::int;
      v_retra   := (random()*3)::int + CASE WHEN v_risks[i]='high' THEN 2 ELSE 0 END;
      v_hours   := round((random()*48 + CASE WHEN v_risks[i]='high' THEN 24 ELSE 4 END)::numeric, 2);
      v_high    := v_defects >= 6;

      INSERT INTO public.product_metrics
        (model_id, submitted_at, defect_count, parts_replaced, retrabalho,
         resolution_time_hours, warranty_status, state_code, is_high_os, source, raw_payload)
      VALUES
        (v_model_id, now() - ((v_i*2) || ' days')::interval,
         v_defects, v_parts, v_retra, v_hours,
         v_warranty, v_state, v_high, 'manual',
         jsonb_build_object('seed','demo_v1'));
    END LOOP;

    v_risk := v_risks[i]::public.risk_level;
    v_score := CASE v_risks[i] WHEN 'high' THEN 0.85 WHEN 'medium' THEN 0.55 ELSE 0.20 END;
    v_pl := CASE v_risks[i] WHEN 'low' THEN 0.80 WHEN 'medium' THEN 0.20 ELSE 0.05 END;
    v_pm := CASE v_risks[i] WHEN 'medium' THEN 0.70 WHEN 'high' THEN 0.20 ELSE 0.15 END;
    v_ph := CASE v_risks[i] WHEN 'high' THEN 0.75 WHEN 'medium' THEN 0.10 ELSE 0.05 END;

    PERFORM public.fn_record_risk_change(
      v_model_id, v_risk, v_score, v_pl, v_pm, v_ph, 0.90, 'demo-v1', NULL
    );

    v_cluster := v_clusters[i];
    v_cluster_label := v_clabels[i];
    PERFORM public.fn_record_cluster_change(
      v_model_id, v_cluster, v_cluster_label,
      jsonb_build_object('seed','demo_v1','avg_defects', v_score*10),
      'demo-v1'
    );

    IF v_risks[i] = 'high' AND v_inv_count < 2 THEN
      SELECT id INTO v_alert_id
      FROM public.alerts
      WHERE model_id = v_model_id AND status <> 'resolved'
      ORDER BY created_at DESC LIMIT 1;

      IF v_alert_id IS NOT NULL THEN
        INSERT INTO public.investigations
          (model_id, triggering_alert_id, reason, status, opened_by)
        VALUES
          (v_model_id, v_alert_id,
           'Investigação técnica — escalada para risco alto (' || v_ext || ')',
           v_inv_statuses[v_inv_count + 1]::public.investigation_status,
           NULL)
        RETURNING id INTO v_inv_id;

        INSERT INTO public.investigation_logs
          (investigation_id, author_id, log_type, content, metadata)
        VALUES
          (v_inv_id, NULL, 'comment',
           'Seed: análise inicial registrada para demonstração.',
           jsonb_build_object('seed','demo_v1'));

        v_inv_count := v_inv_count + 1;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.ml_runs
    (run_type, status, model_version, started_at, finished_at, rows_processed, metadata)
  VALUES
    ('training', 'success', 'demo-v1',
     now() - interval '1 hour', now() - interval '30 minutes',
     180,
     jsonb_build_object(
       'seed','demo_v1',
       'metrics', jsonb_build_object('accuracy',0.91,'precision',0.88,'recall',0.86),
       'artifacts', jsonb_build_object('feature_importance',
         jsonb_build_object('defect_count',0.42,'retrabalho',0.31,'resolution_time',0.27))
     ));

  INSERT INTO public.system_logs (action, entity_type, metadata)
  VALUES ('demo_seed_applied', 'seed', jsonb_build_object('version','demo_v1','models', v_models));
END
$seed$;
