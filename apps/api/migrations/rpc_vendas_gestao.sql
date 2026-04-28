-- Migração SQL: Gestão de Pós-Venda (Cancelamento e Devoluções)
-- Implementa RPCs para estorno de estoque e controle de status

DO $$
DECLARE
  schema_record RECORD;
  v_sql text;
BEGIN
  -- Loop em todos os schemas tenant existentes
  FOR schema_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE 'Implementando gestão de vendas no schema %', schema_record.schema_name;

    -- 1. RPC tenant_cancelar_venda: Cancelamento total com estorno de estoque
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_cancelar_venda(
        p_venda_id UUID
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_item RECORD;
        v_status_atual TEXT;
      BEGIN
        -- Verificar status atual
        SELECT status INTO v_status_atual FROM vendas WHERE id = p_venda_id;
        
        IF v_status_atual = ''cancelado'' THEN
          RETURN jsonb_build_object(''success'', false, ''error'', ''Esta venda já está cancelada.'');
        END IF;

        -- 1. Atualizar status da venda
        UPDATE vendas SET status = ''cancelado'', atualizado_em = NOW() WHERE id = p_venda_id;

        -- 2. Devolver itens ao estoque
        FOR v_item IN SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = p_venda_id
        LOOP
          UPDATE estoque 
          SET quantidade = quantidade + v_item.quantidade, 
              atualizado_em = NOW() 
          WHERE produto_id = v_item.produto_id;
        END LOOP;

        RETURN jsonb_build_object(''success'', true, ''venda_id'', p_venda_id);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

    -- 2. RPC tenant_devolver_item: Devolução parcial de item com estorno de estoque
    v_sql := format('
      CREATE OR REPLACE FUNCTION %I.tenant_devolver_item(
        p_venda_id UUID,
        p_venda_item_id UUID,
        p_quantidade INTEGER
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_item_produto_id UUID;
        v_item_qtd_atual INTEGER;
        v_venda_status TEXT;
      BEGIN
        -- Verificar se a venda não está cancelada
        SELECT status INTO v_venda_status FROM vendas WHERE id = p_venda_id;
        IF v_venda_status = ''cancelado'' THEN
          RETURN jsonb_build_object(''success'', false, ''error'', ''Não é possível devolver itens de uma venda já cancelada.'');
        END IF;

        -- Buscar dados do item
        SELECT produto_id, quantidade INTO v_item_produto_id, v_item_qtd_atual 
        FROM vendas_itens 
        WHERE id = p_venda_item_id AND venda_id = p_venda_id;

        IF NOT FOUND THEN
          RETURN jsonb_build_object(''success'', false, ''error'', ''Item não encontrado nesta venda.'');
        END IF;

        IF p_quantidade > v_item_qtd_atual THEN
          RETURN jsonb_build_object(''success'', false, ''error'', ''Quantidade de devolução maior que a vendida.'');
        END IF;

        -- 1. Atualizar quantidade no item da venda (ou marcar como devolvido)
        -- Decidimos manter o registro original mas subtrair a quantidade ativa para o estoque
        UPDATE vendas_itens SET quantidade = quantidade - p_quantidade WHERE id = p_venda_item_id;

        -- 2. Devolver ao estoque
        UPDATE estoque 
        SET quantidade = quantidade + p_quantidade, 
            atualizado_em = NOW() 
        WHERE produto_id = v_item_produto_id;

        -- 3. Marcar venda como tendo devolução (opcional, vamos usar status para clareza)
        UPDATE vendas SET status = ''parcialmente_devolvida'', atualizado_em = NOW() WHERE id = p_venda_id;

        RETURN jsonb_build_object(''success'', true, ''venda_id'', p_venda_id);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
      END;
      $func$;
    ', schema_record.schema_name, schema_record.schema_name);
    EXECUTE v_sql;

  END LOOP;
END $$;

-- 3. Wrappers no schema PUBLIC
CREATE OR REPLACE FUNCTION public.tenant_cancelar_venda(p_venda_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema text;
  v_result JSONB;
BEGIN
  v_tenant_schema := public.get_tenant_schema();
  IF v_tenant_schema IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Tenant não identificado'); END IF;
  EXECUTE format('SELECT %I.tenant_cancelar_venda($1)', v_tenant_schema) INTO v_result USING p_venda_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_devolver_item(p_venda_id UUID, p_venda_item_id UUID, p_quantidade INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema text;
  v_result JSONB;
BEGIN
  v_tenant_schema := public.get_tenant_schema();
  IF v_tenant_schema IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Tenant não identificado'); END IF;
  EXECUTE format('SELECT %I.tenant_devolver_item($1, $2, $3)', v_tenant_schema) INTO v_result USING p_venda_id, p_venda_item_id, p_quantidade;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_cancelar_venda(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_devolver_item(UUID, UUID, INTEGER) TO authenticated;
