-- ==========================================
-- VERIFICAR RPCS DE TENANT
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Verificar se as RPCs de tenant existem
-- Permissão: Use a service_role para executar este SQL

-- Verificar se a RPC tenant_criar_produto existe
SELECT 
  proname,
  prosecdef,
  prokind,
  prosecdef
FROM pg_proc 
WHERE proname = 'tenant_criar_produto';

-- Verificar se outras RPCs de tenant existem
SELECT 
  proname,
  prosecdef,
  prokind,
  prosecdef
FROM pg_proc 
WHERE proname LIKE 'tenant_%'
ORDER BY proname;

-- Verificar permissões das RPCs de tenant
SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_%'
ORDER BY routine_name;
