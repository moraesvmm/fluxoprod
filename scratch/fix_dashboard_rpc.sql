-- Atualiza função wrapper pública
CREATE OR REPLACE FUNCTION public.tenant_dashboard_kpis_por_mes(p_meses INTEGER DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  -- Obter schema do tenant
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  
  EXECUTE format('SET LOCAL search_path TO %I, public', v_tenant_schema);

  -- Executar RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_dashboard_kpis_por_mes($1)', v_tenant_schema)
  INTO v_result
  USING p_meses;
  
  -- Garantir que sempre retorna array
  IF v_result IS NULL OR NOT jsonb_typeof(v_result) = 'array' THEN
    v_result := '[]'::jsonb;
  END IF;
  
  RETURN v_result;
END;
$$;

DO $DO_BLOCK$
DECLARE
    schema_record RECORD;
BEGIN
    -- Loop por todos os schemas de tenant
    FOR schema_record IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_dashboard_kpis_por_mes(p_meses INTEGER DEFAULT 6)
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $tenant_func$
            DECLARE
              v_result JSONB;
            BEGIN
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  ''mes'', to_char(sub.mes, ''YYYY-MM''),
                  ''faturamento'', sub.faturamento,
                  ''total_vendas'', sub.total_vendas,
                  ''ticket_medio'', sub.ticket_medio
                ) ORDER BY sub.mes
              ), ''[]''::jsonb)
              INTO v_result
              FROM (
                SELECT 
                  meses.mes,
                  COALESCE(SUM(v.valor_total), 0) as faturamento,
                  COUNT(v.id) as total_vendas,
                  CASE WHEN COUNT(v.id) > 0 THEN COALESCE(SUM(v.valor_total), 0) / COUNT(v.id) ELSE 0 END as ticket_medio
                FROM (
                  SELECT generate_series(
                    date_trunc(''month'', CURRENT_DATE - INTERVAL ''1 month'' * (p_meses - 1)),
                    date_trunc(''month'', CURRENT_DATE),
                    INTERVAL ''1 month''
                  ) as mes
                ) meses
                LEFT JOIN %I.vendas v ON 
                  date_trunc(''month'', v.criado_em) = meses.mes
                  AND v.deleted_at IS NULL
                GROUP BY meses.mes
              ) sub;
              
              IF v_result IS NULL THEN
                v_result := ''[]''::jsonb;
              END IF;
              
              RETURN v_result;
            END;
            $tenant_func$;
        ', schema_record.schema_name, schema_record.schema_name);
    END LOOP;
END
$DO_BLOCK$;
