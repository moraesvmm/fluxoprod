-- apps/api/migrations/mrp_producao_completar_rpcs.sql
-- Corrige 404 em rpc/tenant_abrir_ordem_producao: as RPCs tenant_abrir_ordem_producao
-- e tenant_criar_ficha_tecnica eram usadas pelo frontend (apps/web/src/lib/api-producao.ts)
-- mas nunca haviam sido criadas por migração versionada nem registradas no hook de
-- provisionamento (mrp_producao.sql só criava tenant_listar_*/tenant_concluir_ordem_producao).
-- Este arquivo completa o hook e cria os roteadores públicos que faltavam.

-- 1. Função idempotente: hook do módulo MRP passa a criar também as funções locais
-- de abertura de OP e cadastro de ficha técnica em cada schema tenant.
CREATE OR REPLACE FUNCTION public.provisionar_hook_mrp_producao(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS tipo_item VARCHAR(50) DEFAULT ''produto_acabado''', p_schema);
    EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS unidade_medida VARCHAR(20) DEFAULT ''UN''', p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.fichas_tecnicas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_acabado_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            materia_prima_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE RESTRICT,
            quantidade_necessaria NUMERIC(10, 4) NOT NULL CHECK (quantidade_necessaria > 0),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        );
    ', p_schema, p_schema, p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.ordens_producao (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            numero_op SERIAL,
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE RESTRICT,
            quantidade_planejada NUMERIC(10, 2) NOT NULL CHECK (quantidade_planejada > 0),
            quantidade_produzida NUMERIC(10, 2) DEFAULT 0,
            status VARCHAR(50) DEFAULT ''planejada'' CHECK (status IN (''planejada'', ''em_andamento'', ''concluida'', ''cancelada'')),
            data_inicio TIMESTAMPTZ,
            data_fim TIMESTAMPTZ,
            custo_total_materiais NUMERIC(12, 2) DEFAULT 0,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        );
    ', p_schema, p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.ordens_producao_insumos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ordem_id UUID NOT NULL REFERENCES %I.ordens_producao(id) ON DELETE CASCADE,
            insumo_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE RESTRICT,
            quantidade_prevista NUMERIC(10, 4) NOT NULL CHECK (quantidade_prevista > 0),
            quantidade_consumida NUMERIC(10, 4) DEFAULT 0,
            custo_unitario_real NUMERIC(12, 4) DEFAULT 0,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', p_schema, p_schema, p_schema);

    -- RPC Tenant Local: Criar ficha técnica
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_criar_ficha_tecnica_local(UUID, UUID, NUMERIC);', p_schema);
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_ficha_tecnica_local(
            p_produto_acabado_id UUID,
            p_materia_prima_id UUID,
            p_quantidade_necessaria NUMERIC
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_id UUID;
        BEGIN
            IF p_produto_acabado_id = p_materia_prima_id THEN
                RETURN jsonb_build_object(''success'', false, ''error'', ''Produto acabado e matéria-prima não podem ser o mesmo item'');
            END IF;

            IF p_quantidade_necessaria IS NULL OR p_quantidade_necessaria <= 0 THEN
                RETURN jsonb_build_object(''success'', false, ''error'', ''Quantidade necessária deve ser maior que zero'');
            END IF;

            INSERT INTO fichas_tecnicas (produto_acabado_id, materia_prima_id, quantidade_necessaria)
            VALUES (p_produto_acabado_id, p_materia_prima_id, p_quantidade_necessaria)
            RETURNING id INTO v_id;

            RETURN jsonb_build_object(''success'', true, ''id'', v_id);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
        END;
        $func$;
    ', p_schema, p_schema);

    -- RPC Tenant Local: Abrir OP (cria a ordem e reserva os insumos previstos na ficha técnica)
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_abrir_ordem_producao_local(UUID, NUMERIC);', p_schema);
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_abrir_ordem_producao_local(
            p_produto_id UUID,
            p_quantidade_planejada NUMERIC
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_ordem_id UUID;
        BEGIN
            IF p_quantidade_planejada IS NULL OR p_quantidade_planejada <= 0 THEN
                RETURN jsonb_build_object(''success'', false, ''error'', ''Quantidade planejada deve ser maior que zero'');
            END IF;

            IF NOT EXISTS (SELECT 1 FROM produtos WHERE id = p_produto_id AND deleted_at IS NULL) THEN
                RETURN jsonb_build_object(''success'', false, ''error'', ''Produto não encontrado'');
            END IF;

            INSERT INTO ordens_producao (produto_id, quantidade_planejada, status, data_inicio)
            VALUES (p_produto_id, p_quantidade_planejada, ''em_andamento'', NOW())
            RETURNING id INTO v_ordem_id;

            INSERT INTO ordens_producao_insumos (ordem_id, insumo_id, quantidade_prevista)
            SELECT v_ordem_id, f.materia_prima_id, f.quantidade_necessaria * p_quantidade_planejada
            FROM fichas_tecnicas f
            WHERE f.produto_acabado_id = p_produto_id
              AND f.deleted_at IS NULL;

            RETURN jsonb_build_object(''success'', true, ''ordem_id'', v_ordem_id);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
        END;
        $func$;
    ', p_schema, p_schema);

    -- RPC Tenant Local: Concluir OP (Executa a transação atômica)
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_concluir_ordem_producao_local(UUID, NUMERIC, JSONB);', p_schema);
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_concluir_ordem_producao_local(
            p_ordem_id UUID,
            p_qtd_produzida NUMERIC,
            p_insumos JSONB
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_status VARCHAR;
            v_produto_acabado_id UUID;
            v_insumo JSONB;
            v_id_insumo UUID;
            v_qtd_consumida NUMERIC;
            v_custo_unitario NUMERIC;
            v_custo_total_op NUMERIC := 0;
            v_estoque_id UUID;
            v_quantidade_estoque NUMERIC;
        BEGIN
            SELECT status, produto_id INTO v_status, v_produto_acabado_id
            FROM ordens_producao
            WHERE id = p_ordem_id
            FOR UPDATE;

            IF v_status IS NULL THEN
                RETURN jsonb_build_object(''success'', false, ''error'', ''Ordem não encontrada'');
            END IF;

            IF v_status = ''concluida'' THEN
                RETURN jsonb_build_object(''success'', false, ''error'', ''Ordem já concluída'');
            END IF;

            IF jsonb_typeof(p_insumos) IS DISTINCT FROM ''array'' THEN
                RAISE EXCEPTION ''Insumos devem ser informados como array'';
            END IF;

            IF EXISTS (
                SELECT 1
                FROM ordens_producao_insumos opi
                WHERE opi.ordem_id = p_ordem_id
                  AND NOT EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements(p_insumos) item
                      WHERE item->>''insumo_id'' = opi.insumo_id::TEXT
                  )
            ) THEN
                RAISE EXCEPTION ''Todos os insumos previstos devem ser informados'';
            END IF;

            IF (
                SELECT COUNT(*)
                FROM jsonb_array_elements(p_insumos)
            ) <> (
                SELECT COUNT(DISTINCT item->>''insumo_id'')
                FROM jsonb_array_elements(p_insumos) item
            ) THEN
                RAISE EXCEPTION ''Insumos duplicados nao sao permitidos'';
            END IF;

            FOR v_insumo IN SELECT * FROM jsonb_array_elements(p_insumos) LOOP
                v_id_insumo := (v_insumo->>''insumo_id'')::UUID;
                v_qtd_consumida := (v_insumo->>''quantidade_consumida'')::NUMERIC;

                IF v_qtd_consumida IS NULL OR v_qtd_consumida <= 0 THEN
                    RAISE EXCEPTION ''Quantidade consumida deve ser maior que zero'';
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM ordens_producao_insumos opi
                    WHERE opi.ordem_id = p_ordem_id
                      AND opi.insumo_id = v_id_insumo
                ) THEN
                    RAISE EXCEPTION ''Insumo %% nao pertence a ordem de producao'', v_id_insumo;
                END IF;

                SELECT COALESCE(p.custo_unitario, 0), e.id, e.quantidade
                INTO v_custo_unitario, v_estoque_id, v_quantidade_estoque
                FROM produtos p
                JOIN estoque e ON e.produto_id = p.id
                WHERE p.id = v_id_insumo
                ORDER BY e.atualizado_em DESC NULLS LAST, e.id
                LIMIT 1
                FOR UPDATE OF e;

                IF NOT FOUND THEN
                    RAISE EXCEPTION ''Insumo %% nao possui registro de estoque'', v_id_insumo;
                END IF;

                IF v_quantidade_estoque < v_qtd_consumida THEN
                    RAISE EXCEPTION ''Estoque insuficiente para o insumo %%'', v_id_insumo;
                END IF;

                UPDATE estoque
                SET quantidade = quantidade - v_qtd_consumida,
                    atualizado_em = NOW()
                WHERE id = v_estoque_id;

                UPDATE ordens_producao_insumos
                SET quantidade_consumida = v_qtd_consumida,
                    custo_unitario_real = v_custo_unitario
                WHERE ordem_id = p_ordem_id AND insumo_id = v_id_insumo;

                v_custo_total_op := v_custo_total_op + (v_qtd_consumida * v_custo_unitario);
            END LOOP;

            SELECT e.id
            INTO v_estoque_id
            FROM estoque e
            WHERE e.produto_id = v_produto_acabado_id
            ORDER BY e.atualizado_em DESC NULLS LAST, e.id
            LIMIT 1
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION ''Produto acabado %% nao possui registro de estoque'', v_produto_acabado_id;
            END IF;

            UPDATE estoque
            SET quantidade = quantidade + p_qtd_produzida,
                atualizado_em = NOW()
            WHERE id = v_estoque_id;

            UPDATE produtos
            SET custo_unitario = CASE
                    WHEN p_qtd_produzida > 0 THEN v_custo_total_op / p_qtd_produzida
                    ELSE custo_unitario
                END,
                atualizado_em = NOW()
            WHERE id = v_produto_acabado_id;

            UPDATE ordens_producao
            SET status = ''concluida'',
                quantidade_produzida = p_qtd_produzida,
                custo_total_materiais = v_custo_total_op,
                data_fim = NOW(),
                atualizado_em = NOW()
            WHERE id = p_ordem_id;

            RETURN jsonb_build_object(''success'', true, ''ordem_id'', p_ordem_id);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
        END;
        $func$;
    ', p_schema, p_schema);

    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC;', p_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon;', p_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated;', p_schema);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', p_schema);
    EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO service_role;', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_mrp_producao(TEXT) FROM PUBLIC, anon, authenticated;

