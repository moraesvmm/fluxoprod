DROP FUNCTION IF EXISTS public.tenant_listar_vendas(integer, integer);

CREATE OR REPLACE FUNCTION public.tenant_listar_vendas(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_name TEXT;
  v_result JSONB;
BEGIN
  v_schema_name := (
      SELECT e.schema_name
      FROM public.user_profiles up
      JOIN public.empresas e ON e.id = up.empresa_id
      WHERE up.user_id = auth.uid()
      LIMIT 1
  );

  IF v_schema_name IS NULL OR v_schema_name = 'public' THEN
    RETURN '[]'::JSONB;
  END IF;

  EXECUTE format('
    SELECT jsonb_agg(
      jsonb_build_object(
        ''id'', v.id,
        ''cliente'', COALESCE(v.cliente_nome, c.nome, ''Cliente Avulso''),
        ''valor'', v.valor_total,
        ''metodo'', v.metodo_pagamento,
        ''status'', v.status,
        ''vendedor_id'', v.vendedor_id,
        ''vendedor_nome'', v.vendedor_nome,
        ''criado_em'', v.criado_em
      )
    )
    FROM (
        SELECT * FROM %I.vendas
        WHERE deleted_at IS NULL
        ORDER BY criado_em DESC
        LIMIT $1 OFFSET $2
    ) v
    LEFT JOIN %I.clientes c ON v.cliente_id = c.id
  ', v_schema_name, v_schema_name)
  INTO v_result
  USING p_limit, p_offset;

  RETURN COALESCE(v_result, '[]'::JSONB);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_vendas TO authenticated;
