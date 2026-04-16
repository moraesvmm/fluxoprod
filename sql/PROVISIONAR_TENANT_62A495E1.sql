-- ==========================================
-- PROVISIONAR TABELAS NO TENANT_62A495E1
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar todas as tabelas necessárias no schema tenant_62a495e1
-- Permissão: Use a service_role para executar este SQL

-- Configurar search_path temporário
SET search_path TO tenant_62a495e1, public;

-- 1. MÓDULO 2: CRM & Gestão de Clientes
CREATE TABLE IF NOT EXISTS tenant_62a495e1.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(50),
    funil_fase VARCHAR(50) DEFAULT 'lead' CHECK (funil_fase IN ('lead', 'prospect', 'oportunidade', 'cliente', 'recuperacao')),
    status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_clientes_status ON tenant_62a495e1.clientes(status);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_clientes_funil ON tenant_62a495e1.clientes(funil_fase);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_clientes_nome ON tenant_62a495e1.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_clientes_email ON tenant_62a495e1.clientes(email);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_clientes_telefone ON tenant_62a495e1.clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_clientes_criado_em ON tenant_62a495e1.clientes(criado_em DESC);

-- 2. MÓDULO 6: Catálogo de Produtos e Serviços
CREATE TABLE IF NOT EXISTS tenant_62a495e1.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'produto' CHECK (tipo IN ('produto', 'servico')),
    preco_base NUMERIC(10, 2) NOT NULL CHECK (preco_base >= 0),
    sku VARCHAR(100),
    preco_custo NUMERIC(10, 2) CHECK (preco_custo >= 0),
    categoria VARCHAR(100),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_produtos_nome ON tenant_62a495e1.produtos(nome);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_produtos_tipo ON tenant_62a495e1.produtos(tipo);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_produtos_preco_base ON tenant_62a495e1.produtos(preco_base);

-- 3. MÓDULO 5: Controle de Estoque
CREATE TABLE IF NOT EXISTS tenant_62a495e1.estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES tenant_62a495e1.produtos(id) ON DELETE SET NULL,
    sku VARCHAR(100) UNIQUE,
    quantidade INTEGER DEFAULT 0 CHECK (quantidade >= 0),
    quantidade_minima INTEGER DEFAULT 10 CHECK (quantidade_minima > 0),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para estoque
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_estoque_produto ON tenant_62a495e1.estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_estoque_quantidade ON tenant_62a495e1.estoque(quantidade);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_estoque_sku ON tenant_62a495e1.estoque(sku);

