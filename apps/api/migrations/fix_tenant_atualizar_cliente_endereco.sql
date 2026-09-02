-- apps/api/migrations/fix_tenant_atualizar_cliente_endereco.sql
-- Bug: hotfix_pipeline_coalesce.sql recriou tenant_atualizar_cliente com 7 parametros
-- (sem p_endereco), rodando como script avulso sobre os tenants existentes na epoca,
-- sem nunca ter sido registrado como hook de provisionamento. O wrapper publico
-- (fix_crm_sprint24.sql) continua chamando com 8 argumentos posicionais (incluindo
-- p_endereco) -> "function tenant_atualizar_cliente(...) does not exist" ao mover
-- cliente de fase no pipeline do CRM.

CREATE OR REPLACE FUNCTION public.provisionar_hook_atualizar_cliente_endereco(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    EXECUTE format('ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS endereco TEXT', p_schema);

    -- Remove overloads antigas (6 e 7 parametros) para nao deixar assinaturas duplicadas.
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT)', p_schema);
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)', p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_atualizar_cliente(
            p_cliente_id UUID,
            p_nome TEXT DEFAULT NULL,
            p_email TEXT DEFAULT NULL,
            p_telefone TEXT DEFAULT NULL,
            p_funil_fase TEXT DEFAULT NULL,
            p_status TEXT DEFAULT NULL,
            p_cpf_cnpj TEXT DEFAULT NULL,
            p_endereco TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        BEGIN
            UPDATE clientes
            SET
                nome = COALESCE(p_nome, nome),
                email = COALESCE(p_email, email),
                telefone = COALESCE(p_telefone, telefone),
                funil_fase = COALESCE(p_funil_fase, funil_fase),
                status = COALESCE(p_status, status),
                cpf_cnpj = COALESCE(p_cpf_cnpj, cpf_cnpj),
                endereco = COALESCE(p_endereco, endereco),
                atualizado_em = NOW()
            WHERE id = p_cliente_id AND deleted_at IS NULL;

            IF NOT FOUND THEN
                RETURN jsonb_build_object('error', 'Cliente não encontrado ou já excluído');
            END IF;

            RETURN jsonb_build_object('success', true);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('error', SQLERRM);
        END;
        $func$;
    $sql$, p_schema, p_schema);

    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated', p_schema);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_atualizar_cliente_endereco(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('atualizar_cliente_endereco_fix', 799, 'public.provisionar_hook_atualizar_cliente_endereco(text)'::REGPROCEDURE)
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
        PERFORM public.provisionar_hook_atualizar_cliente_endereco(v_schema);
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
