-- Correção Completa das RPCs de Listagem e KPIs do Dashboard
-- Essas correções mapeiam os dados incorretos da aplicação com os schemas limpos.

-- 1. Dashboard KPIs (Arrays Object compatível)
DROP FUNCTION IF EXISTS public.tenant_dashboard_kpis();
CREATE OR REPLACE FUNCTION public.tenant_dashboard_kpis() RETURNS TABLE( total_vendas NUMERIC, qtd_vendas BIGINT, qtd_clientes BIGINT, qtd_produtos BIGINT, qtd_os_abertas BIGINT, estoque_baixo BIGINT, saldo NUMERIC ) LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_schema TEXT; BEGIN SELECT schema_name INTO v_schema FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid(); IF v_schema IS NULL OR v_schema = 'public' THEN RETURN; END IF; RETURN QUERY EXECUTE format('SELECT COALESCE((SELECT SUM(valor_total) FROM %I.vendas), 0)::NUMERIC, COALESCE((SELECT COUNT(*) FROM %I.vendas), 0)::BIGINT, COALESCE((SELECT COUNT(*) FROM %I.clientes), 0)::BIGINT, COALESCE((SELECT COUNT(*) FROM %I.produtos), 0)::BIGINT, COALESCE((SELECT COUNT(*) FROM %I.ordens_servico WHERE status = ''aberta''), 0)::BIGINT, COALESCE((SELECT COUNT(*) FROM %I.estoque WHERE quantidade <= quantidade_minima), 0)::BIGINT, COALESCE((SELECT SUM(CASE WHEN tipo IN (''receita'', ''receber'') THEN valor ELSE -valor END) FROM %I.financeiro), 0)::NUMERIC', v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema); END; $$;
GRANT EXECUTE ON FUNCTION public.tenant_dashboard_kpis TO authenticated, anon;


-- 2. Clientes
DROP FUNCTION IF EXISTS public.tenant_listar_clientes(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.tenant_listar_clientes(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0) RETURNS TABLE ( id UUID, nome VARCHAR, documento VARCHAR, contato VARCHAR, email VARCHAR, endereco VARCHAR, data_cadastro TIMESTAMPTZ, status VARCHAR ) LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_schema_name TEXT; BEGIN SELECT schema_name INTO v_schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid(); IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN; END IF; RETURN QUERY EXECUTE format(' SELECT id, nome, null::VARCHAR as documento, telefone::VARCHAR as contato, email, null::VARCHAR as endereco, criado_em as data_cadastro, status FROM %I.clientes ORDER BY nome ASC LIMIT %L OFFSET %L ', v_schema_name, p_limit, p_offset); END; $$;
GRANT EXECUTE ON FUNCTION public.tenant_listar_clientes TO authenticated, anon;


-- 3. Produtos + Estoque Real Interpolado
DROP FUNCTION IF EXISTS public.tenant_listar_produtos(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.tenant_listar_produtos(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0) RETURNS TABLE ( id UUID, nome VARCHAR, preco NUMERIC, sku VARCHAR, descricao TEXT, estoque_atual INTEGER, estoque_minimo INTEGER, data_cadastro TIMESTAMPTZ, status VARCHAR ) LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_schema_name TEXT; BEGIN SELECT schema_name INTO v_schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid(); IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN; END IF; RETURN QUERY EXECUTE format(' SELECT p.id, p.nome, p.preco_base as preco, e.sku, p.descricao, COALESCE(e.quantidade, 0) as estoque_atual, COALESCE(e.quantidade_minima, 0) as estoque_minimo, p.criado_em as data_cadastro, ''ativo''::VARCHAR as status FROM %I.produtos p LEFT JOIN %I.estoque e ON e.produto_id = p.id ORDER BY p.nome ASC LIMIT %L OFFSET %L ', v_schema_name, v_schema_name, p_limit, p_offset); END; $$;
GRANT EXECUTE ON FUNCTION public.tenant_listar_produtos TO authenticated, anon;


-- 4. Financeiro
DROP FUNCTION IF EXISTS public.tenant_listar_financeiro(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.tenant_listar_financeiro(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0) RETURNS TABLE ( id UUID, tipo_transacao VARCHAR, valor NUMERIC, vencimento DATE, status VARCHAR, descricao TEXT, categoria VARCHAR, data_cadastro TIMESTAMPTZ, data_pagamento DATE ) LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_schema_name TEXT; BEGIN SELECT schema_name INTO v_schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid(); IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN; END IF; RETURN QUERY EXECUTE format(' SELECT id, tipo as tipo_transacao, valor, data_vencimento as vencimento, status, descricao, null::VARCHAR as categoria, criado_em as data_cadastro, null::DATE as data_pagamento FROM %I.financeiro ORDER BY data_vencimento DESC LIMIT %L OFFSET %L ', v_schema_name, p_limit, p_offset); END; $$;
GRANT EXECUTE ON FUNCTION public.tenant_listar_financeiro TO authenticated, anon;


-- 5. Ordens de Servico
DROP FUNCTION IF EXISTS public.tenant_listar_ordens_servico(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.tenant_listar_ordens_servico(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0) RETURNS TABLE ( id UUID, cliente_id UUID, descricao TEXT, status VARCHAR, prioridade VARCHAR, data_criacao TIMESTAMPTZ, data_conclusao TIMESTAMPTZ, valor_orcado NUMERIC ) LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_schema_name TEXT; BEGIN SELECT schema_name INTO v_schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid(); IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN; END IF; RETURN QUERY EXECUTE format(' SELECT id, cliente_id, descricao_problema as descricao, status, ''normal''::VARCHAR as prioridade, criado_em as data_criacao, null::TIMESTAMPTZ as data_conclusao, valor_orcamento as valor_orcado FROM %I.ordens_servico ORDER BY criado_em DESC LIMIT %L OFFSET %L ', v_schema_name, p_limit, p_offset); END; $$;
GRANT EXECUTE ON FUNCTION public.tenant_listar_ordens_servico TO authenticated, anon;


-- 6. Vendas
DROP FUNCTION IF EXISTS public.tenant_listar_vendas(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.tenant_listar_vendas(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0) RETURNS TABLE ( id UUID, cliente_id UUID, data_venda TIMESTAMPTZ, total NUMERIC, status VARCHAR, metodo_pagamento VARCHAR, observacoes TEXT ) LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_schema_name TEXT; BEGIN SELECT schema_name INTO v_schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid(); IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN; END IF; RETURN QUERY EXECUTE format(' SELECT id, cliente_id, criado_em as data_venda, valor_total as total, status, metodo_pagamento, null::TEXT as observacoes FROM %I.vendas ORDER BY criado_em DESC LIMIT %L OFFSET %L ', v_schema_name, p_limit, p_offset); END; $$;
GRANT EXECUTE ON FUNCTION public.tenant_listar_vendas TO authenticated, anon;

-- Clean pgrst cache
NOTIFY pgrst, 'reload schema';
