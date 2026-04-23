-- Migração para adicionar as colunas cliente_nome, vendedor_id e vendedor_nome 
-- na tabela de vendas de todos os tenants

DO $$
DECLARE
    v_schema record;
BEGIN
    FOR v_schema IN SELECT schema_name FROM public.empresas LOOP
        EXECUTE format('
            ALTER TABLE %I.vendas 
            ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(255),
            ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES %I.funcionarios(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS vendedor_nome VARCHAR(255);
        ', v_schema.schema_name, v_schema.schema_name);
        
        RAISE NOTICE 'Adicionadas colunas na tabela vendas do schema %', v_schema.schema_name;
    END LOOP;
END;
$$;
