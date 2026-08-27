-- Fecha a exposicao de funcoes SECURITY DEFINER ao papel anon.
-- Somente o funil de checkout precisa responder sem autenticacao.
-- Funcoes de infraestrutura, depuracao e as que recebem o schema por parametro
-- (leitura cross-tenant) passam a ser exclusivas do service_role.

DO $$
DECLARE
    v_funcao RECORD;
    v_anon_permitidas TEXT[] := ARRAY[
        'listar_planos_checkout',
        'listar_modulos_avulsos_checkout',
        'validar_cupom'
    ];
    v_somente_service_role TEXT[] := ARRAY[
        '_after_empresa_insert_seed_modules',
        '_provisionar_rpcs_escrita_a',
        '_provisionar_rpcs_escrita_b',
        '_provisionar_rpcs_leitura',
        '_provisionar_tabelas',
        'create_tenant_schema',
        'criar_rpcs_tenant',
        'drop_old_tenant_atualizar_cliente',
        'drop_old_tenant_criar_cliente',
        'execute_dynamic_ddl',
        'get_clientes_tenant',
        'get_estoque_baixo',
        'get_pendencias_financeiro',
        'get_vendas_periodo',
        'provision_base_tables',
        'provisionar_empresa',
        'provisionar_empresa_master',
        'provisionar_estoque_movimentacoes',
        'relatorio_estoque_tenant',
        'relatorio_financeiro_tenant',
        'relatorio_vendas_tenant',
        'update_all_tenants_atualizar_cliente',
        'update_all_tenants_criar_cliente',
        'update_clientes_funil_fase_constraint',
        'webhook_provisionar_assinatura'
    ];
BEGIN
    FOR v_funcao IN
        SELECT p.proname, p.oid::REGPROCEDURE AS assinatura
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef
          AND (
              has_function_privilege('anon', p.oid, 'EXECUTE')
              OR has_function_privilege('public', p.oid, 'EXECUTE')
          )
    LOOP
        IF v_funcao.proname = ANY(v_anon_permitidas) THEN
            CONTINUE;
        END IF;

        IF v_funcao.proname = ANY(v_somente_service_role)
           OR v_funcao.proname LIKE 'debug\_%'
           OR v_funcao.proname LIKE 'provisionar\_hook\_%' THEN
            EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_funcao.assinatura);
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_funcao.assinatura);
        ELSE
            EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_funcao.assinatura);
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', v_funcao.assinatura);
        END IF;
    END LOOP;
END;
$$;

DO $$
DECLARE
    v_restantes TEXT;
BEGIN
    SELECT string_agg(p.oid::REGPROCEDURE::TEXT, ', ')
    INTO v_restantes
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND p.proname <> ALL (ARRAY[
          'listar_planos_checkout',
          'listar_modulos_avulsos_checkout',
          'validar_cupom'
      ]);

    IF v_restantes IS NOT NULL THEN
        RAISE EXCEPTION 'Funcoes ainda expostas a anon: %', v_restantes;
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
