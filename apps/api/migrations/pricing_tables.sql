-- ============================================================
-- Migration: Pricing Tables (planos, modulos_avulsos, historico_precos)
-- Data: 23/04/2026
-- Objetivo: Permitir controle dinâmico de preços pelo painel master
-- ============================================================

-- 1. Tabela de Planos
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  preco_promocional DECIMAL(10,2),
  descricao TEXT,
  modulos_incluidos TEXT[] DEFAULT '{}',
  ordem_exibicao INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Módulos Avulsos
CREATE TABLE IF NOT EXISTS public.modulos_avulsos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  preco_promocional DECIMAL(10,2),
  descricao TEXT,
  icone TEXT,
  features TEXT[] DEFAULT '{}',
  ordem_exibicao INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Histórico de Preços (Audit Trail)
CREATE TABLE IF NOT EXISTS public.historico_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('plano', 'modulo_avulso')),
  referencia_id UUID NOT NULL,
  referencia_nome TEXT,
  preco_anterior DECIMAL(10,2) NOT NULL,
  preco_novo DECIMAL(10,2) NOT NULL,
  foi_promocional BOOLEAN DEFAULT false,
  alterado_por TEXT,
  motivo TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_planos_key ON public.planos(key);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON public.planos(ativo);
CREATE INDEX IF NOT EXISTS idx_modulos_avulsos_key ON public.modulos_avulsos(key);
CREATE INDEX IF NOT EXISTS idx_modulos_avulsos_ativo ON public.modulos_avulsos(ativo);
CREATE INDEX IF NOT EXISTS idx_historico_precos_ref ON public.historico_precos(referencia_id);
CREATE INDEX IF NOT EXISTS idx_historico_precos_data ON public.historico_precos(criado_em DESC);

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_planos_updated_at ON public.planos;
CREATE TRIGGER trg_planos_updated_at
  BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.update_pricing_updated_at();

DROP TRIGGER IF EXISTS trg_modulos_avulsos_updated_at ON public.modulos_avulsos;
CREATE TRIGGER trg_modulos_avulsos_updated_at
  BEFORE UPDATE ON public.modulos_avulsos
  FOR EACH ROW EXECUTE FUNCTION public.update_pricing_updated_at();

-- 6. Seed: Planos (valores atuais do checkout hardcoded)
INSERT INTO public.planos (key, nome, preco, descricao, modulos_incluidos, ordem_exibicao)
VALUES
  ('starter', 'Starter', 249.00, 'Entrada e Visibilidade', ARRAY['dashboard','crm','catalogo','estoque'], 1),
  ('business', 'Business', 499.00, 'Operação Central', ARRAY['dashboard','crm','catalogo','estoque','vendas','financeiro','rh'], 2),
  ('pro', 'Pro', 849.00, 'Vertical Completo', ARRAY['dashboard','crm','catalogo','estoque','vendas','financeiro','rh','os','obras','comissoes','relatorios'], 3)
ON CONFLICT (key) DO NOTHING;

-- 7. Seed: Módulos Avulsos (valores atuais do checkout hardcoded)
INSERT INTO public.modulos_avulsos (key, nome, preco, descricao, icone, features, ordem_exibicao)
VALUES
  ('os', 'Ordem de Serviço', 79.90, 'Acompanhamento completo para serviços pontuais.', '🔧',
   ARRAY['OS numerada com status em tempo real','Atribuição a colaboradores e técnicos','Registro completo do histórico do serviço'], 1),
  ('obras', 'Gestão de Obras', 79.90, 'Controle especializado para projetos de longa duração.', '🏗️',
   ARRAY['Cronograma por etapas e timeline visual','Financeiro integrado (Previsto vs Real)','Gestão de recursos, materiais e documentos'], 2),
  ('comissoes', 'Comissões', 79.90, 'Gestão transparente das premiações de venda.', '💰',
   ARRAY['Cálculo automático integrado ao PDV','Histórico auditável de bonificações','Relatórios parametrizados por vendedor'], 3),
  ('relatorios', 'Relatórios', 79.90, 'Visão analítica avançada sobre a operação do tenant.', '📄',
   ARRAY['Consolidação de dados cruciais da operação','Visão estratégica macro para diretores','Agiliza o controle para a contabilidade'], 4),
  ('rh', 'RH & Pessoal', 79.90, 'Módulo administrativo da equipe.', '👥',
   ARRAY['Gestão global de colaboradores ativos/desligados','Cadastro e atribuição de cargos funcionais','Abre caminho para cálculo robusto de comissões'], 5)
