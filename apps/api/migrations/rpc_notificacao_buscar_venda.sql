-- RPC para buscar dados de uma venda em um schema tenant de forma segura.
-- O admin client não pode usar .schema(tenantSchema) via PostgREST porque
-- os schemas tenant não são "Exposed Schemas" no Supabase.
-- Esta função roda SECURITY DEFINER e acessa o schema com SQL dinâmico.
--
-- Não é hook de provisionamento: não altera estrutura de nenhum schema tenant.
-- Apenas lê dados. Restrita a service_role (cross-tenant).

DROP FUNCTION IF EXISTS public.tenant_buscar_venda_para_notificacao(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.tenant_buscar_venda_para_notificacao(
    p_venda_id UUID,
    p_schema   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cliente    TEXT;
    v_valor      NUMERIC;
    v_produto    TEXT;
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    -- Buscar cliente e valor da venda
    EXECUTE format(
        'SELECT COALESCE(v.cliente_nome, c.nome, ''Cliente avulso''), v.valor_total
         FROM %I.vendas v
         LEFT JOIN %I.clientes c ON c.id = v.cliente_id
         WHERE v.id = $1',
        p_schema, p_schema
    )
    INTO v_cliente, v_valor
    USING p_venda_id;

    IF v_cliente IS NULL AND v_valor IS NULL THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    -- vendas_itens.produto_id referencia estoque.id; resolve o produto pelo estoque.
    BEGIN
        EXECUTE format(
            'SELECT p.nome
             FROM %I.vendas_itens vi
             JOIN %I.estoque e ON e.id = vi.produto_id
             JOIN %I.produtos p ON p.id = e.produto_id
             WHERE vi.venda_id = $1
             ORDER BY vi.criado_em, vi.id
             LIMIT 1',
            p_schema, p_schema, p_schema
        ) INTO v_produto USING p_venda_id;
    EXCEPTION WHEN OTHERS THEN
        v_produto := NULL;
    END;

    RETURN jsonb_build_object(
        'found',         true,
        'cliente',       COALESCE(v_cliente, 'Cliente avulso'),
        'valor_total',   COALESCE(v_valor, 0),
        'produto_nome',  COALESCE(v_produto, 'produto(s)')
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('found', false, 'error', SQLERRM);
END;
$$;

-- Cross-tenant: apenas service_role pode chamar
REVOKE ALL ON FUNCTION public.tenant_buscar_venda_para_notificacao(UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_buscar_venda_para_notificacao(UUID, TEXT)
    TO service_role;

NOTIFY pgrst, 'reload schema';
