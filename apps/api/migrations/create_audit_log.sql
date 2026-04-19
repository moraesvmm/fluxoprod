-- ============================================================
-- MIGRATION: create_audit_log
-- Gerado em: 2026-04-19
-- Objetivo: Criar tabela de audit trail global e função auxiliar
--           de registro no schema public.
-- ============================================================

-- ── ETAPA 1: Tabela audit_log ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name  TEXT        NOT NULL,
  tabela       TEXT        NOT NULL,
  operacao     TEXT        NOT NULL
                           CHECK (operacao IN ('INSERT','UPDATE','DELETE','SOFT_DELETE')),
  registro_id  UUID        NOT NULL,
  usuario_id   UUID        REFERENCES auth.users(id),
  empresa_id   UUID,
  dados_antes  JSONB,
  dados_depois JSONB,
  ip           TEXT,
  criado_em    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices de consulta
CREATE INDEX IF NOT EXISTS idx_audit_log_registro  ON public.audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario   ON public.audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_criado    ON public.audit_log(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela    ON public.audit_log(tabela, operacao);
CREATE INDEX IF NOT EXISTS idx_audit_log_empresa   ON public.audit_log(empresa_id);

-- ── ETAPA 2: Função auxiliar registrar_audit ─────────────────
CREATE OR REPLACE FUNCTION public.registrar_audit(
  p_schema      TEXT,
  p_tabela      TEXT,
  p_operacao    TEXT,
  p_registro_id UUID,
  p_usuario_id  UUID,
  p_empresa_id  UUID,
  p_dados_antes  JSONB DEFAULT NULL,
  p_dados_depois JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.audit_log (
    schema_name, tabela, operacao, registro_id,
    usuario_id, empresa_id,
    dados_antes, dados_depois,
    criado_em
  ) VALUES (
    p_schema, p_tabela, p_operacao, p_registro_id,
    p_usuario_id, p_empresa_id,
    p_dados_antes, p_dados_depois,
    NOW()
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.registrar_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_audit TO service_role;

-- ── ETAPA 3: RPC de consulta tenant_listar_audit ─────────────
CREATE OR REPLACE FUNCTION public.tenant_listar_audit(
  p_registro_id UUID   DEFAULT NULL,
  p_tabela      TEXT   DEFAULT NULL,
  p_limit       INT    DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_user_id    UUID;
  v_empresa_id UUID;
  v_role       TEXT;
  v_result     JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Usuário não autenticado');
  END IF;

  -- Verificar se o usuário é admin ou master
  SELECT up.role, up.empresa_id
  INTO v_role, v_empresa_id
  FROM public.user_profiles up
  WHERE up.user_id = v_user_id;

  IF v_role NOT IN ('admin', 'master', 'superadmin') THEN
    RETURN jsonb_build_object('error', 'Acesso negado — apenas administradores podem consultar o audit trail');
  END IF;

  SELECT jsonb_agg(row_to_json(a) ORDER BY a.criado_em DESC)
  INTO v_result
  FROM (
    SELECT
      id, schema_name, tabela, operacao, registro_id,
      usuario_id, empresa_id,
      dados_antes, dados_depois,
      criado_em
    FROM public.audit_log
    WHERE
      (p_registro_id IS NULL OR registro_id = p_registro_id)
      AND (p_tabela IS NULL OR tabela = p_tabela)
      AND (v_role = 'master' OR empresa_id = v_empresa_id)
    ORDER BY criado_em DESC
    LIMIT LEAST(p_limit, 500)
  ) a;

  RETURN COALESCE(v_result, '[]'::JSONB);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.tenant_listar_audit TO authenticated;
