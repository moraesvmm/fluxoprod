DROP FUNCTION IF EXISTS public.tenant_listar_clientes(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]);

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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_schema_name TEXT;
    v_result JSONB;
BEGIN
    v_schema_name := (
        SELECT e.schema_name
        FROM public.user_profiles up
        JOIN public.empresas e ON e.id = up.empresa_id
        WHERE up.user_id = auth.uid()
        LIMIT 1
    );
    
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN
        RETURN '[]'::JSONB;
    END IF;
    
    EXECUTE format('
        SELECT jsonb_agg(
            jsonb_build_object(
                ''id'', c.id,
                ''nome'', c.nome,
                ''email'', c.email,
                ''telefone'', c.telefone,
                ''funil_fase'', c.funil_fase,
                ''status'', c.status,
                ''tags'', c.tags,
                ''criado_em'', c.criado_em,
                ''atualizado_em'', c.atualizado_em,
                ''next_cursor'', c.next_cursor
            )
        )
        FROM %I.tenant_listar_clientes($1, $2, $3, $4, $5, $6, $7, $8) c
    ', v_schema_name)
    INTO v_result
    USING p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags;

    RETURN COALESCE(v_result, '[]'::JSONB);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_clientes TO authenticated;
