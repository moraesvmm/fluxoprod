-- ==========================================
-- VERIFICAR E RESTAURAR EMPRESAS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Verificar situação das empresas e restaurar se necessário
-- Permissão: Use a service_role para executar este SQL

-- 1. Verificar empresas existentes na tabela empresas
SELECT 
  id,
  cnpj,
  razao_social,
  porte,
  segmento,
  schema_name,
  status,
  criado_em
FROM public.empresas
ORDER BY criado_em DESC;

-- 2. Verificar schemas de tenants existentes
SELECT 
  schema_name,
  schema_owner
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%'
ORDER BY schema_name;

-- 3. Verificar se há empresas que foram deletadas mas ainda têm schemas
-- Se houver schemas sem empresas correspondentes, crie as empresas

-- 4. Se necessário, restaurar empresas deletadas
-- Descomente e execute se necessário:
-- INSERT INTO public.empresas (id, cnpj, razao_social, porte, segmento, schema_name, status)
-- VALUES 
--   ('00000000-0000-0000-0000-00000000004', '44.444.444/0001-44', 'Empresa Teste 4', 'ME', 'Tecnologia', 'tenant_test_4', 'ativo')
-- ON CONFLICT (id) DO UPDATE SET
--   razao_social = EXCLUDED.razao_social,
--   schema_name = EXCLUDED.schema_name,
--   status = EXCLUDED.status;
