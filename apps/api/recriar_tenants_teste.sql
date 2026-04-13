-- SCRIPT PARA EXCLUIR E RECRiar TENANTS-TESTE
-- ==========================================
-- Execute este script no Supabase SQL Editor do banco de PRODUÇÃO
-- ATENÇÃO: Este script exclui todos os tenants existentes e seus dados
-- Use apenas se não houver dados importantes nos tenants
-- ==========================================

DO $$
DECLARE
  v_empresa_id UUID;
  v_schema_name TEXT;
  v_cnpj TEXT;
  v_razao_social TEXT;
BEGIN
  -- Listar empresas que serão excluídas
  RAISE NOTICE 'Empresas que serão excluídas:';
  
  FOR v_empresa_id, v_cnpj, v_razao_social, v_schema_name IN
    SELECT id, cnpj, razao_social, schema_name
    FROM public.empresas
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE 'Empresa: % (CNPJ: %, Schema: %)', v_razao_social, v_cnpj, v_schema_name;
  END LOOP;
  
  -- Confirmar exclusão (pausa para revisão manual)
  -- Descomente a linha abaixo para continuar automaticamente
  -- RAISE EXCEPTION 'Revise as empresas acima. Para continuar, comente esta linha.';
  
  -- Excluir empresas e seus schemas
  FOR v_empresa_id, v_schema_name IN
    SELECT id, schema_name
    FROM public.empresas
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE 'Excluindo schema %...', v_schema_name;
    
    -- Excluir schema tenant
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE;', v_schema_name);
    
    -- Excluir empresa_modulos
    DELETE FROM public.empresa_modulos WHERE empresa_id = v_empresa_id;
    
    -- Excluir user_profiles vinculados
    DELETE FROM public.user_profiles WHERE empresa_id = v_empresa_id;
    
    -- Excluir empresa
    DELETE FROM public.empresas WHERE id = v_empresa_id;
    
    RAISE NOTICE 'Empresa e schema % excluídos com sucesso.', v_schema_name;
  END LOOP;
  
  RAISE NOTICE 'Todos os tenants-teste foram excluídos.';
  RAISE NOTICE 'Agora você pode recriar as empresas usando a página /mestre ou a função provisionar_empresa.';
END $$;

-- ==========================================
-- INSTRUÇÕES PARA RECRiar EMPRESAS
-- ==========================================
-- Após executar este script, você tem duas opções:
--
-- Opção 1: Usar a página /mestre do frontend
-- 1. Acesse fluxo-erp-oficial.netlify.app/mestre
-- 2. Crie as empresas novamente
--
-- Opção 2: Usar a função provisionar_empresa diretamente
-- 1. Execute: SELECT provisionar_empresa('tenant_empresa_1');
-- 2. Repita para cada empresa