ON CONFLICT (key) DO NOTHING;

-- 8. RPCs de leitura (público - para checkout)
CREATE OR REPLACE FUNCTION public.listar_planos_checkout()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'key', p.key,
        'nome', p.nome,
        'preco', p.preco,
        'preco_promocional', p.preco_promocional,
        'descricao', p.descricao,
        'modulos_incluidos', p.modulos_incluidos,
        'ordem_exibicao', p.ordem_exibicao
      ) ORDER BY p.ordem_exibicao
    ), '[]'::jsonb)
    FROM public.planos p
    WHERE p.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.listar_modulos_avulsos_checkout()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'key', p.key,
        'nome', p.nome,
        'preco', p.preco,
        'preco_promocional', p.preco_promocional,
        'descricao', p.descricao,
        'icone', p.icone,
        'features', p.features,
        'ordem_exibicao', p.ordem_exibicao
      ) ORDER BY p.ordem_exibicao
    ), '[]'::jsonb)
    FROM public.modulos_avulsos p
    WHERE p.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPCs de escrita (master-only)
CREATE OR REPLACE FUNCTION public.master_atualizar_plano(
  p_id UUID,
  p_preco DECIMAL,
  p_preco_promocional DECIMAL DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_old RECORD;
BEGIN
  SELECT preco, nome INTO v_old FROM public.planos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Plano não encontrado');
  END IF;

  -- Registrar histórico
  INSERT INTO public.historico_precos (tipo, referencia_id, referencia_nome, preco_anterior, preco_novo, foi_promocional, alterado_por)
  VALUES ('plano', p_id, v_old.nome, v_old.preco, p_preco, p_preco_promocional IS NOT NULL, 'master');

  -- Atualizar
  UPDATE public.planos
  SET preco = p_preco,
      preco_promocional = p_preco_promocional,
      ativo = p_ativo
  WHERE id = p_id;

  RETURN jsonb_build_object('status', 'ok', 'message', 'Plano atualizado com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.master_atualizar_modulo_avulso(
  p_id UUID,
  p_preco DECIMAL,
  p_preco_promocional DECIMAL DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_old RECORD;
BEGIN
  SELECT preco, nome INTO v_old FROM public.modulos_avulsos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Módulo não encontrado');
  END IF;

  INSERT INTO public.historico_precos (tipo, referencia_id, referencia_nome, preco_anterior, preco_novo, foi_promocional, alterado_por)
  VALUES ('modulo_avulso', p_id, v_old.nome, v_old.preco, p_preco, p_preco_promocional IS NOT NULL, 'master');

  UPDATE public.modulos_avulsos
  SET preco = p_preco,
      preco_promocional = p_preco_promocional,
      ativo = p_ativo
  WHERE id = p_id;

  RETURN jsonb_build_object('status', 'ok', 'message', 'Módulo atualizado com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC de listagem de histórico
CREATE OR REPLACE FUNCTION public.master_listar_historico_precos()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'tipo', h.tipo,
        'referencia_nome', h.referencia_nome,
        'preco_anterior', h.preco_anterior,
        'preco_novo', h.preco_novo,
        'foi_promocional', h.foi_promocional,
        'alterado_por', h.alterado_por,
        'criado_em', h.criado_em
      ) ORDER BY h.criado_em DESC
    ), '[]'::jsonb)
    FROM public.historico_precos h
    LIMIT 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
