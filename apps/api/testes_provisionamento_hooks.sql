-- Smoke test transacional do provisionamento de um tenant novo.
-- Requer ao menos um registro em auth.users e termina sempre em ROLLBACK.

BEGIN;

DO $preflight$
BEGIN
    IF to_regprocedure('public.executar_hooks_provisionamento(text)') IS NULL THEN
        RAISE EXCEPTION 'Executor de hooks ausente; aplique 000_provisionamento_hooks.sql antes deste smoke test';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.provisionamento_hooks hook_item
        WHERE hook_item.hook_key = 'mrp_producao'
          AND hook_item.ativo
    ) THEN
        RAISE EXCEPTION 'Hook MRP ausente; aplique apps/api/migrations/mrp_producao.sql antes deste smoke test';
    END IF;
END;
$preflight$;

DO $smoke$
DECLARE
    v_empresa_id UUID := gen_random_uuid();
    v_schema TEXT := 'tenant_smoke_' || substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12);
    v_cnpj TEXT := 'smoke_' || substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 13);
    v_user_id UUID;
    v_insumo_id UUID;
    v_produto_acabado_id UUID;
    v_ordem_id UUID;
    v_result JSON;
    v_jsonb JSONB;
    v_quantidade NUMERIC;
    v_custo_unitario NUMERIC;
    v_required_columns TEXT[] := ARRAY[
        'nf_entrada', 'ncm', 'cfop_padrao', 'origem', 'deleted_at', 'image_urls'
    ];
    v_required_tables TEXT[] := ARRAY[
        'fichas_tecnicas', 'ordens_producao', 'ordens_producao_insumos',
        'usuarios_filiais', 'caixas', 'caixa_sessoes', 'caixa_movimentos', 'fechamentos_caixa'
    ];
