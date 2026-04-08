-- ==========================================
-- TABELAS URGENTES - EXECUTAR IMEDIATAMENTE
-- ==========================================
-- Execute este script no Editor SQL do seu Supabase AGORA!

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
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Políticas para Clientes
DROP POLICY IF EXISTS clientes_select ON public.clientes;
CREATE POLICY clientes_select ON public.clientes FOR SELECT USING (true);

DROP POLICY IF EXISTS clientes_insert ON public.clientes;
CREATE POLICY clientes_insert ON public.clientes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS clientes_update ON public.clientes;
CREATE POLICY clientes_update ON public.clientes FOR UPDATE USING (true);

DROP POLICY IF EXISTS clientes_delete ON public.clientes;
CREATE POLICY clientes_delete ON public.clientes FOR DELETE USING (true);

-- Políticas para Transações Financeiras
DROP POLICY IF EXISTS transacoes_financeiras_select ON public.transacoes_financeiras;
CREATE POLICY transacoes_financeiras_select ON public.transacoes_financeiras FOR SELECT USING (true);

DROP POLICY IF EXISTS transacoes_financeiras_insert ON public.transacoes_financeiras;
CREATE POLICY transacoes_financeiras_insert ON public.transacoes_financeiras FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS transacoes_financeiras_update ON public.transacoes_financeiras;
CREATE POLICY transacoes_financeiras_update ON public.transacoes_financeiras FOR UPDATE USING (true);

DROP POLICY IF EXISTS transacoes_financeiras_delete ON public.transacoes_financeiras;
CREATE POLICY transacoes_financeiras_delete ON public.transacoes_financeiras FOR DELETE USING (true);

-- Políticas para Produtos
DROP POLICY IF EXISTS produtos_select ON public.produtos;
CREATE POLICY produtos_select ON public.produtos FOR SELECT USING (true);

DROP POLICY IF EXISTS produtos_insert ON public.produtos;
CREATE POLICY produtos_insert ON public.produtos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS produtos_update ON public.produtos;
CREATE POLICY produtos_update ON public.produtos FOR UPDATE USING (true);

DROP POLICY IF EXISTS produtos_delete ON public.produtos;
CREATE POLICY produtos_delete ON public.produtos FOR DELETE USING (true);
