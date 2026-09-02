-- apps/api/migrations/fix_tenant_listar_produtos_tipo_item.sql
-- Bug: tenant_listar_produtos nunca retornava tipo_item (nem ncm/cfop_padrao/origem/
-- unidade_medida), embora a coluna exista em produtos e o tipo Produto no frontend
-- já as declare. A tela de Fichas Técnicas filtra materia-prima por p.tipo_item,
-- que chegava sempre undefined -> dropdown de matérias-primas ficava sempre vazio.

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
         ''tipo_item'', p.tipo_item,
         ''unidade_medida'', p.unidade_medida,
         ''ncm'', p.ncm,
         ''cfop_padrao'', p.cfop_padrao,
         ''origem'', p.origem,
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

NOTIFY pgrst, 'reload schema';
