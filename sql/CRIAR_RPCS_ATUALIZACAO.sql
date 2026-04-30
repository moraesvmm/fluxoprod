-- ==========================================
-- CRIAR RPCs DE ATUALIZAÇÃO (tenant_atualizar_*)
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar RPCs para atualização de registros
-- Permissão: Use a service_role para executar este SQL

-- 1. RPC para atualizar cliente
DROP FUNCTION IF EXISTS public.tenant_atualizar_cliente(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) CASCADE;
CREATE OR REPLACE FUNCTION public.tenant_atualizar_cliente(
  p_cliente_id UUID,
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
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %I.clientes
    SET nome = $2, email = $3, telefone = $4, funil_fase = $5, status = $6, atualizado_em = NOW()
    WHERE id = $1
    RETURNING id, nome, email, telefone, funil_fase, status, atualizado_em
  ', v_tenant_schema)
  USING p_cliente_id, p_nome, p_email, p_telefone, p_funil_fase, p_status
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Cliente não encontrado');
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 2. RPC para atualizar produto
DROP FUNCTION IF EXISTS public.tenant_atualizar_produto(UUID, VARCHAR, TEXT, VARCHAR, NUMERIC, VARCHAR, NUMERIC, VARCHAR) CASCADE;
CREATE OR REPLACE FUNCTION public.tenant_atualizar_produto(
  p_produto_id UUID,
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
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %I.produtos
    SET nome = $2, descricao = $3, tipo = $4, preco_base = $5, sku = $6, preco_custo = $7, categoria = $8, atualizado_em = NOW()
    WHERE id = $1
    RETURNING id, nome, descricao, tipo, preco_base, sku, preco_custo, categoria, atualizado_em
  ', v_tenant_schema)
  USING p_produto_id, p_nome, p_descricao, p_tipo, p_preco_base, p_sku, p_preco_custo, p_categoria
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Produto não encontrado');
  END IF;
  
  -- Atualizar SKU no estoque também
  IF p_sku IS NOT NULL THEN
    EXECUTE format('UPDATE %I.estoque SET sku = $2 WHERE produto_id = $1', v_tenant_schema)
    USING p_produto_id, p_sku;
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 3. RPC para atualizar estoque
DROP FUNCTION IF EXISTS public.tenant_atualizar_estoque(UUID, VARCHAR, INTEGER, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION public.tenant_atualizar_estoque(
  p_estoque_id UUID,
  p_sku VARCHAR(100),
  p_quantidade INTEGER,
  p_quantidade_minima INTEGER
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
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %I.estoque
    SET sku = $2, quantidade = $3, quantidade_minima = $4, atualizado_em = NOW()
    WHERE id = $1
    RETURNING id, produto_id, sku, quantidade, quantidade_minima, atualizado_em
  ', v_tenant_schema)
  USING p_estoque_id, p_sku, p_quantidade, p_quantidade_minima
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Estoque não encontrado');
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 4. RPC para atualizar funcionário
DROP FUNCTION IF EXISTS public.tenant_atualizar_funcionario(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, VARCHAR) CASCADE;
CREATE OR REPLACE FUNCTION public.tenant_atualizar_funcionario(
  p_funcionario_id UUID,
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
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %I.funcionarios
    SET nome = $2, cargo = $3, email = $4, telefone = $5, salario = $6, role = $7, atualizado_em = NOW()
    WHERE id = $1
    RETURNING id, nome, cargo, email, telefone, salario, role, atualizado_em
  ', v_tenant_schema)
  USING p_funcionario_id, p_nome, p_cargo, p_email, p_telefone, p_salario, p_role
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Funcionário não encontrado');
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 5. RPC para atualizar OS
DROP FUNCTION IF EXISTS public.tenant_atualizar_os(UUID, UUID, UUID, VARCHAR, TEXT, VARCHAR, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION public.tenant_atualizar_os(
  p_os_id UUID,
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
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %I.ordens_servico
    SET 
      cliente_id = COALESCE($2, cliente_id), 
      colaborador_id = COALESCE($3, colaborador_id), 
      veiculo_equipamento = COALESCE($4, veiculo_equipamento), 
      descricao_problema = COALESCE($5, descricao_problema), 
      status = COALESCE($6, status), 
      valor_orcamento = COALESCE($7, valor_orcamento), 
      atualizado_em = NOW()
    WHERE id = $1
    RETURNING id, cliente_id, colaborador_id, veiculo_equipamento, descricao_problema, status, valor_orcamento, atualizado_em
  ', v_tenant_schema)
  USING p_os_id, p_cliente_id, p_colaborador_id, p_veiculo_equipamento, p_descricao_problema, p_status, p_valor_orcamento
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'OS não encontrada');
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 6. RPC para atualizar obra
CREATE OR REPLACE FUNCTION public.tenant_atualizar_obra(
  p_obra_id UUID,
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
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %I.obras
    SET cliente_id = $2, nome = $3, descricao = $4, endereco = $5, data_inicio = $6, data_fim_prevista = $7, status = $8, orcamento_total = $9, atualizado_em = NOW()
    WHERE id = $1
    RETURNING id, cliente_id, nome, descricao, endereco, data_inicio, data_fim_prevista, status, orcamento_total, atualizado_em
  ', v_tenant_schema)
  USING p_obra_id, p_cliente_id, p_nome, p_descricao, p_endereco, p_data_inicio, p_data_fim_prevista, p_status, p_orcamento_total
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Obra não encontrada');
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 7. RPC para atualizar financeiro
CREATE OR REPLACE FUNCTION public.tenant_atualizar_financeiro(
  p_financeiro_id UUID,
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
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %I.financeiro
    SET tipo = $2, descricao = $3, valor = $4, data_vencimento = $5, status = $6, categoria = $7, atualizado_em = NOW()
    WHERE id = $1
    RETURNING id, tipo, descricao, valor, data_vencimento, status, categoria, atualizado_em
  ', v_tenant_schema)
  USING p_financeiro_id, p_tipo, p_descricao, p_valor, p_data_vencimento, p_status, p_categoria
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Registro financeiro não encontrado');
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 8. RPC para atualizar comissão
CREATE OR REPLACE FUNCTION public.tenant_atualizar_comissao(
  p_comissao_id UUID,
  p_status_pagamento VARCHAR(50),
  p_data_pagamento DATE
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
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %I.comissoes
    SET status_pagamento = $2, data_pagamento = $3
    WHERE id = $1
    RETURNING id, colaborador_id, venda_id, valor_comissao, valor_venda, periodo_referencia, status_pagamento, data_pagamento
  ', v_tenant_schema)
  USING p_comissao_id, p_status_pagamento, p_data_pagamento
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Comissão não encontrada');
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant permissões para authenticated users
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_produto TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_estoque TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_funcionario TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_os TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_obra TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_financeiro TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_comissao TO authenticated;

-- Verificar se as RPCs de atualização foram criadas
SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_atualizar_%'
ORDER BY routine_name;
