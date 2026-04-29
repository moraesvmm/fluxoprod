-- Migração SQL: Atualização Retroativa de CMV
-- Estima o custo total de vendas passadas baseado no preço de custo atual

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
    RAISE NOTICE 'Calculando CMV retroativo no schema %', schema_record.schema_name;

    v_sql := format('
      UPDATE %I.vendas v
      SET valor_custo_total = (
        SELECT COALESCE(SUM(p.preco_custo * vi.quantidade), 0)
        FROM %I.vendas_itens vi
        JOIN %I.produtos p ON p.id = vi.produto_id
        WHERE vi.venda_id = v.id
      )
      WHERE v.valor_custo_total = 0 OR v.valor_custo_total IS NULL;
    ', schema_record.schema_name, schema_record.schema_name, schema_record.schema_name);
    
    EXECUTE v_sql;
  END LOOP;
END $$;
