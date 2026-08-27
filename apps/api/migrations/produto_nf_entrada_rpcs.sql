-- RPCs de produtos com NF de entrada.
-- Mantem as assinaturas antigas e adiciona versoes com p_nf_entrada.

DO $$
DECLARE
  v_tenant RECORD;
BEGIN
  FOR v_tenant IN
    SELECT e.schema_name
    FROM public.empresas e
    WHERE e.schema_name LIKE 'tenant_%'
      AND EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = e.schema_name
          AND t.table_name = 'produtos'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS nf_entrada VARCHAR(60)', v_tenant.schema_name);
    EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8)', v_tenant.schema_name);
    EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS cfop_padrao VARCHAR(4)', v_tenant.schema_name);
    EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS origem INTEGER DEFAULT 0', v_tenant.schema_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_criar_produto(
  p_nome VARCHAR(255),
  p_descricao TEXT DEFAULT NULL,
  p_tipo VARCHAR(50) DEFAULT 'produto',
  p_preco_base NUMERIC(10, 2) DEFAULT 0,
  p_sku VARCHAR(100) DEFAULT NULL,
  p_preco_custo NUMERIC(10, 2) DEFAULT 0,
  p_categoria VARCHAR(100) DEFAULT 'geral',
  p_estoque_atual INTEGER DEFAULT 0,
  p_estoque_minimo INTEGER DEFAULT 10,
  p_nf_entrada VARCHAR(60) DEFAULT NULL,
  p_image_urls JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_produto JSONB;
  v_produto_id UUID;
  v_estoque_id UUID;
  v_entrada_id UUID;
  v_entrada_item_id UUID;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;

  EXECUTE format(
    'INSERT INTO %I.produtos (
       nome, descricao, tipo, preco_base, custo_unitario, categoria, nf_entrada
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id',
    v_tenant_schema
  )
  USING p_nome, p_descricao, COALESCE(p_tipo, 'produto'),
        COALESCE(p_preco_base, 0), COALESCE(p_preco_custo, 0),
        COALESCE(p_categoria, 'geral'), NULLIF(trim(COALESCE(p_nf_entrada, '')), '')
  INTO v_produto_id;

  IF p_image_urls IS NOT NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = v_tenant_schema
      AND table_name = 'produtos'
      AND column_name = 'image_urls'
  ) THEN
    EXECUTE format('UPDATE %I.produtos SET image_urls = $2 WHERE id = $1', v_tenant_schema)
    USING v_produto_id, p_image_urls;
  END IF;

  EXECUTE format(
    'INSERT INTO %I.estoque (produto_id, sku, quantidade, quantidade_minima)
     VALUES ($1, $2, $3, $4)
     RETURNING id',
    v_tenant_schema
  )
  USING v_produto_id, p_sku, COALESCE(p_estoque_atual, 0), COALESCE(p_estoque_minimo, 10)
  INTO v_estoque_id;

  IF COALESCE(p_estoque_atual, 0) > 0
     AND to_regclass(format('%I.estoque_entradas', v_tenant_schema)) IS NOT NULL THEN
    EXECUTE format(
      'INSERT INTO %I.estoque_entradas (
         numero_documento, valor_total, observacao, origem, criado_por
       ) VALUES ($1, $2, $3, ''estoque_inicial'', auth.uid())
       RETURNING id',
      v_tenant_schema
    )
        USING NULLIF(trim(COALESCE(p_nf_entrada, '')), ''),
          COALESCE(p_estoque_atual, 0) * COALESCE(p_preco_custo, 0),
          'Estoque inicial do cadastro do produto'
    INTO v_entrada_id;

    EXECUTE format(
      'INSERT INTO %I.estoque_entrada_itens (
         entrada_id, produto_id, estoque_id, quantidade, custo_unitario
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING id',
      v_tenant_schema
    )
        USING v_entrada_id, v_produto_id, v_estoque_id,
          COALESCE(p_estoque_atual, 0), COALESCE(p_preco_custo, 0)
    INTO v_entrada_item_id;

    EXECUTE format(
      'INSERT INTO %I.estoque_movimentacoes (
         produto_id, estoque_id, entrada_id, entrada_item_id, tipo, origem,
         quantidade, saldo_anterior, saldo_posterior, custo_unitario,
         documento, observacao, criado_por
       ) VALUES ($1, $2, $3, $4, ''entrada'', ''estoque_inicial'',
                 $5, 0, $5, $6, $7, $8, auth.uid())',
      v_tenant_schema
    )
    USING v_produto_id, v_estoque_id, v_entrada_id, v_entrada_item_id,
          COALESCE(p_estoque_atual, 0), COALESCE(p_preco_custo, 0),
          NULLIF(trim(COALESCE(p_nf_entrada, '')), ''),
          'Estoque inicial do cadastro do produto';
  END IF;

  EXECUTE format(
    'SELECT jsonb_build_object(
       ''id'', p.id,
       ''nome'', p.nome,
       ''descricao'', p.descricao,
       ''tipo'', p.tipo,
       ''preco_base'', p.preco_base,
       ''preco_venda'', p.preco_base,
       ''preco_custo'', p.custo_unitario,
       ''categoria'', p.categoria,
       ''nf_entrada'', p.nf_entrada,
       ''sku'', e.sku,
       ''estoque_atual'', e.quantidade,
       ''estoque_minimo'', e.quantidade_minima,
       ''criado_em'', p.criado_em
     )
     FROM %I.produtos p
     JOIN %I.estoque e ON e.produto_id = p.id
     WHERE p.id = $1',
    v_tenant_schema, v_tenant_schema
  )
  USING v_produto_id
  INTO v_produto;

  RETURN v_produto || jsonb_build_object('success', true, 'produto_id', v_produto_id, 'estoque_id', v_estoque_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_atualizar_produto(
  p_produto_id UUID,
  p_nome VARCHAR(255),
  p_descricao TEXT DEFAULT NULL,
  p_tipo VARCHAR(50) DEFAULT NULL,
  p_preco_base NUMERIC(10, 2) DEFAULT NULL,
  p_sku VARCHAR(100) DEFAULT NULL,
  p_preco_custo NUMERIC(10, 2) DEFAULT NULL,
  p_categoria VARCHAR(100) DEFAULT NULL,
  p_nf_entrada VARCHAR(60) DEFAULT NULL,
  p_image_urls JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
  v_produto_id UUID;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;

  EXECUTE format(
    'UPDATE %I.produtos
     SET nome = $2,
         descricao = COALESCE($3, descricao),
         tipo = COALESCE($4, tipo),
         preco_base = COALESCE($5, preco_base),
         custo_unitario = COALESCE($6, custo_unitario),
         categoria = COALESCE($7, categoria),
         nf_entrada = CASE WHEN $8 IS NULL THEN nf_entrada ELSE NULLIF(trim($8), '''') END,
         atualizado_em = NOW()
     WHERE id = $1
     RETURNING id',
    v_tenant_schema
  )
  USING p_produto_id, p_nome, p_descricao, p_tipo, p_preco_base,
      p_preco_custo, p_categoria, p_nf_entrada
  INTO v_produto_id;

  IF v_produto_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Produto não encontrado');
  END IF;

  EXECUTE format(
    'UPDATE %I.estoque SET sku = COALESCE($2, sku) WHERE produto_id = $1',
    v_tenant_schema
  )
  USING p_produto_id, p_sku;

  IF p_image_urls IS NOT NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = v_tenant_schema
      AND table_name = 'produtos'
      AND column_name = 'image_urls'
  ) THEN
    EXECUTE format('UPDATE %I.produtos SET image_urls = $2 WHERE id = $1', v_tenant_schema)
    USING p_produto_id, p_image_urls;
  END IF;

  EXECUTE format(
    'SELECT jsonb_build_object(
       ''id'', p.id,
       ''nome'', p.nome,
       ''descricao'', p.descricao,
       ''tipo'', p.tipo,
       ''preco_base'', p.preco_base,
       ''preco_venda'', p.preco_base,
       ''preco_custo'', p.custo_unitario,
       ''categoria'', p.categoria,
       ''nf_entrada'', p.nf_entrada,
       ''sku'', e.sku,
       ''estoque_atual'', e.quantidade,
       ''estoque_minimo'', e.quantidade_minima,
       ''atualizado_em'', p.atualizado_em
     )
     FROM %I.produtos p
     LEFT JOIN %I.estoque e ON e.produto_id = p.id
     WHERE p.id = $1',
    v_tenant_schema, v_tenant_schema
  )
  USING p_produto_id
  INTO v_result;

  RETURN v_result || jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_criar_produto(VARCHAR, TEXT, VARCHAR, NUMERIC, VARCHAR, NUMERIC, VARCHAR, INTEGER, INTEGER, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_produto(UUID, VARCHAR, TEXT, VARCHAR, NUMERIC, VARCHAR, NUMERIC, VARCHAR, VARCHAR, JSONB) TO authenticated;

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
           ''origem'', p.origem
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
  p_origem INTEGER
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
         atualizado_em = NOW()
     WHERE id = $1
     RETURNING id',
    v_tenant_schema
  )
  USING p_produto_id, NULLIF(trim(p_ncm), ''),
        NULLIF(trim(p_cfop_padrao), ''), COALESCE(p_origem, 0)
  INTO v_produto_id;

  IF v_produto_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Produto não encontrado');
  END IF;

  RETURN jsonb_build_object('success', true, 'produto_id', v_produto_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_criar_produto(VARCHAR, TEXT, VARCHAR, NUMERIC, VARCHAR, NUMERIC, VARCHAR, INTEGER, INTEGER, VARCHAR, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_atualizar_produto(UUID, VARCHAR, TEXT, VARCHAR, NUMERIC, VARCHAR, NUMERIC, VARCHAR, VARCHAR, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_listar_produtos_fiscal() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_atualizar_produto_fiscal(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.tenant_listar_produtos_fiscal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_produto_fiscal(UUID, TEXT, TEXT, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
