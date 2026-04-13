-- SCRIPT PARA RECRiar RPCs tenant_* EM TODOS OS TENANTS EXISTENTES
-- ==========================================
-- Execute este script no Supabase SQL Editor do banco de PRODUÇÃO
-- Este script recria as RPCs tenant_* que podem estar desatualizadas ou ausentes
-- ==========================================

DO $$
DECLARE
  v_schema_name TEXT;
  v_rpc_name TEXT;
BEGIN
  -- Iterar sobre todos os schemas tenant existentes
  FOR v_schema_name IN 
    SELECT schema_name 
    FROM information_schema.schemata s
    WHERE s.schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE 'Processando schema: %', v_schema_name;
    
    -- Recriar RPC tenant_listar_clientes
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_clientes(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
      RETURNS TABLE (
        id UUID,
        nome VARCHAR(255),
        email VARCHAR(255),
        telefone VARCHAR(50),
        funil_fase VARCHAR(50),
        status VARCHAR(50),
        criado_em TIMESTAMPTZ,
        atualizado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY 
        SELECT 
          id, nome, email, telefone, funil_fase, status, criado_em, atualizado_em 
        FROM clientes 
        ORDER BY criado_em DESC 
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_clientes recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_listar_produtos
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_produtos(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
      RETURNS TABLE (
        id UUID,
        nome VARCHAR(255),
        descricao TEXT,
        tipo VARCHAR(50),
        preco_base NUMERIC(10, 2),
        criado_em TIMESTAMPTZ,
        atualizado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY 
        SELECT 
          id, nome, descricao, tipo, preco_base, criado_em, atualizado_em 
        FROM produtos 
        ORDER BY nome 
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_produtos recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_listar_estoque
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_estoque(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
      RETURNS TABLE (
        id UUID,
        produto_id UUID,
        sku VARCHAR(100),
        quantidade INTEGER,
        quantidade_minima INTEGER,
        atualizado_em TIMESTAMPTZ,
        produto_nome VARCHAR(255),
        produto_preco_base NUMERIC
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY
        SELECT
          e.id,
          e.produto_id,
          e.sku,
          e.quantidade,
          e.quantidade_minima,
          e.atualizado_em,
          p.nome as produto_nome,
          p.preco_base as produto_preco_base
        FROM estoque e
        LEFT JOIN produtos p ON e.produto_id = p.id
        ORDER BY e.quantidade ASC
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_estoque recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_listar_vendas
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_vendas(p_limit INT DEFAULT 50)
      RETURNS TABLE (
        id UUID,
        cliente_id UUID,
        valor_total NUMERIC(10, 2),
        metodo_pagamento VARCHAR(50),
        status VARCHAR(50),
        criado_em TIMESTAMPTZ,
        atualizado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY SELECT * FROM vendas ORDER BY criado_em DESC LIMIT p_limit;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_vendas recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_listar_funcionarios
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_funcionarios(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
      RETURNS TABLE (
        id UUID,
        nome VARCHAR(255),
        cargo VARCHAR(100),
        salario NUMERIC(10, 2),
        role VARCHAR(50),
        criado_em TIMESTAMPTZ,
        atualizado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY 
        SELECT 
          id, nome, cargo, salario, role, criado_em, atualizado_em 
        FROM funcionarios 
        ORDER BY nome 
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_funcionarios recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_listar_ordens_servico
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_ordens_servico(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
      RETURNS TABLE (
        id UUID,
        cliente_id UUID,
        colaborador_id UUID,
        veiculo_equipamento VARCHAR(255),
        descricao_problema TEXT,
        status VARCHAR(50),
        valor_orcamento NUMERIC(10, 2),
        criado_em TIMESTAMPTZ,
        atualizado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY 
        SELECT 
          id, cliente_id, colaborador_id, veiculo_equipamento, descricao_problema, 
          status, valor_orcamento, criado_em, atualizado_em 
        FROM ordens_servico 
        ORDER BY criado_em DESC 
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_ordens_servico recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_listar_obras
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_obras(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
      RETURNS TABLE (
        id UUID,
        cliente_id UUID,
        nome VARCHAR(255),
        descricao TEXT,
        endereco TEXT,
        data_inicio DATE,
        data_fim_prevista DATE,
        data_fim_real DATE,
        status VARCHAR(50),
        orcamento_total NUMERIC(10, 2),
        criado_em TIMESTAMPTZ,
        atualizado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY 
        SELECT 
          id, cliente_id, nome, descricao, endereco, 
          data_inicio, data_fim_prevista, data_fim_real, 
          status, orcamento_total, criado_em, atualizado_em 
        FROM obras 
        ORDER BY criado_em DESC 
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_obras recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_listar_financeiro
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_financeiro(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
      RETURNS TABLE (
        id UUID,
        tipo VARCHAR(20),
        descricao TEXT,
        valor NUMERIC(10, 2),
        data_vencimento DATE,
        status VARCHAR(50),
        criado_em TIMESTAMPTZ,
        atualizado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY 
        SELECT 
          id, tipo, descricao, valor, data_vencimento, status, criado_em, atualizado_em 
        FROM financeiro 
        ORDER BY criado_em DESC 
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_financeiro recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_listar_comissoes
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_listar_comissoes(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
      RETURNS TABLE (
        id UUID,
        colaborador_id UUID,
        venda_id UUID,
        regra_comissao_id UUID,
        valor_comissao NUMERIC(10, 2),
        valor_venda NUMERIC(10, 2),
        periodo_referencia DATE,
        status_pagamento VARCHAR(50),
        data_pagamento DATE,
        criado_em TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY 
        SELECT 
          id, colaborador_id, venda_id, regra_comissao_id, valor_comissao, 
          valor_venda, periodo_referencia, status_pagamento, data_pagamento, criado_em 
        FROM comissoes 
        ORDER BY criado_em DESC 
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_listar_comissoes recriada em %', v_schema_name;
    
    -- Recriar RPC tenant_dashboard_kpis
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_dashboard_kpis()
      RETURNS TABLE (
        total_vendas NUMERIC,
        total_receita NUMERIC,
        total_despesa NUMERIC,
        saldo NUMERIC,
        qtd_vendas INT,
        qtd_clientes INT,
        qtd_produtos INT,
        qtd_os_abertas INT,
        estoque_baixo INT
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        RETURN QUERY
        WITH vendas_total AS (
          SELECT
            COALESCE(SUM(valor_total), 0) as total_vendas,
            COUNT(*) as qtd_vendas
          FROM vendas
          WHERE status = ''concluido''
          AND criado_em >= NOW() - INTERVAL ''6 months''
        ),
        financeiro_total AS (
          SELECT
            COALESCE(SUM(CASE WHEN tipo = ''receber'' THEN valor ELSE 0 END), 0) as total_receita,
            COALESCE(SUM(CASE WHEN tipo = ''pagar'' THEN valor ELSE 0 END), 0) as total_despesa
          FROM financeiro
          WHERE criado_em >= NOW() - INTERVAL ''6 months''
        ),
        contagem AS (
          SELECT
            (SELECT COUNT(*) FROM clientes) as qtd_clientes,
            (SELECT COUNT(*) FROM produtos) as qtd_produtos,
            (SELECT COUNT(*) FROM ordens_servico WHERE status = ''aberta'') as qtd_os_abertas,
            (SELECT COUNT(*) FROM estoque WHERE quantidade <= quantidade_minima) as estoque_baixo
        )
        SELECT
          vt.total_vendas,
          ft.total_receita,
          ft.total_despesa,
          (ft.total_receita - ft.total_despesa) as saldo,
          vt.qtd_vendas,
          c.qtd_clientes,
          c.qtd_produtos,
          c.qtd_os_abertas,
          c.estoque_baixo
        FROM vendas_total vt, financeiro_total ft, contagem c;
      END;
      $func$;
    ', v_schema_name, v_schema_name);
    
    RAISE NOTICE 'RPC tenant_dashboard_kpis recriada em %', v_schema_name;
    
    -- Conceder permissões para authenticated nas RPCs
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_clientes(INT, INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_clientes(INT, INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_clientes(INT, INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_produtos(INT, INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_produtos(INT, INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_produtos(INT, INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_estoque(INT, INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_estoque(INT, INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_estoque(INT, INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_vendas(INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_vendas(INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_vendas(INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_funcionarios(INT, INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_funcionarios(INT, INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_funcionarios(INT, INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_ordens_servico(INT, INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_ordens_servico(INT, INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_ordens_servico(INT, INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_obras(INT, INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_obras(INT, INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_obras(INT, INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_financeiro(INT, INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_financeiro(INT, INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_financeiro(INT, INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_comissoes(INT, INT) FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_comissoes(INT, INT) FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_comissoes(INT, INT) TO authenticated;', v_schema_name);
    
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_dashboard_kpis() FROM PUBLIC;', v_schema_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_dashboard_kpis() FROM anon;', v_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_dashboard_kpis() TO authenticated;', v_schema_name);
    
    RAISE NOTICE 'Permissões concedidas para RPCs em %', v_schema_name;
    RAISE NOTICE '========================================';
  END LOOP;
  
  RAISE NOTICE 'Todas as RPCs tenant_* foram recriadas em todos os tenants.';
END $$;
