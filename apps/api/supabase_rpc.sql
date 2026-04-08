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
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS public.logs_provisionamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id),
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
-- 1. FUNÇÃO RPC DE PROVISIONAMENTO DINÂMICO
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
    -- (evita exposição acidental caso o schema seja adicionado na lista de schemas expostos da API)
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role;', novo_schema);

    -- Default privileges para tabelas/funções futuras no schema
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
            funil_fase VARCHAR(50) DEFAULT ''lead'',
            status VARCHAR(50) DEFAULT ''ativo'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 4. MÓDULO 6: Catálogo de Produtos e Serviços
    EXECUTE format('
        CREATE TABLE %I.produtos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            tipo VARCHAR(50) DEFAULT ''produto'', -- produto ou servico
            preco_base NUMERIC(10, 2) NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 5. MÓDULO 5: Controle de Estoque
    EXECUTE format('
        CREATE TABLE %I.estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID REFERENCES %I.produtos(id),
            sku VARCHAR(100) UNIQUE,
            quantidade INTEGER DEFAULT 0,
            quantidade_minima INTEGER DEFAULT 10,
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- 6. MÓDULO 3: Vendas & PDV
    EXECUTE format('
        CREATE TABLE %I.vendas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id),
            valor_total NUMERIC(10, 2) NOT NULL,
            metodo_pagamento VARCHAR(50),
            status VARCHAR(50) DEFAULT ''concluido'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- 7. MÓDULO 4: Gestão Financeira
    EXECUTE format('
        CREATE TABLE %I.financeiro (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tipo VARCHAR(20) NOT NULL, -- pagar ou receber
            descricao TEXT NOT NULL,
            valor NUMERIC(10, 2) NOT NULL,
            data_vencimento DATE NOT NULL,
            status VARCHAR(50) DEFAULT ''pendente'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 8. MÓDULO 7: Departamento Pessoal & RH
    EXECUTE format('
        CREATE TABLE %I.funcionarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            cargo VARCHAR(100),
            salario NUMERIC(10, 2),
            role VARCHAR(50) DEFAULT ''funcionario'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 9. MÓDULO 9: Ordem de Serviço (O.S.)
    EXECUTE format('
        CREATE TABLE %I.ordens_servico (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            veiculo_equipamento VARCHAR(255),
            descricao_problema TEXT,
            status VARCHAR(50) DEFAULT ''aberta'' CHECK (status IN (''aberta'', ''em_execucao'', ''concluida'', ''cancelada'')),
            valor_orcamento NUMERIC(10, 2),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- 10. MÓDULO 10: Configurações do Tenant
    EXECUTE format('
        CREATE TABLE %I.configuracoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chave VARCHAR(100) UNIQUE NOT NULL,
            valor JSONB NOT NULL CHECK (valor IS NOT NULL),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- Índice explícito para configurações
    EXECUTE format('CREATE INDEX idx_%I_configuracoes_chave ON %I.configuracoes(chave);', novo_schema, novo_schema);

    -- Garantir que as tabelas criadas também não sejam acessíveis por anon/authenticated
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', novo_schema);

    -- Módulo 1 (Dashboard) e Módulo 8 (Relatórios) consumirão dados agregados dessas tabelas lógicas via views/consultas.

    RETURN json_build_object(
        'status', 'success', 
        'message', 'Ambiente Multi-Tenant provisionado com sucesso para os 10 módulos!',
        'schema_name', novo_schema
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;
