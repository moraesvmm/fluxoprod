-- Gestao administrativa de acesso a filiais e caixas.
-- A atualizacao e feita em lote e somente por tenant_admin autenticado.

CREATE OR REPLACE FUNCTION public.provisionar_hook_gestao_lotacoes_filiais(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    IF to_regclass(format('%I.usuarios_filiais', p_schema)) IS NULL
       OR to_regclass(format('%I.locais_estoque', p_schema)) IS NULL
       OR to_regclass(format('%I.caixas', p_schema)) IS NULL THEN
        RAISE EXCEPTION 'Schema % nao possui as tabelas de caixa por filial', p_schema;
    END IF;

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_listar_lotacoes_filiais(p_user_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM public.user_profiles profile
                JOIN public.empresas empresa ON empresa.id = profile.empresa_id
                WHERE profile.user_id = auth.uid()
                  AND profile.role = 'tenant_admin'
                  AND empresa.schema_name = current_schema()
            ) THEN
                RAISE EXCEPTION 'Permissao negada';
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM public.user_profiles profile
                JOIN public.empresas empresa ON empresa.id = profile.empresa_id
                WHERE profile.user_id = p_user_id
                  AND empresa.schema_name = current_schema()
            ) THEN
                RAISE EXCEPTION 'Usuario nao pertence a esta empresa';
            END IF;

            RETURN COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'filial_id', filial.id,
                    'filial_nome', filial.nome,
                    'caixas_ativos', caixas.quantidade,
                    'permitido', COALESCE(lotacao.ativo, FALSE),
                    'papel', lotacao.papel
                ) ORDER BY filial.nome)
                FROM locais_estoque filial
                LEFT JOIN LATERAL (
                    SELECT count(*)::INTEGER AS quantidade
                    FROM caixas caixa
                    WHERE caixa.filial_id = filial.id
                      AND caixa.ativo = TRUE
                ) caixas ON TRUE
                LEFT JOIN usuarios_filiais lotacao
                  ON lotacao.filial_id = filial.id
                 AND lotacao.user_id = p_user_id
                WHERE filial.ativo = TRUE
                  AND filial.tipo IN ('filial', 'loja')
            ), '[]'::JSONB);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_salvar_lotacoes_filiais(
            p_user_id UUID,
            p_lotacoes JSONB
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_lotacao RECORD;
        BEGIN
            IF jsonb_typeof(p_lotacoes) IS DISTINCT FROM 'array' THEN
                RAISE EXCEPTION 'Lotacoes devem ser uma lista';
            END IF;
            IF NOT EXISTS (
                SELECT 1
                FROM public.user_profiles profile
                JOIN public.empresas empresa ON empresa.id = profile.empresa_id
                WHERE profile.user_id = auth.uid()
                  AND profile.role = 'tenant_admin'
                  AND empresa.schema_name = current_schema()
            ) THEN
                RAISE EXCEPTION 'Permissao negada';
            END IF;
            IF NOT EXISTS (
                SELECT 1
                FROM public.user_profiles profile
                JOIN public.empresas empresa ON empresa.id = profile.empresa_id
                WHERE profile.user_id = p_user_id
                  AND empresa.schema_name = current_schema()
            ) THEN
                RAISE EXCEPTION 'Usuario nao pertence a esta empresa';
            END IF;

            FOR v_lotacao IN
                SELECT *
                FROM jsonb_to_recordset(p_lotacoes) AS item(filial_id UUID, papel TEXT)
            LOOP
                IF v_lotacao.filial_id IS NULL
                   OR v_lotacao.papel NOT IN ('operador', 'supervisor', 'gerente') THEN
                    RAISE EXCEPTION 'Lotacao invalida';
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM locais_estoque filial
                    WHERE filial.id = v_lotacao.filial_id
                      AND filial.ativo = TRUE
                      AND filial.tipo IN ('filial', 'loja')
                ) THEN
                    RAISE EXCEPTION 'Filial invalida';
                END IF;
            END LOOP;

            DELETE FROM usuarios_filiais WHERE user_id = p_user_id;

            INSERT INTO usuarios_filiais (user_id, filial_id, papel, ativo)
            SELECT p_user_id, item.filial_id, item.papel, TRUE
            FROM jsonb_to_recordset(p_lotacoes) AS item(filial_id UUID, papel TEXT)
            ON CONFLICT (user_id, filial_id) DO UPDATE
            SET papel = EXCLUDED.papel, ativo = TRUE;

            RETURN jsonb_build_object('success', TRUE);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_lotacoes_filiais(UUID) FROM PUBLIC, anon, authenticated', p_schema);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_salvar_lotacoes_filiais(UUID, JSONB) FROM PUBLIC, anon, authenticated', p_schema);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_lotacoes_filiais(UUID) TO service_role', p_schema);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_salvar_lotacoes_filiais(UUID, JSONB) TO service_role', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_gestao_lotacoes_filiais(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('gestao_lotacoes_filiais', 85, 'public.provisionar_hook_gestao_lotacoes_filiais(text)'::REGPROCEDURE)
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
        PERFORM public.provisionar_hook_gestao_lotacoes_filiais(v_schema);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_listar_lotacoes_filiais(p_user_id UUID)
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
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_listar_lotacoes_filiais($1)', v_schema) INTO v_result USING p_user_id;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_salvar_lotacoes_filiais(p_user_id UUID, p_lotacoes JSONB)
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
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_salvar_lotacoes_filiais($1,$2)', v_schema) INTO v_result USING p_user_id, p_lotacoes;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_listar_lotacoes_filiais(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_salvar_lotacoes_filiais(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_listar_lotacoes_filiais(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_salvar_lotacoes_filiais(UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';