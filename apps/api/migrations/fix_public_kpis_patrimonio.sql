-- Correção: Sincronização do Wrapper Público de KPIs com as novas métricas
-- Adiciona patrimonio_estoque ao retorno da função pública

CREATE OR REPLACE FUNCTION public.tenant_dashboard_kpis()
RETURNS TABLE(
  total_vendas NUMERIC,
  qtd_vendas BIGINT,
  qtd_clientes BIGINT,
  qtd_produtos BIGINT,
  qtd_os_abertas BIGINT,
  qtd_obras_em_andamento BIGINT,
  estoque_baixo BIGINT,
  saldo NUMERIC,
  patrimonio_estoque NUMERIC
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
      COALESCE((SELECT SUM(valor_total) FROM %I.vendas WHERE deleted_at IS NULL AND status != ''Cancelado''), 0)::NUMERIC,
      COALESCE((SELECT COUNT(*) FROM %I.vendas WHERE deleted_at IS NULL AND status != ''Cancelado''), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.clientes WHERE deleted_at IS NULL), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.produtos WHERE deleted_at IS NULL), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.ordens_servico WHERE deleted_at IS NULL AND status != ''Concluída''), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.obras WHERE deleted_at IS NULL AND status != ''Concluída''), 0)::BIGINT,
      COALESCE((SELECT COUNT(*) FROM %I.produtos WHERE deleted_at IS NULL AND estoque_atual <= estoque_minimo), 0)::BIGINT,
      COALESCE((SELECT SUM(CASE WHEN tipo IN (''receita'', ''receber'') THEN valor ELSE -valor END) FROM %I.financeiro WHERE deleted_at IS NULL AND status = ''concluido''), 0)::NUMERIC,
      COALESCE((SELECT SUM(estoque_atual * preco_custo) FROM %I.produtos WHERE deleted_at IS NULL), 0)::NUMERIC
  ', v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_dashboard_kpis TO authenticated;
