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

CREATE TABLE IF NOT EXISTS public.modulos_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    modulo_nome VARCHAR(100) NOT NULL, -- ex: 'crm', 'financeiro', 'pdv'
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, modulo_nome)
);

CREATE TABLE IF NOT EXISTS public.logs_provisionamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id),
    schema_name VARCHAR(100),
    status VARCHAR(50),
    mensagem TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

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
            cliente_id UUID REFERENCES %I.clientes(id),
            veiculo_equipamento VARCHAR(255),
            descricao_problema TEXT,
            status VARCHAR(50) DEFAULT ''aberto'',
            valor_orcamento NUMERIC(10, 2),
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- 10. MÓDULO 10: Configurações do Tenant
    EXECUTE format('
        CREATE TABLE %I.configuracoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chave VARCHAR(100) UNIQUE NOT NULL,
            valor JSONB NOT NULL,
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

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
