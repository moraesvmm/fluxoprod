-- Migration: Verdade dos números do Dashboard Executivo
-- 1) tenant_dashboard_kpis: adiciona recortes reais de HOJE e MÊS (antes o rótulo "Hoje" exibia o acumulado histórico)
-- 2) tenant_dashboard_kpis_por_mes: exclui vendas canceladas e adiciona CMV, lucro bruto e margem por mês
-- Convenção de cancelamento tolerante a variações históricas ('Cancelado', 'cancelada', ...): lower(status) NOT LIKE 'cancel%'

DO $$
DECLARE
  schema_record RECORD;
  v_sql text;
BEGIN
  FOR schema_record IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE 'Atualizando KPIs executivos no schema %', schema_record.schema_name;

    -- ── 1. tenant_dashboard_kpis ─────────────────────────────────────────────
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_dashboard_kpis()
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_faturamento_hoje NUMERIC;
        v_qtd_vendas_hoje BIGINT;
        v_faturamento_mes NUMERIC;
        v_cmv_mes NUMERIC;
        v_qtd_vendas_mes BIGINT;
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
        -- Recorte HOJE (fuso do servidor; vendas válidas)
        SELECT COALESCE(SUM(valor_total), 0), COUNT(*)
        INTO v_faturamento_hoje, v_qtd_vendas_hoje
        FROM vendas
        WHERE deleted_at IS NULL
          AND lower(status) NOT LIKE ''cancel%%''
          AND criado_em >= date_trunc(''day'', now())
          AND criado_em < date_trunc(''day'', now()) + INTERVAL ''1 day'';

        -- Recorte MÊS CORRENTE
        SELECT COALESCE(SUM(valor_total), 0), COALESCE(SUM(COALESCE(valor_custo_total, 0)), 0), COUNT(*)
        INTO v_faturamento_mes, v_cmv_mes, v_qtd_vendas_mes
        FROM vendas
        WHERE deleted_at IS NULL
          AND lower(status) NOT LIKE ''cancel%%''
          AND criado_em >= date_trunc(''month'', now());

        -- Acumulado histórico (mantido por compatibilidade de contrato)
        SELECT COALESCE(SUM(valor_total), 0), COUNT(*)
        INTO v_total_vendas, v_qtd_vendas
        FROM vendas
        WHERE deleted_at IS NULL AND lower(status) NOT LIKE ''cancel%%'';

        SELECT COUNT(*) INTO v_qtd_clientes FROM clientes WHERE deleted_at IS NULL;
        SELECT COUNT(*) INTO v_qtd_produtos FROM produtos WHERE deleted_at IS NULL;
        SELECT COUNT(*) INTO v_qtd_os_abertas FROM ordens_servico WHERE deleted_at IS NULL AND status != ''Concluída'';
        SELECT COUNT(*) INTO v_qtd_obras FROM obras WHERE deleted_at IS NULL AND status != ''Concluída'';
        SELECT COUNT(*) INTO v_estoque_baixo FROM produtos WHERE deleted_at IS NULL AND estoque_atual <= estoque_minimo;

        SELECT COALESCE(SUM(CASE WHEN tipo IN (''receita'', ''receber'') THEN valor ELSE -valor END), 0)
        INTO v_saldo FROM financeiro WHERE deleted_at IS NULL AND status = ''concluido'';

        SELECT COALESCE(SUM(estoque_atual * preco_custo), 0) INTO v_patrimonio_estoque
        FROM produtos WHERE deleted_at IS NULL;

        RETURN jsonb_build_object(
          ''faturamento_hoje'', v_faturamento_hoje,
          ''qtd_vendas_hoje'', v_qtd_vendas_hoje,
          ''faturamento_mes'', v_faturamento_mes,
          ''cmv_mes'', v_cmv_mes,
          ''lucro_bruto_mes'', v_faturamento_mes - v_cmv_mes,
          ''qtd_vendas_mes'', v_qtd_vendas_mes,
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

    -- ── 2. tenant_dashboard_kpis_por_mes ────────────────────────────────────
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_dashboard_kpis_por_mes(p_meses INTEGER DEFAULT 6)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_result JSONB;
      BEGIN
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            ''mes'', to_char(sub.mes, ''YYYY-MM''),
            ''faturamento'', sub.faturamento,
            ''cmv'', sub.cmv,
            ''lucro_bruto'', sub.faturamento - sub.cmv,
            ''margem_bruta'', CASE WHEN sub.faturamento > 0
              THEN round(((sub.faturamento - sub.cmv) / sub.faturamento) * 100, 2)
              ELSE 0 END,
            ''total_vendas'', sub.total_vendas,
            ''ticket_medio'', sub.ticket_medio
          ) ORDER BY sub.mes
        ), ''[]''::jsonb)
        INTO v_result
        FROM (
          SELECT
            meses.mes,
            COALESCE(SUM(v.valor_total), 0) AS faturamento,
            COALESCE(SUM(COALESCE(v.valor_custo_total, 0)), 0) AS cmv,
            COUNT(v.id) AS total_vendas,
            CASE WHEN COUNT(v.id) > 0
              THEN COALESCE(SUM(v.valor_total), 0) / COUNT(v.id)
              ELSE 0 END AS ticket_medio
          FROM (
            SELECT generate_series(
              date_trunc(''month'', CURRENT_DATE - INTERVAL ''1 month'' * (p_meses - 1)),
              date_trunc(''month'', CURRENT_DATE),
              INTERVAL ''1 month''
            ) AS mes
          ) meses
          LEFT JOIN vendas v ON
            date_trunc(''month'', v.criado_em) = meses.mes
            AND v.deleted_at IS NULL
            AND lower(v.status) NOT LIKE ''cancel%%''
          GROUP BY meses.mes
        ) sub;

        RETURN COALESCE(v_result, ''[]''::jsonb);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

  END LOOP;
