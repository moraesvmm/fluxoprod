-- Migração: Adicionar índices idx_clientes_criado_em e idx_obras_criado_em
-- para todos os tenants existentes
-- Execute este script no Supabase SQL Editor

DO $$
DECLARE
  tenant_schema RECORD;
BEGIN
  -- Iterar sobre todos os schemas tenant existentes
  FOR tenant_schema IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    -- Adicionar índice idx_clientes_criado_em se não existir
    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_clientes_criado_em ON %I.clientes(criado_em DESC);',
        tenant_schema.schema_name, tenant_schema.schema_name
      );
      RAISE NOTICE 'Índice idx_%_clientes_criado_em criado', tenant_schema.schema_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao criar índice idx_%_clientes_criado_em: %', tenant_schema.schema_name, SQLERRM;
    END;

    -- Adicionar índice idx_obras_criado_em se não existir
    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_obras_criado_em ON %I.obras(criado_em DESC);',
        tenant_schema.schema_name, tenant_schema.schema_name
      );
      RAISE NOTICE 'Índice idx_%_obras_criado_em criado', tenant_schema.schema_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao criar índice idx_%_obras_criado_em: %', tenant_schema.schema_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Migração concluída com sucesso.';
END $$;
