-- ==============================================================================
-- FLUXO ERP - PATCH FISCAL: SEQUÊNCIAS ATÔMICAS (nNF)
-- Status: Produção - Correção de Duplicidade de NFe
-- ==============================================================================

-- 1. Criação da tabela de séries fiscais
CREATE TABLE IF NOT EXISTS public.fiscal_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ambiente VARCHAR(20) NOT NULL CHECK (ambiente IN ('producao', 'homologacao')),
  modelo VARCHAR(2) NOT NULL DEFAULT '55' CHECK (modelo IN ('55', '65')), -- 55=NFe, 65=NFCe
  serie INT NOT NULL DEFAULT 1,
  numero_atual INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(empresa_id, ambiente, modelo, serie)
);

COMMENT ON TABLE public.fiscal_series IS 'Controle de sequência e série para emissão de notas fiscais (NFe/NFCe) por ambiente para evitar duplicidade e pular notas.';

-- 2. Políticas de RLS
ALTER TABLE public.fiscal_series ENABLE ROW LEVEL SECURITY;

-- Usuários e APIs com service_role podem acessar
DROP POLICY IF EXISTS "fiscal_series_leitura_propria" ON public.fiscal_series;
CREATE POLICY "fiscal_series_leitura_propria" ON public.fiscal_series
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND empresa_id = fiscal_series.empresa_id
    )
  );

-- 3. Função Atômica de Incremento (Concurrency Safe via Row Level Lock)
CREATE OR REPLACE FUNCTION public.incrementar_numero_nfe(
  p_empresa_id UUID,
  p_ambiente VARCHAR,
  p_serie INT DEFAULT 1,
  p_modelo VARCHAR DEFAULT '55'
) RETURNS INT AS $$
DECLARE
  v_numero_atual INT;
BEGIN
  -- Utilizamos INSERT ON CONFLICT DO UPDATE (Upsert) que possui lock atômico de linha no Postgres.
  -- Assim, requisições concorrentes não conseguem roubar o mesmo número (Racing Condition).
  INSERT INTO public.fiscal_series (empresa_id, ambiente, serie, modelo, numero_atual)
  VALUES (p_empresa_id, p_ambiente, p_serie, p_modelo, 1)
  ON CONFLICT (empresa_id, ambiente, modelo, serie)
  DO UPDATE SET
    numero_atual = public.fiscal_series.numero_atual + 1,
    atualizado_em = NOW()
  RETURNING numero_atual INTO v_numero_atual;

  RETURN v_numero_atual;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.incrementar_numero_nfe IS 'RPC Atômica que autoincrementa e retorna o próximo número de NFe livre garantindo thread-safety no banco.';
