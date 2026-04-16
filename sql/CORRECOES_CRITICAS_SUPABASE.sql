-- ==========================================
-- CORREÇÕES CRÍTICAS - SISTEMA FLUXO
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Data: 14/04/2026
-- Objetivo: Corrigir RPCs críticas que estão quebrando o sistema

-- ==========================================
-- 1. CRIAR TABELAS NECESSÁRIAS SE NÃO EXISTIREM
-- ==========================================

-- Tabela empresa_modulos
CREATE TABLE IF NOT EXISTS public.empresa_modulos (
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    modulo_key TEXT NOT NULL REFERENCES public.modulos_catalogo(key) ON DELETE CASCADE,
    ativo BOOLEAN NOT NULL DEFAULT FALSE,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (empresa_id, modulo_key)
);

-- Tabela logs_provisionamento
CREATE TABLE IF NOT EXISTS public.logs_provisionamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    schema_name VARCHAR(100),
    status VARCHAR(50),
    mensagem TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('master', 'tenant_admin', 'tenant_user')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tenant_tem_empresa CHECK (
      role != 'tenant_admin' OR (role = 'tenant_admin' AND empresa_id IS NOT NULL)
    ),
    CONSTRAINT chk_tenant_user_tem_empresa CHECK (
      role != 'tenant_user' OR (role = 'tenant_user' AND empresa_id IS NOT NULL)
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_empresa_modulos_empresa ON public.empresa_modulos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_modulos_ativo ON public.empresa_modulos(ativo);
CREATE INDEX IF NOT EXISTS idx_logs_provisionamento_empresa ON public.logs_provisionamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_empresa ON public.user_profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- ==========================================
-- 2. CRIAR FUNÇÃO is_master SE NÃO EXISTIR
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'master'
  );
$$;

