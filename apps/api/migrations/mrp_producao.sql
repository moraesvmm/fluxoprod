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

-- 3. Loop em schemas de tenants existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Schemas tenant_* incompletos (provisionamento abortado) não têm produtos e quebrariam o ALTER
    FOR r IN
        SELECT s.schema_name
        FROM information_schema.schemata s
        WHERE s.schema_name LIKE 'tenant_%'
          AND EXISTS (
              SELECT 1
              FROM information_schema.tables t
              WHERE t.table_schema = s.schema_name
                AND t.table_name = 'produtos'
          )
    LOOP
        -- Alterar produtos
        BEGIN
            EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN tipo_item VARCHAR(50) DEFAULT ''produto_acabado'';', r.schema_name);
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
            EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN unidade_medida VARCHAR(20) DEFAULT ''UN'';', r.schema_name);
        EXCEPTION WHEN duplicate_column THEN NULL; END;

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
        ', r.schema_name, r.schema_name, r.schema_name);

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
        ', r.schema_name, r.schema_name);

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
        ', r.schema_name, r.schema_name, r.schema_name);

        -- RPC Tenant Local: Concluir OP (Executa a transação atômica)
        -- A versão anterior tem defaults nos parâmetros, e CREATE OR REPLACE não pode removê-los (42P13)
        EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_concluir_ordem_producao_local(UUID, NUMERIC, JSONB);', r.schema_name);

        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_concluir_ordem_producao_local(
                p_ordem_id UUID,
                p_qtd_produzida NUMERIC,
                p_insumos JSONB
            )
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            DECLARE
                v_status VARCHAR;
                v_produto_acabado_id UUID;
                v_insumo JSONB;
                v_id_insumo UUID;
                v_qtd_consumida NUMERIC;
                v_custo_unitario NUMERIC;
                v_custo_total_op NUMERIC := 0;
            BEGIN
                SELECT status, produto_id INTO v_status, v_produto_acabado_id
                FROM ordens_producao WHERE id = p_ordem_id;

                IF v_status IS NULL THEN
                    RETURN jsonb_build_object(''success'', false, ''error'', ''Ordem não encontrada'');
                END IF;

                IF v_status = ''concluida'' THEN
                    RETURN jsonb_build_object(''success'', false, ''error'', ''Ordem já concluída'');
                END IF;

                FOR v_insumo IN SELECT * FROM jsonb_array_elements(p_insumos) LOOP
                    v_id_insumo := (v_insumo->>''insumo_id'')::UUID;
                    v_qtd_consumida := (v_insumo->>''quantidade_consumida'')::NUMERIC;
                    
                    SELECT COALESCE(preco_custo, 0) INTO v_custo_unitario
                    FROM produtos WHERE id = v_id_insumo;

                    UPDATE produtos 
                    SET estoque_atual = COALESCE(estoque_atual, 0) - v_qtd_consumida,
                        atualizado_em = NOW()
                    WHERE id = v_id_insumo;

                    UPDATE ordens_producao_insumos
                    SET quantidade_consumida = v_qtd_consumida,
                        custo_unitario_real = v_custo_unitario
                    WHERE ordem_id = p_ordem_id AND insumo_id = v_id_insumo;

                    v_custo_total_op := v_custo_total_op + (v_qtd_consumida * v_custo_unitario);
                END LOOP;

                UPDATE produtos
                SET estoque_atual = COALESCE(estoque_atual, 0) + p_qtd_produzida,
                    preco_custo = CASE WHEN p_qtd_produzida > 0 THEN (v_custo_total_op / p_qtd_produzida) ELSE preco_custo END,
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
        ', r.schema_name, r.schema_name);

        -- Permissões
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC;', r.schema_name);
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon;', r.schema_name);
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated;', r.schema_name);
        EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', r.schema_name);
        EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO service_role;', r.schema_name);
    END LOOP;
END $$;

-- 4. Criar RPCs Globais de Roteamento (Public)
CREATE OR REPLACE FUNCTION public.tenant_listar_fichas_tecnicas(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.tenant_listar_ordens_producao(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.tenant_concluir_ordem_producao(
    p_ordem_id UUID,
    p_qtd_produzida NUMERIC,
    p_insumos JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 5. RPC para Atualizar o Template do Provisionador (se houver)
-- O script CORRECOES_CRITICAS_SUPABASE.sql contém a provisionar_empresa inteira.
-- Como ela é DDL longo, para evitar reescrevê-la aqui e quebrar algo, o DO $$ garante os tenants atuais.
-- Idealmente, adicione manualmente no sql/CORRECOES_CRITICAS_SUPABASE.sql depois.
