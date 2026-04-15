-- ==========================================
-- CRIAR RPCs PARA FINANCEIRO
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar RPCs de criação e exclusão para financeiro
-- Permissão: Use a service_role para executar este SQL

-- 1. RPC para criar registro financeiro
CREATE OR REPLACE FUNCTION public.tenant_criar_financeiro(
  p_tipo VARCHAR(20),
  p_descricao TEXT,
  p_valor NUMERIC(10, 2),
  p_data_vencimento DATE,
  p_status VARCHAR(50),
  p_categoria VARCHAR(100)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  -- Obter o schema do tenant do usuário atual
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;
  
  -- Executar a inserção no schema do tenant
  EXECUTE format('
    INSERT INTO %I.financeiro (tipo, descricao, valor, data_vencimento, status, categoria)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, tipo, descricao, valor, data_vencimento, status, categoria, criado_em
  ', v_tenant_schema)
  USING p_tipo, p_descricao, p_valor, p_data_vencimento, p_status, p_categoria
  INTO v_result;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 2. RPC para excluir registro financeiro
CREATE OR REPLACE FUNCTION public.tenant_excluir_financeiro(p_financeiro_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  -- Obter o schema do tenant do usuário atual
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;
  
  -- Executar a exclusão no schema do tenant
  EXECUTE format('DELETE FROM %I.financeiro WHERE id = $1', v_tenant_schema)
  USING p_financeiro_id;
  
  RETURN jsonb_build_object('success', true, 'financeiro_id', p_financeiro_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant permissões para authenticated users
GRANT EXECUTE ON FUNCTION public.tenant_criar_financeiro TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_financeiro TO authenticated;

-- Verificar se as RPCs foram criadas
SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_%financeiro%'
ORDER BY routine_name;
