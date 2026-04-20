-- RPC: tenant_dashboard_kpis_por_mes
-- Retorna série temporal de faturamento dos últimos N meses
-- Sempre retorna array JSONB, mesmo se vazio

CREATE OR REPLACE FUNCTION tenant_dashboard_kpis_por_mes(p_meses INTEGER DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Buscar faturamento mensal dos últimos N meses
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'mes', to_char(mes, 'YYYY-MM'),
        'faturamento', COALESCE(SUM(v.valor_total), 0),
        'total_vendas', COALESCE(COUNT(v.id), 0),
        'ticket_medio', CASE 
          WHEN COUNT(v.id) > 0 THEN COALESCE(SUM(v.valor_total), 0) / COUNT(v.id)
          ELSE 0
        END
      )
      ORDER BY mes
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE - INTERVAL '1 month' * (p_meses - 1)),
      date_trunc('month', CURRENT_DATE),
      INTERVAL '1 month'
    ) as mes
  ) meses
  LEFT JOIN vendas v ON 
    date_trunc('month', v.criado_em) = meses.mes
    AND v.deleted_at IS NULL;
  
  -- Se o resultado for NULL (não deveria acontecer com COALESCE), retorna array vazio
  IF v_result IS NULL THEN
    v_result := '[]'::jsonb;
  END IF;
  
  RETURN v_result;
END;
$$;

-- Criar wrapper público para roteamento
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
