-- Update public wrapper to support p_endereco
CREATE OR REPLACE FUNCTION public.tenant_criar_cliente(
  p_nome TEXT,
  p_email TEXT,
  p_telefone TEXT,
  p_funil_fase TEXT,
  p_status TEXT,
  p_cpf_cnpj TEXT,
  p_endereco TEXT DEFAULT NULL
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
    'SELECT %I.tenant_criar_cliente($1, $2, $3, $4, $5, $6, $7)',
    v_tenant_schema
  )
  INTO v_result
  USING p_nome, p_email, p_telefone, p_funil_fase, p_status, p_cpf_cnpj, p_endereco;

  RETURN v_result;
END;
$$;

-- Function to update all tenant schemas
CREATE OR REPLACE FUNCTION public.update_all_tenants_criar_cliente()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_record RECORD;
BEGIN
  FOR schema_record IN 
    SELECT nspname FROM pg_namespace WHERE nspname LIKE 'tenant_%' OR nspname = 'tenant_template'
  LOOP
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.tenant_criar_cliente(
        p_nome TEXT,
        p_email TEXT,
        p_telefone TEXT,
        p_funil_fase TEXT,
        p_status TEXT,
        p_cpf_cnpj TEXT,
        p_endereco TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $inner$
      DECLARE
        v_cliente_id UUID;
      BEGIN
        INSERT INTO %I.clientes (nome, email, telefone, funil_fase, status, cpf_cnpj, endereco, deleted_at)
        VALUES (p_nome, p_email, p_telefone, p_funil_fase, p_status, p_cpf_cnpj, p_endereco, NULL)
        RETURNING id INTO v_cliente_id;

        RETURN jsonb_build_object(
          ''success'', true,
          ''cliente_id'', v_cliente_id
        );
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''error'', SQLERRM);
      END;
      $inner$;
    ', schema_record.nspname, schema_record.nspname);
  END LOOP;
END;
$$;

SELECT public.update_all_tenants_criar_cliente();

-- Also drop the old version if the signature changed in a way that Postgres doesn't overwrite it
DROP FUNCTION IF EXISTS public.tenant_criar_cliente(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.drop_old_tenant_criar_cliente()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_record RECORD;
BEGIN
  FOR schema_record IN 
    SELECT nspname FROM pg_namespace WHERE nspname LIKE 'tenant_%' OR nspname = 'tenant_template'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_criar_cliente(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);', schema_record.nspname);
  END LOOP;
END;
$$;

SELECT public.drop_old_tenant_criar_cliente();
