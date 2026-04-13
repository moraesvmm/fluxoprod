-- MIGRAÇÃO COMPLETA PARA PRODUÇÃO
-- ==========================================
-- Execute este script no Supabase SQL Editor do banco de PRODUÇÃO
-- Este script aplica todas as mudanças recentes aos 5 tenants existentes
-- ==========================================

-- ==========================================
-- PASSO 1: Aplicar mudanças do schema public
-- ==========================================

-- Verificar se as tabelas públicas existem
-- (Se não existirem, execute o supabase_rpc.sql completo primeiro)

-- Verificar se a função set_tenant_schema existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'set_tenant_schema' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'A função set_tenant_schema não existe. Execute o supabase_rpc.sql completo primeiro.';
  END IF;
  
  RAISE NOTICE 'Função set_tenant_schema encontrada.';
END $$;

-- ==========================================
-- PASSO 2: Adicionar índices em criado_em para clientes e obras
-- ==========================================

DO $$
DECLARE
  tenant_schema RECORD;
BEGIN
  -- Iterar sobre todos os schemas tenant existentes
  FOR tenant_schema IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    -- Adicionar índice idx_clientes_criado_em se não existir
    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_clientes_criado_em ON %I.clientes(criado_em DESC);',
        tenant_schema.schema_name, tenant_schema.schema_name
      );
      RAISE NOTICE 'Índice idx_%_clientes_criado_em criado/verificado', tenant_schema.schema_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao criar índice idx_%_clientes_criado_em: %', tenant_schema.schema_name, SQLERRM;
    END;

    -- Adicionar índice idx_obras_criado_em se não existir
    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_obras_criado_em ON %I.obras(criado_em DESC);',
        tenant_schema.schema_name, tenant_schema.schema_name
      );
      RAISE NOTICE 'Índice idx_%_obras_criado_em criado/verificado', tenant_schema.schema_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao criar índice idx_%_obras_criado_em: %', tenant_schema.schema_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Índices de criado_em adicionados/verificados em todos os tenants.';
END $$;

-- ==========================================
-- PASSO 3: Verificar e atualizar RPCs tenant_*
-- ==========================================

-- A função provisionar_empresa cria as RPCs tenant_* dinamicamente
-- Se os tenants foram criados com versão antiga, precisamos recriar as RPCs

-- Verificar se a função upgrade_all_tenants existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'upgrade_all_tenants' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE 'Função upgrade_all_tenants encontrada. Executando...';
    
    -- Executar upgrade para todos os tenants
    PERFORM public.upgrade_all_tenants();
    
    RAISE NOTICE 'Upgrade de todos os tenants concluído.';
  ELSE
    RAISE NOTICE 'Função upgrade_all_tenants não encontrada. As RPCs tenant_* precisam ser verificadas manualmente.';
  END IF;
END $$;

-- ==========================================
-- PASSO 4: Verificação final
-- ==========================================

DO $$
DECLARE
  tenant_count INT;
  v_schema_name TEXT;
BEGIN
  -- Contar tenants
  SELECT COUNT(*) INTO tenant_count
  FROM information_schema.schemata s
  WHERE s.schema_name LIKE 'tenant_%';
  
  RAISE NOTICE 'Total de tenants encontrados: %', tenant_count;
  
  -- Verificar se as RPCs tenant_dashboard_kpis existem
  FOR v_schema_name IN 
    SELECT schema_name 
    FROM information_schema.schemata s
    WHERE s.schema_name LIKE 'tenant_%'
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'tenant_dashboard_kpis' 
      AND pronamespace = v_schema_name::regnamespace
    ) THEN
      RAISE NOTICE 'RPC tenant_dashboard_kpis encontrada em schema %', v_schema_name;
    ELSE
      RAISE WARNING 'RPC tenant_dashboard_kpis NÃO encontrada em schema %', v_schema_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Verificação concluída.';
END $$;

-- ==========================================
-- PASSO 5: Instruções adicionais
-- ==========================================

-- Se após executar este script ainda houver erros 400 nas RPCs:
-- 1. Verifique se as RPCs tenant_* existem em cada schema tenant
-- 2. Se não existirem, pode ser necessário recriar os tenants ou executar o supabase_rpc.sql completo
-- 3. Entre em contato com o desenvolvedor para investigação adicional

-- Para verificar manualmente se uma RPC existe em um tenant específico:
-- SELECT * FROM pg_proc WHERE proname = 'tenant_dashboard_kpis' AND pronamespace = 'tenant_xxx'::regnamespace;

-- Para listar todas as RPCs em um tenant específico:
-- SELECT proname FROM pg_proc WHERE pronamespace = 'tenant_xxx'::regnamespace AND proname LIKE 'tenant_%';
