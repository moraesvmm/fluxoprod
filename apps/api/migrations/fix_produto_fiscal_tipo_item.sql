-- apps/api/migrations/fix_produto_fiscal_tipo_item.sql
-- Ate agora nao existia NENHUM caminho no app para gravar tipo_item/unidade_medida:
-- nem tenant_criar_produto, nem tenant_atualizar_produto, nem tenant_atualizar_produto_fiscal
-- aceitavam esses campos. Por isso a Ficha Tecnica nunca encontrava materia-prima
-- (o campo sempre ficava no valor padrao 'produto_acabado'). Estende o endpoint fiscal
-- (ja usado pelo Catalogo) para tambem gravar e listar tipo_item/unidade_medida.

CREATE OR REPLACE FUNCTION public.tenant_listar_produtos_fiscal()
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
       jsonb_agg(
         jsonb_build_object(
           ''id'', p.id,
           ''nome'', p.nome,
           ''ncm'', p.ncm,
           ''cfop_padrao'', p.cfop_padrao,
           ''origem'', p.origem,
           ''tipo_item'', p.tipo_item,
           ''unidade_medida'', p.unidade_medida
         ) ORDER BY p.nome ASC
       ),
       ''[]''::jsonb
     )
     FROM %I.produtos p%s',
    v_tenant_schema,
    CASE WHEN v_has_deleted_at THEN ' WHERE p.deleted_at IS NULL' ELSE '' END
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_atualizar_produto_fiscal(
  p_produto_id UUID,
  p_ncm TEXT,
  p_cfop_padrao TEXT,
  p_origem INTEGER,
  p_tipo_item TEXT DEFAULT NULL,
  p_unidade_medida TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_produto_id UUID;
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
    'UPDATE %I.produtos
     SET ncm = $2,
         cfop_padrao = $3,
         origem = $4,
         tipo_item = COALESCE(NULLIF(trim($5), ''''), tipo_item),
         unidade_medida = COALESCE(NULLIF(trim($6), ''''), unidade_medida),
         atualizado_em = NOW()
     WHERE id = $1
     RETURNING id',
    v_tenant_schema
  )
  USING p_produto_id, NULLIF(trim(p_ncm), ''),
        NULLIF(trim(p_cfop_padrao), ''), COALESCE(p_origem, 0),
        p_tipo_item, p_unidade_medida
  INTO v_produto_id;

  IF v_produto_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Produto não encontrado');
  END IF;

  RETURN jsonb_build_object('success', true, 'produto_id', v_produto_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_produtos_fiscal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_produto_fiscal(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
