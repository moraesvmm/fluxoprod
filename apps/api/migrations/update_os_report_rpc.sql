-- ==========================================
-- ATUALIZACAO DA RPC DE LISTAGEM PARA RELATORIOS (OS)
-- ==========================================

-- 1. Remover assinatura antiga para evitar conflitos de retorno (RETURNS TABLE)
DROP FUNCTION IF EXISTS public.tenant_listar_ordens_servico(INTEGER, INTEGER);

-- 2. Criar nova versão com campos de assistência técnica
CREATE OR REPLACE FUNCTION public.tenant_listar_ordens_servico(
  p_limit INTEGER DEFAULT 100, 
  p_offset INTEGER DEFAULT 0
) 
RETURNS TABLE (
  id UUID,
  cliente_id UUID,
  descricao TEXT,
  status VARCHAR,
  prioridade VARCHAR,
  data_criacao TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  valor_orcado NUMERIC,
  equipamento_serial TEXT,
  laudo_tecnico TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$ 
DECLARE 
  v_schema_name TEXT; 
BEGIN 
  -- Obter o schema do tenant do usuário atual
  SELECT schema_name INTO v_schema_name 
  FROM public.user_profiles up 
  JOIN public.empresas e ON e.id = up.empresa_id 
  WHERE up.user_id = auth.uid(); 
  
  IF v_schema_name IS NULL OR v_schema_name = 'public' THEN 
    RETURN; 
  END IF; 
  
  RETURN QUERY EXECUTE format(' 
    SELECT 
      id, 
      cliente_id, 
      descricao_problema as descricao, 
      status, 
      ''normal''::VARCHAR as prioridade, 
      criado_em as data_criacao, 
      null::TIMESTAMPTZ as data_conclusao, 
      valor_orcamento as valor_orcado,
      equipamento_serial,
      laudo_tecnico
    FROM %I.ordens_servico 
    ORDER BY criado_em DESC 
    LIMIT %L OFFSET %L 
  ', v_schema_name, p_limit, p_offset); 
END; 
$$;

-- 3. Restaurar permissões
GRANT EXECUTE ON FUNCTION public.tenant_listar_ordens_servico(INTEGER, INTEGER) TO authenticated, anon;
