-- apps/api/migrations/fix_tenant_listar_clientes_documento.sql
-- Bug crítico: tenant_listar_clientes (rpcs_tags.sql) seleciona a coluna c.documento,
-- que NUNCA existiu em nenhum tenant (a tabela clientes só tem cpf_cnpj, adicionado
-- por um script avulso não registrado no provisionamento). Toda chamada gerava um erro
-- SQL ("column c.documento does not exist"), capturado pelo wrapper público como
-- {"error": ...} (não um array) — por isso a lista de clientes aparece sempre vazia,
-- para qualquer tenant, com ou sem clientes cadastrados.

CREATE OR REPLACE FUNCTION public.provisionar_hook_crm_clientes_documento(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    -- cpf_cnpj era inserido por tenant_criar_cliente sem nunca ter sido
    -- adicionado por um hook de provisionamento registrado.
    EXECUTE format('ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT', p_schema);

    EXECUTE format(
        'DROP FUNCTION IF EXISTS %I.tenant_listar_clientes(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[])',
        p_schema
    );

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_listar_clientes(
            p_cursor UUID DEFAULT NULL,
            p_limit INT DEFAULT 20,
            p_status TEXT DEFAULT NULL,
            p_funil_fase TEXT DEFAULT NULL,
            p_busca TEXT DEFAULT NULL,
            p_order_by TEXT DEFAULT 'criado_em',
            p_order_dir TEXT DEFAULT 'DESC',
            p_tags TEXT[] DEFAULT NULL
        )
        RETURNS TABLE (
            id UUID,
            nome VARCHAR(255),
            email VARCHAR(255),
            telefone VARCHAR(50),
            documento TEXT,
            endereco TEXT,
            funil_fase VARCHAR(50),
            status VARCHAR(50),
            tags TEXT[],
            criado_em TIMESTAMPTZ,
            atualizado_em TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ,
            next_cursor UUID
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT
                c.id,
                c.nome,
                c.email,
                c.telefone,
                c.cpf_cnpj::TEXT AS documento,
                c.endereco,
                c.funil_fase,
                c.status,
                c.tags,
                c.criado_em,
                c.atualizado_em,
                c.deleted_at,
                LEAD(c.id) OVER (
                    ORDER BY
                        CASE
                            WHEN p_order_by IN ('nome', 'email', 'telefone', 'criado_em', 'atualizado_em')
                            THEN p_order_by
                            ELSE 'criado_em'
                        END,
                        CASE
                            WHEN UPPER(p_order_dir) IN ('ASC', 'DESC')
                            THEN UPPER(p_order_dir)
                            ELSE 'DESC'
                        END
                ) AS next_cursor
            FROM clientes c
            WHERE c.deleted_at IS NULL
                AND (p_status IS NULL OR c.status = p_status)
                AND (p_funil_fase IS NULL OR c.funil_fase = p_funil_fase)
                AND (p_busca IS NULL OR
                     c.nome ILIKE '%%' || p_busca || '%%' OR
                     c.email ILIKE '%%' || p_busca || '%%' OR
                     c.cpf_cnpj ILIKE '%%' || p_busca || '%%')
                AND (p_cursor IS NULL OR c.id < p_cursor)
                AND (p_tags IS NULL OR c.tags @> p_tags)
            ORDER BY
                CASE
                    WHEN p_order_by IN ('nome', 'email', 'telefone', 'criado_em', 'atualizado_em')
                    THEN p_order_by
                    ELSE 'criado_em'
                END,
                CASE
                    WHEN UPPER(p_order_dir) IN ('ASC', 'DESC')
                    THEN UPPER(p_order_dir)
                    ELSE 'DESC'
                END
            LIMIT p_limit;
        END;
        $func$;
    $sql$, p_schema, p_schema);

    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_clientes(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) FROM PUBLIC, anon, authenticated', p_schema);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_clientes(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO service_role', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_crm_clientes_documento(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('crm_clientes_documento_fix', 500, 'public.provisionar_hook_crm_clientes_documento(text)'::REGPROCEDURE)
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
        PERFORM public.provisionar_hook_crm_clientes_documento(v_schema);
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
