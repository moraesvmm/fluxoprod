-- ==========================================
-- VERIFICAR TENANT_62A495E1
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Verificar se há produtos no schema tenant_62a495e1 e se a empresa correspondente existe
-- Permissão: Use a service_role para executar este SQL

-- Verificar se há produtos no schema tenant_62a495e1
SELECT * FROM tenant_62a495e1.produtos LIMIT 10;

-- Verificar se a empresa correspondente existe na tabela empresas
SELECT 
  id,
  cnpj,
  razao_social,
  schema_name,
  status
FROM public.empresas
WHERE schema_name = 'tenant_62a495e1';

-- Verificar se o usuário tem perfil nesse tenant
SELECT 
  up.user_id,
  up.role,
  up.empresa_id,
  e.schema_name
FROM public.user_profiles up
JOIN public.empresas e ON e.id = up.empresa_id
WHERE e.schema_name = 'tenant_62a495e1';
