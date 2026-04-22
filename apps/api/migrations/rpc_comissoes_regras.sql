-- Migration: RPCs públicas e tenant para regras de comissão e pagamento de comissão

DO $$
DECLARE
  tenant_schema RECORD;
BEGIN
  FOR tenant_schema IN
    SELECT schema_name
    FROM public.empresas
    WHERE schema_name IS NOT NULL
      AND schema_name <> 'public'
  LOOP
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_regras_comissao(
        p_limit INT DEFAULT 1000,
        p_offset INT DEFAULT 0
      )
      RETURNS TABLE (
        id UUID,
        colaborador_id UUID,
        tipo_calculo VARCHAR(20),
        valor NUMERIC(10, 2),
        ativo BOOLEAN,
        criado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY
        SELECT
          id,
          colaborador_id,
          tipo_calculo,
          valor,
          ativo,
          criado_em
        FROM regras_comissao
        ORDER BY criado_em DESC
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', tenant_schema.schema_name, tenant_schema.schema_name);

    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_criar_regra_comissao(
        p_colaborador_id UUID,
        p_tipo_calculo VARCHAR(20),
        p_valor NUMERIC(10, 2),
        p_ativo BOOLEAN DEFAULT TRUE
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_regra_id UUID;
      BEGIN
        INSERT INTO regras_comissao (
          colaborador_id,
          tipo_calculo,
          valor,
          ativo
        ) VALUES (
          p_colaborador_id,
          p_tipo_calculo,
          p_valor,
          COALESCE(p_ativo, TRUE)
        )
        RETURNING id INTO v_regra_id;

        RETURN jsonb_build_object(''success'', TRUE, ''regra_id'', v_regra_id);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''error'', SQLERRM);
      END;
      $func$;
    ', tenant_schema.schema_name, tenant_schema.schema_name);

    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_excluir_regra_comissao(
        p_regra_id UUID
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        DELETE FROM regras_comissao WHERE id = p_regra_id;
        RETURN jsonb_build_object(''success'', TRUE);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''error'', SQLERRM);
      END;
      $func$;
    ', tenant_schema.schema_name, tenant_schema.schema_name);

    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_atualizar_comissao(
        p_comissao_id UUID,
        p_status_pagamento VARCHAR(50),
        p_data_pagamento DATE DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        UPDATE comissoes
        SET
          status_pagamento = COALESCE(p_status_pagamento, status_pagamento),
          data_pagamento = COALESCE(p_data_pagamento, data_pagamento)
        WHERE id = p_comissao_id;

        RETURN jsonb_build_object(''success'', TRUE, ''comissao_id'', p_comissao_id);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''error'', SQLERRM);
      END;
      $func$;
    ', tenant_schema.schema_name, tenant_schema.schema_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_listar_regras_comissao(
  p_limit INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  colaborador_id UUID,
  tipo_calculo VARCHAR(20),
  valor NUMERIC(10, 2),
  ativo BOOLEAN,
  criado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_schema IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT * FROM %I.tenant_listar_regras_comissao($1, $2)',
    v_tenant_schema
  )
  USING p_limit, p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_criar_regra_comissao(
  p_colaborador_id UUID,
  p_tipo_calculo VARCHAR(20),
  p_valor NUMERIC(10, 2),
  p_ativo BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  EXECUTE format(
    'SELECT %I.tenant_criar_regra_comissao($1, $2, $3, $4)',
    v_tenant_schema
  )
  INTO v_result
  USING p_colaborador_id, p_tipo_calculo, p_valor, p_ativo;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_excluir_regra_comissao(
  p_regra_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  EXECUTE format(
    'SELECT %I.tenant_excluir_regra_comissao($1)',
    v_tenant_schema
  )
  INTO v_result
  USING p_regra_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_atualizar_comissao(
  p_comissao_id UUID,
  p_status_pagamento VARCHAR(50),
  p_data_pagamento DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  EXECUTE format(
    'SELECT %I.tenant_atualizar_comissao($1, $2, $3)',
    v_tenant_schema
  )
  INTO v_result
  USING p_comissao_id, p_status_pagamento, p_data_pagamento;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_regras_comissao TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_criar_regra_comissao TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_regra_comissao TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_comissao TO authenticated;