BEGIN
    SELECT u.id
    INTO v_user_id
    FROM auth.users u
    ORDER BY u.created_at
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Smoke test requer ao menos um usuario em auth.users';
    END IF;

    SELECT public.provisionar_empresa_master(
        v_empresa_id,
        v_cnpj,
        'Empresa Smoke Hooks',
        'teste',
        'teste',
        v_schema,
        ARRAY[]::TEXT[],
        'Empresa Smoke Hooks'
    )
    INTO v_result;

    IF v_result->>'status' <> 'success' THEN
        RAISE EXCEPTION 'Provisionamento retornou status inesperado: %', v_result;
    END IF;

    IF (
        SELECT count(*)
        FROM unnest(v_required_columns) required(column_name)
        WHERE NOT EXISTS (
            SELECT 1
            FROM information_schema.columns c
            WHERE c.table_schema = v_schema
              AND c.table_name = 'produtos'
              AND c.column_name = required.column_name
        )
    ) > 0 THEN
        RAISE EXCEPTION 'Colunas de compatibilidade do catalogo ausentes em %', v_schema;
    END IF;

    IF (
        SELECT count(*)
        FROM unnest(v_required_tables) required(table_name)
        WHERE to_regclass(format('%I.%I', v_schema, required.table_name)) IS NULL
    ) > 0 THEN
        RAISE EXCEPTION 'Tabelas MRP ausentes em %', v_schema;
    END IF;

    IF to_regprocedure(format('%I.tenant_dashboard_kpis()', v_schema)) IS NULL
       OR to_regprocedure(format('%I.tenant_dashboard_kpis_por_mes(integer)', v_schema)) IS NULL
       OR to_regprocedure(format('%I.tenant_listar_locais_estoque()', v_schema)) IS NULL
       OR to_regprocedure(format('%I.tenant_obter_sugestoes_nurturing()', v_schema)) IS NULL
       OR to_regprocedure(format(
          '%I.tenant_processar_venda(uuid,text,jsonb,uuid,text,text,numeric,numeric,boolean,uuid,uuid,uuid)',
            v_schema
       )) IS NULL
      OR to_regprocedure(format('%I.tenant_listar_contextos_caixa()', v_schema)) IS NULL
    OR to_regprocedure(format('%I.tenant_listar_lotacoes_filiais(uuid)', v_schema)) IS NULL
    OR to_regprocedure(format('%I.tenant_salvar_lotacoes_filiais(uuid,jsonb)', v_schema)) IS NULL
      OR to_regprocedure(format('%I.tenant_obter_resumo_caixa(uuid,uuid,date)', v_schema)) IS NULL
      OR to_regprocedure(format('%I.tenant_fechar_caixa(uuid,uuid,date,jsonb,text)', v_schema)) IS NULL
    OR to_regprocedure(format('%I.tenant_listar_financeiro_filial(uuid)', v_schema)) IS NULL
    OR to_regprocedure(format('%I.tenant_atualizar_financeiro_filial(uuid,uuid,text,text,numeric,date,text,text)', v_schema)) IS NULL
    OR to_regprocedure(format('%I.tenant_excluir_financeiro_filial(uuid,uuid)', v_schema)) IS NULL
    OR to_regprocedure(format('%I.tenant_conciliar_financeiro_filial(uuid,jsonb)', v_schema)) IS NULL
       OR to_regprocedure(format(
            '%I.tenant_concluir_ordem_producao_local(uuid,numeric,jsonb)',
            v_schema
       )) IS NULL THEN
        RAISE EXCEPTION 'Uma ou mais assinaturas locais obrigatorias estao ausentes em %', v_schema;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = v_schema
          AND p.proname = 'tenant_dashboard_kpis'
          AND p.pronargs = 0
          AND p.prorettype = 'jsonb'::REGTYPE
    ) THEN
        RAISE EXCEPTION 'Dashboard local nao usa o contrato JSONB em %', v_schema;
    END IF;

    IF (
        SELECT count(*)
        FROM unnest(ARRAY[
            'catalogo_produtos',
            'estoque_movimentacoes',
            'dashboard_executivo',
            'locais_estoque',
            'nurturing_interacoes',
            'processar_venda',
            'caixa_diario',
            'gestao_lotacoes_filiais',
            'dashboard_dono_filial',
            'financeiro_filial_seguranca',
            'mrp_producao'
        ]) required(hook_key)
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.provisionamento_hooks h
            WHERE h.hook_key = required.hook_key
              AND h.ativo
        )
    ) > 0 THEN
        RAISE EXCEPTION 'Registro de hooks obrigatorios incompleto';
    END IF;

    EXECUTE format('SELECT %I.tenant_dashboard_kpis()', v_schema) INTO v_jsonb;
    IF jsonb_typeof(v_jsonb) <> 'object' THEN
        RAISE EXCEPTION 'Dashboard local retornou contrato invalido';
    END IF;

    EXECUTE format('SELECT %I.tenant_dashboard_kpis_por_mes(6)', v_schema) INTO v_jsonb;
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Dashboard mensal local retornou contrato invalido';
    END IF;

    EXECUTE format('SELECT %I.tenant_listar_locais_estoque()', v_schema) INTO v_jsonb;
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Locais de estoque retornaram contrato invalido';
    END IF;

    EXECUTE format(
        'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::JSONB) FROM %I.tenant_obter_sugestoes_nurturing() t',
        v_schema
    ) INTO v_jsonb;
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Nurturing local retornou contrato invalido';
    END IF;

    EXECUTE format(
        'SELECT %I.tenant_processar_venda($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        v_schema
    )
    INTO v_jsonb
    USING NULL::UUID, NULL::TEXT, '[]'::JSONB, NULL::UUID, NULL::TEXT,
          'dinheiro'::TEXT, 0::NUMERIC, 0::NUMERIC, FALSE, NULL::UUID;

    IF v_jsonb->>'success' <> 'false' THEN
        RAISE EXCEPTION 'RPC local de venda nao executou a assinatura de dez argumentos';
    END IF;

    EXECUTE format(
        'INSERT INTO %I.produtos (nome, tipo, preco_base, custo_unitario) '
        'VALUES ($1, ''produto'', $2, $3) RETURNING id',
        v_schema
    )
    INTO v_insumo_id
    USING 'Insumo Smoke', 4::NUMERIC, 4::NUMERIC;

    EXECUTE format(
        'INSERT INTO %I.produtos (nome, tipo, preco_base, custo_unitario) '
        'VALUES ($1, ''produto'', $2, $3) RETURNING id',
        v_schema
    )
    INTO v_produto_acabado_id
    USING 'Produto Acabado Smoke', 12::NUMERIC, 0::NUMERIC;

    EXECUTE format(
        'INSERT INTO %I.estoque (produto_id, sku, quantidade, quantidade_minima) '
        'VALUES ($1, $2, $3, $4)',
        v_schema
    ) USING v_insumo_id, 'smoke-insumo-' || v_insumo_id, 10, 1;

    EXECUTE format(
        'INSERT INTO %I.estoque (produto_id, sku, quantidade, quantidade_minima) '
        'VALUES ($1, $2, $3, $4)',
        v_schema
    ) USING v_produto_acabado_id, 'smoke-acabado-' || v_produto_acabado_id, 1, 1;

    EXECUTE format(
        'INSERT INTO %I.ordens_producao (produto_id, quantidade_planejada) '
        'VALUES ($1, $2) RETURNING id',
        v_schema
    )
    INTO v_ordem_id
    USING v_produto_acabado_id, 2::NUMERIC;

    EXECUTE format(
        'INSERT INTO %I.ordens_producao_insumos '
        '(ordem_id, insumo_id, quantidade_prevista) VALUES ($1, $2, $3)',
        v_schema
    ) USING v_ordem_id, v_insumo_id, 3::NUMERIC;

    EXECUTE format(
        'SELECT %I.tenant_concluir_ordem_producao_local($1, $2, $3)',
        v_schema
    )
    INTO v_jsonb
    USING
        v_ordem_id,
        2::NUMERIC,
        jsonb_build_array(jsonb_build_object(
            'insumo_id', v_insumo_id,
            'quantidade_consumida', 3
        ));

    IF v_jsonb->>'success' <> 'true' THEN
        RAISE EXCEPTION 'Conclusao MRP falhou: %', v_jsonb;
    END IF;

    EXECUTE format(
        'SELECT quantidade FROM %I.estoque WHERE produto_id = $1 '
        'ORDER BY atualizado_em DESC NULLS LAST, id LIMIT 1',
        v_schema
    ) INTO v_quantidade USING v_insumo_id;
    IF v_quantidade <> 7 THEN
        RAISE EXCEPTION 'MRP nao consumiu estoque canonico: %', v_quantidade;
    END IF;

    EXECUTE format(
        'SELECT quantidade FROM %I.estoque WHERE produto_id = $1 '
        'ORDER BY atualizado_em DESC NULLS LAST, id LIMIT 1',
        v_schema
    ) INTO v_quantidade USING v_produto_acabado_id;
    IF v_quantidade <> 3 THEN
        RAISE EXCEPTION 'MRP nao incrementou estoque canonico: %', v_quantidade;
    END IF;

    EXECUTE format(
        'SELECT custo_unitario FROM %I.produtos WHERE id = $1',
        v_schema
    ) INTO v_custo_unitario USING v_produto_acabado_id;
    IF v_custo_unitario <> 6 THEN
        RAISE EXCEPTION 'MRP calculou custo_unitario inesperado: %', v_custo_unitario;
    END IF;

    INSERT INTO public.user_profiles (user_id, empresa_id, role)
    VALUES (v_user_id, v_empresa_id, 'tenant_admin')
    ON CONFLICT (user_id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        role = EXCLUDED.role;

    PERFORM set_config('request.jwt.claim.sub', v_user_id::TEXT, TRUE);
    PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object('sub', v_user_id::TEXT, 'role', 'authenticated')::TEXT,
        TRUE
    );
