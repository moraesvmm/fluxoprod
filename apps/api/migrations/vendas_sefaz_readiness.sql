-- Migração SQL: Prontidão SEFAZ e Melhorias de Busca (Vendas)
-- Adiciona campos de NFe e otimiza RPCs de listagem

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
    RAISE NOTICE 'Atualizando schema % para prontidão SEFAZ', schema_record.schema_name;

    -- 1. Adicionar colunas de NFe na tabela vendas
    v_sql := format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''%s'' AND table_name = ''vendas'' AND column_name = ''nfe_status'') THEN
          ALTER TABLE %I.vendas ADD COLUMN nfe_status VARCHAR(20) DEFAULT ''nao_emitida'';
          ALTER TABLE %I.vendas ADD COLUMN nfe_chave VARCHAR(44);
          ALTER TABLE %I.vendas ADD COLUMN nfe_recibo VARCHAR(100);
          ALTER TABLE %I.vendas ADD COLUMN nfe_xml TEXT;
          ALTER TABLE %I.vendas ADD COLUMN nfe_erro TEXT;
        END IF;
      END $inner$;
    ', schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 2. Atualizar RPC tenant_listar_vendas para suportar busca e novos campos
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_vendas(
        p_limit INTEGER DEFAULT 100,
        p_offset INTEGER DEFAULT 0,
        p_busca TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_result JSONB;
      BEGIN
        SELECT jsonb_agg(row_to_json(t))
        INTO v_result
        FROM (
          SELECT 
            v.id,
            v.valor_total as valor,
            v.metodo_pagamento as metodo,
            v.status,
            v.criado_em,
            c.nome as cliente,
            v.nfe_status,
            v.nfe_chave,
            v.desconto_aplicado
          FROM vendas v
          LEFT JOIN clientes c ON v.cliente_id = c.id
          WHERE (p_busca IS NULL OR 
                 c.nome ILIKE ''%%'' || p_busca || ''%%'' OR 
                 v.id::text ILIKE ''%%'' || p_busca || ''%%'')
            AND v.deleted_at IS NULL
          ORDER BY v.criado_em DESC
          LIMIT p_limit OFFSET p_offset
        ) t;
        
        RETURN COALESCE(v_result, ''[]''::jsonb);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 3. Atualizar RPC tenant_processar_venda para suportar inicialização de NFe
    -- Mantendo compatibilidade com a versão anterior
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
      BEGIN
        -- Se p_emitir_nfe for true, coloca como pendente para o agente de integração captar
        IF p_emitir_nfe THEN
          v_nfe_status := ''pendente'';
        END IF;

        -- Localizar ou criar cliente
        IF v_cliente_id IS NULL AND p_cliente_nome IS NOT NULL THEN
          SELECT id INTO v_cliente_id FROM clientes WHERE nome = p_cliente_nome AND deleted_at IS NULL LIMIT 1;
          
          IF v_cliente_id IS NULL THEN
            INSERT INTO clientes (nome, funil_fase, status) 
            VALUES (p_cliente_nome, ''Lead'', ''Ativo'') 
            RETURNING id INTO v_cliente_id;
          END IF;
        END IF;

        -- Criar venda
        INSERT INTO vendas (cliente_id, valor_total, metodo_pagamento, status, desconto_aplicado, vendedor_id, nfe_status)
        VALUES (v_cliente_id, p_valor_total, p_metodo_pagamento, ''Concluído'', p_desconto, p_vendedor_id, v_nfe_status)
        RETURNING id INTO v_venda_id;

        -- Processar itens e baixar estoque
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, qtd INTEGER, preco NUMERIC)
        LOOP
          INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
          VALUES (v_venda_id, v_item.produto_id, v_item.qtd, v_item.preco);

          UPDATE estoque 
          SET quantidade = quantidade - v_item.qtd, atualizado_em = NOW()
          WHERE produto_id = v_item.produto_id;
        END LOOP;

        RETURN jsonb_build_object(
          ''success'', true, 
          ''venda_id'', v_venda_id, 
          ''total'', p_valor_total,
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

-- Wrappers no schema PUBLIC para roteamento multi-tenant
CREATE OR REPLACE FUNCTION public.tenant_listar_vendas(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_busca TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema text;
  v_result JSONB;
BEGIN
  v_tenant_schema := public.get_tenant_schema();
  IF v_tenant_schema IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Tenant não identificado'); 
  END IF;
  
  EXECUTE format('SELECT %I.tenant_listar_vendas($1, $2, $3)', v_tenant_schema)
  INTO v_result
  USING p_limit, p_offset, p_busca;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_vendas(INTEGER, INTEGER, TEXT) TO authenticated;
