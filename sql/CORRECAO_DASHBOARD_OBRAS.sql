-- Correção da RPC tenant_dashboard_kpis para incluir KPI de Obras em Andamento
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Adicionar KPI de obras em andamento ao dashboard
-- Permissão: Use a service_role para executar este SQL

-- Atualizar RPC tenant_dashboard_kpis para incluir KPI de Obras
DROP FUNCTION IF EXISTS public.tenant_dashboard_kpis();
CREATE OR REPLACE FUNCTION public.tenant_dashboard_kpis() 
RETURNS TABLE(
  total_vendas NUMERIC, 
  qtd_vendas BIGINT, 
  qtd_clientes BIGINT, 
  qtd_produtos BIGINT, 
  qtd_os_abertas BIGINT, 
  qtd_obras_em_andamento BIGINT,
  estoque_baixo BIGINT, 
  saldo NUMERIC
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  v_schema TEXT;
BEGIN
  SELECT schema_name INTO v_schema 
  FROM public.user_profiles up 
  JOIN public.empresas e ON e.id = up.empresa_id 
  WHERE up.user_id = auth.uid();
  
  IF v_schema IS NULL OR v_schema = 'public' THEN
    RETURN;
  END IF;
  
  RETURN QUERY EXECUTE format('
    SELECT 
      COALESCE((SELECT SUM(valor_total) FROM %I.vendas), 0)::NUMERIC,
      COALESCE((SELECT COUNT(*) FROM %I.vendas), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.clientes), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.produtos), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.ordens_servico WHERE status = ''aberta''), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.obras WHERE status = ''em_andamento''), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.estoque WHERE quantidade <= quantidade_minima), 0)::BIGINT,
      COALESCE((SELECT SUM(CASE WHEN tipo IN (''receita'', ''receber'') THEN valor ELSE -valor END) FROM %I.financeiro), 0)::NUMERIC
  ', v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_dashboard_kpis TO authenticated, anon;

-- Clean pgrst cache
NOTIFY pgrst, 'reload schema';