-- 4. MÓDULO 3: Vendas & PDV
CREATE TABLE IF NOT EXISTS tenant_62a495e1.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES tenant_62a495e1.clientes(id) ON DELETE SET NULL,
    vendedor_id UUID,
    cliente_nome VARCHAR(255),
    vendedor_nome VARCHAR(255),
    valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total >= 0),
    metodo_pagamento VARCHAR(50) CHECK (metodo_pagamento IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto', 'transferencia')),
    status VARCHAR(50) DEFAULT 'concluido' CHECK (status IN ('pendente', 'concluido', 'cancelado', 'reembolsado')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para vendas
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_vendas_cliente ON tenant_62a495e1.vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_vendas_status ON tenant_62a495e1.vendas(status);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_vendas_criado_em ON tenant_62a495e1.vendas(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_vendas_valor_total ON tenant_62a495e1.vendas(valor_total);

-- 4.1. Tabela vendas_itens (CRÍTICA - FK para estoque)
CREATE TABLE IF NOT EXISTS tenant_62a495e1.vendas_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL REFERENCES tenant_62a495e1.vendas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES tenant_62a495e1.estoque(id) ON DELETE RESTRICT,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10, 2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para vendas_itens
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_vendas_itens_venda ON tenant_62a495e1.vendas_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_vendas_itens_produto ON tenant_62a495e1.vendas_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_vendas_itens_data ON tenant_62a495e1.vendas_itens(criado_em);

-- 5. MÓDULO 4: Gestão Financeira
CREATE TABLE IF NOT EXISTS tenant_62a495e1.financeiro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pagar', 'receber')),
    descricao TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL CHECK (valor >= 0),
    data_vencimento DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'atrasado')),
    categoria VARCHAR(100),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para financeiro
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_financeiro_tipo ON tenant_62a495e1.financeiro(tipo);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_financeiro_status ON tenant_62a495e1.financeiro(status);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_financeiro_vencimento ON tenant_62a495e1.financeiro(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_financeiro_criado_em ON tenant_62a495e1.financeiro(criado_em DESC);

-- 6. MÓDULO 7: Departamento Pessoal & RH
CREATE TABLE IF NOT EXISTS tenant_62a495e1.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    email VARCHAR(255),
    telefone VARCHAR(50),
    salario NUMERIC(10, 2) CHECK (salario >= 0),
    role VARCHAR(50) DEFAULT 'funcionario' CHECK (role IN ('funcionario', 'gerente', 'admin', 'colaborador')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para funcionarios
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_funcionarios_cargo ON tenant_62a495e1.funcionarios(cargo);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_funcionarios_role ON tenant_62a495e1.funcionarios(role);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_funcionarios_nome ON tenant_62a495e1.funcionarios(nome);

-- 7. MÓDULO 9: Ordem de Serviço (O.S.)
CREATE TABLE IF NOT EXISTS tenant_62a495e1.ordens_servico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER DEFAULT 1,
    cliente_id UUID REFERENCES tenant_62a495e1.clientes(id) ON DELETE SET NULL,
    colaborador_id UUID REFERENCES tenant_62a495e1.funcionarios(id) ON DELETE SET NULL,
    veiculo_equipamento VARCHAR(255),
    descricao_problema TEXT,
    status VARCHAR(50) DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_execucao', 'concluida', 'cancelada')),
    valor_orcamento NUMERIC(10, 2) CHECK (valor_orcamento >= 0),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para ordens_servico
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_os_cliente ON tenant_62a495e1.ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_os_colaborador ON tenant_62a495e1.ordens_servico(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_os_status ON tenant_62a495e1.ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_os_criado_em ON tenant_62a495e1.ordens_servico(criado_em DESC);

-- 8. MÓDULO 11: Obras
CREATE TABLE IF NOT EXISTS tenant_62a495e1.obras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES tenant_62a495e1.clientes(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    endereco TEXT,
    data_inicio DATE,
    data_fim_prevista DATE,
    data_fim_real DATE,
    status VARCHAR(50) DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'cancelada', 'paralisada')),
    orcamento_total NUMERIC(10, 2) CHECK (orcamento_total >= 0),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_obras_datas CHECK (data_fim_prevista IS NULL OR data_inicio IS NULL OR data_fim_prevista >= data_inicio)
);

-- Índices para obras
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_obras_cliente ON tenant_62a495e1.obras(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_obras_status ON tenant_62a495e1.obras(status);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_obras_criado_em ON tenant_62a495e1.obras(criado_em DESC);

-- 9. MÓDULO 12: Comissões
CREATE TABLE IF NOT EXISTS tenant_62a495e1.regras_comissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL REFERENCES tenant_62a495e1.funcionarios(id) ON DELETE CASCADE,
    tipo_calculo VARCHAR(20) NOT NULL CHECK (tipo_calculo IN ('percentual', 'valor_fixo')),
    valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para regras_comissao
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_regras_comissao_colaborador ON tenant_62a495e1.regras_comissao(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_regras_comissao_ativo ON tenant_62a495e1.regras_comissao(ativo);

CREATE TABLE IF NOT EXISTS tenant_62a495e1.comissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL REFERENCES tenant_62a495e1.funcionarios(id) ON DELETE CASCADE,
    venda_id UUID REFERENCES tenant_62a495e1.vendas(id) ON DELETE SET NULL,
    regra_comissao_id UUID REFERENCES tenant_62a495e1.regras_comissao(id) ON DELETE SET NULL,
    valor_comissao NUMERIC(10, 2) NOT NULL,
    valor_venda NUMERIC(10, 2),
    periodo_referencia DATE NOT NULL,
    status_pagamento VARCHAR(50) DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
    data_pagamento DATE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para comissoes
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_62a495e1_comissoes_venda_colaborador ON tenant_62a495e1.comissoes(venda_id, colaborador_id) WHERE venda_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_comissoes_colaborador ON tenant_62a495e1.comissoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_comissoes_periodo ON tenant_62a495e1.comissoes(periodo_referencia);
CREATE INDEX IF NOT EXISTS idx_tenant_62a495e1_comissoes_status ON tenant_62a495e1.comissoes(status_pagamento);

-- 10. Trigger para atualizar estoque após venda
CREATE OR REPLACE FUNCTION tenant_62a495e1.atualizar_estoque_apos_venda()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
    v_qtd_atual INTEGER;
BEGIN
    -- Verificar estoque atual antes da venda
    SELECT quantidade INTO v_qtd_atual
    FROM tenant_62a495e1.estoque
    WHERE id = NEW.produto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado no estoque';
    END IF;

    IF v_qtd_atual < NEW.quantidade THEN
        RAISE EXCEPTION 'Quantidade insuficiente no estoque';
    END IF;

    -- Atualizar estoque
    UPDATE tenant_62a495e1.estoque
    SET quantidade = quantidade - NEW.quantidade,
        atualizado_em = NOW()
    WHERE id = NEW.produto_id;

    RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_tenant_62a495e1_vendas_itens_atualizar_estoque ON tenant_62a495e1.vendas_itens;
CREATE TRIGGER trg_tenant_62a495e1_vendas_itens_atualizar_estoque
AFTER INSERT ON tenant_62a495e1.vendas_itens
FOR EACH ROW
EXECUTE FUNCTION tenant_62a495e1.atualizar_estoque_apos_venda();

-- 11. Trigger para calcular comissão automaticamente após venda
CREATE OR REPLACE FUNCTION tenant_62a495e1.calcular_comissao_apos_venda()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
    v_regra RECORD;
    v_valor_comissao NUMERIC(10, 2);
BEGIN
    -- Se não houver vendedor, não calcular comissão
    IF NEW.vendedor_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Buscar regra de comissão para o vendedor
    SELECT * INTO v_regra
    FROM tenant_62a495e1.regras_comissao
    WHERE colaborador_id = NEW.vendedor_id
      AND ativo = TRUE
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Calcular comissão baseado na regra
    IF v_regra.tipo_calculo = 'percentual' THEN
        v_valor_comissao = NEW.valor_total * (v_regra.valor / 100);
    ELSE
        v_valor_comissao = v_regra.valor;
    END IF;

    -- Criar registro de comissão
    INSERT INTO tenant_62a495e1.comissoes (
        colaborador_id,
        venda_id,
        regra_comissao_id,
        valor_comissao,
        valor_venda,
        periodo_referencia,
        status_pagamento
    ) VALUES (
        NEW.vendedor_id,
        NEW.id,
        v_regra.id,
        v_valor_comissao,
        NEW.valor_total,
        DATE_TRUNC('month', NEW.criado_em)::DATE,
        'pendente'
    );

    RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_tenant_62a495e1_vendas_calcular_comissao ON tenant_62a495e1.vendas;
CREATE TRIGGER trg_tenant_62a495e1_vendas_calcular_comissao
AFTER INSERT ON tenant_62a495e1.vendas
FOR EACH ROW
EXECUTE FUNCTION tenant_62a495e1.calcular_comissao_apos_venda();

-- Reset search_path
SET search_path TO public;

-- Verificar se as tabelas foram criadas
SELECT 
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'tenant_62a495e1'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
