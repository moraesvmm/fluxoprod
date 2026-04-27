-- ============================================================
-- HOTFIX: Corrigir COALESCE faltante no campo cpf_cnpj
-- da função tenant_atualizar_cliente em todos os schemas.
-- Data: 27/04/2026
-- Problema: Ao atualizar apenas funil_fase (pipeline drag),
--           cpf_cnpj era sobrescrito com NULL.
-- ============================================================

DO $$
DECLARE
  tenant_schema RECORD;
BEGIN
  FOR tenant_schema IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
  LOOP
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
          cpf_cnpj = COALESCE(p_cpf_cnpj, cpf_cnpj),
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

    RAISE NOTICE 'tenant_atualizar_cliente corrigida em %', tenant_schema.schema_name;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
