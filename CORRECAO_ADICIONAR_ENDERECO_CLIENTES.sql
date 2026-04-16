-- ==========================================
-- CORREÇÃO - ADICIONAR COLUNA ENDERECO EM CLIENTES
-- ==========================================

-- ==========================================
-- PARTE 1: ADICIONAR COLUNA EM TODOS OS SCHEMAS TENANT
-- ==========================================

DO $$
DECLARE
  v_schema_name TEXT;
BEGIN
  FOR v_schema_name IN 
    SELECT nspname 
    FROM pg_namespace 
    WHERE nspname LIKE 'tenant_%'
    ORDER BY nspname
  LOOP
    
    EXECUTE format(
      'ALTER TABLE IF EXISTS %I.clientes 
       ADD COLUMN IF NOT EXISTS endereco TEXT',
      v_schema_name
    );

    RAISE NOTICE 'Coluna endereco verificada em %s.clientes', v_schema_name;

  END LOOP;
END $$;

-- ==========================================
-- PARTE 2: VERIFICAR RESULTADO
-- ==========================================

SELECT 
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema LIKE 'tenant_%'
  AND table_name = 'clientes'
  AND column_name = 'endereco'
ORDER BY table_schema;

-- ==========================================
-- PARTE 3: ATUALIZAR RPC TENANT_CRIAR_CLIENTE
-- ==========================================

DO $$
DECLARE
  v_schema_name TEXT;
BEGIN

  FOR v_schema_name IN 
    SELECT nspname 
    FROM pg_namespace 
    WHERE nspname LIKE 'tenant_%'
    ORDER BY nspname
  LOOP

    EXECUTE format('

CREATE OR REPLACE FUNCTION %I.tenant_criar_cliente(
  p_nome VARCHAR(255),
  p_email VARCHAR(255),
  p_telefone VARCHAR(50),
  p_endereco TEXT,
  p_funil_fase VARCHAR(50),
  p_status VARCHAR(50),
  p_idempotency_key TEXT DEFAULT NULL
)

RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = %I, public

AS $func$

DECLARE
  v_cliente_id UUID;
  v_cached_result JSONB;

BEGIN

  -- Verificar idempotência

  IF p_idempotency_key IS NOT NULL THEN

    SELECT result
    INTO v_cached_result
    FROM idempotency_control
    WHERE idempotency_key = p_idempotency_key
      AND operation_type = ''tenant_criar_cliente'';

    IF v_cached_result IS NOT NULL THEN
      RETURN v_cached_result;
    END IF;

  END IF;

  INSERT INTO clientes (
    nome,
    email,
    telefone,
    endereco,
    funil_fase,
    status
  )
  VALUES (
    p_nome,
    p_email,
    p_telefone,
    p_endereco,
    p_funil_fase,
    p_status
  )
  RETURNING id
  INTO v_cliente_id;

  v_cached_result := jsonb_build_object(
    ''success'', true,
    ''cliente_id'', v_cliente_id
  );

  IF p_idempotency_key IS NOT NULL THEN

    INSERT INTO idempotency_control (
      idempotency_key,
      operation_type,
      result
    )
    VALUES (
      p_idempotency_key,
      ''tenant_criar_cliente'',
      v_cached_result
    );

  END IF;

  RETURN v_cached_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION ''Erro ao criar cliente: %'', SQLERRM;

END;

$func$;

', v_schema_name, v_schema_name);

    RAISE NOTICE 'RPC tenant_criar_cliente atualizada no schema %s', v_schema_name;

  END LOOP;

END $$;

-- ==========================================
-- PARTE 4: RPC PUBLIC TENANT_CRIAR_CLIENTE
-- ==========================================

DROP FUNCTION IF EXISTS public.tenant_criar_cliente(
  VARCHAR,
  VARCHAR,
  VARCHAR,
  TEXT,
  VARCHAR,
  VARCHAR
);

CREATE OR REPLACE FUNCTION public.tenant_criar_cliente(
  p_nome VARCHAR(255),
  p_email VARCHAR(255),
  p_telefone VARCHAR(50),
  p_endereco TEXT,
  p_funil_fase VARCHAR(50),
  p_status VARCHAR(50)
)

RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$

DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;

BEGIN

  SELECT schema_name
  INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e
    ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object(
      'error',
      'Tenant não encontrado'
    );
  END IF;

  EXECUTE format(
    'SELECT %I.tenant_criar_cliente($1,$2,$3,$4,$5,$6)',
    v_tenant_schema
  )
  INTO v_result
  USING
    p_nome,
    p_email,
    p_telefone,
    p_endereco,
    p_funil_fase,
    p_status;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN

  RETURN jsonb_build_object(
    'error',
    SQLERRM
  );

END;

$$;

GRANT EXECUTE 
ON FUNCTION public.tenant_criar_cliente 
TO authenticated;

-- ==========================================
-- PARTE 5: RPC TENANT_LISTAR_CLIENTES
-- ==========================================

DROP FUNCTION IF EXISTS public.tenant_listar_clientes(INT, INT);

CREATE OR REPLACE FUNCTION public.tenant_listar_clientes(
  p_limit INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)

RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$

DECLARE
  v_tenant_schema TEXT;
  v_row JSONB;

BEGIN

  SELECT schema_name
  INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e
    ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  IF v_tenant_schema IS NULL THEN
    RAISE EXCEPTION 
      'Tenant não encontrado';
  END IF;

  FOR v_row IN
    EXECUTE format(
      '

SELECT jsonb_build_object(
  ''id'', id,
  ''nome'', nome,
  ''email'', email,
  ''telefone'', telefone,
  ''endereco'', endereco,
  ''funil_fase'', funil_fase,
  ''status'', status,
  ''criado_em'', criado_em,
  ''atualizado_em'', atualizado_em
)
FROM %I.clientes
ORDER BY criado_em DESC
LIMIT $1 OFFSET $2

',
      v_tenant_schema
    )
    USING p_limit, p_offset

  LOOP

    RETURN NEXT v_row;

  END LOOP;

  RETURN;

EXCEPTION WHEN OTHERS THEN

  RAISE EXCEPTION 'Erro ao listar clientes: %s', SQLERRM;

END;

$$;

GRANT EXECUTE 
ON FUNCTION public.tenant_listar_clientes 
TO authenticated;

-- ==========================================
-- PARTE 6: VERIFICAR RPCS
-- ==========================================

SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'tenant_criar_cliente',
    'tenant_listar_clientes'
  )
ORDER BY routine_name;
