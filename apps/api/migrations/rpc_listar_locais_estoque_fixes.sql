-- Corrige a listagem de locais, que ordenava uma coluna fora do jsonb_agg.

CREATE OR REPLACE FUNCTION public.provisionar_hook_locais_estoque(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    IF to_regclass(format('%I.locais_estoque', p_schema)) IS NULL THEN
        RAISE EXCEPTION 'Tabela %.locais_estoque inexistente', p_schema;
    END IF;

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_listar_locais_estoque()
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_result JSONB;
        BEGIN
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', l.id,
                        'nome', l.nome,
                        'tipo', l.tipo,
                        'endereco', l.endereco,
                        'ativo', l.ativo,
                        'criado_em', l.criado_em
                    ) ORDER BY l.criado_em DESC
                ),
                '[]'::JSONB
            )
            INTO v_result
            FROM locais_estoque l
            WHERE l.ativo = TRUE;

            RETURN v_result;
        END;
        $func$;
    $sql$, p_schema, p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_locais_estoque(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('locais_estoque', 40, 'public.provisionar_hook_locais_estoque(text)'::REGPROCEDURE)
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
        WHERE e.schema_name LIKE 'tenant_%'
          AND to_regnamespace(e.schema_name) IS NOT NULL
        ORDER BY e.schema_name
    LOOP
        PERFORM public.provisionar_hook_locais_estoque(v_schema);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_listar_locais_estoque()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT e.schema_name
    INTO v_schema
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid()
    LIMIT 1;

    IF v_schema IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;

    EXECUTE format('SELECT %I.tenant_listar_locais_estoque()', v_schema)
    INTO v_result;

    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_listar_locais_estoque() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_listar_locais_estoque() TO authenticated;

NOTIFY pgrst, 'reload schema';