END $$;

-- ── Wrappers públicos (roteamento por tenant) ────────────────────────────────

-- O contrato público permanece TABLE (o frontend consome array); o cálculo vive
-- exclusivamente na função do schema tenant, evitando lógica duplicada.
DROP FUNCTION IF EXISTS public.tenant_dashboard_kpis();

CREATE FUNCTION public.tenant_dashboard_kpis()
RETURNS TABLE(
  faturamento_hoje NUMERIC,
  qtd_vendas_hoje BIGINT,
  faturamento_mes NUMERIC,
  cmv_mes NUMERIC,
  lucro_bruto_mes NUMERIC,
  qtd_vendas_mes BIGINT,
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
  SELECT e.schema_name INTO v_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  IF v_schema IS NULL OR v_schema = 'public' THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE format('
    SELECT
      (r->>''faturamento_hoje'')::NUMERIC,
      (r->>''qtd_vendas_hoje'')::BIGINT,
      (r->>''faturamento_mes'')::NUMERIC,
      (r->>''cmv_mes'')::NUMERIC,
      (r->>''lucro_bruto_mes'')::NUMERIC,
      (r->>''qtd_vendas_mes'')::BIGINT,
      (r->>''total_vendas'')::NUMERIC,
      (r->>''qtd_vendas'')::BIGINT,
      (r->>''qtd_clientes'')::BIGINT,
      (r->>''qtd_produtos'')::BIGINT,
      (r->>''qtd_os_abertas'')::BIGINT,
      (r->>''qtd_obras_em_andamento'')::BIGINT,
      (r->>''estoque_baixo'')::BIGINT,
      (r->>''saldo'')::NUMERIC,
      (r->>''patrimonio_estoque'')::NUMERIC
    FROM (SELECT %I.tenant_dashboard_kpis() AS r) t
  ', v_schema);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_dashboard_kpis TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_dashboard_kpis_por_mes(p_meses INTEGER DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  IF v_tenant_schema IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  EXECUTE format('SET LOCAL search_path TO %I, public', v_tenant_schema);
  EXECUTE format('SELECT %I.tenant_dashboard_kpis_por_mes($1)', v_tenant_schema)
  INTO v_result
  USING p_meses;

  IF v_result IS NULL OR NOT jsonb_typeof(v_result) = 'array' THEN
    v_result := '[]'::jsonb;
  END IF;

  RETURN v_result;
END;
$$;
