-- Entradas de mercadoria e ledger de movimentacoes de estoque.
-- A entrada, seus itens, o saldo e os movimentos sao persistidos na mesma transacao.

CREATE OR REPLACE FUNCTION public.provisionar_estoque_movimentacoes(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema TEXT := p_schema;
BEGIN
  IF v_schema !~ '^tenant_[a-zA-Z0-9_]+$'
     OR NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema) THEN
    RAISE EXCEPTION 'Schema tenant invalido: %', v_schema;
  END IF;

  IF to_regclass(format('%I.produtos', v_schema)) IS NULL
     OR to_regclass(format('%I.estoque', v_schema)) IS NULL THEN
    RAISE NOTICE 'Schema % ignorado: tabelas produtos/estoque nao encontradas', v_schema;
    RETURN;
  END IF;

    EXECUTE format($sql$
      CREATE TABLE IF NOT EXISTS %I.estoque_entradas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fornecedor_id UUID,
        fornecedor_nome VARCHAR(255),
        fornecedor_documento VARCHAR(20),
        numero_documento VARCHAR(60),
        serie_documento VARCHAR(20),
        chave_nfe VARCHAR(44),
        data_emissao DATE,
        data_entrada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        valor_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
        observacao TEXT,
        origem VARCHAR(30) NOT NULL DEFAULT 'manual'
          CHECK (origem IN ('manual', 'xml_nfe', 'focus_nfe', 'estoque_inicial', 'importacao')),
        status VARCHAR(20) NOT NULL DEFAULT 'concluida'
          CHECK (status IN ('rascunho', 'concluida', 'cancelada')),
        idempotency_key TEXT,
        criado_por UUID,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (chave_nfe IS NULL OR chave_nfe ~ '^[0-9]{44}$')
      )
    $sql$, v_schema);

    EXECUTE format($sql$
      CREATE TABLE IF NOT EXISTS %I.estoque_entrada_itens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entrada_id UUID NOT NULL REFERENCES %I.estoque_entradas(id) ON DELETE RESTRICT,
        produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE RESTRICT,
        estoque_id UUID NOT NULL REFERENCES %I.estoque(id) ON DELETE RESTRICT,
        local_id UUID,
        quantidade INTEGER NOT NULL CHECK (quantidade > 0),
        custo_unitario NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (custo_unitario >= 0),
        lote VARCHAR(80),
        data_validade DATE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (entrada_id, produto_id, local_id, lote)
      )
    $sql$, v_schema, v_schema, v_schema, v_schema);

    EXECUTE format($sql$
      CREATE TABLE IF NOT EXISTS %I.estoque_movimentacoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE RESTRICT,
        estoque_id UUID NOT NULL REFERENCES %I.estoque(id) ON DELETE RESTRICT,
        local_id UUID,
        entrada_id UUID REFERENCES %I.estoque_entradas(id) ON DELETE RESTRICT,
        entrada_item_id UUID REFERENCES %I.estoque_entrada_itens(id) ON DELETE RESTRICT,
        venda_id UUID,
        transferencia_id UUID,
        movimento_estorno_id UUID REFERENCES %I.estoque_movimentacoes(id) ON DELETE RESTRICT,
        tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
          'entrada', 'saida_venda', 'devolucao_venda', 'ajuste_entrada', 'ajuste_saida',
          'transferencia_saida', 'transferencia_entrada', 'estorno'
        )),
        origem VARCHAR(40) NOT NULL,
        quantidade INTEGER NOT NULL CHECK (quantidade <> 0),
        saldo_anterior INTEGER NOT NULL,
        saldo_posterior INTEGER NOT NULL CHECK (saldo_posterior >= 0),
        custo_unitario NUMERIC(14, 4),
        documento VARCHAR(80),
        observacao TEXT,
        idempotency_key TEXT,
        criado_por UUID,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (saldo_posterior = saldo_anterior + quantidade)
      )
    $sql$, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema);

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I.estoque_entradas (idempotency_key) WHERE idempotency_key IS NOT NULL', 'uq_' || v_schema || '_entradas_idempotency', v_schema);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I.estoque_entradas (chave_nfe) WHERE chave_nfe IS NOT NULL', 'uq_' || v_schema || '_entradas_chave_nfe', v_schema);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I.estoque_entradas (fornecedor_documento, numero_documento, serie_documento) WHERE chave_nfe IS NULL AND fornecedor_documento IS NOT NULL AND numero_documento IS NOT NULL', 'uq_' || v_schema || '_entradas_documento', v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.estoque_entradas (data_entrada DESC)', 'idx_' || v_schema || '_entradas_data', v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.estoque_entrada_itens (produto_id, criado_em DESC)', 'idx_' || v_schema || '_entrada_itens_produto', v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.estoque_movimentacoes (produto_id, criado_em DESC)', 'idx_' || v_schema || '_movimentos_produto', v_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.estoque_movimentacoes (tipo, criado_em DESC)', 'idx_' || v_schema || '_movimentos_tipo', v_schema);

    EXECUTE format($function$
      CREATE OR REPLACE FUNCTION %I.tenant_registrar_entrada_estoque(
        p_fornecedor_id UUID,
        p_fornecedor_nome TEXT,
        p_fornecedor_documento TEXT,
        p_numero_documento TEXT,
        p_serie_documento TEXT,
        p_chave_nfe TEXT,
        p_data_emissao DATE,
        p_observacao TEXT,
        p_origem TEXT,
        p_itens JSONB,
        p_idempotency_key TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_entrada_id UUID;
        v_item RECORD;
        v_estoque_id UUID;
        v_entrada_item_id UUID;
        v_saldo_anterior INTEGER;
        v_saldo_posterior INTEGER;
        v_valor_total NUMERIC(14, 2) := 0;
        v_documento TEXT;
        v_custo_anterior NUMERIC := 0;
        v_novo_custo NUMERIC := 0;
      BEGIN
        IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
          RAISE EXCEPTION 'Informe ao menos um item para a entrada';
        END IF;

        IF NULLIF(trim(p_chave_nfe), '') IS NOT NULL AND trim(p_chave_nfe) !~ '^[0-9]{44}$' THEN
          RAISE EXCEPTION 'A chave da NF-e deve conter 44 digitos';
        END IF;

        IF p_idempotency_key IS NOT NULL THEN
          SELECT id INTO v_entrada_id
          FROM estoque_entradas
          WHERE idempotency_key = p_idempotency_key;

          IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'entrada_id', v_entrada_id, 'duplicada', true);
          END IF;
        END IF;

        v_documento := COALESCE(NULLIF(trim(p_chave_nfe), ''), NULLIF(trim(p_numero_documento), ''), 'Entrada manual');

        INSERT INTO estoque_entradas (
          fornecedor_id, fornecedor_nome, fornecedor_documento, numero_documento,
          serie_documento, chave_nfe, data_emissao, observacao, origem,
          idempotency_key, criado_por
        ) VALUES (
          p_fornecedor_id, NULLIF(trim(p_fornecedor_nome), ''), NULLIF(regexp_replace(p_fornecedor_documento, '[^0-9]', '', 'g'), ''),
          NULLIF(trim(p_numero_documento), ''), NULLIF(trim(p_serie_documento), ''), NULLIF(trim(p_chave_nfe), ''),
          p_data_emissao, NULLIF(trim(p_observacao), ''), COALESCE(NULLIF(p_origem, ''), 'manual'),
          p_idempotency_key, auth.uid()
        ) RETURNING id INTO v_entrada_id;

        PERFORM set_config('app.estoque_movimento_gerenciado', 'true', true);

        FOR v_item IN
          SELECT *
          FROM jsonb_to_recordset(p_itens) AS item(
            produto_id UUID,
            quantidade INTEGER,
            custo_unitario NUMERIC,
            local_id UUID,
            lote TEXT,
            data_validade DATE
          )
        LOOP
          IF v_item.produto_id IS NULL OR COALESCE(v_item.quantidade, 0) <= 0 THEN
            RAISE EXCEPTION 'Produto e quantidade positiva sao obrigatorios em todos os itens';
          END IF;

          SELECT e.id, e.quantidade,
                 COALESCE(
                   NULLIF(to_jsonb(p)->>'preco_custo', '')::NUMERIC,
                   NULLIF(to_jsonb(p)->>'custo_unitario', '')::NUMERIC,
                   0
                 )
          INTO v_estoque_id, v_saldo_anterior, v_custo_anterior
          FROM estoque e
          JOIN produtos p ON p.id = e.produto_id
          WHERE e.produto_id = v_item.produto_id
          FOR UPDATE OF e;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto %% nao possui registro de estoque', v_item.produto_id;
          END IF;

          v_saldo_posterior := v_saldo_anterior + v_item.quantidade;
          v_novo_custo := CASE
            WHEN v_saldo_posterior = 0 THEN COALESCE(v_item.custo_unitario, 0)
            ELSE ((v_saldo_anterior * v_custo_anterior) + (v_item.quantidade * COALESCE(v_item.custo_unitario, 0))) / v_saldo_posterior
          END;

          UPDATE estoque
          SET quantidade = v_saldo_posterior, atualizado_em = NOW()
          WHERE id = v_estoque_id;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'produtos' AND column_name = 'preco_custo'
          ) AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'produtos' AND column_name = 'custo_unitario'
          ) THEN
            EXECUTE 'UPDATE produtos SET preco_custo = $1, custo_unitario = $1, atualizado_em = NOW() WHERE id = $2'
            USING v_novo_custo, v_item.produto_id;
          ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'produtos' AND column_name = 'preco_custo'
          ) THEN
            EXECUTE 'UPDATE produtos SET preco_custo = $1, atualizado_em = NOW() WHERE id = $2'
            USING v_novo_custo, v_item.produto_id;
          ELSE
            EXECUTE 'UPDATE produtos SET custo_unitario = $1, atualizado_em = NOW() WHERE id = $2'
            USING v_novo_custo, v_item.produto_id;
          END IF;

          IF v_item.local_id IS NOT NULL THEN
            INSERT INTO estoque_por_local (produto_id, local_id, quantidade, criado_em, atualizado_em)
            VALUES (v_item.produto_id, v_item.local_id, v_item.quantidade, NOW(), NOW())
            ON CONFLICT (produto_id, local_id)
            DO UPDATE SET quantidade = estoque_por_local.quantidade + EXCLUDED.quantidade, atualizado_em = NOW();
          END IF;

          INSERT INTO estoque_entrada_itens (
            entrada_id, produto_id, estoque_id, local_id, quantidade,
            custo_unitario, lote, data_validade
          ) VALUES (
            v_entrada_id, v_item.produto_id, v_estoque_id, v_item.local_id,
            v_item.quantidade, COALESCE(v_item.custo_unitario, 0),
            NULLIF(trim(v_item.lote), ''), v_item.data_validade
          ) RETURNING id INTO v_entrada_item_id;

          INSERT INTO estoque_movimentacoes (
            produto_id, estoque_id, local_id, entrada_id, entrada_item_id,
            tipo, origem, quantidade, saldo_anterior, saldo_posterior,
            custo_unitario, documento, observacao, idempotency_key, criado_por
          ) VALUES (
            v_item.produto_id, v_estoque_id, v_item.local_id, v_entrada_id, v_entrada_item_id,
            'entrada', COALESCE(NULLIF(p_origem, ''), 'manual'), v_item.quantidade,
            v_saldo_anterior, v_saldo_posterior, COALESCE(v_item.custo_unitario, 0),
            v_documento, NULLIF(trim(p_observacao), ''),
            CASE WHEN p_idempotency_key IS NULL THEN NULL ELSE p_idempotency_key || ':' || v_item.produto_id::TEXT END,
            auth.uid()
          );

          v_valor_total := v_valor_total + (v_item.quantidade * COALESCE(v_item.custo_unitario, 0));
        END LOOP;

        UPDATE estoque_entradas
        SET valor_total = v_valor_total, atualizado_em = NOW()
        WHERE id = v_entrada_id;

        PERFORM set_config('app.estoque_movimento_gerenciado', 'false', true);

        RETURN jsonb_build_object('success', true, 'entrada_id', v_entrada_id, 'valor_total', v_valor_total);
      EXCEPTION
        WHEN unique_violation THEN
          SELECT id INTO v_entrada_id
          FROM estoque_entradas
          WHERE (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key)
             OR (NULLIF(trim(p_chave_nfe), '') IS NOT NULL AND chave_nfe = trim(p_chave_nfe))
          LIMIT 1;

          IF v_entrada_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'entrada_id', v_entrada_id, 'duplicada', true);
          END IF;
          RAISE;
      END;
      $func$
    $function$, v_schema, v_schema);

    EXECUTE format($function$
      CREATE OR REPLACE FUNCTION %I.tenant_listar_entradas_estoque(
        p_produto_id UUID DEFAULT NULL,
        p_limit INTEGER DEFAULT 100,
        p_offset INTEGER DEFAULT 0
      )
      RETURNS TABLE (
        id UUID,
        fornecedor_nome VARCHAR,
        fornecedor_documento VARCHAR,
        numero_documento VARCHAR,
        serie_documento VARCHAR,
        chave_nfe VARCHAR,
        data_emissao DATE,
        data_entrada TIMESTAMPTZ,
        valor_total NUMERIC,
        origem VARCHAR,
        status VARCHAR,
        quantidade_itens BIGINT
      )
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
        SELECT e.id, e.fornecedor_nome, e.fornecedor_documento, e.numero_documento,
               e.serie_documento, e.chave_nfe, e.data_emissao, e.data_entrada,
               e.valor_total, e.origem, e.status, COUNT(i.id) AS quantidade_itens
        FROM estoque_entradas e
        LEFT JOIN estoque_entrada_itens i ON i.entrada_id = e.id
        WHERE p_produto_id IS NULL OR i.produto_id = p_produto_id
        GROUP BY e.id
        ORDER BY e.data_entrada DESC
        LIMIT LEAST(GREATEST(p_limit, 1), 500) OFFSET GREATEST(p_offset, 0)
      $func$
    $function$, v_schema, v_schema);

    EXECUTE format($function$
      CREATE OR REPLACE FUNCTION %I.tenant_listar_movimentacoes_estoque(
        p_produto_id UUID DEFAULT NULL,
        p_tipo TEXT DEFAULT NULL,
        p_limit INTEGER DEFAULT 100,
        p_offset INTEGER DEFAULT 0
      )
      RETURNS TABLE (
        id UUID,
        produto_id UUID,
        produto_nome VARCHAR,
        tipo VARCHAR,
        origem VARCHAR,
        quantidade INTEGER,
        saldo_anterior INTEGER,
        saldo_posterior INTEGER,
        custo_unitario NUMERIC,
        documento VARCHAR,
        entrada_id UUID,
        venda_id UUID,
        transferencia_id UUID,
        criado_em TIMESTAMPTZ
      )
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
        SELECT m.id, m.produto_id, p.nome, m.tipo, m.origem, m.quantidade,
               m.saldo_anterior, m.saldo_posterior, m.custo_unitario,
               m.documento, m.entrada_id, m.venda_id, m.transferencia_id, m.criado_em
        FROM estoque_movimentacoes m
        JOIN produtos p ON p.id = m.produto_id
        WHERE (p_produto_id IS NULL OR m.produto_id = p_produto_id)
          AND (p_tipo IS NULL OR m.tipo = p_tipo)
        ORDER BY m.criado_em DESC
        LIMIT LEAST(GREATEST(p_limit, 1), 500) OFFSET GREATEST(p_offset, 0)
      $func$
    $function$, v_schema, v_schema);

    EXECUTE format($function$
      CREATE OR REPLACE FUNCTION %I.registrar_alteracao_saldo_no_ledger()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_delta INTEGER;
        v_tipo TEXT;
        v_origem TEXT := 'atualizacao_saldo_legado';
        v_venda_id UUID;
      BEGIN
        IF NEW.quantidade = OLD.quantidade
           OR current_setting('app.estoque_movimento_gerenciado', true) = 'true'
           OR NEW.produto_id IS NULL THEN
          RETURN NEW;
        END IF;

        v_delta := NEW.quantidade - OLD.quantidade;

        SELECT vi.venda_id INTO v_venda_id
        FROM vendas_itens vi
        JOIN vendas v ON v.id = vi.venda_id
        WHERE (vi.produto_id = NEW.id OR vi.produto_id = NEW.produto_id)
          AND vi.quantidade = ABS(v_delta)
          AND vi.criado_em >= NOW() - INTERVAL '5 seconds'
        ORDER BY vi.criado_em DESC
        LIMIT 1;

        IF v_venda_id IS NOT NULL AND v_delta < 0 THEN
          v_tipo := 'saida_venda';
          v_origem := 'venda';
        ELSIF v_venda_id IS NOT NULL AND v_delta > 0 THEN
          v_tipo := 'devolucao_venda';
          v_origem := 'devolucao_venda';
        ELSIF v_delta > 0 THEN
          v_tipo := 'ajuste_entrada';
        ELSE
          v_tipo := 'ajuste_saida';
        END IF;

        INSERT INTO estoque_movimentacoes (
          produto_id, estoque_id, venda_id, tipo, origem, quantidade,
          saldo_anterior, saldo_posterior, documento, criado_por
        ) VALUES (
          NEW.produto_id, NEW.id, v_venda_id, v_tipo, v_origem, v_delta,
          OLD.quantidade, NEW.quantidade,
          CASE WHEN v_venda_id IS NULL THEN NULL ELSE v_venda_id::TEXT END,
          auth.uid()
        );

        RETURN NEW;
      END;
      $func$
    $function$, v_schema, v_schema);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_estoque_registrar_movimento ON %I.estoque', v_schema);
    EXECUTE format(
      'CREATE TRIGGER trg_estoque_registrar_movimento AFTER UPDATE OF quantidade ON %I.estoque FOR EACH ROW EXECUTE FUNCTION %I.registrar_alteracao_saldo_no_ledger()',
      v_schema, v_schema
    );

    IF to_regclass(format('%I.estoque_por_local', v_schema)) IS NOT NULL THEN
      EXECUTE format($function$
        CREATE OR REPLACE FUNCTION %I.registrar_transferencia_no_ledger()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_estoque_id UUID;
          v_anterior INTEGER;
          v_delta INTEGER;
          v_transferencia_id UUID;
          v_tipo TEXT;
        BEGIN
          IF current_setting('app.estoque_movimento_gerenciado', true) = 'true' THEN
            RETURN NEW;
          END IF;

          v_anterior := CASE WHEN TG_OP = 'INSERT' THEN 0 ELSE OLD.quantidade END;
          v_delta := NEW.quantidade - v_anterior;
          IF v_delta = 0 THEN
            RETURN NEW;
          END IF;

          SELECT id INTO v_estoque_id FROM estoque WHERE produto_id = NEW.produto_id LIMIT 1;
          IF v_estoque_id IS NULL THEN
            RETURN NEW;
          END IF;

          IF v_delta < 0 THEN
            v_tipo := 'transferencia_saida';
            SELECT id INTO v_transferencia_id
            FROM transferencias_estoque
            WHERE produto_id = NEW.produto_id
              AND local_origem_id = NEW.local_id
              AND quantidade = ABS(v_delta)
              AND status IN ('pendente', 'em_transito')
            ORDER BY criado_em DESC LIMIT 1;
          ELSE
            v_tipo := 'transferencia_entrada';
            SELECT id INTO v_transferencia_id
            FROM transferencias_estoque
            WHERE produto_id = NEW.produto_id
              AND local_destino_id = NEW.local_id
              AND quantidade = v_delta
              AND status = 'concluida'
            ORDER BY concluida_em DESC NULLS LAST, criado_em DESC LIMIT 1;

            IF v_transferencia_id IS NULL THEN
              SELECT id INTO v_transferencia_id
              FROM transferencias_estoque
              WHERE produto_id = NEW.produto_id
                AND local_origem_id = NEW.local_id
                AND quantidade = v_delta
                AND status = 'cancelada'
              ORDER BY criado_em DESC LIMIT 1;

              IF v_transferencia_id IS NOT NULL THEN
                v_tipo := 'estorno';
              END IF;
            END IF;
          END IF;

          INSERT INTO estoque_movimentacoes (
            produto_id, estoque_id, local_id, transferencia_id, tipo, origem,
            quantidade, saldo_anterior, saldo_posterior, documento, criado_por
          ) VALUES (
            NEW.produto_id, v_estoque_id, NEW.local_id, v_transferencia_id,
            v_tipo, 'transferencia', v_delta, v_anterior, NEW.quantidade,
            CASE WHEN v_transferencia_id IS NULL THEN NULL ELSE v_transferencia_id::TEXT END,
            auth.uid()
          );

          RETURN NEW;
        END;
        $func$
      $function$, v_schema, v_schema);

      EXECUTE format('DROP TRIGGER IF EXISTS trg_estoque_local_registrar_movimento ON %I.estoque_por_local', v_schema);
      EXECUTE format(
        'CREATE TRIGGER trg_estoque_local_registrar_movimento AFTER INSERT OR UPDATE OF quantidade ON %I.estoque_por_local FOR EACH ROW EXECUTE FUNCTION %I.registrar_transferencia_no_ledger()',
        v_schema, v_schema
      );
    END IF;

    EXECUTE format($function$
      CREATE OR REPLACE FUNCTION %I.bloquear_alteracao_movimento_estoque()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $func$
      BEGIN
        RAISE EXCEPTION 'Movimentacoes de estoque sao imutaveis; registre um estorno';
      END;
      $func$
    $function$, v_schema);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_bloquear_alteracao_movimento ON %I.estoque_movimentacoes', v_schema);
    EXECUTE format(
      'CREATE TRIGGER trg_bloquear_alteracao_movimento BEFORE UPDATE OR DELETE ON %I.estoque_movimentacoes FOR EACH ROW EXECUTE FUNCTION %I.bloquear_alteracao_movimento_estoque()',
      v_schema, v_schema
    );
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_estoque_movimentacoes(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provisionar_estoque_movimentacoes(TEXT) TO service_role;

DO $$
DECLARE
  schema_record RECORD;
BEGIN
  FOR schema_record IN
    SELECT DISTINCT e.schema_name
    FROM public.empresas e
    JOIN information_schema.schemata s ON s.schema_name = e.schema_name
    WHERE e.schema_name LIKE 'tenant_%'
  LOOP
    PERFORM public.provisionar_estoque_movimentacoes(schema_record.schema_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_registrar_entrada_estoque(
  p_itens JSONB,
  p_fornecedor_id UUID DEFAULT NULL,
  p_fornecedor_nome TEXT DEFAULT NULL,
  p_fornecedor_documento TEXT DEFAULT NULL,
  p_numero_documento TEXT DEFAULT NULL,
  p_serie_documento TEXT DEFAULT NULL,
  p_chave_nfe TEXT DEFAULT NULL,
  p_data_emissao DATE DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL,
  p_origem TEXT DEFAULT 'manual',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema TEXT;
  v_result JSONB;
BEGIN
  v_schema := public.get_tenant_schema();
  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Tenant nao identificado';
  END IF;

  EXECUTE format(
    'SELECT %I.tenant_registrar_entrada_estoque($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    v_schema
  ) INTO v_result USING
    p_fornecedor_id, p_fornecedor_nome, p_fornecedor_documento, p_numero_documento,
    p_serie_documento, p_chave_nfe, p_data_emissao, p_observacao, p_origem,
    p_itens, p_idempotency_key;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_listar_entradas_estoque(
  p_produto_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, fornecedor_nome VARCHAR, fornecedor_documento VARCHAR,
  numero_documento VARCHAR, serie_documento VARCHAR, chave_nfe VARCHAR,
  data_emissao DATE, data_entrada TIMESTAMPTZ, valor_total NUMERIC,
  origem VARCHAR, status VARCHAR, quantidade_itens BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema TEXT;
BEGIN
  v_schema := public.get_tenant_schema();
  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Tenant nao identificado';
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT * FROM %I.tenant_listar_entradas_estoque($1,$2,$3)', v_schema
  ) USING p_produto_id, p_limit, p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_listar_movimentacoes_estoque(
  p_produto_id UUID DEFAULT NULL,
  p_tipo TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, produto_id UUID, produto_nome VARCHAR, tipo VARCHAR, origem VARCHAR,
  quantidade INTEGER, saldo_anterior INTEGER, saldo_posterior INTEGER,
  custo_unitario NUMERIC, documento VARCHAR, entrada_id UUID, venda_id UUID,
  transferencia_id UUID, criado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema TEXT;
BEGIN
  v_schema := public.get_tenant_schema();
  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Tenant nao identificado';
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT * FROM %I.tenant_listar_movimentacoes_estoque($1,$2,$3,$4)', v_schema
  ) USING p_produto_id, p_tipo, p_limit, p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_registrar_entrada_estoque(JSONB, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_registrar_entrada_estoque(JSONB, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_listar_entradas_estoque(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_listar_movimentacoes_estoque(UUID, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
