-- Registry for idempotent tenant provisioning hooks.
-- The leading sort key keeps this migration before feature hook registrations.

CREATE TABLE IF NOT EXISTS public.provisionamento_hooks (
    hook_key TEXT PRIMARY KEY,
    ordem INTEGER NOT NULL UNIQUE CHECK (ordem >= 0),
    hook_function REGPROCEDURE NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON TABLE public.provisionamento_hooks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validar_schema_tenant_provisionamento(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_schema IS NULL
       OR p_schema !~ '^tenant_[a-z0-9_]+$'
       OR octet_length(p_schema) > 63 THEN
        RAISE EXCEPTION 'Schema tenant invalido: %', p_schema
            USING ERRCODE = '22023';
    END IF;

    IF to_regnamespace(p_schema) IS NULL THEN
        RAISE EXCEPTION 'Schema tenant inexistente: %', p_schema
            USING ERRCODE = '3F000';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.empresas e
        WHERE e.schema_name = p_schema
    ) THEN
        RAISE EXCEPTION 'Schema tenant nao pertence a uma empresa: %', p_schema
            USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_registro_hook_provisionamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hook RECORD;
BEGIN
    SELECT
        n.nspname AS schema_name,
        p.pronargs,
        p.proargtypes,
        p.prorettype,
        p.prosecdef
    INTO v_hook
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE p.oid = NEW.hook_function::OID;

    IF NOT FOUND
       OR v_hook.schema_name <> 'public'
       OR v_hook.pronargs <> 1
       OR v_hook.proargtypes[0] <> 'text'::REGTYPE::OID
       OR v_hook.prorettype <> 'void'::REGTYPE::OID
       OR NOT v_hook.prosecdef THEN
        RAISE EXCEPTION
            'Hook % deve ser public, SECURITY DEFINER e ter assinatura (TEXT) RETURNS VOID',
            NEW.hook_function;
    END IF;

    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provisionamento_hooks_validar
ON public.provisionamento_hooks;

CREATE TRIGGER provisionamento_hooks_validar
BEFORE INSERT OR UPDATE ON public.provisionamento_hooks
FOR EACH ROW
EXECUTE FUNCTION public.validar_registro_hook_provisionamento();

CREATE OR REPLACE FUNCTION public.executar_hooks_provisionamento(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hook RECORD;
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext('public.executar_hooks_provisionamento'),
        pg_catalog.hashtext(p_schema)
    );

    FOR v_hook IN
        SELECT
            h.hook_key,
            h.hook_function,
            p.oid AS function_oid,
            n.nspname AS function_schema,
            p.proname AS function_name,
            p.pronargs,
            p.proargtypes,
            p.prorettype,
            p.prosecdef
        FROM public.provisionamento_hooks h
        LEFT JOIN pg_catalog.pg_proc p ON p.oid = h.hook_function::OID
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE h.ativo
        ORDER BY h.ordem, h.hook_key
    LOOP
        IF v_hook.function_oid IS NULL
           OR v_hook.function_schema <> 'public'
           OR v_hook.pronargs <> 1
           OR v_hook.proargtypes[0] <> 'text'::REGTYPE::OID
           OR v_hook.prorettype <> 'void'::REGTYPE::OID
           OR NOT v_hook.prosecdef THEN
            RAISE EXCEPTION 'Hook registrado invalido: % (%)',
                v_hook.hook_key,
                v_hook.hook_function;
        END IF;

        EXECUTE format(
            'SELECT %I.%I($1)',
            v_hook.function_schema,
            v_hook.function_name
        )
        USING p_schema;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_schema_tenant_provisionamento(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_registro_hook_provisionamento() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.executar_hooks_provisionamento(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.executar_hooks_provisionamento(TEXT) TO service_role;

DO $$
BEGIN
    IF to_regprocedure('public.provisionar_estoque_movimentacoes(text)') IS NOT NULL THEN
        INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
        VALUES (
            'estoque_movimentacoes',
            20,
            'public.provisionar_estoque_movimentacoes(text)'::REGPROCEDURE
        )
        ON CONFLICT (hook_key) DO UPDATE
        SET ordem = EXCLUDED.ordem,
            hook_function = EXCLUDED.hook_function,
            ativo = TRUE;
    END IF;
END;
$$;