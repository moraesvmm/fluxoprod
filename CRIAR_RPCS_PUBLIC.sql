-- ==========================================
-- CRIAR RPCs DE CRIAÇÃO/EXCLUSÃO NO SCHEMA PUBLIC
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar RPCs de criação/exclusão no schema public que chamam RPCs no schema tenant
-- Permissão: Use a service_role para executar este SQL

-- Criar RPC tenant_criar_produto no schema public
CREATE OR REPLACE FUNCTION public.tenant_criar_produto(
  p_nome VARCHAR(255),
  p_descricao TEXT,
  p_tipo VARCHAR(50),
  p_preco_base NUMERIC(10, 2),
  p_sku VARCHAR(100),
  p_preco_custo NUMERIC(10, 2),
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
  
  -- Executar a RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_criar_produto($1, $2, $3, $4, $5, $6, $7)', v_tenant_schema)
  INTO v_result
  USING p_nome, p_descricao, p_tipo, p_preco_base, p_sku, p_preco_custo, p_categoria;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Criar RPC tenant_excluir_produto no schema public
CREATE OR REPLACE FUNCTION public.tenant_excluir_produto(p_produto_id UUID)
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
  
  -- Executar a RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_excluir_produto($1)', v_tenant_schema)
  INTO v_result
  USING p_produto_id;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Criar RPC tenant_criar_cliente no schema public
CREATE OR REPLACE FUNCTION public.tenant_criar_cliente(
  p_nome VARCHAR(255),
  p_email VARCHAR(255),
  p_telefone VARCHAR(50),
  p_funil_fase VARCHAR(50),
  p_status VARCHAR(50)
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
  
  -- Executar a RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_criar_cliente($1, $2, $3, $4, $5)', v_tenant_schema)
  INTO v_result
  USING p_nome, p_email, p_telefone, p_funil_fase, p_status;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Criar RPC tenant_excluir_cliente no schema public
CREATE OR REPLACE FUNCTION public.tenant_excluir_cliente(p_cliente_id UUID)
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
  
  -- Executar a RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_excluir_cliente($1)', v_tenant_schema)
  INTO v_result
  USING p_cliente_id;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Criar RPC tenant_criar_os no schema public
CREATE OR REPLACE FUNCTION public.tenant_criar_os(
  p_cliente_id UUID,
  p_colaborador_id UUID,
  p_veiculo_equipamento VARCHAR(255),
  p_descricao_problema TEXT,
  p_status VARCHAR(50),
  p_valor_orcamento NUMERIC(10, 2)
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
  
  -- Executar a RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_criar_os($1, $2, $3, $4, $5, $6)', v_tenant_schema)
  INTO v_result
  USING p_cliente_id, p_colaborador_id, p_veiculo_equipamento, p_descricao_problema, p_status, p_valor_orcamento;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Criar RPC tenant_excluir_os no schema public
CREATE OR REPLACE FUNCTION public.tenant_excluir_os(p_os_id UUID)
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
  
  -- Executar a RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_excluir_os($1)', v_tenant_schema)
  INTO v_result
  USING p_os_id;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Criar RPC tenant_criar_obra no schema public
CREATE OR REPLACE FUNCTION public.tenant_criar_obra(
  p_cliente_id UUID,
  p_nome VARCHAR(255),
  p_descricao TEXT,
  p_endereco TEXT,
  p_data_inicio DATE,
  p_data_fim_prevista DATE,
  p_status VARCHAR(50),
  p_orcamento_total NUMERIC(10, 2)
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
  
  -- Executar a RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_criar_obra($1, $2, $3, $4, $5, $6, $7, $8)', v_tenant_schema)
  INTO v_result
  USING p_cliente_id, p_nome, p_descricao, p_endereco, p_data_inicio, p_data_fim_prevista, p_status, p_orcamento_total;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Criar RPC tenant_excluir_obra no schema public
CREATE OR REPLACE FUNCTION public.tenant_excluir_obra(p_obra_id UUID)
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
  
  -- Executar a RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_excluir_obra($1)', v_tenant_schema)
  INTO v_result
  USING p_obra_id;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant permissões para authenticated users
GRANT EXECUTE ON FUNCTION public.tenant_criar_produto TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_produto TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_criar_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_criar_os TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_os TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_criar_obra TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_obra TO authenticated;
