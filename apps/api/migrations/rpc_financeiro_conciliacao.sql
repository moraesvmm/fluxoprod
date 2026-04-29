-- Migração SQL: Estrutura para Conciliação Bancária
-- Adiciona campos de rastreabilidade bancária na tabela financeiro

DO $$
DECLARE
  schema_record RECORD;
  v_sql text;
BEGIN
  -- Loop em todos os schemas tenant existentes
  FOR schema_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE 'Preparando estrutura de conciliação no schema %', schema_record.schema_name;

    v_sql := format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''%s'' AND table_name = ''financeiro'' AND column_name = ''banco_transacao_id'') THEN
          ALTER TABLE %I.financeiro ADD COLUMN banco_transacao_id VARCHAR(100);
          ALTER TABLE %I.financeiro ADD COLUMN banco_nome VARCHAR(50);
          ALTER TABLE %I.financeiro ADD COLUMN data_conciliacao TIMESTAMPTZ;
          ALTER TABLE %I.financeiro ADD COLUMN conciliado BOOLEAN DEFAULT FALSE;
          
          CREATE INDEX idx_%I_financeiro_conciliado ON %I.financeiro(conciliado) WHERE conciliado = TRUE;
          CREATE INDEX idx_%I_financeiro_banco_id ON %I.financeiro(banco_transacao_id);
        END IF;
      END $inner$;
    ', schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

  END LOOP;
END $$;
