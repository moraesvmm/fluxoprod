-- Migration: Verdade dos números do Dashboard Executivo
-- 1) tenant_dashboard_kpis: adiciona recortes reais de HOJE e MÊS (antes o rótulo "Hoje" exibia o acumulado histórico)
-- 2) tenant_dashboard_kpis_por_mes: exclui vendas canceladas e adiciona CMV, lucro bruto e margem por mês
-- Convenção de cancelamento tolerante a variações históricas ('Cancelado', 'cancelada', ...): lower(status) NOT LIKE 'cancel%'

CREATE OR REPLACE FUNCTION public.provisionar_hook_dashboard_executivo(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sql text;
  v_table TEXT;
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);
    RAISE NOTICE 'Atualizando KPIs executivos no schema %', p_schema;

    FOREACH v_table IN ARRAY ARRAY[
      'vendas', 'clientes', 'produtos', 'ordens_servico', 'obras', 'financeiro'
    ]
    LOOP
      IF to_regclass(format('%I.%I', p_schema, v_table)) IS NULL THEN
        RAISE EXCEPTION 'Tabela %.% inexistente', p_schema, v_table;
      END IF;

      EXECUTE format(
        'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
        p_schema,
        v_table
      );
    END LOOP;

    -- ── 1. tenant_dashboard_kpis ─────────────────────────────────────────────
    -- Tenants provisionados antes desta migração têm a versão RETURNS TABLE, e
    -- CREATE OR REPLACE não altera o tipo de retorno (42P13).
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_dashboard_kpis();', p_schema);

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
        SELECT COALESCE(SUM(valor_total), 0), COUNT(*)
        INTO v_faturamento_mes, v_qtd_vendas_mes
        FROM vendas
        WHERE deleted_at IS NULL
          AND lower(status) NOT LIKE ''cancel%%''
          AND criado_em >= date_trunc(''month'', now());

        -- CMV vem dos itens: vendas_itens.produto_id referencia estoque(id), não produtos(id)
        SELECT COALESCE(SUM(vi.quantidade * COALESCE(p.custo_unitario, 0)), 0)
        INTO v_cmv_mes
        FROM vendas v
        JOIN vendas_itens vi ON vi.venda_id = v.id
        LEFT JOIN estoque e ON e.id = vi.produto_id
        LEFT JOIN produtos p ON p.id = e.produto_id
        WHERE v.deleted_at IS NULL
          AND lower(v.status) NOT LIKE ''cancel%%''
          AND v.criado_em >= date_trunc(''month'', now());

        -- Acumulado histórico (mantido por compatibilidade de contrato)
        SELECT COALESCE(SUM(valor_total), 0), COUNT(*)
        INTO v_total_vendas, v_qtd_vendas
        FROM vendas
        WHERE deleted_at IS NULL AND lower(status) NOT LIKE ''cancel%%'';

        SELECT COUNT(*) INTO v_qtd_clientes FROM clientes WHERE deleted_at IS NULL;
        SELECT COUNT(*) INTO v_qtd_produtos FROM produtos WHERE deleted_at IS NULL;

        SELECT COUNT(*) INTO v_qtd_os_abertas
        FROM ordens_servico
        WHERE deleted_at IS NULL
          AND lower(status) NOT LIKE ''conclu%%''
          AND lower(status) NOT LIKE ''cancel%%'';

        SELECT COUNT(*) INTO v_qtd_obras
        FROM obras
        WHERE deleted_at IS NULL AND lower(status) = ''em_andamento'';

        -- estoque/vendas_itens não têm deleted_at em schemas antigos; filtra-se por produtos
        SELECT COUNT(*) INTO v_estoque_baixo
        FROM estoque e
        JOIN produtos p ON p.id = e.produto_id
        WHERE p.deleted_at IS NULL AND e.quantidade <= e.quantidade_minima;

        -- ''pago'' é o estado liquidado em financeiro.status
        SELECT COALESCE(SUM(CASE WHEN tipo = ''receber'' THEN valor ELSE -valor END), 0)
        INTO v_saldo
        FROM financeiro
        WHERE deleted_at IS NULL AND status = ''pago'';

        SELECT COALESCE(SUM(e.quantidade * COALESCE(p.custo_unitario, 0)), 0)
        INTO v_patrimonio_estoque
        FROM estoque e
        JOIN produtos p ON p.id = e.produto_id
        WHERE p.deleted_at IS NULL;

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
    ', p_schema, p_schema);
    EXECUTE v_sql;

    -- ── 2. tenant_dashboard_kpis_por_mes ────────────────────────────────────
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_dashboard_kpis_por_mes(INTEGER);', p_schema);

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
            COALESCE(SUM(cmv.custo), 0) AS cmv,
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
          -- LATERAL evita que o join de itens multiplique valor_total
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(vi.quantidade * COALESCE(p.custo_unitario, 0)), 0) AS custo
            FROM vendas_itens vi
            LEFT JOIN estoque e ON e.id = vi.produto_id
            LEFT JOIN produtos p ON p.id = e.produto_id
            WHERE vi.venda_id = v.id
          ) cmv ON TRUE
          GROUP BY meses.mes
        ) sub;

        RETURN COALESCE(v_result, ''[]''::jsonb);
      END;
      $func$;
    ', p_schema, p_schema);
    EXECUTE v_sql;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_dashboard_executivo(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('dashboard_executivo', 30, 'public.provisionar_hook_dashboard_executivo(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem,
    hook_function = EXCLUDED.hook_function,
    ativo = TRUE;

DO $$
DECLARE
  v_schema TEXT;
BEGIN
  FOR v_schema IN
    SELECT e.schema_name
    FROM public.empresas e
    WHERE e.schema_name LIKE 'tenant_%'
      AND to_regnamespace(e.schema_name) IS NOT NULL
    ORDER BY e.schema_name
  LOOP
    PERFORM public.provisionar_hook_dashboard_executivo(v_schema);
  END LOOP;
END;
$$;

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
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.tenant_dashboard_kpis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_dashboard_kpis TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_dashboard_kpis_por_mes(p_meses INTEGER DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.tenant_dashboard_kpis_por_mes(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_dashboard_kpis_por_mes(INTEGER) TO authenticated;
