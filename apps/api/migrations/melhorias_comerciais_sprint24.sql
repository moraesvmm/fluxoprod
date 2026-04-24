-- Migração SQL: Melhorias Comerciais Sprint 24
-- Adiciona: fechamentos_mensais, cpf_cnpj em clientes, desconto em vendas

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
    RAISE NOTICE 'Atualizando schema %', schema_record.schema_name;

    -- 1. Criar tabela fechamentos_mensais
    v_sql := format('
      CREATE TABLE IF NOT EXISTS %I.fechamentos_mensais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mes VARCHAR(7) NOT NULL UNIQUE, -- YYYY-MM
        faturamento NUMERIC(10, 2) DEFAULT 0,
        total_vendas INTEGER DEFAULT 0,
        ticket_medio NUMERIC(10, 2) DEFAULT 0,
        criado_em TIMESTAMPTZ DEFAULT NOW(),
        visto_em TIMESTAMPTZ
      );
    ', schema_record.schema_name);
    EXECUTE v_sql;

    -- 2. Adicionar cpf_cnpj em clientes
    v_sql := format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''%s'' AND table_name = ''clientes'' AND column_name = ''cpf_cnpj'') THEN
          ALTER TABLE %I.clientes ADD COLUMN cpf_cnpj VARCHAR(20);
        END IF;
      END $inner$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 3. Adicionar desconto_aplicado em vendas
    v_sql := format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''%s'' AND table_name = ''vendas'' AND column_name = ''desconto_aplicado'') THEN
          ALTER TABLE %I.vendas ADD COLUMN desconto_aplicado NUMERIC(10, 2) DEFAULT 0;
        END IF;
      END $inner$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 4. Atualizar RPC tenant_criar_cliente
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_criar_cliente(
        p_nome TEXT,
        p_email TEXT,
        p_telefone TEXT,
        p_funil_fase TEXT,
        p_status TEXT,
        p_cpf_cnpj TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_id UUID;
      BEGIN
        INSERT INTO clientes (nome, email, telefone, funil_fase, status, cpf_cnpj)
        VALUES (p_nome, p_email, p_telefone, p_funil_fase, p_status, p_cpf_cnpj)
        RETURNING id INTO v_id;
        
        RETURN jsonb_build_object(''success'', true, ''id'', v_id);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 5. Atualizar RPC tenant_atualizar_cliente
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_atualizar_cliente(
        p_id UUID,
        p_nome TEXT,
        p_email TEXT,
        p_telefone TEXT,
        p_funil_fase TEXT,
        p_status TEXT,
        p_cpf_cnpj TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        UPDATE clientes 
        SET 
          nome = p_nome,
          email = p_email,
          telefone = p_telefone,
          funil_fase = p_funil_fase,
          status = p_status,
          cpf_cnpj = p_cpf_cnpj,
          atualizado_em = NOW()
        WHERE id = p_id;
        
        RETURN jsonb_build_object(''success'', true);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 6. Atualizar RPC tenant_processar_venda (transacional com desconto)
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_processar_venda(
        p_cliente_id UUID,
        p_cliente_nome TEXT,
        p_itens JSONB, -- Array de objetos com produto_id, qtd, preco
        p_vendedor_id UUID DEFAULT NULL,
        p_vendedor_nome TEXT DEFAULT NULL,
        p_metodo_pagamento TEXT DEFAULT ''dinheiro'',
        p_valor_total NUMERIC DEFAULT 0,
        p_desconto NUMERIC DEFAULT 0
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
      BEGIN
        -- Se não tiver cliente_id mas tiver nome (Cliente Avulso), tenta achar ou cria
        IF v_cliente_id IS NULL AND p_cliente_nome IS NOT NULL THEN
          SELECT id INTO v_cliente_id FROM clientes WHERE nome = p_cliente_nome LIMIT 1;
          
          IF v_cliente_id IS NULL THEN
            INSERT INTO clientes (nome, funil_fase, status) 
            VALUES (p_cliente_nome, ''Lead'', ''Ativo'') 
            RETURNING id INTO v_cliente_id;
          END IF;
        END IF;

        -- Criar venda
        INSERT INTO vendas (cliente_id, valor_total, metodo_pagamento, status, desconto_aplicado)
        VALUES (v_cliente_id, p_valor_total, p_metodo_pagamento, ''Concluído'', p_desconto)
        RETURNING id INTO v_venda_id;

        -- Processar itens e decrementar estoque
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, qtd INTEGER, preco NUMERIC)
        LOOP
          -- Inserir item da venda
          INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
          VALUES (v_venda_id, v_item.produto_id, v_item.qtd, v_item.preco);

          -- Decrementar estoque
          UPDATE estoque 
          SET quantidade = quantidade - v_item.qtd, atualizado_em = NOW()
          WHERE produto_id = v_item.produto_id;
        END LOOP;

        RETURN jsonb_build_object(''success'', true, ''venda_id'', v_venda_id, ''total'', p_valor_total);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 7. Criar RPC tenant_obter_fechamento_pendente
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_obter_fechamento_pendente()
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_mes_passado VARCHAR(7);
        v_registro fechamentos_mensais%%ROWTYPE;
        v_faturamento NUMERIC(10,2);
        v_total_vendas INTEGER;
        v_ticket_medio NUMERIC(10,2);
      BEGIN
        v_mes_passado := to_char(date_trunc(''month'', CURRENT_DATE - INTERVAL ''1 month''), ''YYYY-MM'');

        -- Tentar buscar registro existente
        SELECT * INTO v_registro FROM fechamentos_mensais WHERE mes = v_mes_passado;

        -- Se não existe, cria
        IF v_registro IS NULL THEN
          -- Calcular métricas na tabela de vendas
          SELECT 
            COALESCE(SUM(valor_total), 0),
            COUNT(id),
            CASE WHEN COUNT(id) > 0 THEN COALESCE(SUM(valor_total), 0) / COUNT(id) ELSE 0 END
          INTO v_faturamento, v_total_vendas, v_ticket_medio
          FROM vendas 
          WHERE to_char(date_trunc(''month'', criado_em), ''YYYY-MM'') = v_mes_passado
          AND deleted_at IS NULL;

          -- Inserir
          INSERT INTO fechamentos_mensais (mes, faturamento, total_vendas, ticket_medio)
          VALUES (v_mes_passado, v_faturamento, v_total_vendas, v_ticket_medio)
          RETURNING * INTO v_registro;
        END IF;

        -- Se foi visto, retorna vazio indicando que não há pendências
        IF v_registro.visto_em IS NOT NULL THEN
          RETURN jsonb_build_object(''pendente'', false);
        END IF;

        RETURN jsonb_build_object(
          ''pendente'', true,
          ''mes'', v_registro.mes,
          ''faturamento'', v_registro.faturamento,
          ''total_vendas'', v_registro.total_vendas,
          ''ticket_medio'', v_registro.ticket_medio
        );
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 8. Criar RPC tenant_marcar_fechamento_visto
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_marcar_fechamento_visto(p_mes TEXT)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        UPDATE fechamentos_mensais 
        SET visto_em = NOW() 
        WHERE mes = p_mes;
        
        RETURN jsonb_build_object(''success'', true);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

  END LOOP;
END $$;

-- 9. Wrappers globais no schema PUBLIC
CREATE OR REPLACE FUNCTION public.tenant_obter_fechamento_pendente() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_schema text;
  v_result JSONB;
BEGIN
  v_tenant_schema := public.get_tenant_schema();
  IF v_tenant_schema IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Tenant não identificado'); END IF;
  EXECUTE format('SET search_path TO %I', v_tenant_schema);
  EXECUTE format('SELECT %I.tenant_obter_fechamento_pendente()', v_tenant_schema) INTO v_result;
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.tenant_obter_fechamento_pendente() TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_marcar_fechamento_visto(p_mes TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_schema text;
  v_result JSONB;
BEGIN
  v_tenant_schema := public.get_tenant_schema();
  IF v_tenant_schema IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Tenant não identificado'); END IF;
  EXECUTE format('SET search_path TO %I', v_tenant_schema);
  EXECUTE format('SELECT %I.tenant_marcar_fechamento_visto($1)', v_tenant_schema) USING p_mes INTO v_result;
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.tenant_marcar_fechamento_visto(TEXT) TO authenticated;
