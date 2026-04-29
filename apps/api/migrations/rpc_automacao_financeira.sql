-- Migração SQL: Automação Financeira e Captura de CMV
-- Integração Venda -> Financeiro e Registro de Custo Total

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
    RAISE NOTICE 'Implementando automação financeira no schema %', schema_record.schema_name;

    -- 1. Adicionar coluna valor_custo_total na tabela vendas
    v_sql := format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''%s'' AND table_name = ''vendas'' AND column_name = ''valor_custo_total'') THEN
          ALTER TABLE %I.vendas ADD COLUMN valor_custo_total NUMERIC DEFAULT 0;
        END IF;
      END $inner$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 2. Atualizar RPC tenant_processar_venda (v2 com integração financeira)
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_processar_venda(
        p_cliente_id UUID,
        p_cliente_nome TEXT,
        p_itens JSONB,
        p_vendedor_id UUID DEFAULT NULL,
        p_vendedor_nome TEXT DEFAULT NULL,
        p_metodo_pagamento TEXT DEFAULT ''dinheiro'',
        p_valor_total NUMERIC DEFAULT 0,
        p_desconto NUMERIC DEFAULT 0,
        p_emitir_nfe BOOLEAN DEFAULT FALSE
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_venda_id UUID;
        v_item RECORD;
        v_cliente_id UUID := p_cliente_id;
        v_nfe_status TEXT := ''nao_emitida'';
        v_custo_total_venda NUMERIC := 0;
        v_custo_unitario_atual NUMERIC;
      BEGIN
        -- 1. Lógica SEFAZ
        IF p_emitir_nfe THEN
          v_nfe_status := ''pendente'';
        END IF;

        -- 2. Localizar ou criar cliente
        IF v_cliente_id IS NULL AND p_cliente_nome IS NOT NULL THEN
          SELECT id INTO v_cliente_id FROM clientes WHERE nome = p_cliente_nome AND deleted_at IS NULL LIMIT 1;
          IF v_cliente_id IS NULL THEN
            INSERT INTO clientes (nome, funil_fase, status) 
            VALUES (p_cliente_nome, ''Lead'', ''Ativo'') 
            RETURNING id INTO v_cliente_id;
          END IF;
        END IF;

        -- 3. Criar venda (inicialmente com custo 0)
        INSERT INTO vendas (cliente_id, valor_total, metodo_pagamento, status, desconto_aplicado, vendedor_id, nfe_status)
        VALUES (v_cliente_id, p_valor_total, p_metodo_pagamento, ''Concluído'', p_desconto, p_vendedor_id, v_nfe_status)
        RETURNING id INTO v_venda_id;

        -- 4. Processar itens, baixar estoque e calcular CMV
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, qtd INTEGER, preco NUMERIC)
        LOOP
          -- Buscar custo atual do produto para registrar o CMV da venda
          SELECT preco_custo INTO v_custo_unitario_atual FROM produtos WHERE id = v_item.produto_id;
          v_custo_total_venda := v_custo_total_venda + (COALESCE(v_custo_unitario_atual, 0) * v_item.qtd);

          INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
          VALUES (v_venda_id, v_item.produto_id, v_item.qtd, v_item.preco);

          UPDATE estoque 
          SET quantidade = quantidade - v_item.qtd, atualizado_em = NOW()
          WHERE produto_id = v_item.produto_id;
        END LOOP;

        -- 5. Atualizar custo total na venda
        UPDATE vendas SET valor_custo_total = v_custo_total_venda WHERE id = v_venda_id;

        -- 6. AUTOMATIZAÇÃO FINANCEIRA: Criar entrada no financeiro
        INSERT INTO financeiro (tipo, descricao, valor, data_vencimento, status, categoria)
        VALUES (
          ''receita'', 
          ''Venda #'' || upper(substring(v_venda_id::text from 1 for 8)), 
          p_valor_total, 
          CURRENT_DATE, 
          ''concluido'', 
          ''Vendas''
        );

        RETURN jsonb_build_object(
          ''success'', true, 
          ''venda_id'', v_venda_id, 
          ''total'', p_valor_total,
          ''custo_total'', v_custo_total_venda,
          ''nfe_status'', v_nfe_status
        );
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

  END LOOP;
END $$;
