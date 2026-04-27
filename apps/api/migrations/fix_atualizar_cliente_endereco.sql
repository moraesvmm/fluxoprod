-- Update public wrapper to support p_endereco for atualizar_cliente
CREATE OR REPLACE FUNCTION public.tenant_atualizar_cliente(
  p_cliente_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_funil_fase TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_cpf_cnpj TEXT DEFAULT NULL,
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
    'SELECT %I.tenant_atualizar_cliente($1, $2, $3, $4, $5, $6, $7, $8)',
    v_tenant_schema
  )
  INTO v_result
  USING p_cliente_id, p_nome, p_email, p_telefone, p_funil_fase, p_status, p_cpf_cnpj, p_endereco;

  RETURN v_result;
END;
$$;

-- Function to update all tenant schemas
CREATE OR REPLACE FUNCTION public.update_all_tenants_atualizar_cliente()
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
      CREATE OR REPLACE FUNCTION %I.tenant_atualizar_cliente(
        p_cliente_id UUID,
        p_nome TEXT DEFAULT NULL,
        p_email TEXT DEFAULT NULL,
        p_telefone TEXT DEFAULT NULL,
        p_funil_fase TEXT DEFAULT NULL,
        p_status TEXT DEFAULT NULL,
        p_cpf_cnpj TEXT DEFAULT NULL,
        p_endereco TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $inner$
      BEGIN
        UPDATE %I.clientes
        SET
          nome = COALESCE(p_nome, nome),
          email = COALESCE(p_email, email),
          telefone = COALESCE(p_telefone, telefone),
          funil_fase = COALESCE(p_funil_fase, funil_fase),
          status = COALESCE(p_status, status),
          cpf_cnpj = COALESCE(p_cpf_cnpj, cpf_cnpj),
          endereco = COALESCE(p_endereco, endereco),
          atualizado_em = NOW()
        WHERE id = p_cliente_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
          RETURN jsonb_build_object(''error'', ''Cliente não encontrado ou já excluído'');
        END IF;

        RETURN jsonb_build_object(''success'', true);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''error'', SQLERRM);
      END;
      $inner$;
    ', schema_record.nspname, schema_record.nspname);
  END LOOP;
END;
$$;

SELECT public.update_all_tenants_atualizar_cliente();

-- Also drop the old version if the signature changed in a way that Postgres doesn't overwrite it
DROP FUNCTION IF EXISTS public.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.drop_old_tenant_atualizar_cliente()
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
    EXECUTE format('DROP FUNCTION IF EXISTS %I.tenant_atualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);', schema_record.nspname);
  END LOOP;
END;
$$;

SELECT public.drop_old_tenant_atualizar_cliente();
