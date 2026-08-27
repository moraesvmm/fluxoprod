-- apps/api/migrations/rpc_nurturing_interacoes_venda.sql
-- Migration: Atualizar constraints de interações e evoluir a RPC de Nurturing para modelo híbrido (Vendas + CRM)

DO $$
DECLARE
    tenant_schema RECORD;
BEGIN
    FOR tenant_schema IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- 1. Atualizar Constraint de Tipo (incluindo 'venda')
        BEGIN
            EXECUTE format('
                ALTER TABLE %I.interacoes_clientes 
                DROP CONSTRAINT IF EXISTS interacoes_clientes_tipo_check;

                ALTER TABLE %I.interacoes_clientes 
                ADD CONSTRAINT interacoes_clientes_tipo_check 
                CHECK (tipo IN (''ligacao'', ''email'', ''reuniao'', ''nota'', ''whatsapp'', ''visita'', ''venda''));
            ', tenant_schema.schema_name, tenant_schema.schema_name);
            RAISE NOTICE 'Constraint de tipo atualizado em %', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao atualizar constraint em %: %', tenant_schema.schema_name, SQLERRM;
        END;

        -- 2. Definir/Atualizar RPC Interna tenant_obter_sugestoes_nurturing
        BEGIN
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
                SET search_path = %I
                AS $func$
                BEGIN
                    RETURN QUERY
                    -- Bloco 1: Alertas baseados em Vendas (Modelo Tradicional)
                    SELECT 
                        v.id,
                        ''RECOMPRA''::TEXT AS tipo,
                        ''recompra''::TEXT AS categoria,
                        p.nome::TEXT AS produto_servico,
                        (v.criado_em + INTERVAL ''30 days'')::TEXT AS data_alerta,
                        (''Olá '' || c.nome || ''! Identificamos que seu produto '' || p.nome || '' pode estar acabando. Gostaria de repor?'')::TEXT AS mensagem_sugerida,
                        c.nome::TEXT AS cliente_nome,
                        COALESCE(c.telefone, '''')::TEXT AS cliente_telefone
                    FROM vendas v
                    JOIN clientes c ON c.id = v.cliente_id
                    JOIN vendas_itens vi ON vi.venda_id = v.id
                    -- vendas_itens.produto_id referencia estoque(id), não produtos(id)
                    JOIN estoque e ON e.id = vi.produto_id
                    JOIN produtos p ON p.id = e.produto_id
                    WHERE lower(v.status) LIKE ''conclu%%''
                        AND v.criado_em >= NOW() - INTERVAL ''90 days''
                        AND c.deleted_at IS NULL
                    
                    UNION ALL

                    -- Bloco 2: Alertas baseados em Interações de Venda (Modelo CRM A La Carte)
                    SELECT 
                        ic.id,
                        ''RECOMPRA''::TEXT AS tipo,
                        ''recompra''::TEXT AS categoria,
                        (ic.metadata->>''produto_descricao'')::TEXT AS produto_servico,
                        (ic.data_interacao + ((COALESCE(ic.metadata->>''ciclo_recompra_dias'', ''30''))::INT * INTERVAL ''1 day''))::TEXT AS data_alerta,
                        (''Olá '' || c.nome || ''! Seu ciclo de '' || COALESCE(ic.metadata->>''produto_descricao'', ''produto'') || '' está se encerrando. Podemos renovar?'')::TEXT AS mensagem_sugerida,
                        c.nome::TEXT AS cliente_nome,
                        COALESCE(c.telefone, '''')::TEXT AS cliente_telefone
                    FROM interacoes_clientes ic
                    JOIN clientes c ON c.id = ic.cliente_id
                    WHERE ic.tipo = ''venda''
                        AND (ic.data_interacao + ((COALESCE(ic.metadata->>''ciclo_recompra_dias'', ''30''))::INT * INTERVAL ''1 day'')) <= NOW() + INTERVAL ''3 days''
                        AND (ic.data_interacao + ((COALESCE(ic.metadata->>''ciclo_recompra_dias'', ''30''))::INT * INTERVAL ''1 day'')) >= NOW() - INTERVAL ''7 days''
                        AND c.deleted_at IS NULL;
                END;
                $func$;
            ', tenant_schema.schema_name, tenant_schema.schema_name);
            RAISE NOTICE 'RPC tenant_obter_sugestoes_nurturing atualizada em %', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao atualizar RPC em %: %', tenant_schema.schema_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 3. Definir Wrapper Público
CREATE OR REPLACE FUNCTION public.tenant_obter_sugestoes_nurturing()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_result JSONB;
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
    
    EXECUTE format('
        SELECT jsonb_agg(row_to_json(t))
        FROM %I.tenant_obter_sugestoes_nurturing() t
    ', v_tenant_schema)
    INTO v_result;

    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_obter_sugestoes_nurturing() TO authenticated;
