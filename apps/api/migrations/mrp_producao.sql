-- apps/api/migrations/mrp_producao.sql
-- Módulo de Produção (MRP)
-- Cria tabelas no schema public (para tipagem) e nos schemas tenant_* (para dados)

-- 1. Alterar public.produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tipo_item VARCHAR(50) DEFAULT 'produto_acabado';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unidade_medida VARCHAR(20) DEFAULT 'UN';

-- 2. Criar tabelas no public (Template para database.types.ts)
CREATE TABLE IF NOT EXISTS public.fichas_tecnicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_acabado_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    materia_prima_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    quantidade_necessaria NUMERIC(10, 4) NOT NULL CHECK (quantidade_necessaria > 0),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ordens_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_op SERIAL,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    quantidade_planejada NUMERIC(10, 2) NOT NULL CHECK (quantidade_planejada > 0),
    quantidade_produzida NUMERIC(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'cancelada')),
    data_inicio TIMESTAMPTZ,
    data_fim TIMESTAMPTZ,
    custo_total_materiais NUMERIC(12, 2) DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ordens_producao_insumos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ordem_id UUID NOT NULL REFERENCES public.ordens_producao(id) ON DELETE CASCADE,
    insumo_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    quantidade_prevista NUMERIC(10, 4) NOT NULL CHECK (quantidade_prevista > 0),
    quantidade_consumida NUMERIC(10, 4) DEFAULT 0,
    custo_unitario_real NUMERIC(12, 4) DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Dummy para public (apenas para segurança)
ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao_insumos ENABLE ROW LEVEL SECURITY;

-- 3. Hook idempotente para schemas tenant
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

        -- Criar fichas_tecnicas
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

        -- Criar ordens_producao
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

        -- Criar ordens_producao_insumos
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

        -- RPC Tenant Local: Concluir OP (Executa a transação atômica)
        -- A versão anterior tem defaults nos parâmetros, e CREATE OR REPLACE não pode removê-los (42P13)
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

        -- Permissões
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC;', p_schema);
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon;', p_schema);
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated;', p_schema);
        EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', p_schema);
        EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO service_role;', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_mrp_producao(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('mrp_producao', 70, 'public.provisionar_hook_mrp_producao(text)'::REGPROCEDURE)
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
        PERFORM public.provisionar_hook_mrp_producao(v_schema);
    END LOOP;
END;
$$;

-- 4. Criar RPCs Globais de Roteamento (Public)
CREATE OR REPLACE FUNCTION public.tenant_listar_fichas_tecnicas(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
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
    IF v_schema = 'public' THEN RETURN '[]'::JSONB; END IF;
    
    EXECUTE format('
        SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::JSONB)
        FROM (
            SELECT f.*, p_acabado.nome as produto_acabado_nome, p_materia.nome as materia_prima_nome, p_materia.unidade_medida
            FROM %I.fichas_tecnicas f
            JOIN %I.produtos p_acabado ON p_acabado.id = f.produto_acabado_id
            JOIN %I.produtos p_materia ON p_materia.id = f.materia_prima_id
            WHERE f.deleted_at IS NULL
            ORDER BY f.criado_em DESC
            LIMIT $1 OFFSET $2
        ) t;
    ', v_schema, v_schema, v_schema) INTO v_result USING p_limit, p_offset;
    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_listar_fichas_tecnicas(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_listar_fichas_tecnicas(INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_listar_ordens_producao(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
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
    IF v_schema = 'public' THEN RETURN '[]'::JSONB; END IF;
    
    EXECUTE format('
        SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::JSONB)
        FROM (
            SELECT o.*, p.nome as produto_nome, p.unidade_medida
            FROM %I.ordens_producao o
            JOIN %I.produtos p ON p.id = o.produto_id
            WHERE o.deleted_at IS NULL
            ORDER BY o.numero_op DESC
            LIMIT $1 OFFSET $2
        ) t;
    ', v_schema, v_schema) INTO v_result USING p_limit, p_offset;
    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_listar_ordens_producao(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_listar_ordens_producao(INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_concluir_ordem_producao(
    p_ordem_id UUID,
    p_qtd_produzida NUMERIC,
    p_insumos JSONB
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
    
    EXECUTE format('SELECT %I.tenant_concluir_ordem_producao_local($1, $2, $3)', v_schema) 
    INTO v_result USING p_ordem_id, p_qtd_produzida, p_insumos;
    
    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_concluir_ordem_producao(UUID, NUMERIC, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_concluir_ordem_producao(UUID, NUMERIC, JSONB) TO authenticated;

-- O hook registrado acima atende os tenants atuais e o provisionador master.