END;
$smoke$;

SET LOCAL ROLE authenticated;

DO $public_calls$
DECLARE
    v_jsonb JSONB;
BEGIN
    PERFORM * FROM public.tenant_dashboard_kpis();

    v_jsonb := public.tenant_dashboard_kpis_por_mes(6);
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Wrapper publico do dashboard mensal retornou contrato invalido';
    END IF;

    v_jsonb := public.tenant_obter_sugestoes_nurturing();
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Wrapper publico de nurturing retornou contrato invalido';
    END IF;

    v_jsonb := public.tenant_listar_locais_estoque();
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Wrapper publico de locais de estoque retornou contrato invalido';
    END IF;

    v_jsonb := public.tenant_listar_produtos(10, 0);
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Wrapper publico do catalogo retornou contrato invalido';
    END IF;

    v_jsonb := public.tenant_processar_venda(
        NULL, NULL, '[]'::JSONB, NULL, NULL, 'dinheiro', 0, 0, FALSE, NULL
    );
    IF v_jsonb->>'success' <> 'false' THEN
        RAISE EXCEPTION 'Wrapper publico de venda nao executou a assinatura corrigida';
    END IF;

    v_jsonb := public.tenant_listar_fichas_tecnicas(10, 0);
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Wrapper publico de fichas tecnicas retornou contrato invalido';
    END IF;

    v_jsonb := public.tenant_listar_ordens_producao(10, 0);
    IF jsonb_typeof(v_jsonb) <> 'array' THEN
        RAISE EXCEPTION 'Wrapper publico de ordens de producao retornou contrato invalido';
    END IF;

    v_jsonb := public.tenant_concluir_ordem_producao(
        gen_random_uuid(), 1, '[]'::JSONB
    );
    IF jsonb_typeof(v_jsonb) <> 'object' THEN
        RAISE EXCEPTION 'Wrapper publico de conclusao MRP retornou contrato invalido';
    END IF;
END;
$public_calls$;

RESET ROLE;
ROLLBACK;