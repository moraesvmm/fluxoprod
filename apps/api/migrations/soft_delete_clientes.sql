-- Migration: Adicionar soft delete na tabela clientes
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
        -- Adicionar coluna deleted_at se não existir
        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;',
                tenant_schema.schema_name
            );
            RAISE NOTICE 'Coluna deleted_at adicionada em %.clientes', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao adicionar deleted_at em %.clientes: %', tenant_schema.schema_name, SQLERRM;
        END;
        
        -- Criar índice em deleted_at se não existir
        BEGIN
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS idx_%I_clientes_deleted_at ON %I.clientes(deleted_at);',
                tenant_schema.schema_name, tenant_schema.schema_name
            );
            RAISE NOTICE 'Índice idx_%_clientes_deleted_at criado', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar índice idx_%_clientes_deleted_at: %', tenant_schema.schema_name, SQLERRM;
        END;
    END LOOP;
END $$;
