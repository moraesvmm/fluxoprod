-- Corrige a transacao do PDV conforme constraints e FKs reais dos tenants.

DO $$
DECLARE
    tenant_schema RECORD;
BEGIN
    FOR tenant_schema IN
        SELECT e.schema_name
        FROM public.empresas e
        WHERE e.schema_name LIKE 'tenant_%'
          AND EXISTS (
              SELECT 1
              FROM information_schema.tables t
              WHERE t.table_schema = e.schema_name
                AND t.table_name = 'clientes'
          )
          AND EXISTS (
              SELECT 1
              FROM information_schema.tables t
              WHERE t.table_schema = e.schema_name
                AND t.table_name = 'vendas'
          )
          AND EXISTS (
              SELECT 1
              FROM information_schema.tables t
              WHERE t.table_schema = e.schema_name
                AND t.table_name = 'vendas_itens'
          )
          AND EXISTS (
              SELECT 1
              FROM information_schema.tables t
              WHERE t.table_schema = e.schema_name
                AND t.table_name = 'estoque'
          )
    LOOP
        EXECUTE format($sql$
            CREATE OR REPLACE FUNCTION %I.tenant_processar_venda(
                p_cliente_id UUID,
                p_cliente_nome TEXT,
                p_itens JSONB,
                p_vendedor_id UUID DEFAULT NULL,
                p_vendedor_nome TEXT DEFAULT NULL,
                p_metodo_pagamento TEXT DEFAULT 'dinheiro',
                p_valor_total NUMERIC DEFAULT 0,
                p_desconto NUMERIC DEFAULT 0,
                p_emitir_nfe BOOLEAN DEFAULT FALSE,
                p_canal_venda_id UUID DEFAULT NULL
            )
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I, pg_temp
            AS $func$
            DECLARE
                v_venda_id UUID;
                v_item RECORD;
                v_cliente_id UUID := p_cliente_id;
                v_estoque_atual INTEGER;
                v_nfe_status TEXT := 'nao_emitida';
                v_baixa_por_trigger BOOLEAN;
            BEGIN
                IF jsonb_typeof(p_itens) IS DISTINCT FROM 'array'
                   OR jsonb_array_length(p_itens) = 0 THEN
                    RAISE EXCEPTION 'A venda deve possuir ao menos um item';
                END IF;

                SELECT EXISTS (
                    SELECT 1
                    FROM pg_catalog.pg_trigger trigger
                    JOIN pg_catalog.pg_class tabela ON tabela.oid = trigger.tgrelid
                    JOIN pg_catalog.pg_namespace schema ON schema.oid = tabela.relnamespace
                    JOIN pg_catalog.pg_proc funcao ON funcao.oid = trigger.tgfoid
                    WHERE schema.nspname = current_schema()
                      AND tabela.relname = 'vendas_itens'
                      AND funcao.proname = 'atualizar_estoque_apos_venda'
                      AND NOT trigger.tgisinternal
                      AND trigger.tgenabled <> 'D'
                )
                INTO v_baixa_por_trigger;

                IF p_emitir_nfe THEN
                    v_nfe_status := 'pendente';
                END IF;

                IF v_cliente_id IS NULL AND p_cliente_nome IS NOT NULL THEN
                    SELECT id
                    INTO v_cliente_id
                    FROM clientes
                    WHERE nome = p_cliente_nome
                      AND deleted_at IS NULL
                    LIMIT 1;

                    IF v_cliente_id IS NULL THEN
                        INSERT INTO clientes (nome, funil_fase, status)
                        VALUES (p_cliente_nome, 'lead', 'ativo')
                        RETURNING id INTO v_cliente_id;
                    END IF;
                END IF;

                IF v_cliente_id IS NULL THEN
                    RAISE EXCEPTION 'Cliente nao identificado';
                END IF;

                IF p_canal_venda_id IS NOT NULL THEN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'vendas'
                          AND column_name = 'canal_venda_id'
                    ) THEN
                        RAISE EXCEPTION 'Canal de venda nao suportado neste tenant';
                    END IF;

                    INSERT INTO vendas (
                        cliente_id, valor_total, metodo_pagamento, status,
                        desconto_aplicado, vendedor_id, canal_venda_id
                    )
                    VALUES (
                        v_cliente_id, p_valor_total, p_metodo_pagamento, 'concluido',
                        p_desconto, p_vendedor_id, p_canal_venda_id
                    )
                    RETURNING id INTO v_venda_id;
                ELSE
                    INSERT INTO vendas (
                        cliente_id, valor_total, metodo_pagamento, status,
                        desconto_aplicado, vendedor_id
                    )
                    VALUES (
                        v_cliente_id, p_valor_total, p_metodo_pagamento, 'concluido',
                        p_desconto, p_vendedor_id
                    )
                    RETURNING id INTO v_venda_id;
                END IF;

                FOR v_item IN
                    SELECT *
                    FROM jsonb_to_recordset(p_itens)
                        AS item(produto_id UUID, qtd INTEGER, preco NUMERIC)
                LOOP
                    IF v_item.produto_id IS NULL THEN
                        RAISE EXCEPTION 'Produto nao identificado';
                    END IF;

                    IF v_item.qtd IS NULL OR v_item.qtd <= 0 THEN
                        RAISE EXCEPTION 'Quantidade deve ser maior que zero';
                    END IF;

                    IF v_item.preco IS NULL OR v_item.preco < 0 THEN
                        RAISE EXCEPTION 'Preco deve ser maior ou igual a zero';
                    END IF;

                    SELECT quantidade
                    INTO v_estoque_atual
                    FROM estoque
                    WHERE id = v_item.produto_id
                    FOR UPDATE;

                    IF NOT FOUND THEN
                        RAISE EXCEPTION 'Produto nao encontrado no estoque';
                    END IF;

                    IF v_estoque_atual < v_item.qtd THEN
                        RAISE EXCEPTION 'Estoque insuficiente para o produto';
                    END IF;

                    INSERT INTO vendas_itens (
                        venda_id, produto_id, quantidade, preco_unitario
                    )
                    VALUES (
                        v_venda_id, v_item.produto_id, v_item.qtd, v_item.preco
                    );

                    IF NOT v_baixa_por_trigger THEN
                        UPDATE estoque
                        SET quantidade = quantidade - v_item.qtd,
                            atualizado_em = NOW()
                        WHERE id = v_item.produto_id;
                    END IF;
                END LOOP;

                RETURN jsonb_build_object(
                    'success', TRUE,
                    'venda_id', v_venda_id,
                    'total', p_valor_total,
                    'nfe_status', v_nfe_status
                );
            EXCEPTION WHEN OTHERS THEN
                RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
            END;
            $func$;
        $sql$, tenant_schema.schema_name, tenant_schema.schema_name);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_processar_venda(
    p_cliente_id UUID,
    p_cliente_nome TEXT,
    p_itens JSONB,
    p_vendedor_id UUID DEFAULT NULL,
    p_vendedor_nome TEXT DEFAULT NULL,
    p_metodo_pagamento TEXT DEFAULT 'dinheiro',
    p_valor_total NUMERIC DEFAULT 0,
    p_desconto NUMERIC DEFAULT 0,
    p_emitir_nfe BOOLEAN DEFAULT FALSE,
    p_canal_venda_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT e.schema_name
    INTO v_tenant_schema
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid()
    LIMIT 1;

    IF v_tenant_schema IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Tenant nao identificado');
    END IF;

    EXECUTE format(
        'SELECT %I.tenant_processar_venda($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        v_tenant_schema
    )
    INTO v_result
    USING
        p_cliente_id, p_cliente_nome, p_itens, p_vendedor_id, p_vendedor_nome,
        p_metodo_pagamento, p_valor_total, p_desconto, p_emitir_nfe, p_canal_venda_id;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_processar_venda(
    UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_processar_venda(
    UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID
) TO authenticated;

NOTIFY pgrst, 'reload schema';