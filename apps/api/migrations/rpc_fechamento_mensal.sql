-- ==========================================
-- Migration: RPCs de Fechamento Mensal do Dashboard
-- Data: 27/04/2026
-- Objetivo: Documentar e reproduzir as RPCs tenant_obter_fechamento_pendente
--           e tenant_marcar_fechamento_visto que operam na tabela fechamentos_mensais.
-- Dependência: Tabela fechamentos_mensais já criada pela provisionar_empresa.
-- ==========================================

-- ==========================================
-- 1. RPCs TENANT-LEVEL (aplicar em todos os schemas existentes)
-- ==========================================
DO $$
DECLARE
  tenant_schema RECORD;
BEGIN
  FOR tenant_schema IN
    SELECT schema_name FROM public.empresas WHERE schema_name IS NOT NULL AND schema_name != 'public'
  LOOP
    -- 1.1 tenant_obter_fechamento_pendente
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_obter_fechamento_pendente()
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_mes_anterior VARCHAR(7);
          v_registro RECORD;
          v_faturamento NUMERIC;
          v_total_vendas INT;
          v_ticket_medio NUMERIC;
        BEGIN
          v_mes_anterior := to_char(CURRENT_DATE - INTERVAL ''1 month'', ''YYYY-MM'');

          SELECT * INTO v_registro FROM fechamentos_mensais WHERE mes = v_mes_anterior;

          IF NOT FOUND THEN
            SELECT
              COALESCE(SUM(valor_total), 0),
              COUNT(*)::INT,
              CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor_total), 0) / COUNT(*) ELSE 0 END
            INTO v_faturamento, v_total_vendas, v_ticket_medio
            FROM vendas
            WHERE criado_em >= date_trunc(''month'', CURRENT_DATE - INTERVAL ''1 month'')
              AND criado_em < date_trunc(''month'', CURRENT_DATE)
              AND status = ''concluido'';

            IF v_total_vendas > 0 OR EXTRACT(DAY FROM CURRENT_DATE) <= 5 THEN
              INSERT INTO fechamentos_mensais (mes, faturamento, total_vendas, ticket_medio)
              VALUES (v_mes_anterior, v_faturamento, v_total_vendas, v_ticket_medio)
              ON CONFLICT (mes) DO NOTHING
              RETURNING * INTO v_registro;
            ELSE
              RETURN jsonb_build_object(''success'', true, ''pendente'', false);
            END IF;
          END IF;

          IF v_registro.visto THEN
            RETURN jsonb_build_object(''success'', true, ''pendente'', false);
          END IF;

          RETURN jsonb_build_object(
            ''success'', true,
            ''pendente'', true,
            ''mes'', v_registro.mes,
            ''faturamento'', v_registro.faturamento,
            ''total_vendas'', v_registro.total_vendas,
            ''ticket_medio'', v_registro.ticket_medio
          );
        END;
        $func$;
    ', tenant_schema.schema_name, tenant_schema.schema_name);

    -- 1.2 tenant_marcar_fechamento_visto
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_marcar_fechamento_visto(p_mes VARCHAR)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          UPDATE fechamentos_mensais
          SET visto = true, visto_em = NOW()
          WHERE mes = p_mes;

          IF NOT FOUND THEN
            RETURN jsonb_build_object(''success'', false, ''error'', ''Registro não encontrado'');
          END IF;

          RETURN jsonb_build_object(''success'', true);
        END;
        $func$;
    ', tenant_schema.schema_name, tenant_schema.schema_name);

    RAISE NOTICE 'RPCs de fechamento mensal criadas em %', tenant_schema.schema_name;
  END LOOP;
END $$;

-- ==========================================
-- 2. WRAPPERS PÚBLICOS (roteamento para schema do tenant)
-- ==========================================

-- 2.1 Obter fechamento pendente
CREATE OR REPLACE FUNCTION public.tenant_obter_fechamento_pendente()
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
    RETURN jsonb_build_object('success', false, 'error', 'Tenant não identificado');
  END IF;

  EXECUTE format('SET LOCAL search_path TO %I, public', v_tenant_schema);

  EXECUTE format('SELECT %I.tenant_obter_fechamento_pendente()', v_tenant_schema)
  INTO v_result;

  RETURN COALESCE(v_result, jsonb_build_object('success', true, 'pendente', false));
END;
$$;
GRANT EXECUTE ON FUNCTION public.tenant_obter_fechamento_pendente TO authenticated;

-- 2.2 Marcar fechamento como visto
CREATE OR REPLACE FUNCTION public.tenant_marcar_fechamento_visto(p_mes VARCHAR)
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
    RETURN jsonb_build_object('success', false, 'error', 'Tenant não identificado');
  END IF;

  EXECUTE format('SET LOCAL search_path TO %I, public', v_tenant_schema);

  EXECUTE format('SELECT %I.tenant_marcar_fechamento_visto($1)', v_tenant_schema)
  INTO v_result
  USING p_mes;

  RETURN COALESCE(v_result, jsonb_build_object('success', false, 'error', 'Falha ao marcar'));
END;
$$;
GRANT EXECUTE ON FUNCTION public.tenant_marcar_fechamento_visto TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
