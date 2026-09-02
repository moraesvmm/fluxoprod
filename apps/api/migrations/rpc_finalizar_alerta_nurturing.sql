-- apps/api/migrations/rpc_finalizar_alerta_nurturing.sql
-- Corrige o botão "X" do CRM de recompra: tenant_finalizar_alerta_nurturing só existia
-- ad-hoc no tenant demo (tenant_suplementos_257cc9), nunca foi versionada nem registrada
-- no hook de provisionamento, então 404 nos demais tenants (card nunca sai da tela).
-- As sugestões são calculadas dinamicamente (vendas/interacoes_clientes), sem uma linha
-- de "alerta" persistida, então esta migração cria uma tabela de dispensa e filtra por ela.

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

    -- Tabela de dispensa: as sugestões não têm linha própria, então guardamos o id de origem (venda/interação) descartado.
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.nurturing_alertas_dispensados (
            origem_id UUID PRIMARY KEY,
            dispensado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    ', p_schema);

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
              AND NOT EXISTS (SELECT 1 FROM nurturing_alertas_dispensados d WHERE d.origem_id = v.id)

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
              AND c.deleted_at IS NULL
              AND NOT EXISTS (SELECT 1 FROM nurturing_alertas_dispensados d WHERE d.origem_id = ic.id);
        END;
        $func$;
    ', p_schema, p_schema);

    -- RPC Tenant Local: Descartar sugestão (grava a dispensa; a sugestão para de aparecer)
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_finalizar_alerta_nurturing_local(UUID);', p_schema);
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_finalizar_alerta_nurturing_local(p_origem_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        BEGIN
            INSERT INTO nurturing_alertas_dispensados (origem_id)
            VALUES (p_origem_id)
            ON CONFLICT (origem_id) DO NOTHING;

            RETURN jsonb_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
        END;
        $func$;
    ', p_schema, p_schema);

    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC;', p_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon;', p_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated;', p_schema);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', p_schema);
    EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO service_role;', p_schema);
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

-- Wrapper público: descartar sugestão de nurturing
CREATE OR REPLACE FUNCTION public.tenant_finalizar_alerta_nurturing(p_alerta_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT public.set_tenant_schema(auth.uid()) INTO v_schema;
    IF v_schema = 'public' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Acesso negado ou usuário sem tenant configurado');
    END IF;

    EXECUTE format('SELECT %I.tenant_finalizar_alerta_nurturing_local($1)', v_schema)
    INTO v_result USING p_alerta_id;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_finalizar_alerta_nurturing(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_finalizar_alerta_nurturing(UUID) TO authenticated;

-- O hook atualizado acima atende os tenants atuais e o provisionador master (tenants futuros).
