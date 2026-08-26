-- Preparacao da integracao FocusNFe multiempresa.
-- Tokens ficam somente no backend; nunca expor estas colunas ao frontend.

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS fiscal_provedor VARCHAR(30) NOT NULL DEFAULT 'nativo',
  ADD COLUMN IF NOT EXISTS focusnfe_empresa_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS focusnfe_token_producao TEXT,
  ADD COLUMN IF NOT EXISTS focusnfe_token_homologacao TEXT,
  ADD COLUMN IF NOT EXISTS focusnfe_configurado_em TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS empresas_focusnfe_empresa_id_uq
  ON public.empresas (focusnfe_empresa_id)
  WHERE focusnfe_empresa_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.fiscal_emissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tenant_schema VARCHAR(100) NOT NULL,
  venda_id UUID NOT NULL,
  provedor VARCHAR(30) NOT NULL,
  tipo_documento VARCHAR(10) NOT NULL,
  ambiente VARCHAR(20) NOT NULL CHECK (ambiente IN ('homologacao', 'producao')),
  referencia VARCHAR(180) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pendente',
  chave VARCHAR(60),
  numero VARCHAR(30),
  serie VARCHAR(30),
  xml_url TEXT,
  danfe_url TEXT,
  resposta JSONB,
  erro TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, provedor, tipo_documento, ambiente, referencia)
);

CREATE INDEX IF NOT EXISTS fiscal_emissoes_empresa_status_idx
  ON public.fiscal_emissoes (empresa_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS fiscal_emissoes_venda_idx
  ON public.fiscal_emissoes (venda_id);

COMMENT ON TABLE public.fiscal_emissoes IS 'Rastreabilidade idempotente de documentos fiscais enviados por provedores externos.';
COMMENT ON COLUMN public.empresas.fiscal_provedor IS 'nativo ou focusnfe';
COMMENT ON COLUMN public.empresas.focusnfe_empresa_id IS 'ID da empresa emitente retornado pela API FocusNFe.';
