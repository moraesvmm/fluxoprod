-- Criar e editar funcionario liam "RETURNING id" para uma variavel JSONB,
-- o que falha em tempo de execucao ao converter o UUID.

CREATE OR REPLACE FUNCTION public.tenant_criar_funcionario(
  p_nome CHARACTER VARYING,
  p_cargo CHARACTER VARYING,
  p_email CHARACTER VARYING,
  p_telefone CHARACTER VARYING,
  p_salario NUMERIC,
  p_role CHARACTER VARYING,
  p_dia_pagamento INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_funcionario_id UUID;
  v_result JSONB;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_schema IS NULL OR v_tenant_schema = 'public' THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;

  EXECUTE format(
    'INSERT INTO %I.funcionarios (nome, cargo, email, telefone, salario, role, dia_pagamento)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id',
    v_tenant_schema
  )
  USING p_nome, p_cargo, p_email, p_telefone, p_salario,
        COALESCE(p_role, 'funcionario'), p_dia_pagamento
  INTO v_funcionario_id;

  EXECUTE format(
    'SELECT jsonb_build_object(
       ''id'', f.id,
       ''nome'', f.nome,
       ''cargo'', f.cargo,
       ''email'', f.email,
       ''telefone'', f.telefone,
       ''salario'', f.salario,
       ''role'', f.role,
       ''dia_pagamento'', f.dia_pagamento,
       ''criado_em'', f.criado_em
     )
     FROM %I.funcionarios f
     WHERE f.id = $1',
    v_tenant_schema
  )
  USING v_funcionario_id
  INTO v_result;

  RETURN v_result || jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_atualizar_funcionario(
  p_funcionario_id UUID,
  p_nome CHARACTER VARYING,
  p_cargo CHARACTER VARYING,
  p_email CHARACTER VARYING,
  p_telefone CHARACTER VARYING,
  p_salario NUMERIC,
  p_role CHARACTER VARYING,
  p_dia_pagamento INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_funcionario_id UUID;
  v_result JSONB;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_schema IS NULL OR v_tenant_schema = 'public' THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;

  EXECUTE format(
    'UPDATE %I.funcionarios
     SET nome = COALESCE($2, nome),
         cargo = COALESCE($3, cargo),
         email = COALESCE($4, email),
         telefone = COALESCE($5, telefone),
         salario = COALESCE($6, salario),
         role = COALESCE($7, role),
         dia_pagamento = COALESCE($8, dia_pagamento),
         atualizado_em = NOW()
     WHERE id = $1
     RETURNING id',
    v_tenant_schema
  )
  USING p_funcionario_id, p_nome, p_cargo, p_email, p_telefone,
        p_salario, p_role, p_dia_pagamento
  INTO v_funcionario_id;

  IF v_funcionario_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Funcionário não encontrado');
  END IF;

  EXECUTE format(
    'SELECT jsonb_build_object(
       ''id'', f.id,
       ''nome'', f.nome,
       ''cargo'', f.cargo,
       ''email'', f.email,
       ''telefone'', f.telefone,
       ''salario'', f.salario,
       ''role'', f.role,
       ''dia_pagamento'', f.dia_pagamento,
       ''atualizado_em'', f.atualizado_em
     )
     FROM %I.funcionarios f
     WHERE f.id = $1',
    v_tenant_schema
  )
  USING p_funcionario_id
  INTO v_result;

  RETURN v_result || jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_criar_funcionario(CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING, NUMERIC, CHARACTER VARYING, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_atualizar_funcionario(UUID, CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING, NUMERIC, CHARACTER VARYING, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_criar_funcionario(CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING, NUMERIC, CHARACTER VARYING, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_funcionario(UUID, CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING, NUMERIC, CHARACTER VARYING, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
