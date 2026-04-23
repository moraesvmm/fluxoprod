-- ==========================================
-- SCRIPT DE PROVISIONAMENTO DE TENANTS (FLUXO)
-- ==========================================
-- IMPORTANTE: Rode este script no Editor SQL do seu Supabase.

-- ==========================================
-- 0. SCHEMA MASTER (Public)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    porte VARCHAR(50),
    segmento VARCHAR(100),
    schema_name VARCHAR(100) UNIQUE NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'ativo'
);

-- ==========================================
-- 0.1. CATÁLOGO DE MÓDULOS E GOVERNANÇA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.modulos_catalogo (
    key TEXT PRIMARY KEY, -- ex: 'dashboard', 'crm'
    nome TEXT NOT NULL,
    descricao TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flags por empresa (fonte de verdade)
CREATE TABLE IF NOT EXISTS public.empresa_modulos (
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    modulo_key TEXT NOT NULL REFERENCES public.modulos_catalogo(key) ON DELETE CASCADE,
    ativo BOOLEAN NOT NULL DEFAULT FALSE,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (empresa_id, modulo_key)
);

-- Usuários e papéis (master global e usuários por empresa)
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

-- Ao criar empresa, garantir feature flags criadas (todas false)
CREATE OR REPLACE FUNCTION public._after_empresa_insert_seed_modules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.empresa_modulos (empresa_id, modulo_key, ativo)
  SELECT NEW.id, m.key, FALSE
  FROM public.modulos_catalogo m
  ON CONFLICT (empresa_id, modulo_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_empresas_seed_modules'
  ) THEN
    CREATE TRIGGER trg_empresas_seed_modules
    AFTER INSERT ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION public._after_empresa_insert_seed_modules();
  END IF;
END $$;

-- Seed catálogo (idempotente)
INSERT INTO public.modulos_catalogo (key, nome, descricao) VALUES
  ('dashboard', 'Dashboard', 'Indicadores e visão geral do negócio.'),
  ('crm', 'CRM', 'Cadastro de clientes e funil de relacionamento.'),
  ('vendas', 'Vendas & PDV', 'Registro de vendas, PDV e emissão de comprovantes.'),
  ('financeiro', 'Financeiro', 'Contas a pagar/receber, conciliação e fluxo de caixa.'),
  ('estoque', 'Estoque', 'Controle de estoque, SKUs e níveis mínimos.'),
  ('catalogo', 'Catálogo', 'Produtos e serviços com precificação base.'),
  ('rh', 'RH', 'Cadastro de colaboradores e informações básicas.'),
  ('relatorios', 'Relatórios', 'Relatórios e exportações consolidadas.'),
  ('os', 'Ordem de Serviço', 'Abertura e gestão de ordens de serviço.'),
  ('obras', 'Obras', 'Gestão de obras e projetos com integração com OS e vendas.'),
  ('comissoes', 'Comissões', 'Regras de comissão por colaborador e cálculo automático.'),
  ('configuracoes', 'Configurações', 'Preferências e parâmetros do tenant.')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 0.2. RLS (GOVERNANÇA CENTRAL + ISOLAMENTO)
-- ==========================================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- master pode tudo (governança central)
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

-- usuário comum: ler própria empresa e seus módulos
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

-- Recriar tabela com foreign key constraint (mais rigoroso para uso real)
DROP TABLE IF EXISTS public.logs_provisionamento CASCADE;
CREATE TABLE public.logs_provisionamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    schema_name VARCHAR(100),
    status VARCHAR(50),
    mensagem TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance em tabelas públicas
CREATE INDEX IF NOT EXISTS idx_empresas_schema_name ON public.empresas(schema_name);
CREATE INDEX IF NOT EXISTS idx_empresas_status ON public.empresas(status);
CREATE INDEX IF NOT EXISTS idx_empresa_modulos_empresa ON public.empresa_modulos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_modulos_ativo ON public.empresa_modulos(ativo);
CREATE INDEX IF NOT EXISTS idx_user_profiles_empresa ON public.user_profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_logs_provisionamento_empresa ON public.logs_provisionamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_provisionamento_criado_em ON public.logs_provisionamento(criado_em DESC);

-- ==========================================
-- 1. FUNÇÃO RPC DE PROVISIONAMENTO DINÂMICO (EXPANDIDA)
-- ==========================================
CREATE OR REPLACE FUNCTION provisionar_empresa(novo_schema text)
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

    -- Endurecimento: por padrão, schemas tenant NÃO devem ser acessíveis por anon/authenticated
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role;', novo_schema);

    -- Default privileges
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM PUBLIC;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM anon;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM authenticated;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO service_role;', novo_schema);

    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM PUBLIC;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM anon;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM authenticated;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO service_role;', novo_schema);

    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM PUBLIC;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM anon;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM authenticated;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON FUNCTIONS TO service_role;', novo_schema);

    -- 3. MÓDULO 2: CRM & Gestão de Clientes
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

    -- Índices para clientes
    EXECUTE format('CREATE INDEX idx_%I_clientes_status ON %I.clientes(status);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_clientes_funil ON %I.clientes(funil_fase);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_clientes_nome ON %I.clientes(nome);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_clientes_email ON %I.clientes(email);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_clientes_telefone ON %I.clientes(telefone);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_clientes_criado_em ON %I.clientes(criado_em DESC);', novo_schema, novo_schema);

    -- 4. MÓDULO 6: Catálogo de Produtos e Serviços
    EXECUTE format('
        CREATE TABLE %I.produtos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            tipo VARCHAR(50) DEFAULT ''produto'' CHECK (tipo IN (''produto'', ''servico'')),
            preco_base NUMERIC(10, 2) NOT NULL CHECK (preco_base >= 0),
            categoria VARCHAR(100),
            custo_unitario NUMERIC(10, 2) CHECK (custo_unitario >= 0),
            metodo_valoracao VARCHAR(50) DEFAULT ''custo_medio'' CHECK (metodo_valoracao IN (''custo_medio'', ''fifo'', ''lifo'')),
            codigo_barras VARCHAR(50),
            codigo_qr TEXT,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- Índices para produtos
    EXECUTE format('CREATE INDEX idx_%I_produtos_nome ON %I.produtos(nome);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_produtos_tipo ON %I.produtos(tipo);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_produtos_preco_base ON %I.produtos(preco_base);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_produtos_categoria ON %I.produtos(categoria);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_produtos_codigo_barras ON %I.produtos(codigo_barras);', novo_schema, novo_schema);

    -- Adicionar CHECK constraint para garantir preço de venda válido (se houver campo separado)
    -- Nota: Esta constraint será adicionada se a tabela tiver campos de custo e venda separados
    -- Atualmente, apenas preco_base existe, então esta constraint é opcional

    -- 5. MÓDULO 5: Controle de Estoque
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

    -- Índices para estoque
    EXECUTE format('CREATE INDEX idx_%I_estoque_produto ON %I.estoque(produto_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_estoque_quantidade ON %I.estoque(quantidade);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_estoque_sku ON %I.estoque(sku);', novo_schema, novo_schema);

    -- 5.1. MÓDULO 5.1: Alertas de Estoque
    EXECUTE format('
        CREATE TABLE %I.alertas_estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            tipo_alerta VARCHAR(50) NOT NULL CHECK (tipo_alerta IN (''estoque_baixo'', ''sem_estoque'', ''reposicao_sugerida'')),
            estoque_atual INTEGER NOT NULL,
            estoque_minimo INTEGER NOT NULL,
            mensagem TEXT,
            status VARCHAR(50) DEFAULT ''pendente'' CHECK (status IN (''pendente'', ''visualizado'', ''resolvido'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            resolvido_em TIMESTAMPTZ
        );
    ', novo_schema, novo_schema);

    -- Índices para alertas_estoque
    EXECUTE format('CREATE INDEX idx_%I_alertas_estoque_produto ON %I.alertas_estoque(produto_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_alertas_estoque_status ON %I.alertas_estoque(status);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_alertas_estoque_criado_em ON %I.alertas_estoque(criado_em DESC);', novo_schema, novo_schema);

    -- 5.2. MÓDULO 5.2: Kits e Bundles
    EXECUTE format('
        CREATE TABLE %I.kits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            ativo BOOLEAN DEFAULT true,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Índices para kits
    EXECUTE format('CREATE INDEX idx_%I_kits_produto ON %I.kits(produto_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_kits_ativo ON %I.kits(ativo);', novo_schema, novo_schema);

    -- Tabela kit_itens
    EXECUTE format('
        CREATE TABLE %I.kit_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            kit_id UUID NOT NULL REFERENCES %I.kits(id) ON DELETE CASCADE,
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Índices para kit_itens
    EXECUTE format('CREATE INDEX idx_%I_kit_itens_kit ON %I.kit_itens(kit_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_kit_itens_produto ON %I.kit_itens(produto_id);', novo_schema, novo_schema);

    -- Trigger para atualizar atualizado_em em kits
    EXECUTE format('
        CREATE OR REPLACE FUNCTION trigger_atualizar_kits()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.atualizado_em = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    ', novo_schema);

    EXECUTE format('
        DROP TRIGGER IF EXISTS trg_atualizar_kits ON %I.kits;
        CREATE TRIGGER trg_atualizar_kits
        BEFORE UPDATE ON %I.kits
        FOR EACH ROW
        EXECUTE FUNCTION trigger_atualizar_kits();
    ', novo_schema, novo_schema);

    -- 5.3. MÓDULO 5.3: Locais e Transferências de Estoque
    EXECUTE format('
        CREATE TABLE %I.locais_estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN (''filial'', ''deposito'', ''loja'')),
            endereco TEXT,
            ativo BOOLEAN DEFAULT true,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- Índices para locais_estoque
    EXECUTE format('CREATE INDEX idx_%I_locais_estoque_tipo ON %I.locais_estoque(tipo);', novo_schema, novo_schema);

    -- Tabela estoque_por_local
    EXECUTE format('
        CREATE TABLE %I.estoque_por_local (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            local_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE CASCADE,
            quantidade INTEGER NOT NULL DEFAULT 0,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(produto_id, local_id)
        );
    ', novo_schema, novo_schema, novo_schema);

    -- Índices para estoque_por_local
    EXECUTE format('CREATE INDEX idx_%I_estoque_por_local_produto ON %I.estoque_por_local(produto_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_estoque_por_local_local ON %I.estoque_por_local(local_id);', novo_schema, novo_schema);

    -- Trigger para atualizar atualizado_em em estoque_por_local
    EXECUTE format('
        CREATE OR REPLACE FUNCTION trigger_atualizar_estoque_por_local()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.atualizado_em = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    ', novo_schema);

    EXECUTE format('
        DROP TRIGGER IF EXISTS trg_atualizar_estoque_por_local ON %I.estoque_por_local;
        CREATE TRIGGER trg_atualizar_estoque_por_local
        BEFORE UPDATE ON %I.estoque_por_local
        FOR EACH ROW
        EXECUTE FUNCTION trigger_atualizar_estoque_por_local();
    ', novo_schema, novo_schema);

    -- Tabela transferencias_estoque
    EXECUTE format('
        CREATE TABLE %I.transferencias_estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            local_origem_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE CASCADE,
            local_destino_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE CASCADE,
            quantidade INTEGER NOT NULL,
            status VARCHAR(50) DEFAULT ''pendente'' CHECK (status IN (''pendente'', ''em_transito'', ''concluida'', ''cancelada'')),
            observacao TEXT,
            criado_por UUID NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            concluida_em TIMESTAMPTZ
        );
    ', novo_schema, novo_schema, novo_schema);

    -- Índices para transferencias_estoque
    EXECUTE format('CREATE INDEX idx_%I_transferencias_estoque_status ON %I.transferencias_estoque(status);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_transferencias_estoque_produto ON %I.transferencias_estoque(produto_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_transferencias_estoque_criado_em ON %I.transferencias_estoque(criado_em DESC);', novo_schema, novo_schema);

    -- 6. MÓDULO 3: Vendas & PDV
    EXECUTE format('
        CREATE TABLE %I.vendas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            cliente_nome VARCHAR(255),
            vendedor_id UUID REFERENCES %I.funcionarios(id) ON DELETE SET NULL,
            vendedor_nome VARCHAR(255),
            valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total >= 0),
            metodo_pagamento VARCHAR(50) CHECK (metodo_pagamento IN (''dinheiro'', ''cartao_credito'', ''cartao_debito'', ''pix'', ''boleto'', ''transferencia'')),
            status VARCHAR(50) DEFAULT ''concluido'' CHECK (status IN (''pendente'', ''concluido'', ''cancelado'', ''reembolsado'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Índices para vendas
    EXECUTE format('CREATE INDEX idx_%I_vendas_cliente ON %I.vendas(cliente_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_vendas_status ON %I.vendas(status);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_vendas_criado_em ON %I.vendas(criado_em DESC);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_vendas_valor_total ON %I.vendas(valor_total);', novo_schema, novo_schema);

    -- 6.1. Tabela vendas_itens (CRÍTICA - FK para estoque)
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

    -- Índices para vendas_itens
    EXECUTE format('CREATE INDEX idx_%I_vendas_itens_venda ON %I.vendas_itens(venda_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_vendas_itens_produto ON %I.vendas_itens(produto_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_vendas_itens_data ON %I.vendas_itens(criado_em);', novo_schema, novo_schema);

    -- 6.2. Tabela previsoes_demanda (Sessão 6 - Previsão de Demanda)
    EXECUTE format('
        CREATE TABLE %I.previsoes_demanda (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            periodo_inicio DATE NOT NULL,
            periodo_fim DATE NOT NULL,
            dias_analise INT NOT NULL,
            demanda_prevista INT NOT NULL,
            media_venda_diaria NUMERIC(10, 4) NOT NULL,
            demanda_real INT,
            precisao NUMERIC(5, 2),
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Índices para previsoes_demanda
    EXECUTE format('CREATE INDEX idx_%I_previsoes_demanda_produto ON %I.previsoes_demanda(produto_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_previsoes_demanda_periodo ON %I.previsoes_demanda(periodo_inicio, periodo_fim);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_previsoes_demanda_criado_em ON %I.previsoes_demanda(criado_em DESC);', novo_schema, novo_schema);

    -- Trigger para atualizar estoque após venda
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.atualizar_estoque_apos_venda()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $func$
        DECLARE
            v_qtd_atual INTEGER;
        BEGIN
            -- Verificar estoque atual antes da venda
            SELECT quantidade INTO v_qtd_atual
            FROM %I.estoque
            WHERE id = NEW.produto_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION ''Produto não encontrado no estoque'';
            END IF;

            IF v_qtd_atual < NEW.quantidade THEN
                RAISE EXCEPTION ''Quantidade insuficiente no estoque'';
            END IF;

            -- Atualizar estoque
            UPDATE %I.estoque
            SET quantidade = quantidade - NEW.quantidade,
                atualizado_em = NOW()
            WHERE id = NEW.produto_id;

            RETURN NEW;
        END;
        $func$;
    ', novo_schema, novo_schema, novo_schema);

    EXECUTE format('
        CREATE TRIGGER trg_%I_vendas_itens_atualizar_estoque
        AFTER INSERT ON %I.vendas_itens
        FOR EACH ROW
        EXECUTE FUNCTION %I.atualizar_estoque_apos_venda();
    ', novo_schema, novo_schema, novo_schema);

    -- 7. MÓDULO 4: Gestão Financeira
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

    -- Índices para financeiro
    EXECUTE format('CREATE INDEX idx_%I_financeiro_tipo ON %I.financeiro(tipo);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_financeiro_status ON %I.financeiro(status);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_financeiro_vencimento ON %I.financeiro(data_vencimento);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_financeiro_criado_em ON %I.financeiro(criado_em DESC);', novo_schema, novo_schema);

    -- 8. MÓDULO 7: Departamento Pessoal & RH
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

    -- Índices para funcionarios
    EXECUTE format('CREATE INDEX idx_%I_funcionarios_cargo ON %I.funcionarios(cargo);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_funcionarios_role ON %I.funcionarios(role);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_funcionarios_nome ON %I.funcionarios(nome);', novo_schema, novo_schema);

    -- 9. MÓDULO 9: Ordem de Serviço (O.S.)
    EXECUTE format('
        CREATE TABLE %I.ordens_servico (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            colaborador_id UUID REFERENCES %I.funcionarios(id) ON DELETE SET NULL,
            veiculo_equipamento VARCHAR(255),
            descricao_problema TEXT,
            status VARCHAR(50) DEFAULT ''aberta'' CHECK (status IN (''aberta'', ''em_execucao'', ''concluida'', ''cancelada'')),
            valor_orcamento NUMERIC(10, 2) CHECK (valor_orcamento >= 0),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema);

    -- Índices para ordens_servico
    EXECUTE format('CREATE INDEX idx_%I_os_cliente ON %I.ordens_servico(cliente_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_os_colaborador ON %I.ordens_servico(colaborador_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_os_status ON %I.ordens_servico(status);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_os_criado_em ON %I.ordens_servico(criado_em DESC);', novo_schema, novo_schema);

    -- 9.1. Tabela auxiliar ordens_servico_itens
    EXECUTE format('
        CREATE TABLE %I.ordens_servico_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
            produto_id UUID REFERENCES %I.produtos(id) ON DELETE SET NULL,
            descricao TEXT NOT NULL,
            quantidade INTEGER DEFAULT 1 CHECK (quantidade > 0),
            preco_unitario NUMERIC(10, 2) CHECK (preco_unitario >= 0),
            subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * COALESCE(preco_unitario, 0)) STORED,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema);

    EXECUTE format('CREATE INDEX idx_%I_os_itens_os ON %I.ordens_servico_itens(ordem_servico_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_os_itens_produto ON %I.ordens_servico_itens(produto_id);', novo_schema, novo_schema);

    -- Trigger para histórico de status da OS
    EXECUTE format('
        CREATE TABLE %I.ordens_servico_historico (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
            status_anterior VARCHAR(50),
            status_novo VARCHAR(50) NOT NULL,
            alterado_por TEXT,
            alterado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Índice para histórico
    EXECUTE format('CREATE INDEX idx_%I_os_historico_os ON %I.ordens_servico_historico(ordem_servico_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_os_historico_alterado_em ON %I.ordens_servico_historico(alterado_em DESC);', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.registrar_historico_os()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $func$
        BEGIN
            IF OLD.status IS DISTINCT FROM NEW.status THEN
                INSERT INTO %I.ordens_servico_historico (ordem_servico_id, status_anterior, status_novo, alterado_por)
                VALUES (NEW.id, OLD.status, NEW.status, current_user);
            END IF;
            NEW.atualizado_em = NOW();
            RETURN NEW;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE TRIGGER trg_%I_os_historico
        BEFORE UPDATE ON %I.ordens_servico
        FOR EACH ROW
        EXECUTE FUNCTION %I.registrar_historico_os();
    ', novo_schema, novo_schema, novo_schema);

    -- 10. MÓDULO 11: Obras (NOVO)
    EXECUTE format('
        CREATE TABLE %I.obras (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            endereco TEXT,
            data_inicio DATE,
            data_fim_prevista DATE,
            data_fim_real DATE,
            status VARCHAR(50) DEFAULT ''planejada'' CHECK (status IN (''planejada'', ''em_andamento'', ''concluida'', ''cancelada'', ''paralisada'')),
            orcamento_total NUMERIC(10, 2) CHECK (orcamento_total >= 0),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT chk_obras_datas CHECK (data_fim_prevista IS NULL OR data_inicio IS NULL OR data_fim_prevista >= data_inicio)
        );
    ', novo_schema, novo_schema);

    -- Relacionamento obras ↔ ordens_servico (muitos para muitos)
    EXECUTE format('
        CREATE TABLE %I.obras_ordens_servico (
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
            PRIMARY KEY (obra_id, ordem_servico_id)
        );
    ', novo_schema, novo_schema, novo_schema);

    EXECUTE format('CREATE INDEX idx_%I_obras_cliente ON %I.obras(cliente_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_status ON %I.obras(status);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_criado_em ON %I.obras(criado_em DESC);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_ordens_servico_os ON %I.obras_ordens_servico(ordem_servico_id);', novo_schema, novo_schema);

    -- 10.1. MÓDULO 11.1: Etapas de Obras (NOVO)
    EXECUTE format('
        CREATE TABLE %I.obras_etapas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            data_prevista DATE NOT NULL,
            data_conclusao DATE,
            status VARCHAR(50) DEFAULT ''pendente'' CHECK (status IN (''pendente'', ''em_andamento'', ''concluida'')),
            ordem INTEGER NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Índices para obras_etapas
    EXECUTE format('CREATE INDEX idx_%I_obras_etapas_obra ON %I.obras_etapas(obra_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_etapas_status ON %I.obras_etapas(status);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_etapas_ordem ON %I.obras_etapas(obra_id, ordem);', novo_schema, novo_schema);

    -- Trigger para atualizar atualizado_em em obras_etapas
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.trigger_atualizar_obras_etapas()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.atualizado_em = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    ', novo_schema);

    EXECUTE format('
        CREATE TRIGGER trg_%I_atualizar_obras_etapas
        BEFORE UPDATE ON %I.obras_etapas
        FOR EACH ROW
        EXECUTE FUNCTION %I.trigger_atualizar_obras_etapas();
    ', novo_schema, novo_schema, novo_schema);

    -- 10.2. MÓDULO 11.2: Custos de Obras (NOVO)
    EXECUTE format('
        CREATE TABLE %I.obras_custos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            categoria VARCHAR(100) NOT NULL,
            descricao TEXT,
            valor_previsto NUMERIC(15, 2) NOT NULL CHECK (valor_previsto >= 0),
            valor_real NUMERIC(15, 2) CHECK (valor_real >= 0),
            data DATE NOT NULL,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN (''material'', ''mao_de_obra'', ''equipamento'', ''servico'', ''outro'')),
            fornecedor_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema);

    -- Índices para obras_custos
    EXECUTE format('CREATE INDEX idx_%I_obras_custos_obra ON %I.obras_custos(obra_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_custos_categoria ON %I.obras_custos(categoria);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_custos_tipo ON %I.obras_custos(tipo);', novo_schema, novo_schema);

    -- Trigger para atualizar atualizado_em em obras_custos
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.trigger_atualizar_obras_custos()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.atualizado_em = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    ', novo_schema);

    EXECUTE format('
        CREATE TRIGGER trg_%I_atualizar_obras_custos
        BEFORE UPDATE ON %I.obras_custos
        FOR EACH ROW
        EXECUTE FUNCTION %I.trigger_atualizar_obras_custos();
    ', novo_schema, novo_schema, novo_schema);

    -- 10.3. MÓDULO 11.3: Recursos de Obras (NOVO)
    EXECUTE format('
        CREATE TABLE %I.obras_recursos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN (''material'', ''mao_de_obra'', ''equipamento'')),
            descricao TEXT NOT NULL,
            quantidade NUMERIC(10, 2) NOT NULL CHECK (quantidade > 0),
            unidade VARCHAR(20) DEFAULT ''un'',
            custo_unitario NUMERIC(15, 2) NOT NULL CHECK (custo_unitario >= 0),
            custo_total NUMERIC(15, 2) GENERATED ALWAYS AS (quantidade * custo_unitario) STORED,
            status VARCHAR(50) DEFAULT ''alocado'' CHECK (status IN (''alocado'', ''em_uso'', ''liberado'')),
            data_alocacao DATE DEFAULT CURRENT_DATE,
            fornecedor_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema);

    -- Índices para obras_recursos
    EXECUTE format('CREATE INDEX idx_%I_obras_recursos_obra ON %I.obras_recursos(obra_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_recursos_tipo ON %I.obras_recursos(tipo);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_recursos_status ON %I.obras_recursos(status);', novo_schema, novo_schema);

    -- Trigger para atualizar atualizado_em em obras_recursos (não inclui custo_total pois é GENERATED)
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.trigger_atualizar_obras_recursos()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.atualizado_em = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    ', novo_schema);

    EXECUTE format('
        CREATE TRIGGER trg_%I_atualizar_obras_recursos
        BEFORE UPDATE ON %I.obras_recursos
        FOR EACH ROW
        EXECUTE FUNCTION %I.trigger_atualizar_obras_recursos();
    ', novo_schema, novo_schema, novo_schema);

    -- 10.4. MÓDULO 11.4: Documentos de Obras (NOVO)
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.obras_documentos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            nome VARCHAR(255) NOT NULL,
            tipo VARCHAR(100) NOT NULL,
            tamanho BIGINT NOT NULL,
            url TEXT NOT NULL,
            caminho_storage TEXT NOT NULL,
            descricao TEXT,
            criado_por UUID NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Índices para obras_documentos
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_obras_documentos_obra ON %I.obras_documentos(obra_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_obras_documentos_tipo ON %I.obras_documentos(tipo);', novo_schema, novo_schema);

    -- 11. MÓDULO 12: Comissões (NOVO)
    EXECUTE format('
        CREATE TABLE %I.regras_comissao (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            colaborador_id UUID NOT NULL REFERENCES %I.funcionarios(id) ON DELETE CASCADE,
            tipo_calculo VARCHAR(20) NOT NULL CHECK (tipo_calculo IN (''percentual'', ''valor_fixo'')),
            valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
            ativo BOOLEAN DEFAULT TRUE,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Índice para regras_comissao
    EXECUTE format('CREATE INDEX idx_%I_regras_comissao_colaborador ON %I.regras_comissao(colaborador_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_regras_comissao_ativo ON %I.regras_comissao(ativo);', novo_schema, novo_schema);

    EXECUTE format('
        CREATE TABLE %I.comissoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            colaborador_id UUID NOT NULL REFERENCES %I.funcionarios(id) ON DELETE CASCADE,
            venda_id UUID REFERENCES %I.vendas(id) ON DELETE SET NULL,
            regra_comissao_id UUID REFERENCES %I.regras_comissao(id) ON DELETE SET NULL,
            valor_comissao NUMERIC(10, 2) NOT NULL,
            valor_venda NUMERIC(10, 2),
            periodo_referencia DATE NOT NULL,
            status_pagamento VARCHAR(50) DEFAULT ''pendente'' CHECK (status_pagamento IN (''pendente'', ''pago'', ''cancelado'')),
            data_pagamento DATE,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema, novo_schema);

    -- Índice único para evitar duplicação de comissão por venda
    EXECUTE format('CREATE UNIQUE INDEX idx_%I_comissoes_venda_colaborador ON %I.comissoes(venda_id, colaborador_id) WHERE venda_id IS NOT NULL;', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_comissoes_colaborador ON %I.comissoes(colaborador_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_comissoes_periodo ON %I.comissoes(periodo_referencia);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_comissoes_status ON %I.comissoes(status_pagamento);', novo_schema, novo_schema);

    -- 12. MÓDULO 13: Configurações do Tenant
    EXECUTE format('
        CREATE TABLE %I.configuracoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chave VARCHAR(100) UNIQUE NOT NULL,
            valor JSONB NOT NULL CHECK (valor IS NOT NULL),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 12.1. Tabela de controle de idempotência para RPCs de escrita
    EXECUTE format('
        CREATE TABLE %I.idempotency_control (
            idempotency_key TEXT PRIMARY KEY,
            operation_type VARCHAR(50) NOT NULL,
            result JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- Índice para limpeza de registros antigos
    EXECUTE format('CREATE INDEX idx_%I_idempotency_created_at ON %I.idempotency_control(created_at);', novo_schema, novo_schema);

    -- 12.2. Tabela de permissões por role para RBAC intra-tenant
    EXECUTE format('
        CREATE TABLE %I.role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role VARCHAR(50) NOT NULL CHECK (role IN (''tenant_admin'', ''tenant_user'')),
            resource VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            allowed BOOLEAN NOT NULL DEFAULT true,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 12.3. Tabela de versionamento de schema para migrations
    EXECUTE format('
        CREATE TABLE %I.schema_migrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            version INTEGER NOT NULL UNIQUE,
            description TEXT NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 12.4. Tabela de auditoria para operações de negócio
    EXECUTE format('
        CREATE TABLE %I.audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            operation_type VARCHAR(50) NOT NULL,
            resource_type VARCHAR(50) NOT NULL,
            resource_id UUID,
            user_id UUID,
            changes JSONB,
            status VARCHAR(50) DEFAULT ''success'',
            error_message TEXT,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- Índices para audit_log
    EXECUTE format('CREATE INDEX idx_%I_audit_log_operation ON %I.audit_log(operation_type);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_audit_log_resource ON %I.audit_log(resource_type, resource_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_audit_log_user ON %I.audit_log(user_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_audit_log_created_at ON %I.audit_log(created_at DESC);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_audit_log_status ON %I.audit_log(status);', novo_schema, novo_schema);

    -- Índice para lookup rápido de versão
    EXECUTE format('CREATE INDEX idx_%I_schema_migrations_version ON %I.schema_migrations(version DESC);', novo_schema, novo_schema);

    -- Inserir versão inicial (v1.0)
    EXECUTE format('
        INSERT INTO %I.schema_migrations (version, description)
        VALUES (1, ''Versão inicial do schema tenant - Fluxo ERP v1.0'')
        ON CONFLICT (version) DO NOTHING;
    ', novo_schema);

    -- Índice para lookup rápido de permissões
    EXECUTE format('CREATE UNIQUE INDEX idx_%I_role_permissions_unique ON %I.role_permissions(role, resource, action);', novo_schema, novo_schema);

    -- Seed de permissões padrão
    EXECUTE format('
        INSERT INTO %I.role_permissions (role, resource, action, allowed) VALUES
        (''tenant_admin'', ''clientes'', ''ler'', true),
        (''tenant_admin'', ''clientes'', ''criar'', true),
        (''tenant_admin'', ''clientes'', ''editar'', true),
        (''tenant_admin'', ''clientes'', ''excluir'', true),
        (''tenant_admin'', ''produtos'', ''ler'', true),
        (''tenant_admin'', ''produtos'', ''criar'', true),
        (''tenant_admin'', ''produtos'', ''editar'', true),
        (''tenant_admin'', ''produtos'', ''excluir'', true),
        (''tenant_admin'', ''estoque'', ''ler'', true),
        (''tenant_admin'', ''estoque'', ''editar'', true),
        (''tenant_admin'', ''vendas'', ''ler'', true),
        (''tenant_admin'', ''vendas'', ''criar'', true),
        (''tenant_admin'', ''financeiro'', ''ler'', true),
        (''tenant_admin'', ''financeiro'', ''criar'', true),
        (''tenant_admin'', ''financeiro'', ''editar'', true),
        (''tenant_admin'', ''financeiro'', ''excluir'', true),
        (''tenant_admin'', ''funcionarios'', ''ler'', true),
        (''tenant_admin'', ''funcionarios'', ''criar'', true),
        (''tenant_admin'', ''funcionarios'', ''editar'', true),
        (''tenant_admin'', ''funcionarios'', ''excluir'', true),
        (''tenant_admin'', ''ordens_servico'', ''ler'', true),
        (''tenant_admin'', ''ordens_servico'', ''criar'', true),
        (''tenant_admin'', ''ordens_servico'', ''editar'', true),
        (''tenant_admin'', ''ordens_servico'', ''excluir'', true),
        (''tenant_admin'', ''obras'', ''ler'', true),
        (''tenant_admin'', ''obras'', ''criar'', true),
        (''tenant_admin'', ''obras'', ''editar'', true),
        (''tenant_admin'', ''obras'', ''excluir'', true),
        (''tenant_admin'', ''comissoes'', ''ler'', true),
        (''tenant_admin'', ''comissoes'', ''editar'', true),
        (''tenant_admin'', ''configuracoes'', ''ler'', true),
        (''tenant_admin'', ''configuracoes'', ''editar'', true),
        (''tenant_user'', ''clientes'', ''ler'', true),
        (''tenant_user'', ''clientes'', ''criar'', true),
        (''tenant_user'', ''clientes'', ''editar'', false),
        (''tenant_user'', ''clientes'', ''excluir'', false),
        (''tenant_user'', ''produtos'', ''ler'', true),
        (''tenant_user'', ''produtos'', ''criar'', false),
        (''tenant_user'', ''produtos'', ''editar'', false),
        (''tenant_user'', ''produtos'', ''excluir'', false),
        (''tenant_user'', ''estoque'', ''ler'', true),
        (''tenant_user'', ''estoque'', ''editar'', false),
        (''tenant_user'', ''vendas'', ''ler'', true),
        (''tenant_user'', ''vendas'', ''criar'', true),
        (''tenant_user'', ''financeiro'', ''ler'', true),
        (''tenant_user'', ''financeiro'', ''criar'', false),
        (''tenant_user'', ''financeiro'', ''editar'', false),
        (''tenant_user'', ''financeiro'', ''excluir'', false),
        (''tenant_user'', ''funcionarios'', ''ler'', true),
        (''tenant_user'', ''funcionarios'', ''criar'', false),
        (''tenant_user'', ''funcionarios'', ''editar'', false),
        (''tenant_user'', ''funcionarios'', ''excluir'', false),
        (''tenant_user'', ''ordens_servico'', ''ler'', true),
        (''tenant_user'', ''ordens_servico'', ''criar'', true),
        (''tenant_user'', ''ordens_servico'', ''editar'', false),
        (''tenant_user'', ''ordens_servico'', ''excluir'', false),
        (''tenant_user'', ''obras'', ''ler'', true),
        (''tenant_user'', ''obras'', ''criar'', false),
        (''tenant_user'', ''obras'', ''editar'', false),
        (''tenant_user'', ''obras'', ''excluir'', false),
        (''tenant_user'', ''comissoes'', ''ler'', true),
        (''tenant_user'', ''comissoes'', ''editar'', false),
        (''tenant_user'', ''configuracoes'', ''ler'', false),
        (''tenant_user'', ''configuracoes'', ''editar'', false)
        ON CONFLICT (role, resource, action) DO NOTHING;
    ', novo_schema);

    -- Índice explícito para configurações
    EXECUTE format('CREATE INDEX idx_%I_configuracoes_chave ON %I.configuracoes(chave);', novo_schema, novo_schema);

    -- Garantir que as tabelas criadas também não sejam acessíveis por anon/authenticated
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', novo_schema);

    -- Criar RPCs de leitura dentro do schema tenant
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
    ', novo_schema, novo_schema);

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
    ', novo_schema, novo_schema);

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
    ', novo_schema, novo_schema);

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
    ', novo_schema, novo_schema);

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
    ', novo_schema, novo_schema);

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
    ', novo_schema, novo_schema);

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
            id, cliente_id, nome, descricao, endereco, data_inicio, data_fim_prevista, 
            data_fim_real, status, orcamento_total, criado_em, atualizado_em 
          FROM obras 
          ORDER BY criado_em DESC 
          LIMIT p_limit OFFSET p_offset;
        END;
        $func$;
    ', novo_schema, novo_schema);

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
    ', novo_schema, novo_schema);

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
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_regras_comissao(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
        RETURNS TABLE (
          id UUID,
          colaborador_id UUID,
          tipo_calculo VARCHAR(20),
          valor NUMERIC(10, 2),
          ativo BOOLEAN,
          criado_em TIMESTAMPTZ
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          RETURN QUERY
          SELECT id, colaborador_id, tipo_calculo, valor, ativo, criado_em
          FROM regras_comissao
          ORDER BY criado_em DESC
          LIMIT p_limit OFFSET p_offset;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_regra_comissao(
          p_colaborador_id UUID,
          p_tipo_calculo VARCHAR(20),
          p_valor NUMERIC(10, 2),
          p_ativo BOOLEAN DEFAULT TRUE
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_regra_id UUID;
        BEGIN
          INSERT INTO regras_comissao (
            colaborador_id,
            tipo_calculo,
            valor,
            ativo
          ) VALUES (
            p_colaborador_id,
            p_tipo_calculo,
            p_valor,
            COALESCE(p_ativo, TRUE)
          )
          RETURNING id INTO v_regra_id;

          RETURN jsonb_build_object(''success'', TRUE, ''regra_id'', v_regra_id);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_regra_comissao(p_regra_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM regras_comissao WHERE id = p_regra_id;
          RETURN jsonb_build_object(''success'', TRUE);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_atualizar_comissao(
          p_comissao_id UUID,
          p_status_pagamento VARCHAR(50),
          p_data_pagamento DATE DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          UPDATE comissoes
          SET
            status_pagamento = COALESCE(p_status_pagamento, status_pagamento),
            data_pagamento = COALESCE(p_data_pagamento, data_pagamento)
          WHERE id = p_comissao_id;

          RETURN jsonb_build_object(''success'', TRUE, ''comissao_id'', p_comissao_id);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPCs de escrita dentro do schema tenant
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_cliente(
          p_nome VARCHAR(255),
          p_email VARCHAR(255),
          p_telefone VARCHAR(50),
          p_funil_fase VARCHAR(50),
          p_status VARCHAR(50),
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_cliente_id UUID;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_cliente'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO clientes (nome, email, telefone, funil_fase, status)
          VALUES (p_nome, p_email, p_telefone, p_funil_fase, p_status)
          RETURNING id INTO v_cliente_id;

          v_cached_result := json_build_object(
            ''success'', true,
            ''cliente_id'', v_cliente_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_cliente'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION ''Erro ao criar cliente: %'', SQLERRM;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_produto(
          p_nome VARCHAR(255),
          p_descricao TEXT,
          p_tipo VARCHAR(50),
          p_preco_base NUMERIC(10, 2),
          p_sku VARCHAR(100),
          p_qtd_inicial INT DEFAULT 0,
          p_qtd_minima INT DEFAULT 10,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_produto_id UUID;
          v_estoque_id UUID;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_produto'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO produtos (nome, descricao, tipo, preco_base)
          VALUES (p_nome, p_descricao, p_tipo, p_preco_base)
          RETURNING id INTO v_produto_id;

          INSERT INTO estoque (produto_id, sku, quantidade, quantidade_minima)
          VALUES (v_produto_id, p_sku, p_qtd_inicial, p_qtd_minima)
          RETURNING id INTO v_estoque_id;

          v_cached_result := json_build_object(
            ''success'', true,
            ''produto_id'', v_produto_id,
            ''estoque_id'', v_estoque_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_produto'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION ''Erro ao criar produto: %'', SQLERRM;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_financeiro(
          p_tipo VARCHAR(20),
          p_descricao TEXT,
          p_valor NUMERIC(10, 2),
          p_data_vencimento DATE,
          p_status VARCHAR(50),
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_financeiro_id UUID;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_financeiro'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO financeiro (tipo, descricao, valor, data_vencimento, status)
          VALUES (p_tipo, p_descricao, p_valor, p_data_vencimento, p_status)
          RETURNING id INTO v_financeiro_id;

          v_cached_result := json_build_object(
            ''success'', true,
            ''financeiro_id'', v_financeiro_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_financeiro'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION ''Erro ao criar financeiro: %'', SQLERRM;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_os(
          p_cliente_id UUID,
          p_colaborador_id UUID,
          p_veiculo_equipamento VARCHAR(255),
          p_descricao_problema TEXT,
          p_status VARCHAR(50),
          p_valor_orcamento NUMERIC(10, 2),
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_os_id UUID;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_os'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO ordens_servico (cliente_id, colaborador_id, veiculo_equipamento, descricao_problema, status, valor_orcamento)
          VALUES (p_cliente_id, p_colaborador_id, p_veiculo_equipamento, p_descricao_problema, p_status, p_valor_orcamento)
          RETURNING id INTO v_os_id;

          v_cached_result := json_build_object(
            ''success'', true,
            ''os_id'', v_os_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_os'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION ''Erro ao criar OS: %'', SQLERRM;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_obra(
          p_cliente_id UUID,
          p_nome VARCHAR(255),
          p_descricao TEXT,
          p_endereco TEXT,
          p_data_inicio DATE,
          p_data_fim_prevista DATE,
          p_status VARCHAR(50),
          p_orcamento_total NUMERIC(10, 2),
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_obra_id UUID;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_obra'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO obras (cliente_id, nome, descricao, endereco, data_inicio, data_fim_prevista, status, orcamento_total)
          VALUES (p_cliente_id, p_nome, p_descricao, p_endereco, p_data_inicio, p_data_fim_prevista, p_status, p_orcamento_total)
          RETURNING id INTO v_obra_id;

          v_cached_result := json_build_object(
            ''success'', true,
            ''obra_id'', v_obra_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_obra'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION ''Erro ao criar obra: %'', SQLERRM;
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPC de atualização dentro do schema tenant
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_atualizar_obra(
          p_obra_id UUID,
          p_nome VARCHAR(255),
          p_descricao TEXT,
          p_endereco TEXT,
          p_data_inicio DATE,
          p_data_fim_prevista DATE,
          p_status VARCHAR(50),
          p_orcamento_total NUMERIC(10, 2),
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_atualizar_obra'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          -- Atualizar obra
          UPDATE obras
          SET 
            nome = p_nome,
            descricao = p_descricao,
            endereco = p_endereco,
            data_inicio = p_data_inicio,
            data_fim_prevista = p_data_fim_prevista,
            status = p_status,
            orcamento_total = p_orcamento_total,
            atualizado_em = NOW()
          WHERE id = p_obra_id;

          IF NOT FOUND THEN
            RETURN jsonb_build_object(''error'', ''Obra não encontrada'');
          END IF;

          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''UPDATE'', ''obras'', p_obra_id, auth.uid(), 
            jsonb_build_object(''nome'', p_nome, ''status'', p_status),
            ''success''
          );

          v_result := jsonb_build_object(
            ''success'', true,
            ''obra_id'', p_obra_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_atualizar_obra'', v_result);
          END IF;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPCs de etapas de obras dentro do schema tenant
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_etapa_obra(
          p_obra_id UUID,
          p_nome VARCHAR(255),
          p_descricao TEXT,
          p_data_prevista DATE,
          p_ordem INTEGER,
          p_status VARCHAR(50) DEFAULT ''pendente'',
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_etapa_id UUID;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_etapa_obra'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO obras_etapas (obra_id, nome, descricao, data_prevista, ordem, status)
          VALUES (p_obra_id, p_nome, p_descricao, p_data_prevista, p_ordem, p_status)
          RETURNING id INTO v_etapa_id;

          v_cached_result := jsonb_build_object(
            ''success'', true,
            ''etapa_id'', v_etapa_id
          );

          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''CREATE'', ''obras_etapas'', v_etapa_id, auth.uid(), 
            jsonb_build_object(''nome'', p_nome, ''obra_id'', p_obra_id),
            ''success''
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_etapa_obra'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_etapas_obra(p_obra_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT jsonb_agg(row_to_json(t))
          INTO v_result
          FROM (
            SELECT id, obra_id, nome, descricao, data_prevista, data_conclusao, status, ordem, criado_em, atualizado_em
            FROM obras_etapas
            WHERE obra_id = p_obra_id
            ORDER BY ordem ASC
          ) t;
          
          RETURN COALESCE(v_result, ''[]''::JSONB);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_atualizar_etapa_obra(
          p_etapa_id UUID,
          p_nome VARCHAR(255),
          p_descricao TEXT,
          p_data_prevista DATE,
          p_data_conclusao DATE,
          p_status VARCHAR(50),
          p_ordem INTEGER,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_atualizar_etapa_obra'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          UPDATE obras_etapas
          SET 
            nome = p_nome,
            descricao = p_descricao,
            data_prevista = p_data_prevista,
            data_conclusao = p_data_conclusao,
            status = p_status,
            ordem = p_ordem
          WHERE id = p_etapa_id;

          IF NOT FOUND THEN
            RETURN jsonb_build_object(''error'', ''Etapa não encontrada'');
          END IF;

          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''UPDATE'', ''obras_etapas'', p_etapa_id, auth.uid(), 
            jsonb_build_object(''nome'', p_nome, ''status'', p_status),
            ''success''
          );

          v_result := jsonb_build_object(
            ''success'', true,
            ''etapa_id'', p_etapa_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_atualizar_etapa_obra'', v_result);
          END IF;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_etapa_obra(p_etapa_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM obras_etapas WHERE id = p_etapa_id;
          
          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''DELETE'', ''obras_etapas'', p_etapa_id, auth.uid(), 
            jsonb_build_object(''etapa_id'', p_etapa_id),
            ''success''
          );
          
          RETURN jsonb_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_obras_progresso(p_obra_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_total INTEGER;
          v_concluidas INTEGER;
          v_em_andamento INTEGER;
          v_pendentes INTEGER;
          v_percentual NUMERIC;
        BEGIN
          SELECT 
            COUNT(*) INTO v_total
          FROM obras_etapas
          WHERE obra_id = p_obra_id;
          
          SELECT 
            COUNT(*) INTO v_concluidas
          FROM obras_etapas
          WHERE obra_id = p_obra_id AND status = ''concluida'';
          
          SELECT 
            COUNT(*) INTO v_em_andamento
          FROM obras_etapas
          WHERE obra_id = p_obra_id AND status = ''em_andamento'';
          
          SELECT 
            COUNT(*) INTO v_pendentes
          FROM obras_etapas
          WHERE obra_id = p_obra_id AND status = ''pendente'';
          
          IF v_total > 0 THEN
            v_percentual := (v_concluidas::NUMERIC / v_total::NUMERIC) * 100;
          ELSE
            v_percentual := 0;
          END IF;
          
          RETURN jsonb_build_object(
            ''total'', v_total,
            ''concluidas'', v_concluidas,
            ''em_andamento'', v_em_andamento,
            ''pendentes'', v_pendentes,
            ''percentual'', ROUND(v_percentual, 1)
          );
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPCs de custos de obras dentro do schema tenant
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_custo_obra(
          p_obra_id UUID,
          p_categoria VARCHAR(100),
          p_descricao TEXT,
          p_valor_previsto NUMERIC(15, 2),
          p_data DATE,
          p_tipo VARCHAR(50),
          p_fornecedor_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_custo_id UUID;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_custo_obra'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO obras_custos (obra_id, categoria, descricao, valor_previsto, data, tipo, fornecedor_id)
          VALUES (p_obra_id, p_categoria, p_descricao, p_valor_previsto, p_data, p_tipo, p_fornecedor_id)
          RETURNING id INTO v_custo_id;

          v_cached_result := jsonb_build_object(
            ''success'', true,
            ''custo_id'', v_custo_id
          );

          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''CREATE'', ''obras_custos'', v_custo_id, auth.uid(), 
            jsonb_build_object(''categoria'', p_categoria, ''tipo'', p_tipo, ''valor_previsto'', p_valor_previsto),
            ''success''
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_custo_obra'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_custos_obra(p_obra_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT jsonb_agg(row_to_json(t))
          INTO v_result
          FROM (
            SELECT id, obra_id, categoria, descricao, valor_previsto, valor_real, data, tipo, fornecedor_id, criado_em, atualizado_em
            FROM obras_custos
            WHERE obra_id = p_obra_id
            ORDER BY data DESC
          ) t;
          
          RETURN COALESCE(v_result, ''[]''::JSONB);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_atualizar_custo_obra(
          p_custo_id UUID,
          p_categoria VARCHAR(100),
          p_descricao TEXT,
          p_valor_previsto NUMERIC(15, 2),
          p_valor_real NUMERIC(15, 2),
          p_data DATE,
          p_tipo VARCHAR(50),
          p_fornecedor_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_atualizar_custo_obra'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          UPDATE obras_custos
          SET 
            categoria = p_categoria,
            descricao = p_descricao,
            valor_previsto = p_valor_previsto,
            valor_real = p_valor_real,
            data = p_data,
            tipo = p_tipo,
            fornecedor_id = p_fornecedor_id
          WHERE id = p_custo_id;

          IF NOT FOUND THEN
            RETURN jsonb_build_object(''error'', ''Custo não encontrado'');
          END IF;

          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''UPDATE'', ''obras_custos'', p_custo_id, auth.uid(), 
            jsonb_build_object(''categoria'', p_categoria, ''tipo'', p_tipo),
            ''success''
          );

          v_result := jsonb_build_object(
            ''success'', true,
            ''custo_id'', p_custo_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_atualizar_custo_obra'', v_result);
          END IF;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_custo_obra(p_custo_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM obras_custos WHERE id = p_custo_id;
          
          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''DELETE'', ''obras_custos'', p_custo_id, auth.uid(), 
            jsonb_build_object(''custo_id'', p_custo_id),
            ''success''
          );
          
          RETURN jsonb_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_obras_resumo_financeiro(p_obra_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_orcamento_total NUMERIC;
          v_total_previsto NUMERIC;
          v_total_real NUMERIC;
          v_variacao NUMERIC;
          v_percentual_utilizado NUMERIC;
        BEGIN
          SELECT COALESCE(orcamento_total, 0) INTO v_orcamento_total
          FROM obras WHERE id = p_obra_id;
          
          SELECT COALESCE(SUM(valor_previsto), 0) INTO v_total_previsto
          FROM obras_custos WHERE obra_id = p_obra_id;
          
          SELECT COALESCE(SUM(valor_real), 0) INTO v_total_real
          FROM obras_custos WHERE obra_id = p_obra_id AND valor_real IS NOT NULL;
          
          v_variacao := v_total_real - v_total_previsto;
          
          IF v_orcamento_total > 0 THEN
            v_percentual_utilizado := (v_total_real / v_orcamento_total) * 100;
          ELSE
            v_percentual_utilizado := 0;
          END IF;
          
          RETURN jsonb_build_object(
            ''orcamento_total'', v_orcamento_total,
            ''total_previsto'', v_total_previsto,
            ''total_real'', v_total_real,
            ''variacao'', v_variacao,
            ''percentual_orcamento_utilizado'', ROUND(v_percentual_utilizado, 1)
          );
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPCs de recursos de obras dentro do schema tenant
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_alocar_recurso_obra(
          p_obra_id UUID,
          p_tipo VARCHAR(50),
          p_descricao TEXT,
          p_quantidade NUMERIC(10, 2),
          p_unidade VARCHAR(20),
          p_custo_unitario NUMERIC(15, 2),
          p_status VARCHAR(50),
          p_data_alocacao DATE,
          p_fornecedor_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_recurso_id UUID;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_alocar_recurso_obra'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO obras_recursos (obra_id, tipo, descricao, quantidade, unidade, custo_unitario, status, data_alocacao, fornecedor_id)
          VALUES (p_obra_id, p_tipo, p_descricao, p_quantidade, p_unidade, p_custo_unitario, p_status, p_data_alocacao, p_fornecedor_id)
          RETURNING id INTO v_recurso_id;

          v_cached_result := jsonb_build_object(
            ''success'', true,
            ''recurso_id'', v_recurso_id
          );

          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''CREATE'', ''obras_recursos'', v_recurso_id, auth.uid(), 
            jsonb_build_object(''tipo'', p_tipo, ''descricao'', p_descricao),
            ''success''
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_alocar_recurso_obra'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_recursos_obra(p_obra_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT jsonb_agg(row_to_json(t))
          INTO v_result
          FROM (
            SELECT id, obra_id, tipo, descricao, quantidade, unidade, custo_unitario, custo_total, status, data_alocacao, fornecedor_id, criado_em, atualizado_em
            FROM obras_recursos
            WHERE obra_id = p_obra_id
            ORDER BY data_alocacao DESC
          ) t;
          
          RETURN COALESCE(v_result, ''[]''::JSONB);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_atualizar_recurso_obra(
          p_recurso_id UUID,
          p_tipo VARCHAR(50),
          p_descricao TEXT,
          p_quantidade NUMERIC(10, 2),
          p_unidade VARCHAR(20),
          p_custo_unitario NUMERIC(15, 2),
          p_status VARCHAR(50),
          p_data_alocacao DATE,
          p_fornecedor_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_atualizar_recurso_obra'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          UPDATE obras_recursos
          SET 
            tipo = p_tipo,
            descricao = p_descricao,
            quantidade = p_quantidade,
            unidade = p_unidade,
            custo_unitario = p_custo_unitario,
            status = p_status,
            data_alocacao = p_data_alocacao,
            fornecedor_id = p_fornecedor_id
          WHERE id = p_recurso_id;

          IF NOT FOUND THEN
            RETURN jsonb_build_object(''error'', ''Recurso não encontrado'');
          END IF;

          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''UPDATE'', ''obras_recursos'', p_recurso_id, auth.uid(), 
            jsonb_build_object(''tipo'', p_tipo, ''descricao'', p_descricao),
            ''success''
          );

          v_result := jsonb_build_object(
            ''success'', true,
            ''recurso_id'', p_recurso_id
          );

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_atualizar_recurso_obra'', v_result);
          END IF;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_recurso_obra(p_recurso_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM obras_recursos WHERE id = p_recurso_id;
          
          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''DELETE'', ''obras_recursos'', p_recurso_id, auth.uid(), 
            jsonb_build_object(''recurso_id'', p_recurso_id),
            ''success''
          );
          
          RETURN jsonb_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPCs de documentos de obras dentro do schema tenant
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_upload_documento_obra(
          p_obra_id UUID,
          p_nome VARCHAR(255),
          p_tipo VARCHAR(100),
          p_tamanho BIGINT,
          p_url TEXT,
          p_caminho_storage TEXT,
          p_descricao TEXT,
          p_criado_por UUID
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_documento_id UUID;
        BEGIN
          INSERT INTO obras_documentos (obra_id, nome, tipo, tamanho, url, caminho_storage, descricao, criado_por)
          VALUES (p_obra_id, p_nome, p_tipo, p_tamanho, p_url, p_caminho_storage, p_descricao, p_criado_por)
          RETURNING id INTO v_documento_id;

          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''CREATE'', ''obras_documentos'', v_documento_id, p_criado_por, 
            jsonb_build_object(''nome'', p_nome, ''tipo'', p_tipo, ''tamanho'', p_tamanho),
            ''success''
          );
          
          RETURN jsonb_build_object(
            ''success'', true,
            ''documento_id'', v_documento_id
          );
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_documentos_obra(p_obra_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT jsonb_agg(row_to_json(t))
          INTO v_result
          FROM (
            SELECT id, obra_id, nome, tipo, tamanho, url, caminho_storage, descricao, criado_por, criado_em
            FROM obras_documentos
            WHERE obra_id = p_obra_id
            ORDER BY criado_em DESC
          ) t;
          
          RETURN COALESCE(v_result, ''[]''::JSONB);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_documento_obra(p_documento_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_caminho_storage TEXT;
          v_criado_por UUID;
        BEGIN
          SELECT caminho_storage, criado_por INTO v_caminho_storage, v_criado_por
          FROM obras_documentos
          WHERE id = p_documento_id;
          
          IF v_caminho_storage IS NULL THEN
            RETURN jsonb_build_object(''error'', ''Documento não encontrado'');
          END IF;
          
          DELETE FROM obras_documentos WHERE id = p_documento_id;
          
          -- Registrar em audit_log
          INSERT INTO audit_log (
            operation_type, resource, resource_id, user_id, details, status
          )
          VALUES (
            ''DELETE'', ''obras_documentos'', p_documento_id, v_criado_por, 
            jsonb_build_object(''caminho_storage'', v_caminho_storage),
            ''success''
          );
          
          RETURN jsonb_build_object(''success'', true, ''caminho_storage'', v_caminho_storage);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPCs de exclusão dentro do schema tenant
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_cliente(p_cliente_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM clientes WHERE id = p_cliente_id;
          RETURN json_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
          RAISE;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_produto(p_produto_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM estoque WHERE produto_id = p_produto_id;
          DELETE FROM produtos WHERE id = p_produto_id;
          RETURN json_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
          RAISE;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_verificar_alertas_estoque()
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_alertas_criados INT;
          v_tipo_alerta VARCHAR(50);
          v_mensagem TEXT;
        BEGIN
          -- Criar alertas para produtos com estoque abaixo do mínimo
          INSERT INTO alertas_estoque (produto_id, tipo_alerta, estoque_atual, estoque_minimo, mensagem, status)
          SELECT 
            e.produto_id,
            CASE 
              WHEN e.quantidade = 0 THEN ''sem_estoque''
              ELSE ''estoque_baixo''
            END as tipo_alerta,
            e.quantidade as estoque_atual,
            e.quantidade_minima as estoque_minimo,
            CONCAT(''Estoque do produto "'', p.nome, ''" está abaixo do mínimo. Atual: '', e.quantidade, '', Mínimo: '', e.quantidade_minima) as mensagem,
            ''pendente'' as status
          FROM estoque e
          JOIN produtos p ON e.produto_id = p.id
          WHERE e.quantidade <= e.quantidade_minima
            AND e.quantidade_minima > 0
            AND NOT EXISTS (
              SELECT 1 FROM alertas_estoque a
              WHERE a.produto_id = e.produto_id
                AND a.status = ''pendente''
                AND a.criado_em > NOW() - INTERVAL ''24 hours''
            );
          
          GET DIAGNOSTICS v_alertas_criados = ROW_COUNT;
          
          RETURN jsonb_build_object(''success'', true, ''alertas_criados'', v_alertas_criados);
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_alertas_estoque(p_status VARCHAR DEFAULT NULL, p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          RETURN COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                ''id'', sub.id,
                ''produto_id'', sub.produto_id,
                ''produto_nome'', sub.nome,
                ''tipo_alerta'', sub.tipo_alerta,
                ''estoque_atual'', sub.estoque_atual,
                ''estoque_minimo'', sub.estoque_minimo,
                ''mensagem'', sub.mensagem,
                ''status'', sub.status,
                ''criado_em'', sub.criado_em,
                ''resolvido_em'', sub.resolvido_em
              )
            )
            FROM (
              SELECT a.*, p.nome
              FROM alertas_estoque a
              JOIN produtos p ON a.produto_id = p.id
              WHERE (p_status IS NULL OR a.status = p_status)
              ORDER BY a.criado_em DESC
              LIMIT p_limit OFFSET p_offset
            ) sub),
            ''[]''::JSONB
          );
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_resolver_alerta_estoque(
          p_alerta_id UUID,
          p_status VARCHAR,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_resolver_alerta_estoque'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          -- Atualizar alerta
          UPDATE alertas_estoque
          SET status = p_status,
              resolvido_em = CASE WHEN p_status = ''resolvido'' THEN NOW() ELSE NULL END
          WHERE id = p_alerta_id;

          -- Registrar em audit_log
          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''UPDATE'', ''alertas_estoque'', p_alerta_id, auth.uid(), jsonb_build_object(''status'', p_status), ''success'');

          v_cached_result := jsonb_build_object(''success'', true);

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_resolver_alerta_estoque'', v_cached_result);
          END IF;

          RETURN v_cached_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_kit(
          p_produto_id UUID,
          p_nome VARCHAR(255),
          p_descricao TEXT,
          p_itens JSONB,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_kit_id UUID;
          v_item JSONB;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_kit'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          -- Criar kit
          INSERT INTO kits (produto_id, nome, descricao)
          VALUES (p_produto_id, p_nome, p_descricao)
          RETURNING id INTO v_kit_id;

          -- Inserir itens do kit
          FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
            INSERT INTO kit_itens (kit_id, produto_id, quantidade)
            VALUES (
              v_kit_id,
              (v_item->>''produto_id'')::UUID,
              (v_item->>''quantidade'')::INT
            );
          END LOOP;

          -- Registrar em audit_log
          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''CREATE'', ''kits'', v_kit_id, auth.uid(), jsonb_build_object(''nome'', p_nome, ''itens'', p_itens), ''success'');

          v_cached_result := jsonb_build_object(''success'', true, ''kit_id'', v_kit_id);

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_kit'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_kits()
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                ''id'', k.id,
                ''produto_id'', k.produto_id,
                ''produto_nome'', p.nome,
                ''nome'', k.nome,
                ''descricao'', k.descricao,
                ''ativo'', k.ativo,
                ''criado_em'', k.criado_em,
                ''atualizado_em'', k.atualizado_em,
                ''itens'', (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      ''id'', ki.id,
                      ''produto_id'', ki.produto_id,
                      ''produto_nome'', pi.nome,
                      ''quantidade'', ki.quantidade
                    )
                  )
                  FROM kit_itens ki
                  JOIN produtos pi ON ki.produto_id = pi.id
                  WHERE ki.kit_id = k.id
                )
              )
            ),
            ''[]''::JSONB
          ) INTO v_result
          FROM kits k
          JOIN produtos p ON k.produto_id = p.id
          WHERE k.ativo = true
          ORDER BY k.criado_em DESC;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_kit(
          p_kit_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_excluir_kit'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          -- Soft delete
          UPDATE kits SET ativo = false WHERE id = p_kit_id;

          -- Registrar em audit_log
          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''DELETE'', ''kits'', p_kit_id, auth.uid(), jsonb_build_object(''soft_delete'', true), ''success'');

          v_cached_result := jsonb_build_object(''success'', true);

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_excluir_kit'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_vender_kit(
          p_kit_id UUID,
          p_quantidade INT DEFAULT 1,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_item RECORD;
          v_qtd_baixar INT;
          v_estoque_atual INT;
          v_produto_nome VARCHAR(255);
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_vender_kit'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          -- Verificar estoque de cada item
          FOR v_item IN 
            SELECT ki.produto_id, ki.quantidade, p.nome as produto_nome
            FROM kit_itens ki
            JOIN produtos p ON ki.produto_id = p.id
            WHERE ki.kit_id = p_kit_id
          LOOP
            -- Obter estoque atual do produto
            SELECT e.quantidade INTO v_estoque_atual
            FROM estoque e
            WHERE e.produto_id = v_item.produto_id;

            v_qtd_baixar := v_item.quantidade * p_quantidade;

            IF v_estoque_atual < v_qtd_baixar THEN
              RETURN jsonb_build_object(''error'', ''Estoque insuficiente para '' || v_item.produto_nome);
            END IF;
          END LOOP;

          -- Baixar estoque de cada item
          FOR v_item IN 
            SELECT ki.produto_id, ki.quantidade
            FROM kit_itens ki
            WHERE ki.kit_id = p_kit_id
          LOOP
            v_qtd_baixar := v_item.quantidade * p_quantidade;

            -- Atualizar estoque
            UPDATE estoque
            SET quantidade = quantidade - v_qtd_baixar,
                atualizado_em = NOW()
            WHERE produto_id = v_item.produto_id;

            -- Registrar movimento de estoque
            INSERT INTO estoque (produto_id, quantidade, quantidade_minima)
            VALUES (v_item.produto_id, -v_qtd_baixar, 10);
          END LOOP;

          -- Registrar em audit_log
          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''UPDATE'', ''kits'', p_kit_id, auth.uid(), jsonb_build_object(''quantidade'', p_quantidade), ''success'');

          v_cached_result := jsonb_build_object(''success'', true);

          -- Armazenar resultado para idempotência
          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_vender_kit'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_local_estoque(
          p_nome VARCHAR(255),
          p_tipo VARCHAR(50),
          p_endereco TEXT,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_local_id UUID;
          v_cached_result JSONB;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_local_estoque'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          INSERT INTO locais_estoque (nome, tipo, endereco)
          VALUES (p_nome, p_tipo, p_endereco)
          RETURNING id INTO v_local_id;

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''CREATE'', ''locais_estoque'', v_local_id, auth.uid(), jsonb_build_object(''nome'', p_nome, ''tipo'', p_tipo), ''success'');

          v_cached_result := jsonb_build_object(''success'', true, ''local_id'', v_local_id);

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_local_estoque'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_locais_estoque()
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                ''id'', l.id,
                ''nome'', l.nome,
                ''tipo'', l.tipo,
                ''endereco'', l.endereco,
                ''ativo'', l.ativo,
                ''criado_em'', l.criado_em
              )
            ),
            ''[]''::JSONB
          ) INTO v_result
          FROM locais_estoque l
          WHERE l.ativo = true
          ORDER BY l.criado_em DESC;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_desativar_local_estoque(
          p_local_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_cached_result JSONB;
          v_total_estoque INT;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_desativar_local_estoque'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          SELECT COALESCE(SUM(quantidade), 0) INTO v_total_estoque
          FROM estoque_por_local
          WHERE local_id = p_local_id;

          IF v_total_estoque > 0 THEN
            RETURN jsonb_build_object(''error'', ''Não é possível desativar local com estoque. Estoque atual: '' || v_total_estoque);
          END IF;

          UPDATE locais_estoque SET ativo = false WHERE id = p_local_id;

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''UPDATE'', ''locais_estoque'', p_local_id, auth.uid(), jsonb_build_object(''soft_delete'', true), ''success'');

          v_cached_result := jsonb_build_object(''success'', true);

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_desativar_local_estoque'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_criar_transferencia(
          p_produto_id UUID,
          p_local_origem_id UUID,
          p_local_destino_id UUID,
          p_quantidade INT,
          p_observacao TEXT,
          p_criado_por UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_transferencia_id UUID;
          v_estoque_origem INT;
          v_cached_result JSONB;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_transferencia'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          IF p_local_origem_id = p_local_destino_id THEN
            RETURN jsonb_build_object(''error'', ''Local de origem e destino devem ser diferentes'');
          END IF;

          SELECT COALESCE(quantidade, 0) INTO v_estoque_origem
          FROM estoque_por_local
          WHERE produto_id = p_produto_id AND local_id = p_local_origem_id;

          IF v_estoque_origem IS NULL OR v_estoque_origem < p_quantidade THEN
            RETURN jsonb_build_object(''error'', ''Estoque insuficiente na origem. Disponível: '' || COALESCE(v_estoque_origem, 0));
          END IF;

          INSERT INTO transferencias_estoque (
            produto_id, local_origem_id, local_destino_id, quantidade, 
            observacao, criado_por, status
          )
          VALUES (
            p_produto_id, p_local_origem_id, p_local_destino_id, p_quantidade,
            p_observacao, p_criado_por, ''pendente''
          )
          RETURNING id INTO v_transferencia_id;

          UPDATE estoque_por_local
          SET quantidade = quantidade - p_quantidade,
              atualizado_em = NOW()
          WHERE produto_id = p_produto_id AND local_id = p_local_origem_id;

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''CREATE'', ''transferencias_estoque'', v_transferencia_id, p_criado_por, jsonb_build_object(''quantidade'', p_quantidade), ''success'');

          v_cached_result := jsonb_build_object(''success'', true, ''transferencia_id'', v_transferencia_id);

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_criar_transferencia'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_concluir_transferencia(
          p_transferencia_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_produto_id UUID;
          v_local_destino_id UUID;
          v_quantidade INT;
          v_cached_result JSONB;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_concluir_transferencia'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          SELECT produto_id, local_destino_id, quantidade
          INTO v_produto_id, v_local_destino_id, v_quantidade
          FROM transferencias_estoque
          WHERE id = p_transferencia_id AND status = ''pendente'';

          IF NOT FOUND THEN
            RETURN jsonb_build_object(''error'', ''Transferência não encontrada ou já processada'');
          END IF;

          UPDATE transferencias_estoque
          SET status = ''concluida'', concluida_em = NOW()
          WHERE id = p_transferencia_id;

          INSERT INTO estoque_por_local (produto_id, local_id, quantidade, criado_em, atualizado_em)
          VALUES (v_produto_id, v_local_destino_id, v_quantidade, NOW(), NOW())
          ON CONFLICT (produto_id, local_id) 
          DO UPDATE SET 
            quantidade = estoque_por_local.quantidade + EXCLUDED.quantidade,
            atualizado_em = NOW();

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''UPDATE'', ''transferencias_estoque'', p_transferencia_id, auth.uid(), jsonb_build_object(''quantidade'', v_quantidade), ''success'');

          v_cached_result := jsonb_build_object(''success'', true);

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_concluir_transferencia'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_cancelar_transferencia(
          p_transferencia_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_local_origem_id UUID;
          v_produto_id UUID;
          v_quantidade INT;
          v_cached_result JSONB;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_cancelar_transferencia'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          SELECT local_origem_id, produto_id, quantidade
          INTO v_local_origem_id, v_produto_id, v_quantidade
          FROM transferencias_estoque
          WHERE id = p_transferencia_id AND status = ''pendente'';

          IF NOT FOUND THEN
            RETURN jsonb_build_object(''error'', ''Transferência não encontrada ou já processada'');
          END IF;

          UPDATE transferencias_estoque
          SET status = ''cancelada''
          WHERE id = p_transferencia_id;

          UPDATE estoque_por_local
          SET quantidade = quantidade + v_quantidade,
              atualizado_em = NOW()
          WHERE produto_id = v_produto_id AND local_id = v_local_origem_id;

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''UPDATE'', ''transferencias_estoque'', p_transferencia_id, auth.uid(), jsonb_build_object(''quantidade'', v_quantidade), ''success'');

          v_cached_result := jsonb_build_object(''success'', true);

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_cancelar_transferencia'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_transferencias(p_status VARCHAR DEFAULT NULL, p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                ''id'', t.id,
                ''produto_id'', t.produto_id,
                ''produto_nome'', p.nome,
                ''local_origem_id'', t.local_origem_id,
                ''local_origem_nome'', lo.nome,
                ''local_destino_id'', t.local_destino_id,
                ''local_destino_nome'', ld.nome,
                ''quantidade'', t.quantidade,
                ''status'', t.status,
                ''observacao'', t.observacao,
                ''criado_por'', t.criado_por,
                ''criado_em'', t.criado_em,
                ''concluida_em'', t.concluida_em
              )
            ),
            ''[]''::JSONB
          ) INTO v_result
          FROM transferencias_estoque t
          JOIN produtos p ON t.produto_id = p.id
          JOIN locais_estoque lo ON t.local_origem_id = lo.id
          JOIN locais_estoque ld ON t.local_destino_id = ld.id
          WHERE (p_status IS NULL OR t.status = p_status)
          ORDER BY t.criado_em DESC
          LIMIT p_limit OFFSET p_offset;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_calcular_valor_estoque(p_metodo VARCHAR DEFAULT ''custo_medio'')
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_valor_total NUMERIC;
          v_produtos_sem_custo INT;
        BEGIN
          IF p_metodo = ''custo_medio'' THEN
            SELECT COALESCE(SUM(e.quantidade * COALESCE(p.custo_unitario, 0)), 0) INTO v_valor_total
            FROM estoque e
            JOIN produtos p ON e.produto_id = p.id;
            
            SELECT COUNT(*) INTO v_produtos_sem_custo
            FROM produtos
            WHERE custo_unitario IS NULL;
            
            RETURN jsonb_build_object(
              ''valor_total'', v_valor_total,
              ''metodo'', p_metodo,
              ''produtos_sem_custo'', v_produtos_sem_custo
            );
            
          ELSIF p_metodo = ''fifo'' OR p_metodo = ''lifo'' THEN
            RETURN jsonb_build_object(
              ''error'', ''Método '' || p_metodo || '' requer tabela de movimentações de estoque com campo custo_entrada. Implementação pendente.'',
              ''metodo'', p_metodo
            );
          ELSE
            RETURN jsonb_build_object(
              ''error'', ''Método inválido. Use: custo_medio, fifo ou lifo''
            );
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_atualizar_custo_produto(
          p_produto_id UUID,
          p_custo_unitario NUMERIC,
          p_metodo_valoracao VARCHAR DEFAULT ''custo_medio'',
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_cached_result JSONB;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key
              AND operation_type = ''tenant_atualizar_custo_produto'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          UPDATE produtos
          SET custo_unitario = p_custo_unitario,
              metodo_valoracao = p_metodo_valoracao,
              atualizado_em = NOW()
          WHERE id = p_produto_id;

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''UPDATE'', ''produtos'', p_produto_id, auth.uid(), jsonb_build_object(''custo_unitario'', p_custo_unitario, ''metodo_valoracao'', p_metodo_valoracao), ''success'');

          v_cached_result := jsonb_build_object(''success'', true);

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_atualizar_custo_produto'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_gerar_codigo_barras(
          p_produto_id UUID,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_codigo VARCHAR(50);
          v_cached_result JSONB;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key
              AND operation_type = ''tenant_gerar_codigo_barras'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          -- Verificar se já tem codigo_barras
          SELECT codigo_barras INTO v_codigo
          FROM produtos
          WHERE id = p_produto_id;

          IF v_codigo IS NOT NULL THEN
            RETURN jsonb_build_object(''success'', true, ''codigo_barras'', v_codigo, ''ja_existia'', true);
          END IF;

          -- Gerar código: PROD + 10 primeiros caracteres do UUID com zeros à esquerda
          v_codigo := ''PROD'' || LPAD(SUBSTRING(p_produto_id::TEXT, 1, 10), 10, ''0'');

          UPDATE produtos
          SET codigo_barras = v_codigo,
              codigo_qr = v_codigo,
              atualizado_em = NOW()
          WHERE id = p_produto_id;

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''UPDATE'', ''produtos'', p_produto_id, auth.uid(), jsonb_build_object(''codigo_barras'', v_codigo), ''success'');

          v_cached_result := jsonb_build_object(''success'', true, ''codigo_barras'', v_codigo);

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_gerar_codigo_barras'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_buscar_produto_por_codigo(p_codigo VARCHAR)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT jsonb_build_object(
            ''id'', p.id,
            ''nome'', p.nome,
            ''descricao'', p.descricao,
            ''tipo'', p.tipo,
            ''preco_base'', p.preco_base,
            ''categoria'', p.categoria,
            ''custo_unitario'', p.custo_unitario,
            ''metodo_valoracao'', p.metodo_valoracao,
            ''codigo_barras'', p.codigo_barras,
            ''codigo_qr'', p.codigo_qr,
            ''criado_em'', p.criado_em,
            ''atualizado_em'', p.atualizado_em
          ) INTO v_result
          FROM produtos p
          WHERE p.codigo_barras = p_codigo OR p.codigo_qr = p_codigo;

          IF v_result IS NULL THEN
            RETURN jsonb_build_object(''error'', ''Produto não encontrado'');
          END IF;

          RETURN v_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_gerar_previsao_demanda(
          p_produto_id UUID,
          p_dias_analise INT DEFAULT 30,
          p_dias_previsao INT DEFAULT 30,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_cached_result JSONB;
          v_media_venda_diaria NUMERIC(10, 4);
          v_demanda_prevista INT;
          v_previsao_id UUID;
          v_periodo_inicio DATE;
          v_periodo_fim DATE;
          v_produto_existe BOOLEAN;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key
              AND operation_type = ''tenant_gerar_previsao_demanda'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          -- Verificar se o produto existe
          SELECT EXISTS(SELECT 1 FROM produtos WHERE id = p_produto_id) INTO v_produto_existe;
          IF NOT v_produto_existe THEN
            RETURN jsonb_build_object(''error'', ''Produto não encontrado'');
          END IF;

          -- Calcular média de venda diária usando vendas_itens
          SELECT COALESCE(SUM(vi.quantidade), 0.0) / p_dias_analise INTO v_media_venda_diaria
          FROM vendas_itens vi
          JOIN vendas v ON vi.venda_id = v.id
          WHERE vi.produto_id = p_produto_id
            AND v.status = ''concluido''
            AND vi.criado_em >= NOW() - (p_dias_analise || '' days'')::INTERVAL;

          -- Calcular demanda prevista
          v_demanda_prevista := ROUND(v_media_venda_diaria * p_dias_previsao);

          -- Definir período
          v_periodo_inicio := CURRENT_DATE;
          v_periodo_fim := CURRENT_DATE + p_dias_previsao;

          -- Inserir previsão
          INSERT INTO previsoes_demanda (
            produto_id, periodo_inicio, periodo_fim, dias_analise,
            demanda_prevista, media_venda_diaria
          ) VALUES (
            p_produto_id, v_periodo_inicio, v_periodo_fim, p_dias_analise,
            v_demanda_prevista, v_media_venda_diaria
          ) RETURNING id INTO v_previsao_id;

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''INSERT'', ''previsoes_demanda'', v_previsao_id, auth.uid(), jsonb_build_object(''demanda_prevista'', v_demanda_prevista, ''media_venda_diaria'', v_media_venda_diaria), ''success'');

          v_cached_result := jsonb_build_object(
            ''success'', true,
            ''demanda_prevista'', v_demanda_prevista,
            ''media_venda_diaria'', v_media_venda_diaria,
            ''previsao_id'', v_previsao_id
          );

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_gerar_previsao_demanda'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_listar_previsoes_demanda(p_produto_id UUID DEFAULT NULL, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_result JSONB;
        BEGIN
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              ''id'', pd.id,
              ''produto_id'', pd.produto_id,
              ''produto_nome'', p.nome,
              ''periodo_inicio'', pd.periodo_inicio,
              ''periodo_fim'', pd.periodo_fim,
              ''dias_analise'', pd.dias_analise,
              ''demanda_prevista'', pd.demanda_prevista,
              ''media_venda_diaria'', pd.media_venda_diaria,
              ''demanda_real'', pd.demanda_real,
              ''precisao'', pd.precisao,
              ''dias_para_zerar'', CASE WHEN pd.media_venda_diaria > 0 THEN ROUND(e.quantidade / pd.media_venda_diaria) ELSE NULL END,
              ''criado_em'', pd.criado_em
            )
          ), ''[]''::JSONB) INTO v_result
          FROM previsoes_demanda pd
          JOIN produtos p ON pd.produto_id = p.id
          LEFT JOIN estoque e ON p.id = e.produto_id
          WHERE (p_produto_id IS NULL OR pd.produto_id = p_produto_id)
          ORDER BY pd.criado_em DESC
          LIMIT p_limit OFFSET p_offset;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_atualizar_demanda_real(
          p_previsao_id UUID,
          p_demanda_real INT,
          p_idempotency_key TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        DECLARE
          v_cached_result JSONB;
          v_precisao NUMERIC(5, 2);
          v_demanda_prevista INT;
        BEGIN
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key
              AND operation_type = ''tenant_atualizar_demanda_real'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

          -- Buscar demanda_prevista para cálculo
          SELECT demanda_prevista INTO v_demanda_prevista
          FROM previsoes_demanda
          WHERE id = p_previsao_id;

          IF v_demanda_prevista IS NULL THEN
            RETURN jsonb_build_object(''error'', ''Previsão não encontrada'');
          END IF;

          -- Calcular precisão
          IF v_demanda_prevista > 0 THEN
            v_precisao := ROUND(100 - (ABS(v_demanda_prevista - p_demanda_real)::NUMERIC / v_demanda_prevista * 100), 2);
          ELSE
            v_precisao := NULL;
          END IF;

          -- Atualizar previsão
          UPDATE previsoes_demanda
          SET demanda_real = p_demanda_real,
              precisao = v_precisao
          WHERE id = p_previsao_id;

          INSERT INTO audit_log (operation_type, resource, resource_id, user_id, details, status)
          VALUES (''UPDATE'', ''previsoes_demanda'', p_previsao_id, auth.uid(), jsonb_build_object(''demanda_real'', p_demanda_real, ''precisao'', v_precisao), ''success'');

          v_cached_result := jsonb_build_object(''success'', true, ''precisao'', v_precisao);

          IF p_idempotency_key IS NOT NULL THEN
            INSERT INTO idempotency_control (idempotency_key, operation_type, result)
            VALUES (p_idempotency_key, ''tenant_atualizar_demanda_real'', v_cached_result);
          END IF;

          RETURN v_cached_result;

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(''error'', SQLERRM);
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_financeiro(p_financeiro_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM financeiro WHERE id = p_financeiro_id;
          RETURN json_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
          RAISE;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_os(p_os_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM ordens_servico WHERE id = p_os_id;
          RETURN json_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
          RAISE;
        END;
        $func$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.tenant_excluir_obra(p_obra_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I
        AS $func$
        BEGIN
          DELETE FROM obras WHERE id = p_obra_id;
          RETURN json_build_object(''success'', true);
        EXCEPTION WHEN OTHERS THEN
          RAISE;
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPC tenant_processar_venda dentro do schema tenant
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
          v_estoque_atual INT;
          v_comissao NUMERIC;
          v_regra_tipo TEXT;
          v_regra_valor NUMERIC;
          v_cached_result JSONB;
        BEGIN
          -- Verificar idempotência
          IF p_idempotency_key IS NOT NULL THEN
            SELECT result INTO v_cached_result
            FROM idempotency_control
            WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_processar_venda'';
            
            IF v_cached_result IS NOT NULL THEN
              RETURN v_cached_result;
            END IF;
          END IF;

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
            RAISE EXCEPTION ''cliente_id ou cliente_nome é obrigatório'';
          END IF;

          BEGIN
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
              v_produto_id := (v_item->>''produto_id'')::UUID;
              v_qtd := (v_item->>''qtd'')::INT;
              v_preco := (v_item->>''preco'')::NUMERIC;

              IF v_produto_id IS NULL THEN
                RAISE EXCEPTION ''produto_id é obrigatório'';
              END IF;

              IF v_qtd IS NULL OR v_qtd <= 0 THEN
                RAISE EXCEPTION ''quantidade deve ser maior que zero'';
              END IF;

              IF v_preco IS NULL OR v_preco < 0 THEN
                RAISE EXCEPTION ''preço deve ser maior ou igual a zero'';
              END IF;

              SELECT quantidade INTO v_estoque_atual
              FROM estoque
              WHERE id = v_produto_id
              FOR UPDATE;

              IF NOT FOUND THEN
                RAISE EXCEPTION ''Produto não encontrado no estoque'';
              END IF;

              IF v_estoque_atual < v_qtd THEN
                RAISE EXCEPTION ''Estoque insuficiente para produto'';
              END IF;

              UPDATE estoque
              SET quantidade = quantidade - v_qtd,
                  atualizado_em = NOW()
              WHERE id = v_produto_id;

              v_total := v_total + (v_qtd * v_preco);
            END LOOP;

            IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = v_cliente_id) THEN
              RAISE EXCEPTION ''Cliente não encontrado'';
            END IF;

            INSERT INTO vendas (cliente_id, valor_total, metodo_pagamento, status)
            VALUES (v_cliente_id, v_total, p_forma_pagamento, ''concluida'')
            RETURNING id INTO v_venda_id;

            INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal)
            SELECT
              v_venda_id,
              (v_item->>''produto_id'')::UUID,
              (v_item->>''qtd'')::INT,
              (v_item->>''preco'')::NUMERIC,
              ((v_item->>''qtd'')::INT * (v_item->>''preco'')::NUMERIC)
            FROM jsonb_array_elements(p_itens) AS v_item;

            IF p_vendedor_id IS NOT NULL THEN
              IF NOT EXISTS (SELECT 1 FROM funcionarios WHERE id = p_vendedor_id) THEN
                RAISE EXCEPTION ''Vendedor não encontrado'';
              END IF;

              SELECT tipo_calculo, valor INTO v_regra_tipo, v_regra_valor
              FROM regras_comissao
              WHERE colaborador_id = p_vendedor_id AND ativo = TRUE
              LIMIT 1;

              IF v_regra_tipo IS NOT NULL AND v_regra_valor IS NOT NULL THEN
                IF v_regra_tipo = ''percentual'' THEN
                  v_comissao := (v_total * v_regra_valor) / 100;
                ELSE
                  v_comissao := v_regra_valor;
                END IF;

                INSERT INTO comissoes (
                  colaborador_id,
                  venda_id,
                  regra_comissao_id,
                  valor_comissao,
                  valor_venda,
                  periodo_referencia,
                  status_pagamento
                )
                SELECT
                  p_vendedor_id,
                  v_venda_id,
                  id,
                  v_comissao,
                  v_total,
                  DATE_TRUNC(''month'', NOW())::DATE,
                  ''pendente''
                FROM regras_comissao
                WHERE colaborador_id = p_vendedor_id AND ativo = TRUE
                LIMIT 1;
              END IF;
            END IF;

            COMMIT;

            v_cached_result := jsonb_build_object(
              ''success'', true,
              ''venda_id'', v_venda_id,
              ''total'', v_total
            );

            -- Armazenar resultado para idempotência
            IF p_idempotency_key IS NOT NULL THEN
              INSERT INTO idempotency_control (idempotency_key, operation_type, result)
              VALUES (p_idempotency_key, ''tenant_processar_venda'', v_cached_result);
            END IF;

            RETURN v_cached_result;

          EXCEPTION
            WHEN OTHERS THEN
              ROLLBACK;
              RETURN jsonb_build_object(
                ''success'', false,
                ''error'', SQLERRM
              );
          END;
        END;
        $func$;
    ', novo_schema, novo_schema);

    -- Criar RPC tenant_dashboard_kpis dentro do schema tenant
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
    ', novo_schema, novo_schema);

    -- Configurar RLS dentro do schema tenant
    -- ESTRATÉGIA DE ISOLAMENTO: OPÇÃO A - ISOLAMENTO POR SCHEMA ROUTING
    -- 
    -- O Fluxo ERP utiliza isolamento físico de dados via schemas PostgreSQL por tenant.
    -- Cada tenant tem seu próprio schema separado (ex: tenant_empresa_1, tenant_empresa_2).
    -- 
    -- O isolamento é garantido pela função set_tenant_schema(), que configura o search_path
    -- para o schema correto antes de qualquer operação. Isso significa que:
    -- - Um usuário do tenant A nunca acessa dados do tenant B porque estão em schemas diferentes
    -- - As policies RLS abaixo usam USING (true) porque o isolamento é feito no nível de schema,
    --   não no nível de tabela. O search_path garante que queries acessem apenas o schema correto.
    -- 
    -- Esta abordagem é mais simples e performática que RLS baseado em auth.uid() para multi-tenancy
    -- com schemas separados, pois evita joins adicionais e complexidade de mapeamento.
    --
    -- IMPORTANTE: A segurança depende inteiramente da correta configuração do search_path via
    -- set_tenant_schema(). Qualquer bypass dessa função pode comprometer o isolamento.
    EXECUTE format('ALTER TABLE %I.clientes ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.produtos ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.estoque ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.vendas ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.vendas_itens ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.funcionarios ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.regras_comissao ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.ordens_servico ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.obras ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.financeiro ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.comissoes ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.idempotency_control ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.configuracoes ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.role_permissions ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.schema_migrations ENABLE ROW LEVEL SECURITY;', novo_schema);
    EXECUTE format('ALTER TABLE %I.audit_log ENABLE ROW LEVEL SECURITY;', novo_schema);

    -- Policies permissivas (USING true) - isolamento é garantido por schema routing
    EXECUTE format('CREATE POLICY tenant_read_clientes ON %I.clientes FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_clientes ON %I.clientes FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_produtos ON %I.produtos FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_produtos ON %I.produtos FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_estoque ON %I.estoque FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_estoque ON %I.estoque FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_vendas ON %I.vendas FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_vendas ON %I.vendas FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_vendas_itens ON %I.vendas_itens FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_vendas_itens ON %I.vendas_itens FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_funcionarios ON %I.funcionarios FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_funcionarios ON %I.funcionarios FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_regras_comissao ON %I.regras_comissao FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_regras_comissao ON %I.regras_comissao FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_ordens_servico ON %I.ordens_servico FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_ordens_servico ON %I.ordens_servico FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_obras ON %I.obras FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_obras ON %I.obras FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_financeiro ON %I.financeiro FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_financeiro ON %I.financeiro FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_comissoes ON %I.comissoes FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_comissoes ON %I.comissoes FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_idempotency_control ON %I.idempotency_control FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_idempotency_control ON %I.idempotency_control FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_configuracoes ON %I.configuracoes FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_configuracoes ON %I.configuracoes FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_role_permissions ON %I.role_permissions FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_role_permissions ON %I.role_permissions FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_schema_migrations ON %I.schema_migrations FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_schema_migrations ON %I.schema_migrations FOR ALL USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_read_audit_log ON %I.audit_log FOR SELECT USING (true);', novo_schema);
    EXECUTE format('CREATE POLICY tenant_write_audit_log ON %I.audit_log FOR ALL USING (true);', novo_schema);

    -- Grant permissions para RPCs dentro do schema tenant
    EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO authenticated;', novo_schema);

    RETURN json_build_object(
        'status', 'success', 
        'message', 'Ambiente Multi-Tenant provisionado com sucesso para todos os módulos!',
        'schema_name', novo_schema
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- ==========================================
-- 2. RPC TRANSACIONAL MASTER (EMPRESA + SCHEMA + MODULOS)
-- ==========================================
CREATE OR REPLACE FUNCTION public.provisionar_empresa_master(
  p_empresa_id uuid,
  p_cnpj text,
  p_razao_social text,
  p_porte text,
  p_segmento text,
  p_schema_name text,
  p_modules text[] DEFAULT ARRAY[]::text[],
  p_nome text DEFAULT NULL
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
  -- Inserir log apenas se empresa existe (para evitar FK violation)
  INSERT INTO public.logs_provisionamento (empresa_id, schema_name, status, mensagem)
  SELECT p_empresa_id, p_schema_name, 'error', SQLERRM
  FROM public.empresas
  WHERE id = p_empresa_id;
  RAISE;
END;
$$;

-- ==========================================
-- 3. RPC DE SCHEMA ROUTING (CONFIGURAÇÃO DE SEARCH_PATH)
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
    RAISE EXCEPTION 'Perfil não encontrado para usuário';
  END IF;

  IF v_role = 'tenant_admin' AND v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário tenant sem empresa vinculada';
  END IF;

  IF v_role = 'tenant_user' AND v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário tenant sem empresa vinculada';
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
    RAISE EXCEPTION 'Empresa não encontrada para usuário';
  END IF;

  -- Validar que schema existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = v_schema_name
  ) THEN
    RAISE EXCEPTION 'Schema tenant não existe';
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
-- 5. RPC DE UPGRADE DE SCHEMAS TENANT (MIGRATIONS)
-- ==========================================
-- Função para aplicar migrations em todos os schemas tenant existentes
CREATE OR REPLACE FUNCTION public.upgrade_all_tenants(p_target_version INTEGER DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_record RECORD;
  v_current_version INTEGER;
  v_upgraded_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_results JSONB := '[]'::JSONB;
BEGIN
  -- Iterar sobre todos os schemas tenant (excluindo public, information_schema, pg_catalog, pg_toast)
  FOR v_schema_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%' 
    ORDER BY schema_name
  LOOP
    BEGIN
      -- Verificar versão atual do schema
      EXECUTE format('SELECT COALESCE(MAX(version), 0) FROM %I.schema_migrations', v_schema_record.schema_name)
      INTO v_current_version;

      -- Se não tem tabela de migrations, criar e inicializar
      IF v_current_version IS NULL THEN
        EXECUTE format('
          CREATE TABLE IF NOT EXISTS %I.schema_migrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            version INTEGER NOT NULL UNIQUE,
            description TEXT NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT NOW()
          );
        ', v_schema_record.schema_name);
        
        EXECUTE format('
          INSERT INTO %I.schema_migrations (version, description)
          VALUES (1, ''Versão inicial do schema tenant - Fluxo ERP v1.0'')
          ON CONFLICT (version) DO NOTHING;
        ', v_schema_record.schema_name);
        
        v_current_version := 1;
      END IF;

      -- Se target_version especificado e versão atual menor que target, aplicar upgrade
      IF p_target_version IS NOT NULL AND v_current_version < p_target_version THEN
        -- Aqui seriam adicionadas as migrations específicas
        -- Por enquanto, apenas atualiza a versão
        EXECUTE format('
          INSERT INTO %I.schema_migrations (version, description)
          VALUES (%L, ''Upgrade automático para versão %L'')
          ON CONFLICT (version) DO NOTHING;
        ', v_schema_record.schema_name, p_target_version, p_target_version);
        
        v_upgraded_count := v_upgraded_count + 1;
        v_results := v_results || jsonb_build_object(
          'schema', v_schema_record.schema_name,
          'from_version', v_current_version,
          'to_version', p_target_version,
          'status', 'upgraded'
        );
      ELSE
        v_results := v_results || jsonb_build_object(
          'schema', v_schema_record.schema_name,
          'current_version', v_current_version,
          'status', 'no_upgrade_needed'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_results := v_results || jsonb_build_object(
        'schema', v_schema_record.schema_name,
        'error', SQLERRM,
        'status', 'failed'
      );
    END;
  END LOOP;

  RETURN json_build_object(
    'status', 'completed',
    'upgraded_count', v_upgraded_count,
    'failed_count', v_failed_count,
    'results', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upgrade_all_tenants(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upgrade_all_tenants(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.upgrade_all_tenants(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_all_tenants(INTEGER) TO service_role;

-- ==========================================
-- 4. RPC TRANSACIONAL DE VENDA (PDV)
-- ==========================================
-- NOTA: A função tenant_processar_venda deve ser criada dinamicamente
-- dentro de cada schema tenant pela função provisionar_empresa,
-- pois as tabelas não existem no schema public no momento da criação.

-- ==========================================
-- 5. RPCs DE LEITURA (CONSISTÊNCIA DE SCHEMA)
-- ==========================================
-- Estas funções operam no schema tenant configurado via search_path

-- NOTA: As RPCs de leitura (tenant_listar_*) que operam em tabelas tenant
-- devem ser criadas dinamicamente dentro de cada schema tenant
-- pela função provisionar_empresa, pois as tabelas não existem
-- no schema public no momento da criação das funções.

-- ==========================================
-- 5. RPCS DE LEITURA (CONSISTÊNCIA DE SCHEMA)
-- ==========================================
-- NOTA: As RPCs de leitura e escrita que operam em tabelas tenant
-- devem ser criadas dinamicamente dentro de cada schema tenant
-- pela função provisionar_empresa, pois as tabelas não existem
-- no schema public no momento da criação das funções.
-- As RPCs abaixo são criadas com search_path dinâmico.

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) PARA ISOLAMENTO MULTI-TENANT
-- ==========================================
-- NOTA: RLS deve ser configurado dinamicamente dentro de cada schema tenant
-- pela função provisionar_empresa, pois as tabelas não existem
-- no schema public no momento da criação das policies.

-- ==========================================
-- 7. RPC DE DASHBOARD (KPIs AGREGADOS)
-- ==========================================
-- NOTA: A função tenant_dashboard_kpis deve ser criada dinamicamente
-- dentro de cada schema tenant pela função provisionar_empresa,
-- pois as tabelas não existem no schema public no momento da criação.

REVOKE ALL ON FUNCTION public.provisionar_empresa_master(uuid, text, text, text, text, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provisionar_empresa_master(uuid, text, text, text, text, text, text[]) FROM anon;
REVOKE ALL ON FUNCTION public.provisionar_empresa_master(uuid, text, text, text, text, text, text[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_empresa_master(uuid, text, text, text, text, text, text[]) TO service_role;
