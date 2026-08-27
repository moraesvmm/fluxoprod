-- As RPCs de RH sempre gravaram email e telefone, mas a tabela nunca teve as colunas.
-- Criar e editar funcionario falhavam em todos os tenants.

CREATE OR REPLACE FUNCTION public.provisionar_hook_rh_funcionarios(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    IF to_regclass(format('%I.funcionarios', p_schema)) IS NULL THEN
        RETURN;
    END IF;

    EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS email VARCHAR(255)', p_schema);
    EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(50)', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_rh_funcionarios(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('rh_funcionarios', 65, 'public.provisionar_hook_rh_funcionarios(text)'::REGPROCEDURE)
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
        PERFORM public.provisionar_hook_rh_funcionarios(v_schema);
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
