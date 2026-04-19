-- Migration: Criar tabela interacoes_clientes para histórico de interações do CRM
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
        -- Criar tabela interacoes_clientes se não existir
        BEGIN
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.interacoes_clientes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    cliente_id UUID NOT NULL,
                    tipo TEXT NOT NULL CHECK (tipo IN (''ligacao'', ''email'', ''reuniao'', ''nota'', ''whatsapp'', ''visita'')),
                    titulo TEXT NOT NULL,
                    descricao TEXT,
                    data_interacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    duracao_minutos INT,
                    usuario_id UUID,
                    metadata JSONB DEFAULT ''{}'',
                    criado_em TIMESTAMPTZ DEFAULT NOW(),
                    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
                    CONSTRAINT fk_interacoes_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
                );
            ', tenant_schema.schema_name);
            RAISE NOTICE 'Tabela interacoes_clientes criada em %', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar tabela interacoes_clientes em %: %', tenant_schema.schema_name, SQLERRM;
        END;
        
        -- Criar índice composto (cliente_id, data_interacao DESC)
        BEGIN
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_%I_interacoes_cliente_data ON %I.interacoes_clientes(cliente_id, data_interacao DESC);
            ', tenant_schema.schema_name, tenant_schema.schema_name);
            RAISE NOTICE 'Índice idx_%_interacoes_cliente_data criado', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar índice idx_%_interacoes_cliente_data: %', tenant_schema.schema_name, SQLERRM;
        END;
        
        -- Criar índice em tipo
        BEGIN
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_%I_interacoes_tipo ON %I.interacoes_clientes(tipo);
            ', tenant_schema.schema_name, tenant_schema.schema_name);
            RAISE NOTICE 'Índice idx_%_interacoes_tipo criado', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar índice idx_%_interacoes_tipo: %', tenant_schema.schema_name, SQLERRM;
        END;
        
        -- Criar trigger para atualizar atualizado_em
        BEGIN
            EXECUTE format('
                DROP TRIGGER IF EXISTS trg_atualizar_interacoes_clientes ON %I.interacoes_clientes;
            ', tenant_schema.schema_name);
            
            EXECUTE format('
                CREATE TRIGGER trg_atualizar_interacoes_clientes
                BEFORE UPDATE ON %I.interacoes_clientes
                FOR EACH ROW
                EXECUTE FUNCTION atualizar_timestamp();
            ', tenant_schema.schema_name);
            RAISE NOTICE 'Trigger trg_atualizar_interacoes_clientes criado em %', tenant_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar trigger em %: %', tenant_schema.schema_name, SQLERRM;
        END;
    END LOOP;
END $$;
