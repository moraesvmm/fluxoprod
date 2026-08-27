-- Corrige o contrato da listagem do catalogo com os campos de produto e estoque.

CREATE OR REPLACE FUNCTION public.provisionar_hook_catalogo_produtos(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.validar_schema_tenant_provisionamento(p_schema);

  IF to_regclass(format('%I.produtos', p_schema)) IS NULL THEN
    RAISE EXCEPTION 'Tabela %.produtos inexistente', p_schema;
  END IF;

  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS nf_entrada VARCHAR(60)', p_schema);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8)', p_schema);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS cfop_padrao VARCHAR(4)', p_schema);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS origem INTEGER DEFAULT 0', p_schema);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', p_schema);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT ''[]''::JSONB', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_catalogo_produtos(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('catalogo_produtos', 10, 'public.provisionar_hook_catalogo_produtos(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem,
    hook_function = EXCLUDED.hook_function,
    ativo = TRUE;

DO $$
DECLARE
  v_schema TEXT;
BEGIN
  FOR v_schema IN
    SELECT e.schema_name
    FROM public.empresas e
    WHERE e.schema_name LIKE 'tenant_%'
      AND to_regnamespace(e.schema_name) IS NOT NULL
    ORDER BY e.schema_name
  LOOP
    PERFORM public.provisionar_hook_catalogo_produtos(v_schema);
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.tenant_listar_produtos(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.tenant_listar_produtos(
  p_limit INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
  v_has_deleted_at BOOLEAN;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_schema IS NULL OR v_tenant_schema = 'public' THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = v_tenant_schema
      AND table_name = 'produtos'
      AND column_name = 'deleted_at'
  ) INTO v_has_deleted_at;

  EXECUTE format(
    'SELECT COALESCE(
       jsonb_agg(row_data ORDER BY row_data->>''nome''),
       ''[]''::jsonb
     )
     FROM (
       SELECT jsonb_build_object(
         ''id'', p.id,
         ''nome'', p.nome,
         ''descricao'', p.descricao,
         ''tipo'', p.tipo,
         ''preco_base'', p.preco_base,
         ''preco_venda'', p.preco_base,
         ''preco_custo'', p.custo_unitario,
         ''custo_unitario'', p.custo_unitario,
         ''categoria'', p.categoria,
         ''sku'', e.sku,
         ''estoque_atual'', COALESCE(e.quantidade, 0),
         ''estoque_minimo'', COALESCE(e.quantidade_minima, 0),
         ''nf_entrada'', p.nf_entrada,
         ''criado_em'', p.criado_em,
         ''atualizado_em'', p.atualizado_em,
         ''status'', ''ativo''
       ) AS row_data
       FROM %I.produtos p
       LEFT JOIN %I.estoque e ON e.produto_id = p.id%s
       ORDER BY p.nome ASC
       LIMIT $1 OFFSET $2
     ) produtos',
    v_tenant_schema,
    v_tenant_schema,
    CASE WHEN v_has_deleted_at THEN ' WHERE p.deleted_at IS NULL' ELSE '' END
  )
  INTO v_result
  USING GREATEST(COALESCE(p_limit, 1000), 0), GREATEST(COALESCE(p_offset, 0), 0);

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_listar_produtos(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_listar_produtos(INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';