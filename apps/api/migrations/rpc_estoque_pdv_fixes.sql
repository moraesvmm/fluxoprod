-- Migração para corrigir a chamada da RPC tenant_listar_estoque no PDV
-- A versão antiga estava causando HTTP 404 porque não resolvia o schema dinamicamente (chamava public.estoque)
-- e retornava TABLE, causando os mesmos problemas de desserialização que ocorreram no CRM.

DROP FUNCTION IF EXISTS public.tenant_listar_estoque();
DROP FUNCTION IF EXISTS public.tenant_listar_estoque(INT, INT);

CREATE OR REPLACE FUNCTION public.tenant_listar_estoque(
    p_limit INT DEFAULT 1000,
    p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_schema_name TEXT;
    v_result JSONB;
BEGIN
    -- Identificar o schema (empresa) do usuário atual
    v_schema_name := (
        SELECT e.schema_name
        FROM public.user_profiles up
        JOIN public.empresas e ON e.id = up.empresa_id
        WHERE up.user_id = auth.uid()
        LIMIT 1
    );
    
    -- Se não encontrar schema (usuário sem empresa ou não autenticado), retorna array vazio
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN
        RETURN '[]'::JSONB;
    END IF;
    
    -- Executar a busca de forma segura diretamente nas tabelas do tenant
    EXECUTE format('
        SELECT jsonb_agg(
            jsonb_build_object(
                ''id'', e.id,
                ''produto_id'', e.produto_id,
                ''sku'', e.sku,
                ''quantidade'', e.quantidade,
                ''quantidade_minima'', e.quantidade_minima,
                ''atualizado_em'', e.atualizado_em,
                ''produto_nome'', p.nome,
                ''produto_preco_base'', p.preco_base
            )
        )
        FROM (
            SELECT * FROM %I.estoque
            ORDER BY quantidade ASC
            LIMIT $1 OFFSET $2
        ) e
        LEFT JOIN %I.produtos p ON e.produto_id = p.id
    ', v_schema_name, v_schema_name)
    INTO v_result
    USING p_limit, p_offset;

    -- Garantir que sempre retorna um array (evitar null no frontend)
    RETURN COALESCE(v_result, '[]'::JSONB);
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, retornar JSON formatado com o erro ao invés de quebrar a resposta
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_estoque TO authenticated;
