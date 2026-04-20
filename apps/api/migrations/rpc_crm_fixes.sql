-- rpc_crm_fixes.sql
-- Fix missing public wrappers and parameter mismatch for CRM module.
-- Optimized to bypass Supabase SQL Editor parser bugs (avoiding INTO keywords completely)

-- 1. Create wrapper for tenant_listar_tags_catalog
CREATE OR REPLACE FUNCTION public.tenant_listar_tags_catalog(p_busca TEXT DEFAULT '', p_limit INT DEFAULT 20)
RETURNS TABLE (
    id UUID,
    nome TEXT,
    cor TEXT,
    uso_count INT,
    criado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_schema TEXT;
BEGIN
    v_tenant_schema := (
        SELECT e.schema_name
        FROM public.user_profiles up
        JOIN public.empresas e ON e.id = up.empresa_id
        WHERE up.user_id = auth.uid()
        LIMIT 1
    );
    
    IF v_tenant_schema IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY EXECUTE format('SELECT id, nome, cor, uso_count, criado_em FROM %I.tenant_listar_tags_catalog($1, $2)', v_tenant_schema)
    USING p_busca, p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_tags_catalog TO authenticated;


-- 2. Create wrapper for tenant_dashboard_metricas
CREATE OR REPLACE FUNCTION public.tenant_dashboard_metricas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_row JSONB;
BEGIN
    v_tenant_schema := (
        SELECT e.schema_name
        FROM public.user_profiles up
        JOIN public.empresas e ON e.id = up.empresa_id
        WHERE up.user_id = auth.uid()
        LIMIT 1
    );
    
    IF v_tenant_schema IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    
    -- Substituto para EXECUTE ... INTO utilizando FOR ... LOOP
    FOR v_row IN 
        EXECUTE format('SELECT %I.tenant_dashboard_metricas() AS result', v_tenant_schema) 
    LOOP
        RETURN COALESCE(v_row, '{}'::jsonb);
    END LOOP;
    
    RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_dashboard_metricas TO authenticated;


-- 3. Update public wrapper for tenant_listar_clientes to match new signature
DROP FUNCTION IF EXISTS public.tenant_listar_clientes(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.tenant_listar_clientes(
    p_cursor UUID DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_status TEXT DEFAULT NULL,
    p_funil_fase TEXT DEFAULT NULL,
    p_busca TEXT DEFAULT NULL,
    p_order_by TEXT DEFAULT 'criado_em',
    p_order_dir TEXT DEFAULT 'DESC',
    p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    nome VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(50),
    documento VARCHAR(50),
    endereco TEXT,
    funil_fase VARCHAR(50),
    status VARCHAR(50),
    tags TEXT[],
    criado_em TIMESTAMPTZ,
    atualizado_em TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    next_cursor UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_schema_name TEXT;
BEGIN
    v_schema_name := (
        SELECT e.schema_name
        FROM public.user_profiles up
        JOIN public.empresas e ON e.id = up.empresa_id
        WHERE up.user_id = auth.uid()
        LIMIT 1
    );
    
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN
        RETURN;
    END IF;
    
    RETURN QUERY EXECUTE format('
        SELECT 
            id,
            nome,
            email,
            telefone,
            documento,
            endereco,
            funil_fase,
            status,
            tags,
            criado_em,
            atualizado_em,
            deleted_at,
            next_cursor
        FROM %I.tenant_listar_clientes($1, $2, $3, $4, $5, $6, $7, $8)
    ', v_schema_name)
    USING p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_clientes TO authenticated;


-- 4. Review and ensure tenant_dashboard_kpis_por_mes accepts authenticated role calls
GRANT EXECUTE ON FUNCTION public.tenant_dashboard_kpis_por_mes TO authenticated;

