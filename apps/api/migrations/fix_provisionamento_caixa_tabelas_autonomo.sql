-- O hook de garantia deve ser autossuficiente para tenants novos.
CREATE OR REPLACE FUNCTION public.provisionar_hook_garantir_caixa_filial(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_filial_id UUID;
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    IF to_regclass(format('%I.locais_estoque', p_schema)) IS NULL THEN
        RAISE EXCEPTION 'Tabela %.locais_estoque inexistente', p_schema;
    END IF;

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.usuarios_filiais (user_id UUID NOT NULL, filial_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE CASCADE, papel TEXT NOT NULL DEFAULT ''operador'' CHECK (papel IN (''operador'', ''supervisor'', ''gerente'')), ativo BOOLEAN NOT NULL DEFAULT TRUE, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (user_id, filial_id))', p_schema, p_schema);
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.caixas (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), filial_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE RESTRICT, codigo TEXT NOT NULL, nome TEXT NOT NULL, ativo BOOLEAN NOT NULL DEFAULT TRUE, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (filial_id, codigo))', p_schema, p_schema);
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.caixa_sessoes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), caixa_id UUID NOT NULL REFERENCES %I.caixas(id) ON DELETE RESTRICT, data_operacional DATE NOT NULL, status TEXT NOT NULL DEFAULT ''aberto'' CHECK (status IN (''aberto'', ''fechado'', ''reaberto'')), aberto_por UUID NOT NULL, aberto_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), valor_abertura NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (valor_abertura >= 0), fechado_em TIMESTAMPTZ, fechado_por UUID, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (caixa_id, data_operacional))', p_schema, p_schema);
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.caixa_movimentos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sessao_id UUID NOT NULL REFERENCES %I.caixa_sessoes(id) ON DELETE RESTRICT, tipo TEXT NOT NULL CHECK (tipo IN (''entrada'', ''saida'', ''estorno'', ''ajuste'', ''suprimento'')), valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0), forma_pagamento TEXT NOT NULL, origem_tipo TEXT NOT NULL CHECK (origem_tipo IN (''venda'', ''devolucao'', ''abertura'', ''sangria'', ''suprimento'', ''ajuste'')), origem_id UUID, descricao TEXT NOT NULL, criado_por UUID NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), cancelado_em TIMESTAMPTZ, cancelado_por UUID)', p_schema, p_schema);
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.fechamentos_caixa (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sessao_id UUID NOT NULL REFERENCES %I.caixa_sessoes(id) ON DELETE RESTRICT, versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0), status TEXT NOT NULL DEFAULT ''fechado'' CHECK (status IN (''fechado'', ''reaberto'')), valor_esperado NUMERIC(12, 2) NOT NULL, valor_informado NUMERIC(12, 2) NOT NULL, diferenca NUMERIC(12, 2) NOT NULL, resumo_por_forma JSONB NOT NULL DEFAULT ''{}''::JSONB, valores_contados JSONB NOT NULL DEFAULT ''{}''::JSONB, observacao TEXT, fechado_por UUID NOT NULL, fechado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), reaberto_por UUID, reaberto_em TIMESTAMPTZ, motivo_reabertura TEXT, UNIQUE (sessao_id, versao))', p_schema, p_schema);

    EXECUTE format('SELECT id FROM %I.locais_estoque WHERE ativo = TRUE AND tipo IN (''filial'', ''loja'') ORDER BY criado_em, id LIMIT 1', p_schema)
    INTO v_filial_id;
    IF v_filial_id IS NULL THEN
        EXECUTE format('INSERT INTO %I.locais_estoque (nome, tipo, ativo) VALUES (''Matriz'', ''filial'', TRUE) RETURNING id', p_schema)
        INTO v_filial_id;
    END IF;

    EXECUTE format('INSERT INTO %I.caixas (filial_id, codigo, nome, ativo) VALUES ($1, ''principal'', ''Caixa principal'', TRUE) ON CONFLICT (filial_id, codigo) DO UPDATE SET ativo = TRUE', p_schema)
    USING v_filial_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_garantir_caixa_filial(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_hook_garantir_caixa_filial(TEXT) TO service_role;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('garantir_caixa_filial', 84, 'public.provisionar_hook_garantir_caixa_filial(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem, hook_function = EXCLUDED.hook_function, ativo = TRUE;

DO $$
DECLARE v_schema TEXT;
BEGIN
    FOR v_schema IN
        SELECT e.schema_name FROM public.empresas e
        WHERE e.schema_name LIKE 'tenant\_%' AND to_regnamespace(e.schema_name) IS NOT NULL
        ORDER BY e.schema_name
    LOOP
        PERFORM public.provisionar_hook_garantir_caixa_filial(v_schema);
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';