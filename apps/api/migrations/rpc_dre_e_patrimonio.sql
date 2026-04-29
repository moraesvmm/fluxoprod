-- Migração SQL: Motor de DRE (Demonstrativo de Resultados)
-- Consolida Faturamento, CMV e Despesas Operacionais por período

DO $$
DECLARE
  schema_record RECORD;
  v_sql text;
BEGIN
  -- Loop em todos os schemas tenant existentes
  FOR schema_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE 'Implementando Motor de DRE no schema %', schema_record.schema_name;

    -- 1. Criar RPC tenant_obter_dre
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_obter_dre(
        p_data_inicio TIMESTAMPTZ,
        p_data_fim TIMESTAMPTZ
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_faturamento NUMERIC := 0;
        v_cmv NUMERIC := 0;
        v_lucro_bruto NUMERIC := 0;
        v_despesas NUMERIC := 0;
        v_lucro_liquido NUMERIC := 0;
        v_margem_bruta NUMERIC := 0;
        v_margem_liquida NUMERIC := 0;
      BEGIN
        -- 1. Calcular Faturamento Bruto (Vendas Concluídas no período)
        SELECT COALESCE(SUM(valor_total), 0) INTO v_faturamento
        FROM vendas
        WHERE criado_em >= p_data_inicio 
          AND criado_em <= p_data_fim
          AND status != ''Cancelado''
          AND deleted_at IS NULL;

        -- 2. Calcular CMV (Custo de Mercadoria Vendida)
        SELECT COALESCE(SUM(valor_custo_total), 0) INTO v_cmv
        FROM vendas
        WHERE criado_em >= p_data_inicio 
          AND criado_em <= p_data_fim
          AND status != ''Cancelado''
          AND deleted_at IS NULL;

        -- 3. Calcular Lucro Bruto
        v_lucro_bruto := v_faturamento - v_cmv;

        -- 4. Calcular Despesas Operacionais (Financeiro do tipo pagar/despesa)
        -- Excluímos possíveis lançamentos manuais de CMV para evitar bitributação/duplicidade se houver
        SELECT COALESCE(SUM(valor), 0) INTO v_despesas
        FROM financeiro
        WHERE criado_em >= p_data_inicio 
          AND criado_em <= p_data_fim
          AND (tipo = ''pagar'' OR tipo = ''despesa'')
          AND categoria != ''Estoque'' -- Categorias que representam reposição
          AND status = ''concluido''
          AND deleted_at IS NULL;

        -- 5. Calcular Lucro Líquido
        v_lucro_liquido := v_lucro_bruto - v_despesas;

        -- 6. Calcular Margens (%)
        IF v_faturamento > 0 THEN
          v_margem_bruta := (v_lucro_bruto / v_faturamento) * 100;
          v_margem_liquida := (v_lucro_liquido / v_faturamento) * 100;
        END IF;

        RETURN jsonb_build_object(
          ''faturamento'', v_faturamento,
          ''cmv'', v_cmv,
          ''lucro_bruto'', v_lucro_bruto,
          ''despesas'', v_despesas,
          ''lucro_liquido'', v_lucro_liquido,
          ''margem_bruta'', round(v_margem_bruta, 2),
          ''margem_liquida'', round(v_margem_liquida, 2),
          ''periodo'', jsonb_build_object(
            ''inicio'', p_data_inicio,
            ''fim'', p_data_fim
          )
        );
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 2. Adicionar KPI de Patrimônio em Estoque à RPC tenant_dashboard_kpis
    -- Primeiro, precisamos saber se a função atual existe para não quebrar o contrato
    -- Vou sobrescrever a tenant_dashboard_kpis com a nova coluna patrimônio_estoque
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_dashboard_kpis()
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_total_vendas NUMERIC;
        v_qtd_vendas BIGINT;
        v_qtd_clientes BIGINT;
        v_qtd_produtos BIGINT;
        v_qtd_os_abertas BIGINT;
        v_qtd_obras BIGINT;
        v_estoque_baixo BIGINT;
        v_saldo NUMERIC;
        v_patrimonio_estoque NUMERIC;
      BEGIN
        SELECT COALESCE(SUM(valor_total), 0), COUNT(*) INTO v_total_vendas, v_qtd_vendas FROM vendas WHERE deleted_at IS NULL AND status != ''Cancelado'';
        SELECT COUNT(*) INTO v_qtd_clientes FROM clientes WHERE deleted_at IS NULL;
        SELECT COUNT(*) INTO v_qtd_produtos FROM produtos WHERE deleted_at IS NULL;
        SELECT COUNT(*) INTO v_qtd_os_abertas FROM ordens_servico WHERE deleted_at IS NULL AND status != ''Concluída'';
        SELECT COUNT(*) INTO v_qtd_obras FROM obras WHERE deleted_at IS NULL AND status != ''Concluída'';
        SELECT COUNT(*) INTO v_estoque_baixo FROM produtos WHERE deleted_at IS NULL AND estoque_atual <= estoque_minimo;
        
        SELECT COALESCE(SUM(CASE WHEN tipo IN (''receita'', ''receber'') THEN valor ELSE -valor END), 0) 
        INTO v_saldo FROM financeiro WHERE deleted_at IS NULL AND status = ''concluido'';

        -- NOVO: Cálculo de Patrimônio em Estoque (Custo Total Imobilizado)
        SELECT COALESCE(SUM(estoque_atual * preco_custo), 0) INTO v_patrimonio_estoque
        FROM produtos WHERE deleted_at IS NULL;

        RETURN jsonb_build_object(
          ''total_vendas'', v_total_vendas,
          ''qtd_vendas'', v_qtd_vendas,
          ''qtd_clientes'', v_qtd_clientes,
          ''qtd_produtos'', v_qtd_produtos,
          ''qtd_os_abertas'', v_qtd_os_abertas,
          ''qtd_obras_em_andamento'', v_qtd_obras,
          ''estoque_baixo'', v_estoque_baixo,
          ''saldo'', v_saldo,
          ''patrimonio_estoque'', v_patrimonio_estoque
        );
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

  END LOOP;
END $$;

-- Wrapper Public
CREATE OR REPLACE FUNCTION public.tenant_obter_dre(p_data_inicio TIMESTAMPTZ, p_data_fim TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema text;
  v_result JSONB;
BEGIN
  v_tenant_schema := public.get_tenant_schema();
  IF v_tenant_schema IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Tenant não identificado'); END IF;
  
  EXECUTE format('SELECT %I.tenant_obter_dre($1, $2)', v_tenant_schema)
  INTO v_result
  USING p_data_inicio, p_data_fim;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_obter_dre(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
