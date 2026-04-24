-- ============================================================
-- MIGRATION: fix_crm_sprint24
-- Data: 2026-04-24
-- Objetivo: Resolver erro "Erro ao salvar cliente" no CRM
--
-- CAUSA RAIZ: Overloads de tenant_criar_cliente e tenant_atualizar_cliente
-- com assinaturas conflitantes (VARCHAR vs TEXT, com/sem p_cpf_cnpj).
--
-- AÇÕES:
--   1. Criar helper get_tenant_schema() (dependência das migrações Sprint24)
--   2. DROP de overloads conflitantes por schema tenant
--   3. CREATE versão unificada com TEXT + p_cpf_cnpj + soft delete
--   4. CREATE/REPLACE wrappers públicos
--   5. NOTIFY PostgREST para reload de schema cache
-- ============================================================

-- ── ETAPA 0: Helper get_tenant_schema ────────────────────────
-- Utilizado por wrappers de fechamento mensal (Sprint 24).
-- Padrão: mesmo lookup de user_profiles + empresas via auth.uid().
CREATE OR REPLACE FUNCTION public.get_tenant_schema()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema TEXT;
BEGIN
  SELECT e.schema_name INTO v_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  RETURN v_schema;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_schema() TO service_role;


-- ── ETAPA 1: Corrigir funções nos schemas tenant ──────────────
DO $$
DECLARE
  tenant_schema RECORD;
BEGIN
  FOR tenant_schema IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE '── Corrigindo schema: % ──', tenant_schema.schema_name;

    -- ── 1a. DROP de todas as overloads de tenant_criar_cliente ──
    -- Limpa TODAS as versões (VARCHAR e TEXT) para evitar ambiguidade.
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_criar_cliente(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT)', tenant_schema.schema_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_criar_cliente(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)', tenant_schema.schema_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_criar_cliente(TEXT, TEXT, TEXT, TEXT, TEXT)', tenant_schema.schema_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- ── 1b. DROP de todas as overloads de tenant_atualizar_cliente ──
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_atualizar_cliente(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR)', tenant_schema.schema_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)', tenant_schema.schema_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT)', tenant_schema.schema_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- ── 2a. CREATE versão definitiva de tenant_criar_cliente ──
    -- Parâmetros: TEXT (compatível com PostgREST JSON)
    -- Inclui: p_cpf_cnpj, soft delete (deleted_at), idempotência
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_criar_cliente(
        p_nome TEXT,
        p_email TEXT DEFAULT NULL,
        p_telefone TEXT DEFAULT NULL,
        p_funil_fase TEXT DEFAULT ''lead'',
        p_status TEXT DEFAULT ''ativo'',
        p_cpf_cnpj TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      DECLARE
        v_cliente_id UUID;
      BEGIN
        INSERT INTO clientes (nome, email, telefone, funil_fase, status, cpf_cnpj, deleted_at)
        VALUES (p_nome, p_email, p_telefone, p_funil_fase, p_status, p_cpf_cnpj, NULL)
        RETURNING id INTO v_cliente_id;

        RETURN jsonb_build_object(
          ''success'', true,
          ''cliente_id'', v_cliente_id
        );
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''error'', SQLERRM);
      END;
      $func$;
    ', tenant_schema.schema_name, tenant_schema.schema_name);
    RAISE NOTICE '  ✓ tenant_criar_cliente recriada em %', tenant_schema.schema_name;

    -- ── 2b. CREATE versão definitiva de tenant_atualizar_cliente ──
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_atualizar_cliente(
        p_cliente_id UUID,
        p_nome TEXT DEFAULT NULL,
        p_email TEXT DEFAULT NULL,
        p_telefone TEXT DEFAULT NULL,
        p_funil_fase TEXT DEFAULT NULL,
        p_status TEXT DEFAULT NULL,
        p_cpf_cnpj TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I
      AS $func$
      BEGIN
        UPDATE clientes
        SET
          nome = COALESCE(p_nome, nome),
          email = COALESCE(p_email, email),
          telefone = COALESCE(p_telefone, telefone),
          funil_fase = COALESCE(p_funil_fase, funil_fase),
          status = COALESCE(p_status, status),
          cpf_cnpj = p_cpf_cnpj,
          atualizado_em = NOW()
        WHERE id = p_cliente_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
          RETURN jsonb_build_object(''error'', ''Cliente não encontrado ou já excluído'');
        END IF;

        RETURN jsonb_build_object(''success'', true);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''error'', SQLERRM);
      END;
      $func$;
    ', tenant_schema.schema_name, tenant_schema.schema_name);
    RAISE NOTICE '  ✓ tenant_atualizar_cliente recriada em %', tenant_schema.schema_name;

  END LOOP;
END $$;


-- ── ETAPA 2: Wrappers públicos ────────────────────────────────
-- Padrão idêntico a rpc_comissoes_regras.sql:
--   1. Lookup schema via user_profiles + empresas + auth.uid()
--   2. EXECUTE format ... INTO v_result USING params
--   3. RETURN v_result

-- ── 2a. DROP overloads antigos dos wrappers públicos ──
DROP FUNCTION IF EXISTS public.tenant_criar_cliente(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.tenant_criar_cliente(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.tenant_criar_cliente(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT);

DROP FUNCTION IF EXISTS public.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.tenant_atualizar_cliente(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

-- ── 2b. Wrapper público: tenant_criar_cliente ──
CREATE OR REPLACE FUNCTION public.tenant_criar_cliente(
  p_nome TEXT,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_funil_fase TEXT DEFAULT 'lead',
  p_status TEXT DEFAULT 'ativo',
  p_cpf_cnpj TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;

  EXECUTE format(
    'SELECT %I.tenant_criar_cliente($1, $2, $3, $4, $5, $6)',
    v_tenant_schema
  )
  INTO v_result
  USING p_nome, p_email, p_telefone, p_funil_fase, p_status, p_cpf_cnpj;

  RETURN v_result;
END;
$$;

-- ── 2c. Wrapper público: tenant_atualizar_cliente ──
CREATE OR REPLACE FUNCTION public.tenant_atualizar_cliente(
  p_cliente_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_funil_fase TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_cpf_cnpj TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;

  EXECUTE format(
    'SELECT %I.tenant_atualizar_cliente($1, $2, $3, $4, $5, $6, $7)',
    v_tenant_schema
  )
  INTO v_result
  USING p_cliente_id, p_nome, p_email, p_telefone, p_funil_fase, p_status, p_cpf_cnpj;

  RETURN v_result;
END;
$$;


-- ── ETAPA 3: Permissões ───────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.tenant_criar_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_schema() TO authenticated;


-- ── ETAPA 4: Reload PostgREST schema cache ────────────────────
NOTIFY pgrst, 'reload schema';


-- ── FIM ───────────────────────────────────────────────────────
-- Após executar, testar:
--   1. CRM → Novo Cliente (com CPF/CNPJ) → deve salvar
--   2. CRM → Editar Cliente (alterar CPF/CNPJ) → deve atualizar
--   3. CRM → Listar clientes → deve continuar funcionando
