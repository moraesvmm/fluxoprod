-- RPCs de produtos com NF de entrada.
-- Mantem as assinaturas antigas e adiciona versoes com p_nf_entrada.

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
SET search_path = public
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
    'INSERT INTO %I.produtos (nome, descricao, tipo, preco_base, sku, preco_custo, categoria, nf_entrada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, nome, descricao, tipo, preco_base, sku, preco_custo, categoria, nf_entrada, criado_em',
    v_tenant_schema
  )
  USING p_nome, p_descricao, p_tipo, p_preco_base, p_sku, p_preco_custo, p_categoria, NULLIF(trim(p_nf_entrada), '')
  INTO v_produto;

  v_produto_id := (v_produto->>'id')::UUID;

  EXECUTE format(
    'INSERT INTO %I.estoque (produto_id, sku, quantidade, quantidade_minima)
     VALUES ($1, $2, $3, $4)
     RETURNING id',
    v_tenant_schema
  )
  USING v_produto_id, p_sku, p_estoque_atual, p_estoque_minimo
  INTO v_estoque_id;

  IF p_estoque_atual > 0
     AND to_regclass(format('%I.estoque_entradas', v_tenant_schema)) IS NOT NULL THEN
    EXECUTE format(
      'INSERT INTO %I.estoque_entradas (
         numero_documento, valor_total, observacao, origem, criado_por
       ) VALUES ($1, $2, $3, ''estoque_inicial'', auth.uid())
       RETURNING id',
      v_tenant_schema
    )
    USING NULLIF(trim(p_nf_entrada), ''), p_estoque_atual * p_preco_custo, 'Estoque inicial do cadastro do produto'
    INTO v_entrada_id;

    EXECUTE format(
      'INSERT INTO %I.estoque_entrada_itens (
         entrada_id, produto_id, estoque_id, quantidade, custo_unitario
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING id',
      v_tenant_schema
    )
    USING v_entrada_id, v_produto_id, v_estoque_id, p_estoque_atual, p_preco_custo
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
          p_estoque_atual, p_preco_custo, NULLIF(trim(p_nf_entrada), ''),
          'Estoque inicial do cadastro do produto';
  END IF;

  RETURN v_produto || jsonb_build_object('success', true, 'produto_id', v_produto_id, 'estoque_id', v_estoque_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_atualizar_produto(
  p_produto_id UUID,
  p_nome VARCHAR(255),
  p_descricao TEXT DEFAULT NULL,
  p_tipo VARCHAR(50) DEFAULT 'produto',
  p_preco_base NUMERIC(10, 2) DEFAULT 0,
  p_sku VARCHAR(100) DEFAULT NULL,
  p_preco_custo NUMERIC(10, 2) DEFAULT 0,
  p_categoria VARCHAR(100) DEFAULT 'geral',
  p_nf_entrada VARCHAR(60) DEFAULT NULL,
  p_image_urls JSONB DEFAULT NULL
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
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;

  EXECUTE format(
    'UPDATE %I.produtos
     SET nome = $2, descricao = $3, tipo = $4, preco_base = $5,
         sku = $6, preco_custo = $7, categoria = $8,
         nf_entrada = NULLIF(trim($9), ''''), atualizado_em = NOW()
     WHERE id = $1
     RETURNING id, nome, descricao, tipo, preco_base, sku, preco_custo, categoria, nf_entrada, atualizado_em',
    v_tenant_schema
  )
  USING p_produto_id, p_nome, p_descricao, p_tipo, p_preco_base, p_sku, p_preco_custo, p_categoria, p_nf_entrada
  INTO v_result;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Produto não encontrado');
  END IF;

  EXECUTE format('UPDATE %I.estoque SET sku = $2 WHERE produto_id = $1', v_tenant_schema)
  USING p_produto_id, p_sku;

  RETURN v_result || jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_criar_produto(VARCHAR, TEXT, VARCHAR, NUMERIC, VARCHAR, NUMERIC, VARCHAR, INTEGER, INTEGER, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_produto(UUID, VARCHAR, TEXT, VARCHAR, NUMERIC, VARCHAR, NUMERIC, VARCHAR, VARCHAR, JSONB) TO authenticated;
