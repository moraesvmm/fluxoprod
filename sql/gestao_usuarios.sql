-- ============================================================
-- GESTÃO DE USUÁRIOS E CONTROLE GRANULAR DE MÓDULOS POR TENANT
-- Fluxo ERP — Pendência Crítica #3
-- Política: MUDANÇAS ADITIVAS APENAS (não quebra tenants existentes)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Adicionar limite_usuarios em public.empresas
-- ------------------------------------------------------------
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS limite_usuarios INTEGER NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.empresas.limite_usuarios IS
  'Número máximo de usuários ativos permitidos pelo plano contratado. Starter=3, Business=10, Pro=50';

-- ------------------------------------------------------------
-- 2. Tabela de permissões granulares de módulo por usuário
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuario_modulos_permitidos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  UUID        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo_key  TEXT        NOT NULL,
  permitido   BOOLEAN     NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, empresa_id, modulo_key)
);

CREATE INDEX IF NOT EXISTS idx_usuario_modulos_user
  ON public.usuario_modulos_permitidos(user_id);

CREATE INDEX IF NOT EXISTS idx_usuario_modulos_empresa
  ON public.usuario_modulos_permitidos(empresa_id);

CREATE INDEX IF NOT EXISTS idx_usuario_modulos_user_empresa
  ON public.usuario_modulos_permitidos(user_id, empresa_id);

COMMENT ON TABLE public.usuario_modulos_permitidos IS
  'Permissões granulares de módulo por usuário dentro do tenant. '
  'tenant_admin sempre tem acesso total. Esta tabela só se aplica a tenant_user.';

-- ------------------------------------------------------------
-- 3. Helper: verificar limite de usuários
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verificar_limite_usuarios(p_empresa_id UUID)
RETURNS TABLE (
  usuarios_ativos INTEGER,
  limite          INTEGER,
  pode_criar      BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*)::INTEGER
       FROM public.user_profiles
      WHERE empresa_id = p_empresa_id AND deleted_at IS NULL)  AS usuarios_ativos,
    (SELECT e.limite_usuarios
       FROM public.empresas e
      WHERE e.id = p_empresa_id)                               AS limite,
    (SELECT count(*)::INTEGER
       FROM public.user_profiles
      WHERE empresa_id = p_empresa_id AND deleted_at IS NULL)
    <
    (SELECT e.limite_usuarios
       FROM public.empresas e
      WHERE e.id = p_empresa_id)                               AS pode_criar;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_limite_usuarios TO authenticated;

-- ------------------------------------------------------------
-- 4. RPC: listar usuários do tenant (somente tenant_admin)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenant_listar_usuarios()
RETURNS TABLE (
  user_id      UUID,
  nome         TEXT,
  email        TEXT,
  role         TEXT,
  criado_em    TIMESTAMPTZ,
  ultimo_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id  UUID;
  v_caller_role TEXT;
BEGIN
  SELECT up.empresa_id, up.role
    INTO v_empresa_id, v_caller_role
    FROM public.user_profiles up
   WHERE up.user_id = auth.uid() AND up.deleted_at IS NULL;

  IF v_caller_role IS DISTINCT FROM 'tenant_admin' THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem gerenciar usuários.';
  END IF;

  RETURN QUERY
  SELECT
    up.user_id,
    up.nome::TEXT,
    au.email::TEXT,
    up.role::TEXT,
    up.criado_em,
    au.last_sign_in_at AS ultimo_login
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.user_id
  WHERE up.empresa_id = v_empresa_id
    AND up.deleted_at IS NULL
  ORDER BY up.criado_em ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_usuarios TO authenticated;

-- ------------------------------------------------------------
-- 5. RPC: listar módulos do tenant com permissão de um usuário
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenant_listar_modulos_usuario(p_target_user_id UUID)
RETURNS TABLE (
  modulo_key  TEXT,
  modulo_nome TEXT,
  contratado  BOOLEAN,
  permitido   BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id  UUID;
  v_caller_role TEXT;
BEGIN
  SELECT up.empresa_id, up.role
    INTO v_empresa_id, v_caller_role
    FROM public.user_profiles up
   WHERE up.user_id = auth.uid() AND up.deleted_at IS NULL;

  IF v_caller_role IS DISTINCT FROM 'tenant_admin' THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  -- Garantir que o usuário alvo pertence ao mesmo tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
     WHERE user_id = p_target_user_id AND empresa_id = v_empresa_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Usuário não pertence a este tenant.';
  END IF;

  RETURN QUERY
  SELECT
    mc.key::TEXT,
    mc.nome::TEXT,
    COALESCE(em.ativo, false)   AS contratado,
    COALESCE(ump.permitido, false) AS permitido
  FROM public.modulos_catalogo mc
  LEFT JOIN public.empresa_modulos em
    ON em.modulo_key = mc.key AND em.empresa_id = v_empresa_id
  LEFT JOIN public.usuario_modulos_permitidos ump
    ON ump.modulo_key = mc.key
   AND ump.user_id   = p_target_user_id
   AND ump.empresa_id = v_empresa_id
  ORDER BY mc.key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_modulos_usuario TO authenticated;

-- ------------------------------------------------------------
-- 6. RPC: atualizar permissões de módulo de um usuário (UPSERT)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenant_atualizar_modulos_usuario(
  p_target_user_id UUID,
  p_modulos        JSONB   -- [{"key": "crm", "permitido": true}, ...]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id  UUID;
  v_caller_role TEXT;
  v_item        JSONB;
BEGIN
  SELECT up.empresa_id, up.role
    INTO v_empresa_id, v_caller_role
    FROM public.user_profiles up
   WHERE up.user_id = auth.uid() AND up.deleted_at IS NULL;

  IF v_caller_role IS DISTINCT FROM 'tenant_admin' THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
     WHERE user_id = p_target_user_id AND empresa_id = v_empresa_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Usuário não pertence a este tenant.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_modulos) LOOP
    INSERT INTO public.usuario_modulos_permitidos
      (user_id, empresa_id, modulo_key, permitido)
    VALUES
      (p_target_user_id, v_empresa_id, v_item->>'key', (v_item->>'permitido')::BOOLEAN)
    ON CONFLICT (user_id, empresa_id, modulo_key)
      DO UPDATE SET permitido = EXCLUDED.permitido;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_atualizar_modulos_usuario TO authenticated;
