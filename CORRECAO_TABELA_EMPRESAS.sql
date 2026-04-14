-- ==========================================
-- CORREÇÃO DA TABELA EMPRESAS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Ajustar colunas da tabela empresas para compatibilidade com RPCs

-- Renomear colunas para compatibilidade
ALTER TABLE public.empresas RENAME COLUMN nome TO razao_social;
ALTER TABLE public.empresas RENAME COLUMN data_criacao TO criado_em;

-- Adicionar coluna atualizado_em se não existir
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();
