-- Migration: Adicionar sistema de tags para segmentação de clientes
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
        -- Adicionar coluna tags à tabela clientes se não existir
        BEGIN
            EXECUTE format('
                ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ''{}'';
            ', tenant_schema.schema_name);
            RAISE NOTICE 'Coluna tags adicionada em %.clientes', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao adicionar tags em %.clientes: %', tenant_schema.schema_name, SQLERRM;
        END;
        
        -- Criar índice GIN em tags se não existir
        BEGIN
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_%I_clientes_tags ON %I.clientes USING GIN(tags);
            ', tenant_schema.schema_name, tenant_schema.schema_name);
            RAISE NOTICE 'Índice idx_%_clientes_tags criado', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar índice idx_%_clientes_tags: %', tenant_schema.schema_name, SQLERRM;
        END;
        
        -- Criar tabela tags_catalog se não existir
        BEGIN
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.tags_catalog (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    nome TEXT NOT NULL UNIQUE,
                    cor TEXT DEFAULT ''#6366f1'',
                    uso_count INT DEFAULT 0,
                    criado_em TIMESTAMPTZ DEFAULT NOW()
                );
            ', tenant_schema.schema_name);
            RAISE NOTICE 'Tabela tags_catalog criada em %', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar tabela tags_catalog em %: %', tenant_schema.schema_name, SQLERRM;
        END;
        
        -- Criar índice em uso_count
        BEGIN
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_%I_tags_catalog_uso_count ON %I.tags_catalog(uso_count DESC);
            ', tenant_schema.schema_name, tenant_schema.schema_name);
            RAISE NOTICE 'Índice idx_%_tags_catalog_uso_count criado', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar índice idx_%_tags_catalog_uso_count: %', tenant_schema.schema_name, SQLERRM;
        END;
    END LOOP;
END $$;
