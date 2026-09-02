-- apps/api/migrations/rpc_processar_venda_uf_destino.sql
-- Sem UF de destino salva na venda, a emissão de NF-e nunca sabia se a operação era
-- estadual ou interestadual (CFOP sempre usava o valor fixo cadastrado no produto).
-- Esta migração adiciona uf_destino em vendas e um parametro opcional na RPC de PDV.

CREATE OR REPLACE FUNCTION public.provisionar_hook_caixa_diario(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    EXECUTE format('ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS uf_destino CHAR(2)', p_schema);

    EXECUTE format($sql$
        DROP FUNCTION IF EXISTS %I.tenant_processar_venda(UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID, UUID, UUID);
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
            p_canal_venda_id UUID DEFAULT NULL,
            p_filial_id UUID DEFAULT NULL,
            p_caixa_id UUID DEFAULT NULL,
            p_uf_destino CHAR(2) DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_cliente_id UUID := p_cliente_id;
            v_venda_id UUID;
            v_sessao_id UUID;
            v_filial_id UUID := p_filial_id;
            v_caixa_id UUID := p_caixa_id;
            v_item RECORD;
            v_estoque_atual INTEGER;
            v_total_calculado NUMERIC := 0;
            v_total_final NUMERIC;
            v_data DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
        BEGIN
            IF jsonb_typeof(p_itens) IS DISTINCT FROM 'array' OR jsonb_array_length(p_itens) = 0 THEN
                RAISE EXCEPTION 'A venda deve possuir ao menos um item';
            END IF;
            IF v_filial_id IS NULL OR v_caixa_id IS NULL THEN
                SELECT caixa.filial_id, caixa.id INTO v_filial_id, v_caixa_id
                FROM caixas caixa
                WHERE caixa.ativo
                  AND tenant_usuario_pode_acessar_filial(caixa.filial_id, FALSE)
                ORDER BY caixa.criado_em
                LIMIT 1;
            END IF;
            IF v_filial_id IS NULL OR NOT tenant_usuario_pode_acessar_filial(v_filial_id, FALSE) THEN
                RAISE EXCEPTION 'Acesso negado a filial';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM caixas WHERE id = v_caixa_id AND filial_id = v_filial_id AND ativo) THEN
                RAISE EXCEPTION 'Caixa nao pertence a filial';
            END IF;

            IF v_cliente_id IS NULL AND BTRIM(COALESCE(p_cliente_nome, '')) <> '' THEN
                SELECT id INTO v_cliente_id FROM clientes WHERE nome = p_cliente_nome AND deleted_at IS NULL LIMIT 1;
                IF v_cliente_id IS NULL THEN
                    INSERT INTO clientes (nome, funil_fase, status)
                    VALUES (p_cliente_nome, 'lead', 'ativo') RETURNING id INTO v_cliente_id;
                END IF;
            END IF;
            IF v_cliente_id IS NULL THEN
                RAISE EXCEPTION 'Cliente nao identificado';
            END IF;

            FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS item(produto_id UUID, qtd INTEGER, preco NUMERIC) LOOP
                IF v_item.produto_id IS NULL OR v_item.qtd IS NULL OR v_item.qtd <= 0 OR v_item.preco IS NULL OR v_item.preco < 0 THEN
                    RAISE EXCEPTION 'Item de venda invalido';
                END IF;
                SELECT quantidade INTO v_estoque_atual FROM estoque WHERE id = v_item.produto_id FOR UPDATE;
                IF NOT FOUND OR v_estoque_atual < v_item.qtd THEN
                    RAISE EXCEPTION 'Estoque insuficiente para o produto';
                END IF;
                v_total_calculado := v_total_calculado + (v_item.qtd * v_item.preco);
            END LOOP;
            v_total_final := GREATEST(0, v_total_calculado - COALESCE(p_desconto, 0));

            SELECT id INTO v_sessao_id FROM caixa_sessoes
            WHERE caixa_id = v_caixa_id AND data_operacional = v_data
            FOR UPDATE;
            IF v_sessao_id IS NULL THEN
                INSERT INTO caixa_sessoes (caixa_id, data_operacional, aberto_por, valor_abertura)
                VALUES (v_caixa_id, v_data, auth.uid(), 0) RETURNING id INTO v_sessao_id;
            ELSIF NOT EXISTS (SELECT 1 FROM caixa_sessoes WHERE id = v_sessao_id AND status IN ('aberto', 'reaberto')) THEN
                RAISE EXCEPTION 'Caixa fechado para esta data';
            END IF;

            INSERT INTO vendas (
                cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total,
                desconto_aplicado, metodo_pagamento, status, data_venda, filial_id, caixa_id, uf_destino
            ) VALUES (
                v_cliente_id, p_cliente_nome, p_vendedor_id, p_vendedor_nome, v_total_final,
                COALESCE(p_desconto, 0), p_metodo_pagamento, 'concluido', v_data, v_filial_id, v_caixa_id, NULLIF(UPPER(p_uf_destino), '')
            ) RETURNING id INTO v_venda_id;

            FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS item(produto_id UUID, qtd INTEGER, preco NUMERIC) LOOP
                INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
                VALUES (v_venda_id, v_item.produto_id, v_item.qtd, v_item.preco);
                UPDATE estoque SET quantidade = quantidade - v_item.qtd, atualizado_em = NOW() WHERE id = v_item.produto_id;
            END LOOP;

            INSERT INTO caixa_movimentos (sessao_id, tipo, valor, forma_pagamento, origem_tipo, origem_id, descricao, criado_por)
            VALUES (v_sessao_id, 'entrada', v_total_final, p_metodo_pagamento, 'venda', v_venda_id, 'Venda #' || SUBSTRING(v_venda_id::TEXT FROM 1 FOR 8), auth.uid());

            RETURN jsonb_build_object('success', TRUE, 'venda_id', v_venda_id, 'total', v_total_final, 'sessao_id', v_sessao_id);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema, p_schema);

    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC, anon, authenticated', p_schema);
    EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO service_role', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_caixa_diario(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('caixa_diario', 80, 'public.provisionar_hook_caixa_diario(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem,
    hook_function = EXCLUDED.hook_function,
    ativo = TRUE;

DO $$
DECLARE
    v_schema TEXT;
BEGIN
    FOR v_schema IN
        SELECT e.schema_name
        FROM public.empresas e
        WHERE e.schema_name LIKE 'tenant\_%'
          AND to_regnamespace(e.schema_name) IS NOT NULL
        ORDER BY e.schema_name
    LOOP
        PERFORM public.provisionar_hook_caixa_diario(v_schema);
    END LOOP;
END;
$$;

-- Roteador publico: nova assinatura com p_uf_destino (a antiga e removida para evitar ambiguidade)
DROP FUNCTION IF EXISTS public.tenant_processar_venda(UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID, UUID, UUID);

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
    p_canal_venda_id UUID DEFAULT NULL,
    p_filial_id UUID DEFAULT NULL,
    p_caixa_id UUID DEFAULT NULL,
    p_uf_destino CHAR(2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema
    FROM public.user_profiles profile
    JOIN public.empresas empresa ON empresa.id = profile.empresa_id
    WHERE profile.user_id = auth.uid()
    LIMIT 1;
    IF v_schema IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Tenant nao identificado');
    END IF;
    EXECUTE format('SELECT %I.tenant_processar_venda($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', v_schema)
    INTO v_result USING p_cliente_id, p_cliente_nome, p_itens, p_vendedor_id, p_vendedor_nome, p_metodo_pagamento, p_valor_total, p_desconto, p_emitir_nfe, p_canal_venda_id, p_filial_id, p_caixa_id, p_uf_destino;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_processar_venda(UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID, UUID, UUID, CHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_processar_venda(UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID, UUID, UUID, CHAR) TO authenticated;

NOTIFY pgrst, 'reload schema';