-- 2. Registro no provisionamento (idempotente - já registrado por mrp_producao.sql, mantém ordem)
INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('mrp_producao', 70, 'public.provisionar_hook_mrp_producao(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem,
    hook_function = EXCLUDED.hook_function,
    ativo = TRUE;

-- 3. Aplicação nos tenants existentes
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
        PERFORM public.provisionar_hook_mrp_producao(v_schema);
    END LOOP;
END;
$$;

-- 4. Roteadores públicos (Public) que faltavam
CREATE OR REPLACE FUNCTION public.tenant_criar_ficha_tecnica(
    p_produto_acabado_id UUID,
    p_materia_prima_id UUID,
    p_quantidade_necessaria NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT public.set_tenant_schema(auth.uid()) INTO v_schema;
    IF v_schema = 'public' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Acesso negado ou usuário sem tenant configurado');
    END IF;

    EXECUTE format('SELECT %I.tenant_criar_ficha_tecnica_local($1, $2, $3)', v_schema)
    INTO v_result USING p_produto_acabado_id, p_materia_prima_id, p_quantidade_necessaria;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_criar_ficha_tecnica(UUID, UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_criar_ficha_tecnica(UUID, UUID, NUMERIC) TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_abrir_ordem_producao(
    p_produto_id UUID,
    p_quantidade_planejada NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT public.set_tenant_schema(auth.uid()) INTO v_schema;
    IF v_schema = 'public' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Acesso negado ou usuário sem tenant configurado');
    END IF;

    EXECUTE format('SELECT %I.tenant_abrir_ordem_producao_local($1, $2)', v_schema)
    INTO v_result USING p_produto_id, p_quantidade_planejada;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_abrir_ordem_producao(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_abrir_ordem_producao(UUID, NUMERIC) TO authenticated;

-- O hook atualizado acima atende os tenants atuais e o provisionador master (tenants futuros).
