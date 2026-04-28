-- Migração SQL: Configurações Fiscais (Empresa)
-- Adiciona campos para integração com SEFAZ/FocusNFe na tabela mestre

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20);
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(50); -- Simples Nacional, Lucro Presumido, etc.
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS focusnfe_token_producao TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS focusnfe_token_homologacao TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS nfe_ambiente VARCHAR(20) DEFAULT 'homologacao';

-- Comentários para documentação
COMMENT ON COLUMN public.empresas.nfe_ambiente IS 'Define se as notas serão emitidas em ambiente de testes (homologacao) ou real (producao)';
