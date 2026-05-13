-- ============================================================
-- MIGRATION: add_soft_delete_all_entities
-- Gerado em: 2026-04-19
-- Objetivo: Implementar soft delete em todas as entidades
--           com RPCs de exclusão no sistema multi-tenant.
--
-- Schemas cobertos:
--   tenant_3ad04037, tenant_62a495e1, tenant_71148b59, tenant_84e7a845
--   public (user_profiles, empresas)
--
-- NOTA: clientes.deleted_at já existe em todos os schemas.
--       A coluna é adicionada com IF NOT EXISTS (idempotente).
-- ============================================================

BEGIN;

-- ============================================================
-- ETAPA 1A: Colunas deleted_at em tabelas COMUNS a todos os schemas
-- ============================================================
DO $$
DECLARE
  schemas TEXT[] := ARRAY[
    'tenant_3ad04037',
    'tenant_62a495e1',
    'tenant_71148b59',
    'tenant_84e7a845'
  ];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP

    -- clientes (coluna já existe, IF NOT EXISTS é seguro)
    EXECUTE format('ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

    -- produtos
    EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

    -- vendas
    EXECUTE format('ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

    -- financeiro (nome real da tabela no banco)
    EXECUTE format('ALTER TABLE %I.financeiro ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

    -- funcionarios
    EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

    -- kits
    EXECUTE format('ALTER TABLE %I.kits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

    -- kit_itens
    EXECUTE format('ALTER TABLE %I.kit_itens ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

    -- alertas_estoque
    EXECUTE format('ALTER TABLE %I.alertas_estoque ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

    -- interacoes_clientes
    EXECUTE format('ALTER TABLE %I.interacoes_clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', s);

  END LOOP;
END $$;

-- ============================================================
-- ETAPA 1B: Tabelas exclusivas de tenant_62a495e1
-- ============================================================
DO $$
BEGIN

  -- obras
  ALTER TABLE tenant_62a495e1.obras           ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  -- obras_etapas
  ALTER TABLE tenant_62a495e1.obras_etapas    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  -- obras_custos
  ALTER TABLE tenant_62a495e1.obras_custos    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  -- obras_recursos
  ALTER TABLE tenant_62a495e1.obras_recursos  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  -- ordens_servico
  ALTER TABLE tenant_62a495e1.ordens_servico  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  -- comissoes
  ALTER TABLE tenant_62a495e1.comissoes       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

END $$;

-- ============================================================
-- ETAPA 1C: Schema PUBLIC
-- ============================================================
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.empresas       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- ETAPA 2: Índices parciais (WHERE deleted_at IS NULL)
-- ============================================================
DO $$
DECLARE
  schemas TEXT[] := ARRAY[
    'tenant_3ad04037',
    'tenant_62a495e1',
    'tenant_71148b59',
    'tenant_84e7a845'
  ];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_clientes_not_deleted        ON %I.clientes(id)             WHERE deleted_at IS NULL', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_produtos_not_deleted         ON %I.produtos(id)             WHERE deleted_at IS NULL', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vendas_not_deleted           ON %I.vendas(id)               WHERE deleted_at IS NULL', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_financeiro_not_deleted       ON %I.financeiro(id)           WHERE deleted_at IS NULL', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_funcionarios_not_deleted     ON %I.funcionarios(id)         WHERE deleted_at IS NULL', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_kits_not_deleted             ON %I.kits(id)                 WHERE deleted_at IS NULL', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_kit_itens_not_deleted        ON %I.kit_itens(id)            WHERE deleted_at IS NULL', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_alertas_estoque_not_deleted  ON %I.alertas_estoque(id)      WHERE deleted_at IS NULL', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_interacoes_not_deleted       ON %I.interacoes_clientes(id)  WHERE deleted_at IS NULL', s);

  END LOOP;
END $$;

-- Índices exclusivos de tenant_62a495e1
CREATE INDEX IF NOT EXISTS idx_obras_not_deleted          ON tenant_62a495e1.obras(id)          WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obras_etapas_not_deleted   ON tenant_62a495e1.obras_etapas(id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obras_custos_not_deleted   ON tenant_62a495e1.obras_custos(id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obras_recursos_not_deleted ON tenant_62a495e1.obras_recursos(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ordens_servico_not_deleted ON tenant_62a495e1.ordens_servico(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comissoes_not_deleted      ON tenant_62a495e1.comissoes(id)      WHERE deleted_at IS NULL;

-- Índices schema public
CREATE INDEX IF NOT EXISTS idx_user_profiles_not_deleted ON public.user_profiles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_empresas_not_deleted      ON public.empresas(id)      WHERE deleted_at IS NULL;

COMMIT;
