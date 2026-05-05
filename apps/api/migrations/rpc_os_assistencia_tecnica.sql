-- ==========================================
-- EXPANSAO DO MODULO DE ORDENS DE SERVICO (ASSISTENCIA TECNICA)
-- ==========================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- Verificar se a tabela base de OS existe no schema
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = r.schema_name AND table_name = 'ordens_servico') THEN
            -- Adicionar novas colunas para rastreabilidade e diagnóstico
            EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS equipamento_serial TEXT;', r.schema_name);
            EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS laudo_tecnico TEXT;', r.schema_name);
            EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS checklist_entrada JSONB;', r.schema_name);
            
            -- Atualizar a função tenant_criar_os dentro do schema
            EXECUTE format('
                CREATE OR REPLACE FUNCTION %I.tenant_criar_os(
                  p_cliente_id UUID,
                  p_colaborador_id UUID,
                  p_veiculo_equipamento VARCHAR(255),
                  p_descricao_problema TEXT,
                  p_status VARCHAR(50),
                  p_valor_orcamento NUMERIC(10, 2),
                  p_idempotency_key TEXT DEFAULT NULL,
                  p_equipamento_serial TEXT DEFAULT NULL,
                  p_laudo_tecnico TEXT DEFAULT NULL,
                  p_checklist_entrada JSONB DEFAULT NULL
                )
                RETURNS JSONB
                LANGUAGE plpgsql
                SECURITY DEFINER
                SET search_path = %I
                AS $func$
                DECLARE
                  v_os_id UUID;
                  v_cached_result JSONB;
                BEGIN
                  -- Verificar idempotência
                  IF p_idempotency_key IS NOT NULL THEN
                    SELECT result INTO v_cached_result
                    FROM idempotency_control
                    WHERE idempotency_key = p_idempotency_key AND operation_type = ''tenant_criar_os'';
                    
                    IF v_cached_result IS NOT NULL THEN
                      RETURN v_cached_result;
                    END IF;
                  END IF;

                  INSERT INTO ordens_servico (
                    cliente_id, colaborador_id, veiculo_equipamento, 
                    descricao_problema, status, valor_orcamento,
                    equipamento_serial, laudo_tecnico, checklist_entrada
                  )
                  VALUES (
                    p_cliente_id, p_colaborador_id, p_veiculo_equipamento, 
                    p_descricao_problema, p_status, p_valor_orcamento,
                    p_equipamento_serial, p_laudo_tecnico, p_checklist_entrada
                  )
                  RETURNING id INTO v_os_id;

                  v_cached_result := json_build_object(
                    ''success'', true,
                    ''os_id'', v_os_id
                  );

                  -- Armazenar resultado para idempotência
                  IF p_idempotency_key IS NOT NULL THEN
                    INSERT INTO idempotency_control (idempotency_key, operation_type, result)
                    VALUES (p_idempotency_key, ''tenant_criar_os'', v_cached_result);
                  END IF;

                  RETURN v_cached_result;
                EXCEPTION WHEN OTHERS THEN
                  RAISE EXCEPTION ''Erro ao criar OS: %%'', SQLERRM;
                END;
                $func$;', r.schema_name, r.schema_name);
        END IF;
    END LOOP;
END $$;

-- Limpar assinaturas antigas para evitar conflitos de sobrecarga (Overloading)
DROP FUNCTION IF EXISTS public.tenant_criar_os(UUID, UUID, VARCHAR, TEXT, VARCHAR, NUMERIC);
DROP FUNCTION IF EXISTS public.tenant_criar_os(UUID, UUID, VARCHAR, TEXT, VARCHAR, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.tenant_atualizar_os(UUID, UUID, UUID, VARCHAR, TEXT, VARCHAR, NUMERIC);

-- Atualizar o Wrapper Público tenant_criar_os
CREATE OR REPLACE FUNCTION public.tenant_criar_os(
  p_cliente_id UUID,
  p_colaborador_id UUID,
  p_veiculo_equipamento VARCHAR(255),
  p_descricao_problema TEXT,
  p_status VARCHAR(50),
  p_valor_orcamento NUMERIC(10, 2),
  p_idempotency_key TEXT DEFAULT NULL,
  p_equipamento_serial TEXT DEFAULT NULL,
  p_laudo_tecnico TEXT DEFAULT NULL,
  p_checklist_entrada JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado');
  END IF;

  EXECUTE format('SELECT %I.tenant_criar_os($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', v_tenant_schema)
  INTO v_result
  USING p_cliente_id, p_colaborador_id, p_veiculo_equipamento, p_descricao_problema, p_status, p_valor_orcamento, p_idempotency_key, p_equipamento_serial, p_laudo_tecnico, p_checklist_entrada;
  
  RETURN v_result;
END;
$$;

-- Atualizar o Wrapper Público tenant_atualizar_os (que está no sql/CRIAR_RPCS_ATUALIZACAO.sql)
CREATE OR REPLACE FUNCTION public.tenant_atualizar_os(
  p_os_id UUID,
  p_cliente_id UUID DEFAULT NULL,
  p_colaborador_id UUID DEFAULT NULL,
  p_veiculo_equipamento VARCHAR(255) DEFAULT NULL,
  p_descricao_problema TEXT DEFAULT NULL,
  p_status VARCHAR(50) DEFAULT NULL,
  p_valor_orcamento NUMERIC(10, 2) DEFAULT NULL,
  p_equipamento_serial TEXT DEFAULT NULL,
  p_laudo_tecnico TEXT DEFAULT NULL,
  p_checklist_entrada JSONB DEFAULT NULL
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
  -- Obter o schema do tenant do usuário atual
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  IF v_tenant_schema IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant não encontrado para o usuário');
  END IF;
  
  -- Executar a atualização no schema do tenant
  EXECUTE format('
    UPDATE %%I.ordens_servico
    SET 
      cliente_id = COALESCE($2, cliente_id), 
      colaborador_id = COALESCE($3, colaborador_id), 
      veiculo_equipamento = COALESCE($4, veiculo_equipamento), 
      descricao_problema = COALESCE($5, descricao_problema), 
      status = COALESCE($6, status), 
      valor_orcamento = COALESCE($7, valor_orcamento),
      equipamento_serial = COALESCE($8, equipamento_serial),
      laudo_tecnico = COALESCE($9, laudo_tecnico),
      checklist_entrada = COALESCE($10, checklist_entrada),
      atualizado_em = NOW()
    WHERE id = $1
    RETURNING id, cliente_id, colaborador_id, veiculo_equipamento, descricao_problema, status, valor_orcamento, equipamento_serial, laudo_tecnico, checklist_entrada, atualizado_em
  ', v_tenant_schema)
  USING p_os_id, p_cliente_id, p_colaborador_id, p_veiculo_equipamento, p_descricao_problema, p_status, p_valor_orcamento, p_equipamento_serial, p_laudo_tecnico, p_checklist_entrada
  INTO v_result;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'OS não encontrada');
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_criar_os(UUID, UUID, VARCHAR, TEXT, VARCHAR, NUMERIC, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_os(UUID, UUID, UUID, VARCHAR, TEXT, VARCHAR, NUMERIC, TEXT, TEXT, JSONB) TO authenticated;