-- ==========================================
-- 3. CRIAR FUNÇÃO provisionar_empresa (CRIA SCHEMA TENANT)
-- ==========================================
CREATE OR REPLACE FUNCTION public.provisionar_empresa(novo_schema text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    schema_exists boolean;
BEGIN
    -- 1. Verifica se o schema já existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = novo_schema
    ) INTO schema_exists;

    IF schema_exists THEN
        RETURN json_build_object('status', 'error', 'message', 'O schema da empresa já existe.');
    END IF;

    -- 2. Cria o schema
    EXECUTE format('CREATE SCHEMA %I;', novo_schema);

    -- 3. Configura permissões do schema
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role;', novo_schema);

    -- 4. Cria tabelas básicas do tenant
    EXECUTE format('
        CREATE TABLE %I.clientes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            telefone VARCHAR(50),
            funil_fase VARCHAR(50) DEFAULT ''lead'' CHECK (funil_fase IN (''lead'', ''prospect'', ''oportunidade'', ''cliente'', ''recuperacao'')),
            status VARCHAR(50) DEFAULT ''ativo'' CHECK (status IN (''ativo'', ''inativo'', ''bloqueado'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    EXECUTE format('
        CREATE TABLE %I.produtos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            tipo VARCHAR(50) DEFAULT ''produto'' CHECK (tipo IN (''produto'', ''servico'')),
            preco_base NUMERIC(10, 2) NOT NULL CHECK (preco_base >= 0),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    EXECUTE format('
        CREATE TABLE %I.estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID REFERENCES %I.produtos(id) ON DELETE SET NULL,
            sku VARCHAR(100) UNIQUE,
            quantidade INTEGER DEFAULT 0 CHECK (quantidade >= 0),
            quantidade_minima INTEGER DEFAULT 10 CHECK (quantidade_minima > 0),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE TABLE %I.vendas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total >= 0),
            metodo_pagamento VARCHAR(50) CHECK (metodo_pagamento IN (''dinheiro'', ''cartao_credito'', ''cartao_debito'', ''pix'', ''boleto'', ''transferencia'')),
            status VARCHAR(50) DEFAULT ''concluido'' CHECK (status IN (''pendente'', ''concluido'', ''cancelado'', ''reembolsado'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE TABLE %I.vendas_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            venda_id UUID NOT NULL REFERENCES %I.vendas(id) ON DELETE CASCADE,
            produto_id UUID NOT NULL REFERENCES %I.estoque(id) ON DELETE RESTRICT,
            quantidade INTEGER NOT NULL CHECK (quantidade > 0),
            preco_unitario NUMERIC(10, 2) NOT NULL CHECK (preco_unitario >= 0),
            subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema);

    EXECUTE format('
        CREATE TABLE %I.funcionarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            cargo VARCHAR(100),
            salario NUMERIC(10, 2) CHECK (salario >= 0),
            role VARCHAR(50) DEFAULT ''funcionario'' CHECK (role IN (''funcionario'', ''gerente'', ''admin'', ''colaborador'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    EXECUTE format('
        CREATE TABLE %I.financeiro (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN (''pagar'', ''receber'')),
            descricao TEXT NOT NULL,
            valor NUMERIC(10, 2) NOT NULL CHECK (valor >= 0),
            data_vencimento DATE NOT NULL,
            status VARCHAR(50) DEFAULT ''pendente'' CHECK (status IN (''pendente'', ''pago'', ''cancelado'', ''atrasado'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 5. Cria RPCs do tenant
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
          SELECT
            COALESCE((SELECT COALESCE(SUM(valor_total), 0) FROM vendas WHERE status = ''concluido''), 0) as total_vendas,
            COALESCE((SELECT COALESCE(SUM(valor), 0) FROM financeiro WHERE tipo = ''receber'' AND status = ''pago''), 0) as total_receita,
            COALESCE((SELECT COALESCE(SUM(valor), 0) FROM financeiro WHERE tipo = ''pagar'' AND status = ''pago''), 0) as total_despesa,
            COALESCE((SELECT COALESCE(SUM(valor), 0) FROM financeiro WHERE tipo = ''receber'' AND status = ''pago''), 0) - 
            COALESCE((SELECT COALESCE(SUM(valor), 0) FROM financeiro WHERE tipo = ''pagar'' AND status = ''pago''), 0) as saldo,
            COALESCE((SELECT COUNT(*) FROM vendas WHERE status = ''concluido''), 0) as qtd_vendas,
            COALESCE((SELECT COUNT(*) FROM clientes), 0) as qtd_clientes,
            COALESCE((SELECT COUNT(*) FROM produtos), 0) as qtd_produtos,
            0 as qtd_os_abertas,
            COALESCE((SELECT COUNT(*) FROM estoque WHERE quantidade < quantidade_minima), 0) as estoque_baixo;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_vendas(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
        RETURNS TABLE (
          id UUID,
          cliente_id UUID,
          valor_total NUMERIC,
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
          RETURN QUERY 
          SELECT 
            id, cliente_id, valor_total, metodo_pagamento, status, criado_em, atualizado_em 
          FROM vendas 
          ORDER BY criado_em DESC 
          LIMIT p_limit OFFSET p_offset;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_funcionarios(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
        RETURNS TABLE (
          id UUID,
          nome VARCHAR(255),
          cargo VARCHAR(100),
          salario NUMERIC,
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
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_processar_venda(
          p_cliente_id UUID,
          p_cliente_nome TEXT,
          p_cliente_telefone TEXT,
          p_cliente_email TEXT,
          p_itens JSONB,
          p_vendedor_id UUID DEFAULT NULL,
          p_forma_pagamento TEXT DEFAULT ''dinheiro'',
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_venda_id UUID;
          v_cliente_id UUID := p_cliente_id;
          v_total NUMERIC := 0;
          v_item JSONB;
          v_produto_id UUID;
          v_qtd INT;
          v_preco NUMERIC;
        BEGIN
          -- Criar cliente se não existir
          IF v_cliente_id IS NULL AND p_cliente_nome IS NOT NULL THEN
            SELECT id INTO v_cliente_id
            FROM clientes
            WHERE nome = p_cliente_nome
            LIMIT 1;

            IF v_cliente_id IS NULL THEN
              INSERT INTO clientes (nome, telefone, email, funil_fase, status)
              VALUES (p_cliente_nome, p_cliente_telefone, p_cliente_email, ''lead'', ''ativo'')
              RETURNING id INTO v_cliente_id;
            END IF;
          END IF;

          IF v_cliente_id IS NULL THEN
            RETURN jsonb_build_object(''success'', false, ''error'', ''cliente_id ou cliente_nome é obrigatório'');
          END IF;

          -- Calcular total
          FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
            v_total := v_total + ((v_item->>''preco'')::NUMERIC * (v_item->>''qtd'')::INT);
          END LOOP;

          -- Criar venda
          INSERT INTO vendas (cliente_id, valor_total, metodo_pagamento, status)
          VALUES (v_cliente_id, v_total, p_forma_pagamento, ''concluido'')
          RETURNING id INTO v_venda_id;

          -- Inserir itens
          FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
            v_produto_id := (v_item->>''produto_id'')::UUID;
            v_qtd := (v_item->>''qtd'')::INT;
            v_preco := (v_item->>''preco'')::NUMERIC;

            INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
            VALUES (v_venda_id, v_produto_id, v_qtd, v_preco);
          END LOOP;

          RETURN jsonb_build_object(
            ''success'', true,
            ''venda_id'', v_venda_id,
            ''cliente_id'', v_cliente_id,
            ''total'', v_total
          );
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- 6. Configura permissões das tabelas
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', novo_schema);

    -- 7. Configura permissões das funções
    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO service_role;', novo_schema);

    RETURN json_build_object('status', 'success', 'message', 'Schema tenant criado com sucesso');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- ==========================================
-- 4. CRIAR FUNÇÃO provisionar_empresa_master
-- ==========================================
CREATE OR REPLACE FUNCTION public.provisionar_empresa_master(
  p_empresa_id uuid,
  p_cnpj text,
  p_razao_social text,
  p_porte text,
  p_segmento text,
  p_schema_name text,
  p_modules text[] DEFAULT ARRAY[]::text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rpc json;
  v_invalid_modules text[];
BEGIN
  IF p_schema_name IS NULL OR p_schema_name !~ '^[a-z][a-z0-9_]{1,63}$' THEN
    RAISE EXCEPTION 'schema_name inválido';
  END IF;

  SELECT array_agg(m)
  INTO v_invalid_modules
  FROM unnest(COALESCE(p_modules, ARRAY[]::text[])) AS m
  WHERE NOT EXISTS (SELECT 1 FROM public.modulos_catalogo c WHERE c.key = m);

  IF v_invalid_modules IS NOT NULL THEN
    RAISE EXCEPTION 'Módulos inválidos no payload';
  END IF;

  INSERT INTO public.empresas (
    id, cnpj, razao_social, porte, segmento, schema_name
  ) VALUES (
    p_empresa_id, p_cnpj, p_razao_social, p_porte, p_segmento, p_schema_name
  );

  v_rpc := public.provisionar_empresa(p_schema_name);
  IF COALESCE(v_rpc->>'status', 'error') <> 'success' THEN
    RAISE EXCEPTION 'Falha ao criar schema tenant';
  END IF;

  IF array_length(COALESCE(p_modules, ARRAY[]::text[]), 1) > 0 THEN
    INSERT INTO public.empresa_modulos (empresa_id, modulo_key, ativo)
    SELECT p_empresa_id, m, true
    FROM unnest(p_modules) AS m
    ON CONFLICT (empresa_id, modulo_key)
    DO UPDATE SET ativo = EXCLUDED.ativo, atualizado_em = now();
  END IF;

  INSERT INTO public.logs_provisionamento (empresa_id, schema_name, status, mensagem)
  VALUES (p_empresa_id, p_schema_name, 'success', 'Provisionamento transacional concluído');

  RETURN json_build_object(
    'status', 'success',
    'empresa_id', p_empresa_id,
    'schema_name', p_schema_name,
    'message', 'Empresa, schema e módulos provisionados com sucesso.'
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.logs_provisionamento (empresa_id, schema_name, status, mensagem)
  SELECT p_empresa_id, p_schema_name, 'error', SQLERRM
  FROM public.empresas
  WHERE id = p_empresa_id;
  RAISE;
END;
$$;

-- ==========================================
-- 5. CRIAR FUNÇÃO set_tenant_schema
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_tenant_schema(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_schema_name TEXT;
  v_role TEXT;
BEGIN
  -- Obter role e empresa_id do usuário
  SELECT role, empresa_id INTO v_role, v_empresa_id
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  -- Validações
  IF v_role IS NULL THEN
    RETURN 'public'; -- Retorna public se não tiver perfil (usuário não configurado)
  END IF;

  IF v_role = 'tenant_admin' AND v_empresa_id IS NULL THEN
    RETURN 'public'; -- Retorna public se tenant não tiver empresa
  END IF;

  IF v_role = 'tenant_user' AND v_empresa_id IS NULL THEN
    RETURN 'public'; -- Retorna public se tenant não tiver empresa
  END IF;

  -- Master usa public (não tem schema tenant)
  IF v_role = 'master' THEN
    PERFORM set_config('search_path', 'public', false);
    RETURN 'public';
  END IF;

  -- Obter schema_name da empresa
  SELECT schema_name INTO v_schema_name
  FROM public.empresas
  WHERE id = v_empresa_id;

  IF v_schema_name IS NULL THEN
    RETURN 'public'; -- Retorna public se empresa não tiver schema
  END IF;

  -- Validar que schema existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = v_schema_name
  ) THEN
    RETURN 'public'; -- Retorna public se schema não existir
  END IF;

  -- Configurar search_path: schema tenant primeiro, depois public
  PERFORM set_config('search_path', v_schema_name || ',public', false);

  RETURN v_schema_name;
END;
$$;

REVOKE ALL ON FUNCTION public.set_tenant_schema(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_tenant_schema(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_tenant_schema(UUID) TO authenticated;

-- ==========================================
-- 6. CONFIGURAR RLS PARA TABELAS PUBLIC
-- ==========================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Master pode tudo
DROP POLICY IF EXISTS master_all_empresas ON public.empresas;
CREATE POLICY master_all_empresas ON public.empresas
  FOR ALL USING (public.is_master()) WITH CHECK (public.is_master());

DROP POLICY IF EXISTS master_all_modulos_catalogo ON public.modulos_catalogo;
CREATE POLICY master_all_modulos_catalogo ON public.modulos_catalogo
  FOR ALL USING (public.is_master()) WITH CHECK (public.is_master());

DROP POLICY IF EXISTS master_all_empresa_modulos ON public.empresa_modulos;
CREATE POLICY master_all_empresa_modulos ON public.empresa_modulos
  FOR ALL USING (public.is_master()) WITH CHECK (public.is_master());

DROP POLICY IF EXISTS master_all_user_profiles ON public.user_profiles;
CREATE POLICY master_all_user_profiles ON public.user_profiles
  FOR ALL USING (public.is_master()) WITH CHECK (public.is_master());

-- Usuário comum: ler própria empresa e seus módulos
DROP POLICY IF EXISTS tenant_read_own_empresa ON public.empresas;
CREATE POLICY tenant_read_own_empresa ON public.empresas
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = auth.uid()
        AND p.empresa_id = public.empresas.id
        AND p.role IN ('tenant_admin', 'tenant_user')
    )
  );

DROP POLICY IF EXISTS tenant_read_own_empresa_modulos ON public.empresa_modulos;
CREATE POLICY tenant_read_own_empresa_modulos ON public.empresa_modulos
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = auth.uid()
        AND p.empresa_id = public.empresa_modulos.empresa_id
        AND p.role IN ('tenant_admin', 'tenant_user')
    )
  );

DROP POLICY IF EXISTS tenant_read_modulos_catalogo ON public.modulos_catalogo;
CREATE POLICY tenant_read_modulos_catalogo ON public.modulos_catalogo
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS user_read_own_profile ON public.user_profiles;
CREATE POLICY user_read_own_profile ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

-- ==========================================
-- FIM DAS CORREÇÕES CRÍTICAS
-- ==========================================
