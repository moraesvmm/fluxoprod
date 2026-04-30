-- ==========================================
-- GESTAO DE PAGAMENTOS RH
-- ==========================================

-- 1. Adicionar colunas necessarias em todos os schemas tenant
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS ultimo_mes_pago VARCHAR(7);', r.schema_name);
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS dia_pagamento INTEGER;', r.schema_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao alterar tabela funcionarios no schema %: %', r.schema_name, SQLERRM;
        END;
    END LOOP;
END
$$;

-- 2. Limpar funcoes antigas para evitar ambiguidade (overloading)
DROP FUNCTION IF EXISTS public.tenant_criar_funcionario(VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, VARCHAR);
DROP FUNCTION IF EXISTS public.tenant_atualizar_funcionario(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, VARCHAR);

-- 3. Funcao para buscar uma configuracao especifica do tenant
CREATE OR REPLACE FUNCTION public.tenant_buscar_configuracao(p_chave TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant nao encontrado');
  END IF;

  EXECUTE format('SELECT jsonb_build_object(''valor'', valor, ''descricao'', descricao) FROM %I.configuracoes WHERE chave = $1', v_tenant_schema)
  USING p_chave
  INTO v_result;

  RETURN v_result;
END;
$$;

-- 4. Funcao para salvar uma configuracao do tenant
CREATE OR REPLACE FUNCTION public.tenant_salvar_configuracao(
  p_chave TEXT,
  p_valor TEXT,
  p_descricao TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_schema TEXT;
BEGIN
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant nao encontrado');
  END IF;

  EXECUTE format('
    INSERT INTO %I.configuracoes (chave, valor, descricao)
    VALUES ($1, $2, $3)
    ON CONFLICT (chave) DO UPDATE SET
      valor = EXCLUDED.valor,
      descricao = COALESCE(EXCLUDED.descricao, configuracoes.descricao),
      atualizado_em = NOW()
  ', v_tenant_schema)
  USING p_chave, p_valor, p_descricao;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Funcao para registrar o pagamento de UM funcionario
CREATE OR REPLACE FUNCTION public.tenant_registrar_pagamento_rh(
  p_funcionario_id UUID,
  p_mes VARCHAR(7)
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
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant nao encontrado');
  END IF;

  EXECUTE format('UPDATE %I.funcionarios SET ultimo_mes_pago = $1, atualizado_em = NOW() WHERE id = $2 RETURNING id', v_tenant_schema)
  USING p_mes, p_funcionario_id
  INTO v_result;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Funcionario nao encontrado');
  END IF;

  RETURN jsonb_build_object('success', true, 'funcionario_id', v_result->>'id');
END;
$$;

-- 6. Funcao para registrar o pagamento de TODOS os funcionarios pendentes
CREATE OR REPLACE FUNCTION public.tenant_registrar_pagamento_rh_todos(
  p_mes VARCHAR(7)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_count INTEGER;
BEGIN
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant nao encontrado');
  END IF;

  EXECUTE format('
    UPDATE %I.funcionarios 
    SET ultimo_mes_pago = $1, atualizado_em = NOW() 
    WHERE (ultimo_mes_pago IS NULL OR ultimo_mes_pago != $1)
  ', v_tenant_schema)
  USING p_mes;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'total_atualizado', v_count);
END;
$$;

-- 7. Atualizar RPC de criacao para incluir dia_pagamento
CREATE OR REPLACE FUNCTION public.tenant_criar_funcionario(
  p_nome VARCHAR(255),
  p_cargo VARCHAR(100),
  p_email VARCHAR(255),
  p_telefone VARCHAR(50),
  p_salario NUMERIC(10, 2),
  p_role VARCHAR(50),
  p_dia_pagamento INTEGER DEFAULT NULL
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
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant nao encontrado');
  END IF;
  
  EXECUTE format('INSERT INTO %I.funcionarios (nome, cargo, email, telefone, salario, role, dia_pagamento) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', v_tenant_schema)
  USING p_nome, p_cargo, p_email, p_telefone, p_salario, p_role, p_dia_pagamento
  INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 8. Atualizar RPC de atualizacao para incluir dia_pagamento
CREATE OR REPLACE FUNCTION public.tenant_atualizar_funcionario(
  p_funcionario_id UUID,
  p_nome VARCHAR(255),
  p_cargo VARCHAR(100),
  p_email VARCHAR(255),
  p_telefone VARCHAR(50),
  p_salario NUMERIC(10, 2),
  p_role VARCHAR(50),
  p_dia_pagamento INTEGER DEFAULT NULL
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
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant nao encontrado');
  END IF;
  
  EXECUTE format('UPDATE %I.funcionarios SET nome = $2, cargo = $3, email = $4, telefone = $5, salario = $6, role = $7, dia_pagamento = $8, atualizado_em = NOW() WHERE id = $1 RETURNING id', v_tenant_schema)
  USING p_funcionario_id, p_nome, p_cargo, p_email, p_telefone, p_salario, p_role, p_dia_pagamento
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Funcionario nao encontrado');
  END IF;
  
  RETURN v_result;
END;
$$;

-- Grant permissoes (Especificando argumentos para evitar ambiguidade)
GRANT EXECUTE ON FUNCTION public.tenant_registrar_pagamento_rh(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_registrar_pagamento_rh_todos(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_buscar_configuracao(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_salvar_configuracao(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_criar_funcionario(VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_funcionario(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, VARCHAR, INTEGER) TO authenticated;
