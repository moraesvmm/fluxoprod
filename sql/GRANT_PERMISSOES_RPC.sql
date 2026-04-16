-- ==========================================
-- GRANT PERMISSÕES PARA FUNÇÃO deletar_empresa_master
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Grant permissões para função RPC deletar_empresa_master
-- Permissão: Use a service_role para executar este SQL

-- Grant execute permission para authenticated users
GRANT EXECUTE ON FUNCTION public.deletar_empresa_master TO authenticated;

-- Grant execute permission para anon (se necessário para testes)
-- GRANT EXECUTE ON FUNCTION public.deletar_empresa_master TO anon;

-- Verificar se a função existe
SELECT 
  proname,
  prosecdef,
  prokind,
  prosecdef
FROM pg_proc 
WHERE proname = 'deletar_empresa_master';

-- Verificar permissões atuais
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name = 'deletar_empresa_master'
  AND routine_schema = 'public';
