-- Migration: Criar RPCs para sistema de tags de clientes
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
        -- Atualizar RPC tenant_listar_clientes para aceitar p_tags
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_listar_clientes(
                p_cursor UUID DEFAULT NULL,
                p_limit INT DEFAULT 20,
                p_status TEXT DEFAULT NULL,
                p_funil_fase TEXT DEFAULT NULL,
                p_busca TEXT DEFAULT NULL,
                p_order_by TEXT DEFAULT ''criado_em'',
                p_order_dir TEXT DEFAULT ''DESC'',
                p_tags TEXT[] DEFAULT NULL
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
                tags TEXT[],
                criado_em TIMESTAMPTZ,
                atualizado_em TIMESTAMPTZ,
                deleted_at TIMESTAMPTZ,
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
                    c.tags,
                    c.criado_em,
                    c.atualizado_em,
                    c.deleted_at,
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
                    AND (p_tags IS NULL OR c.tags @> p_tags)
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
        RAISE NOTICE 'RPC tenant_listar_clientes atualizada com p_tags em %', tenant_schema.schema_name;
        
        -- Criar RPC tenant_adicionar_tag
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_adicionar_tag(
                p_cliente_id UUID,
                p_tag TEXT
            )
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            DECLARE
                v_tag_count INT;
            BEGIN
                -- Validar limite de 10 tags
                SELECT array_length(tags, 1) INTO v_tag_count
                FROM clientes
                WHERE id = p_cliente_id;
                
                IF v_tag_count >= 10 THEN
                    RETURN json_build_object(''success'', false, ''error'', ''Máximo de 10 tags por cliente'');
                END IF;
                
                -- Adicionar tag ao cliente se já não existir
                UPDATE clientes
                SET tags = array_append(DISTINCT array_remove(tags, NULL), p_tag)
                WHERE id = p_cliente_id AND NOT (tags @> ARRAY[p_tag]);
                
                -- Upsert no catalog com incremento de uso_count
                INSERT INTO tags_catalog (nome, cor, uso_count)
                VALUES (p_tag, ''#6366f1'', 1)
                ON CONFLICT (nome) 
                DO UPDATE SET uso_count = uso_count + 1;
                
                RETURN json_build_object(''success'', true);
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION ''Erro ao adicionar tag: %%'', SQLERRM;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_adicionar_tag criada em %', tenant_schema.schema_name;
        
        -- Criar RPC tenant_remover_tag
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_remover_tag(
                p_cliente_id UUID,
                p_tag TEXT
            )
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            BEGIN
                -- Remover tag do cliente
                UPDATE clientes
                SET tags = array_remove(tags, p_tag)
                WHERE id = p_cliente_id;
                
                -- Decrementar uso_count no catalog
                UPDATE tags_catalog
                SET uso_count = GREATEST(uso_count - 1, 0)
                WHERE nome = p_tag;
                
                RETURN json_build_object(''success'', true);
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION ''Erro ao remover tag: %%'', SQLERRM;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_remover_tag criada em %', tenant_schema.schema_name;
        
        -- Criar RPC tenant_listar_tags_catalog
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_listar_tags_catalog(
                p_busca TEXT DEFAULT '''',
                p_limit INT DEFAULT 20
            )
            RETURNS TABLE (
                id UUID,
                nome TEXT,
                cor TEXT,
                uso_count INT,
                criado_em TIMESTAMPTZ
            )
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            BEGIN
                RETURN QUERY
                SELECT 
                    tc.id,
                    tc.nome,
                    tc.cor,
                    tc.uso_count,
                    tc.criado_em
                FROM tags_catalog tc
                WHERE p_busca = '''' OR tc.nome ILIKE ''%%'' || p_busca || ''%%''
                ORDER BY tc.uso_count DESC, tc.nome
                LIMIT p_limit;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_listar_tags_catalog criada em %', tenant_schema.schema_name;
    END LOOP;
END $$;
