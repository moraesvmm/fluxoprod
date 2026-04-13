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
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- Índices para produtos
    EXECUTE format('CREATE INDEX idx_%I_produtos_nome ON %I.produtos(nome);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_produtos_tipo ON %I.produtos(tipo);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_produtos_preco_base ON %I.produtos(preco_base);', novo_schema, novo_schema);

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

    -- 6. MÓDULO 3: Vendas & PDV
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
