-- ==========================================
-- FIX OS LISTING RPC (Including new fields and Joins)
-- ==========================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT schema_name FROM public.empresas WHERE status = 'ativo' AND schema_name LIKE 'tenant_%') LOOP
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_listar_ordens_servico(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
            RETURNS TABLE (
                id UUID,
                numero BIGINT,
                cliente_id UUID,
                colaborador_id UUID,
                veiculo_equipamento VARCHAR(255),
                descricao_problema TEXT,
                status VARCHAR(50),
                valor_orcamento NUMERIC(10, 2),
                tempo_total_minutos INTEGER,
                timer_iniciado_em TIMESTAMPTZ,
                criado_em TIMESTAMPTZ,
                atualizado_em TIMESTAMPTZ,
                cliente JSONB,
                colaborador JSONB
            )
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $func$
            BEGIN
                RETURN QUERY
                SELECT 
                    os.id,
                    os.numero,
                    os.cliente_id,
                    os.colaborador_id,
                    os.veiculo_equipamento,
                    os.descricao_problema,
                    os.status,
                    os.valor_orcamento,
                    os.tempo_total_minutos,
                    os.timer_iniciado_em,
                    os.criado_em,
                    os.atualizado_em,
                    jsonb_build_object(''nome'', c.nome) as cliente,
                    jsonb_build_object(''nome'', f.nome) as colaborador
                FROM %I.ordens_servico os
                LEFT JOIN %I.clientes c ON c.id = os.cliente_id
                LEFT JOIN %I.funcionarios f ON f.id = os.colaborador_id
                WHERE os.deleted_at IS NULL
                ORDER BY os.criado_em DESC
                LIMIT p_limit OFFSET p_offset;
            END;
            $func$;
        ', r.schema_name, r.schema_name, r.schema_name, r.schema_name);
    END LOOP;
END $$;

-- 2. Atualizar o wrapper público para retornar TABLE
DROP FUNCTION IF EXISTS public.tenant_listar_ordens_servico(INT, INT);
CREATE OR REPLACE FUNCTION public.tenant_listar_ordens_servico(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
RETURNS TABLE (
    id UUID,
    numero BIGINT,
    cliente_id UUID,
    colaborador_id UUID,
    veiculo_equipamento VARCHAR(255),
    descricao_problema TEXT,
    status VARCHAR(50),
    valor_orcamento NUMERIC(10, 2),
    tempo_total_minutos INTEGER,
    timer_iniciado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ,
    atualizado_em TIMESTAMPTZ,
    cliente JSONB,
    colaborador JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_schema TEXT;
BEGIN
  -- Obter o schema do tenant do usuário atual
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN;
  END IF;
  
  -- Executar a função no schema do tenant
  RETURN QUERY EXECUTE format('SELECT * FROM %I.tenant_listar_ordens_servico($1, $2)', v_tenant_schema)
  USING p_limit, p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_ordens_servico(INT, INT) TO authenticated;
