-- Migration: Criar RPC tenant_enviar_campanha para campanhas em massa
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
        -- Criar RPC tenant_enviar_campanha
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_enviar_campanha(
                p_cliente_ids UUID[],
                p_titulo TEXT,
                p_mensagem TEXT,
                p_tipo TEXT DEFAULT ''email''
            )
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            DECLARE
                v_enviados INT := 0;
                v_falhas INT := 0;
                v_cliente_id UUID;
                v_interacao_id UUID;
            BEGIN
                -- Iterar sobre os IDs de clientes
                FOREACH v_cliente_id IN ARRAY p_cliente_ids
                LOOP
                    BEGIN
                        -- Criar interação para registrar o envio
                        INSERT INTO interacoes_clientes (
                            cliente_id,
                            tipo,
                            titulo,
                            descricao,
                            data_interacao,
                            metadata
                        )
                        VALUES (
                            v_cliente_id,
                            p_tipo,
                            p_titulo,
                            p_mensagem,
                            NOW(),
                            jsonb_build_object(
                                ''campanha'', true,
                                ''tipo_envio'', p_tipo
                            )
                        )
                        RETURNING id INTO v_interacao_id;
                        
                        v_enviados := v_enviados + 1;
                    EXCEPTION WHEN OTHERS THEN
                        v_falhas := v_falhas + 1;
                    END;
                END LOOP;
                
                RETURN json_build_object(
                    ''success'', true,
                    ''enviados'', v_enviados,
                    ''falhas'', v_falhas,
                    ''total'', array_length(p_cliente_ids, 1)
                );
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_enviar_campanha criada em %', tenant_schema.schema_name;
    END LOOP;
END $$;
