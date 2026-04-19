-- Migration: Criar RPCs para interações_clientes
-- Execute este script no Supabase SQL Editor com SERVICE_ROLE
-- Esta migration é idempotente e pode ser executada múltiplas vezes

DO $$
DECLARE
    tenant_schema RECORD;
BEGIN
    -- Iterar sobre todos os schemas tenant
    FOR tenant_schema IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- Criar RPC tenant_listar_interacoes
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_listar_interacoes(
                p_cliente_id UUID,
                p_limit INT DEFAULT 20,
                p_cursor UUID DEFAULT NULL
            )
            RETURNS TABLE (
                id UUID,
                cliente_id UUID,
                tipo TEXT,
                titulo TEXT,
                descricao TEXT,
                data_interacao TIMESTAMPTZ,
                duracao_minutos INT,
                usuario_id UUID,
                metadata JSONB,
                criado_em TIMESTAMPTZ,
                atualizado_em TIMESTAMPTZ,
                next_cursor UUID
            )
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            BEGIN
                RETURN QUERY
                SELECT 
                    i.id,
                    i.cliente_id,
                    i.tipo,
                    i.titulo,
                    i.descricao,
                    i.data_interacao,
                    i.duracao_minutos,
                    i.usuario_id,
                    i.metadata,
                    i.criado_em,
                    i.atualizado_em,
                    LEAD(i.id) OVER (ORDER BY i.data_interacao DESC, i.id DESC) AS next_cursor
                FROM interacoes_clientes i
                WHERE i.cliente_id = p_cliente_id
                    AND (p_cursor IS NULL OR i.data_interacao < (
                        SELECT data_interacao 
                        FROM interacoes_clientes 
                        WHERE id = p_cursor 
                        LIMIT 1
                    ) OR (i.data_interacao = (
                        SELECT data_interacao 
                        FROM interacoes_clientes 
                        WHERE id = p_cursor 
                        LIMIT 1
                    ) AND i.id < p_cursor))
                ORDER BY i.data_interacao DESC, i.id DESC
                LIMIT p_limit;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_listar_interacoes criada em %', tenant_schema.schema_name;
        
        -- Criar RPC tenant_criar_interacao
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_criar_interacao(
                p_cliente_id UUID,
                p_tipo TEXT,
                p_titulo TEXT,
                p_descricao TEXT DEFAULT NULL,
                p_data_interacao TIMESTAMPTZ DEFAULT NOW(),
                p_duracao_minutos INT DEFAULT NULL,
                p_usuario_id UUID DEFAULT NULL,
                p_metadata JSONB DEFAULT ''{}''
            )
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            DECLARE
                v_interacao_id UUID;
            BEGIN
                INSERT INTO interacoes_clientes (
                    cliente_id, 
                    tipo, 
                    titulo, 
                    descricao, 
                    data_interacao, 
                    duracao_minutos, 
                    usuario_id, 
                    metadata
                )
                VALUES (
                    p_cliente_id, 
                    p_tipo, 
                    p_titulo, 
                    p_descricao, 
                    p_data_interacao, 
                    p_duracao_minutos, 
                    p_usuario_id, 
                    p_metadata
                )
                RETURNING id INTO v_interacao_id;
                
                RETURN json_build_object(
                    ''success'', true,
                    ''interacao_id'', v_interacao_id
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION ''Erro ao criar interação: %%'', SQLERRM;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_criar_interacao criada em %', tenant_schema.schema_name;
        
        -- Criar RPC tenant_excluir_interacao (DELETE direto - justificativa: interações são registros históricos, se excluídas devem ser removidas permanentemente para manter integridade do histórico)
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_excluir_interacao(p_interacao_id UUID)
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            BEGIN
                DELETE FROM interacoes_clientes
                WHERE id = p_interacao_id;
                
                RETURN json_build_object(''success'', true);
            EXCEPTION WHEN OTHERS THEN
                RAISE;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_excluir_interacao criada em %', tenant_schema.schema_name;
    END LOOP;
END $$;
