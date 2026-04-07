-- ==========================================
-- SCRIPT DE TABELAS COMPLETAS - FLUXO SaaS
-- ==========================================
-- Execute este script no Editor SQL do seu Supabase

-- ==========================================
-- TABELA DE VENDAS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente VARCHAR(255) NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    metodo VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'concluido',
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ
);

-- ==========================================
-- TABELA DE CLIENTES (CRM)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(50),
    documento VARCHAR(50),
    endereco TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ
);

-- ==========================================
-- TABELA DE TRANSAÇÕES FINANCEIRAS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.transacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pendente',
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ
);

-- ==========================================
-- TABELA DE PRODUTOS (ESTOQUE)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    sku VARCHAR(100),
    preco_custo DECIMAL(12,2),
    preco_venda DECIMAL(12,2),
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    categoria VARCHAR(100),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ
);

-- ==========================================
-- POLÍTICAS RLS (Row Level Security)
-- ==========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Políticas para Vendas
DROP POLICY IF EXISTS vendas_select ON public.vendas;
CREATE POLICY vendas_select ON public.vendas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS vendas_insert ON public.vendas;
CREATE POLICY vendas_insert ON public.vendas
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS vendas_update ON public.vendas;
CREATE POLICY vendas_update ON public.vendas
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS vendas_delete ON public.vendas;
CREATE POLICY vendas_delete ON public.vendas
  FOR DELETE USING (true);

-- Políticas para Clientes
DROP POLICY IF EXISTS clientes_select ON public.clientes;
CREATE POLICY clientes_select ON public.clientes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS clientes_insert ON public.clientes;
CREATE POLICY clientes_insert ON public.clientes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS clientes_update ON public.clientes;
CREATE POLICY clientes_update ON public.clientes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS clientes_delete ON public.clientes;
CREATE POLICY clientes_delete ON public.clientes
  FOR DELETE USING (true);

-- Políticas para Transações Financeiras
DROP POLICY IF EXISTS transacoes_financeiras_select ON public.transacoes_financeiras;
CREATE POLICY transacoes_financeiras_select ON public.transacoes_financeiras
  FOR SELECT USING (true);

DROP POLICY IF EXISTS transacoes_financeiras_insert ON public.transacoes_financeiras;
CREATE POLICY transacoes_financeiras_insert ON public.transacoes_financeiras
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS transacoes_financeiras_update ON public.transacoes_financeiras;
CREATE POLICY transacoes_financeiras_update ON public.transacoes_financeiras
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS transacoes_financeiras_delete ON public.transacoes_financeiras;
CREATE POLICY transacoes_financeiras_delete ON public.transacoes_financeiras
  FOR DELETE USING (true);

-- Políticas para Produtos
DROP POLICY IF EXISTS produtos_select ON public.produtos;
CREATE POLICY produtos_select ON public.produtos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS produtos_insert ON public.produtos;
CREATE POLICY produtos_insert ON public.produtos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS produtos_update ON public.produtos;
CREATE POLICY produtos_update ON public.produtos
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS produtos_delete ON public.produtos;
CREATE POLICY produtos_delete ON public.produtos
  FOR DELETE USING (true);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_vendas_criado_em ON public.vendas(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON public.vendas(cliente);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON public.vendas(status);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);

CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_criado_em ON public.transacoes_financeiras(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_tipo ON public.transacoes_financeiras(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_categoria ON public.transacoes_financeiras(categoria);

CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_sku ON public.produtos(sku);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
