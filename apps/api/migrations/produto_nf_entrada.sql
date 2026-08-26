-- NF de entrada associada ao produto no cadastro de estoque.
-- Campo opcional: a mesma NF pode originar vários produtos.

DO $$
DECLARE
  schema_record RECORD;
BEGIN
  FOR schema_record IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = schema_record.schema_name
        AND table_name = 'produtos'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS nf_entrada VARCHAR(60)',
        schema_record.schema_name
      );
      EXECUTE format(
        'COMMENT ON COLUMN %I.produtos.nf_entrada IS ''Número, série ou chave da NF de entrada informada no cadastro.''',
        schema_record.schema_name
      );
    END IF;
  END LOOP;
END $$;

-- Garante que futuros tenants também recebam o campo.
-- A criação de novos schemas deve incluir nf_entrada na definição de produtos.
