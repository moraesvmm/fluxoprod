-- Garante a dependencia de caixa antes das RPCs de lotacao por filial.
CREATE OR REPLACE FUNCTION public.provisionar_hook_garantir_caixa_filial(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);
    PERFORM public.provisionar_hook_caixa_diario(p_schema);

    IF to_regclass(format('%I.usuarios_filiais', p_schema)) IS NULL
       OR to_regclass(format('%I.locais_estoque', p_schema)) IS NULL
       OR to_regclass(format('%I.caixas', p_schema)) IS NULL THEN
        RAISE EXCEPTION 'Dependencia de caixa por filial incompleta no schema %', p_schema;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_garantir_caixa_filial(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_hook_garantir_caixa_filial(TEXT) TO service_role;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('garantir_caixa_filial', 84, 'public.provisionar_hook_garantir_caixa_filial(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem,
    hook_function = EXCLUDED.hook_function,
    ativo = TRUE;

DO $$
DECLARE
    v_schema TEXT;
BEGIN
    FOR v_schema IN
        SELECT empresa.schema_name
        FROM public.empresas empresa
        WHERE empresa.schema_name LIKE 'tenant\_%'
          AND to_regnamespace(empresa.schema_name) IS NOT NULL
        ORDER BY empresa.schema_name
    LOOP
        PERFORM public.provisionar_hook_garantir_caixa_filial(v_schema);
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';