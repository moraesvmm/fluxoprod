-- Migration: Atualizar RPCs de clientes com soft delete, cursor pagination, filtros e ordenação
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
        -- Atualizar RPC tenant_listar_clientes
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_listar_clientes(
                p_cursor UUID DEFAULT NULL,
                p_limit INT DEFAULT 20,
                p_status TEXT DEFAULT NULL,
                p_funil_fase TEXT DEFAULT NULL,
                p_busca TEXT DEFAULT NULL,
                p_order_by TEXT DEFAULT ''criado_em'',
                p_order_dir TEXT DEFAULT ''DESC''
            )
            RETURNS TABLE (
                id UUID,
                nome VARCHAR(255),
                email VARCHAR(255),
                telefone VARCHAR(50),
                documento VARCHAR(50),
                endereco TEXT,
                funil_fase VARCHAR(50),
                status VARCHAR(50),
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
                    c.id,
                    c.nome,
                    c.email,
                    c.telefone,
                    c.documento,
                    c.endereco,
                    c.funil_fase,
                    c.status,
                    c.criado_em,
                    c.atualizado_em,
                    LEAD(c.id) OVER (
                        ORDER BY 
                            CASE 
                                WHEN p_order_by IN (''nome'', ''email'', ''telefone'', ''criado_em'', ''atualizado_em'') 
                                THEN p_order_by 
                                ELSE ''criado_em'' 
                            END,
                            CASE 
                                WHEN UPPER(p_order_dir) IN (''ASC'', ''DESC'') 
                                THEN UPPER(p_order_dir) 
                                ELSE ''DESC'' 
                            END
                    ) AS next_cursor
                FROM clientes c
                WHERE c.deleted_at IS NULL
                    AND (p_status IS NULL OR c.status = p_status)
                    AND (p_funil_fase IS NULL OR c.funil_fase = p_funil_fase)
                    AND (p_busca IS NULL OR 
                         c.nome ILIKE ''%%'' || p_busca || ''%%'' OR 
                         c.email ILIKE ''%%'' || p_busca || ''%%'' OR 
                         c.documento ILIKE ''%%'' || p_busca || ''%%'')
                    AND (p_cursor IS NULL OR c.id < p_cursor)
                ORDER BY 
                    CASE 
                        WHEN p_order_by IN (''nome'', ''email'', ''telefone'', ''criado_em'', ''atualizado_em'') 
                        THEN p_order_by 
                        ELSE ''criado_em'' 
                    END,
                    CASE 
                        WHEN UPPER(p_order_dir) IN (''ASC'', ''DESC'') 
                        THEN UPPER(p_order_dir) 
                        ELSE ''DESC'' 
                    END
                LIMIT p_limit;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_listar_clientes atualizada em %', tenant_schema.schema_name;
        
        -- Atualizar RPC tenant_criar_cliente
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_criar_cliente(
                p_nome VARCHAR(255),
                p_email VARCHAR(255),
                p_telefone VARCHAR(50),
                p_funil_fase VARCHAR(50),
                p_status VARCHAR(50),
                p_idempotency_key TEXT DEFAULT NULL
            )
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            DECLARE
                v_cliente_id UUID;
                v_cached_result JSONB;
            BEGIN
                IF p_idempotency_key IS NOT NULL THEN
                    SELECT result INTO v_cached_result
                    FROM idempotency_control
                    WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_cliente'';
                    
                    IF v_cached_result IS NOT NULL THEN
                        RETURN v_cached_result;
                    END IF;
                END IF;

                INSERT INTO clientes (nome, email, telefone, funil_fase, status, deleted_at)
                VALUES (p_nome, p_email, p_telefone, p_funil_fase, p_status, NULL)
                RETURNING id INTO v_cliente_id;

                v_cached_result := json_build_object(
                    ''success'', true,
                    ''cliente_id'', v_cliente_id
                );

                IF p_idempotency_key IS NOT NULL THEN
                    INSERT INTO idempotency_control (idempotency_key, operation_type, result)
                    VALUES (p_idempotency_key, ''tenant_criar_cliente'', v_cached_result);
                END IF;

                RETURN v_cached_result;
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION ''Erro ao criar cliente: %%'', SQLERRM;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_criar_cliente atualizada em %', tenant_schema.schema_name;
        
        -- Atualizar RPC tenant_atualizar_cliente
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_atualizar_cliente(
                p_cliente_id UUID,
                p_nome VARCHAR(255),
                p_email VARCHAR(255),
                p_telefone VARCHAR(50),
                p_funil_fase VARCHAR(50),
                p_status VARCHAR(50)
            )
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            BEGIN
                UPDATE clientes
                SET 
                    nome = p_nome,
                    email = p_email,
                    telefone = p_telefone,
                    funil_fase = p_funil_fase,
                    status = p_status,
                    atualizado_em = NOW()
                WHERE id = p_cliente_id AND deleted_at IS NULL;
                
                RETURN json_build_object(''success'', true);
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION ''Erro ao atualizar cliente: %%'', SQLERRM;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_atualizar_cliente atualizada em %', tenant_schema.schema_name;
        
        -- Atualizar RPC tenant_excluir_cliente para soft delete
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_excluir_cliente(p_cliente_id UUID)
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            BEGIN
                UPDATE clientes
                SET deleted_at = NOW()
                WHERE id = p_cliente_id AND deleted_at IS NULL;
                
                RETURN json_build_object(''success'', true);
            EXCEPTION WHEN OTHERS THEN
                RAISE;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_excluir_cliente atualizada para soft delete em %', tenant_schema.schema_name;
    END LOOP;
END $$;
