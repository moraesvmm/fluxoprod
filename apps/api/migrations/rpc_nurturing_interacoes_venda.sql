-- apps/api/migrations/rpc_nurturing_interacoes_venda.sql
-- Migration: Atualizar constraints de interações e evoluir a RPC de Nurturing para modelo híbrido (Vendas + CRM)

CREATE OR REPLACE FUNCTION public.provisionar_hook_nurturing_interacoes(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    EXECUTE format(
        'ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
        p_schema
    );

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.interacoes_clientes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID NOT NULL REFERENCES %I.clientes(id) ON DELETE CASCADE,
            tipo TEXT NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT,
            data_interacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            duracao_minutos INTEGER,
            usuario_id UUID,
            metadata JSONB NOT NULL DEFAULT ''{}''::JSONB,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )
    ', p_schema, p_schema);

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I.interacoes_clientes (cliente_id, data_interacao DESC)',
        'idx_interacoes_cliente_data',
        p_schema
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I.interacoes_clientes (tipo)',
        'idx_interacoes_tipo',
        p_schema
    );

    EXECUTE format('
        ALTER TABLE %I.interacoes_clientes
        DROP CONSTRAINT IF EXISTS interacoes_clientes_tipo_check;

        ALTER TABLE %I.interacoes_clientes
        ADD CONSTRAINT interacoes_clientes_tipo_check
        CHECK (tipo IN (''ligacao'', ''email'', ''reuniao'', ''nota'', ''whatsapp'', ''visita'', ''venda''));
    ', p_schema, p_schema);

    EXECUTE format(
        'DROP FUNCTION IF EXISTS %I.tenant_obter_sugestoes_nurturing()',
        p_schema
    );

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_obter_sugestoes_nurturing()
        RETURNS TABLE (
            id UUID,
            tipo TEXT,
            categoria TEXT,
            produto_servico TEXT,
            data_alerta TEXT,
            mensagem_sugerida TEXT,
            cliente_nome TEXT,
            cliente_telefone TEXT
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT
                v.id,
                ''RECOMPRA''::TEXT,
                ''recompra''::TEXT,
                p.nome::TEXT,
                (v.criado_em + INTERVAL ''30 days'')::TEXT,
                (''Olá '' || c.nome || ''! Identificamos que seu produto '' || p.nome || '' pode estar acabando. Gostaria de repor?'')::TEXT,
                c.nome::TEXT,
                COALESCE(c.telefone, '''')::TEXT
            FROM vendas v
            JOIN clientes c ON c.id = v.cliente_id
            JOIN vendas_itens vi ON vi.venda_id = v.id
            JOIN estoque e ON e.id = vi.produto_id
            JOIN produtos p ON p.id = e.produto_id
            WHERE lower(v.status) LIKE ''conclu%%''
              AND v.criado_em >= NOW() - INTERVAL ''90 days''
              AND c.deleted_at IS NULL

            UNION ALL

            SELECT
                ic.id,
                ''RECOMPRA''::TEXT,
                ''recompra''::TEXT,
                (ic.metadata->>''produto_descricao'')::TEXT,
                (ic.data_interacao + ((COALESCE(ic.metadata->>''ciclo_recompra_dias'', ''30''))::INT * INTERVAL ''1 day''))::TEXT,
                (''Olá '' || c.nome || ''! Seu ciclo de '' || COALESCE(ic.metadata->>''produto_descricao'', ''produto'') || '' está se encerrando. Podemos renovar?'')::TEXT,
                c.nome::TEXT,
                COALESCE(c.telefone, '''')::TEXT
            FROM interacoes_clientes ic
            JOIN clientes c ON c.id = ic.cliente_id
                        CROSS JOIN LATERAL (
                                SELECT CASE
                                        WHEN COALESCE(ic.metadata->>''ciclo_recompra_dias'', '''') ~ ''^[0-9]+$''
                                        THEN (ic.metadata->>''ciclo_recompra_dias'')::INTEGER
                                        ELSE 30
                                END AS dias
                        ) ciclo
            WHERE ic.tipo = ''venda''
                            AND ic.deleted_at IS NULL
                            AND (ic.data_interacao + (ciclo.dias * INTERVAL ''1 day'')) <= NOW() + INTERVAL ''3 days''
                            AND (ic.data_interacao + (ciclo.dias * INTERVAL ''1 day'')) >= NOW() - INTERVAL ''7 days''
              AND c.deleted_at IS NULL;
        END;
        $func$;
    ', p_schema, p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_nurturing_interacoes(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('nurturing_interacoes', 50, 'public.provisionar_hook_nurturing_interacoes(text)'::REGPROCEDURE)
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
        PERFORM public.provisionar_hook_nurturing_interacoes(v_schema);
    END LOOP;
END;
$$;

-- 3. Definir Wrapper Público
CREATE OR REPLACE FUNCTION public.tenant_obter_sugestoes_nurturing()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_result JSONB;
    v_returns_jsonb BOOLEAN;
BEGIN
    v_tenant_schema := (
        SELECT e.schema_name
        FROM public.user_profiles up
        JOIN public.empresas e ON e.id = up.empresa_id
        WHERE up.user_id = auth.uid()
        LIMIT 1
    );
    
    IF v_tenant_schema IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;

    SELECT p.prorettype = 'jsonb'::regtype
    INTO v_returns_jsonb
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = v_tenant_schema
      AND p.proname = 'tenant_obter_sugestoes_nurturing'
      AND p.pronargs = 0
    LIMIT 1;

    IF v_returns_jsonb THEN
        EXECUTE format(
            'SELECT %I.tenant_obter_sugestoes_nurturing()',
            v_tenant_schema
        ) INTO v_result;
    ELSE
        EXECUTE format('
            SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb)
            FROM %I.tenant_obter_sugestoes_nurturing() t
        ', v_tenant_schema)
        INTO v_result;
    END IF;

    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_obter_sugestoes_nurturing() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_obter_sugestoes_nurturing() TO authenticated;
