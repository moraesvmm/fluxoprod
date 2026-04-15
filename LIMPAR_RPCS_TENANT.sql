-- ==========================================
-- LIMPAR E RECRIRAR RPCs TENANT
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Remover todas as RPCs tenant_* conflitantes e recriar
-- Permissão: Use a service_role para executar este SQL

-- 1. Remover todas as funções tenant_* do schema public
DROP FUNCTION IF EXISTS public.tenant_criar_cliente CASCADE;
DROP FUNCTION IF EXISTS public.tenant_criar_produto CASCADE;
DROP FUNCTION IF EXISTS public.tenant_processar_venda CASCADE;
DROP FUNCTION IF EXISTS public.tenant_excluir_cliente CASCADE;
DROP FUNCTION IF EXISTS public.tenant_excluir_produto CASCADE;
DROP FUNCTION IF EXISTS public.tenant_excluir_os CASCADE;
DROP FUNCTION IF EXISTS public.tenant_excluir_obra CASCADE;
DROP FUNCTION IF EXISTS public.tenant_criar_os CASCADE;
DROP FUNCTION IF EXISTS public.tenant_criar_obra CASCADE;

-- 2. Criar RPC para criar cliente
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
  
  -- Executar a inserção no schema do tenant
  EXECUTE format('
    INSERT INTO %I.clientes (nome, email, telefone, funil_fase, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, nome, email, telefone, funil_fase, status, criado_em
  ', v_tenant_schema)
  USING p_nome, p_email, p_telefone, p_funil_fase, p_status
  INTO v_result;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 3. Criar RPC para criar produto
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
  
  -- Executar a inserção no schema do tenant
  EXECUTE format('
    INSERT INTO %I.produtos (nome, descricao, tipo, preco_base, sku, preco_custo, categoria)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, nome, descricao, tipo, preco_base, sku, preco_custo, categoria, criado_em
  ', v_tenant_schema)
  USING p_nome, p_descricao, p_tipo, p_preco_base, p_sku, p_preco_custo, p_categoria
  INTO v_result;
  
  -- Criar registro em estoque automaticamente
  IF v_result IS NOT NULL THEN
    EXECUTE format('
      INSERT INTO %I.estoque (produto_id, sku, quantidade, quantidade_minima)
      VALUES ($1, $2, 0, 10)
      RETURNING id
    ', v_tenant_schema)
    USING (v_result->>'id')::uuid, p_sku;
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 4. Criar RPC para processar venda (transacional)
CREATE OR REPLACE FUNCTION public.tenant_processar_venda(
  p_cliente_id UUID,
  p_cliente_nome VARCHAR(255),
  p_vendedor_id UUID,
  p_vendedor_nome VARCHAR(255),
  p_valor_total NUMERIC(10, 2),
  p_metodo_pagamento VARCHAR(50),
  p_itens JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_venda_id UUID;
  v_result JSONB;
  v_item JSONB;
  v_produto_id UUID;
  v_quantidade INTEGER;
  v_preco_unitario NUMERIC(10, 2);
BEGIN
  -- Obter o schema do tenant do usuário atual
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;
  
  -- Iniciar transação
  BEGIN
    
    -- Criar venda
    EXECUTE format('
      INSERT INTO %I.vendas (cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, metodo_pagamento, status)
      VALUES ($1, $2, $3, $4, $5, $6, ''concluido'')
      RETURNING id
    ', v_tenant_schema)
    USING p_cliente_id, p_cliente_nome, p_vendedor_id, p_vendedor_nome, p_valor_total, p_metodo_pagamento
    INTO v_venda_id;
    
    -- Inserir itens da venda
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
      v_produto_id := (v_item->>'produto_id')::uuid;
      v_quantidade := (v_item->>'quantidade')::integer;
      v_preco_unitario := (v_item->>'preco_unitario')::numeric;
      
      EXECUTE format('
        INSERT INTO %I.vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
        VALUES ($1, $2, $3, $4)
      ', v_tenant_schema)
      USING v_venda_id, v_produto_id, v_quantidade, v_preco_unitario;
    END LOOP;
    
    -- Retornar resultado
    v_result := jsonb_build_object(
      'success', true,
      'venda_id', v_venda_id,
      'valor_total', p_valor_total,
      'metodo_pagamento', p_metodo_pagamento
    );
    
  EXCEPTION WHEN OTHERS THEN
    RAISE;
    RETURN jsonb_build_object('error', SQLERRM);
  END;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 5. Criar RPC para excluir cliente
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
  
  -- Executar a exclusão no schema do tenant
  EXECUTE format('DELETE FROM %I.clientes WHERE id = $1', v_tenant_schema)
  USING p_cliente_id;
  
  RETURN jsonb_build_object('success', true, 'cliente_id', p_cliente_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 6. Criar RPC para excluir produto
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
  
  -- Executar a exclusão no schema do tenant
  EXECUTE format('DELETE FROM %I.produtos WHERE id = $1', v_tenant_schema)
  USING p_produto_id;
  
  -- Excluir também do estoque
  EXECUTE format('DELETE FROM %I.estoque WHERE produto_id = $1', v_tenant_schema)
  USING p_produto_id;
  
  RETURN jsonb_build_object('success', true, 'produto_id', p_produto_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 7. Criar RPC para excluir OS
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
  
  -- Executar a exclusão no schema do tenant
  EXECUTE format('DELETE FROM %I.ordens_servico WHERE id = $1', v_tenant_schema)
  USING p_os_id;
  
  RETURN jsonb_build_object('success', true, 'os_id', p_os_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 8. Criar RPC para excluir obra
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
  
  -- Executar a exclusão no schema do tenant
  EXECUTE format('DELETE FROM %I.obras WHERE id = $1', v_tenant_schema)
  USING p_obra_id;
  
  RETURN jsonb_build_object('success', true, 'obra_id', p_obra_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 9. Grant permissões para authenticated users
GRANT EXECUTE ON FUNCTION public.tenant_criar_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_criar_produto TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_processar_venda TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_produto TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_os TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_obra TO authenticated;

-- 10. Verificar se as RPCs foram criadas
SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_%'
ORDER BY routine_name;
