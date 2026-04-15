-- ==========================================
-- CRIAR RPCs PARA FUNCIONARIOS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar RPCs de criação e exclusão para funcionários
-- Permissão: Use a service_role para executar este SQL

-- 1. RPC para criar funcionário
CREATE OR REPLACE FUNCTION public.tenant_criar_funcionario(
  p_nome VARCHAR(255),
  p_cargo VARCHAR(100),
  p_email VARCHAR(255),
  p_telefone VARCHAR(50),
  p_salario NUMERIC(10, 2),
  p_role VARCHAR(50)
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
    INSERT INTO %I.funcionarios (nome, cargo, email, telefone, salario, role)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, nome, cargo, email, telefone, salario, role, criado_em
  ', v_tenant_schema)
  USING p_nome, p_cargo, p_email, p_telefone, p_salario, p_role
  INTO v_result;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 2. RPC para excluir funcionário
CREATE OR REPLACE FUNCTION public.tenant_excluir_funcionario(p_funcionario_id UUID)
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
  EXECUTE format('DELETE FROM %I.funcionarios WHERE id = $1', v_tenant_schema)
  USING p_funcionario_id;
  
  RETURN jsonb_build_object('success', true, 'funcionario_id', p_funcionario_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant permissões para authenticated users
GRANT EXECUTE ON FUNCTION public.tenant_criar_funcionario TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_funcionario TO authenticated;

-- Verificar se as RPCs foram criadas
SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_%funcionario%'
ORDER BY routine_name;
