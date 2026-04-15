-- ==========================================
-- ESTUDAR ESTRUTURA COMPLETA DO BANCO DE DADOS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Estudar a estrutura completa antes de aplicar correções
-- Permissão: Use a service_role para executar este SQL

-- 1. Verificar todos os schemas de tenants existentes
SELECT 
  schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%'
ORDER BY schema_name;

-- 2. Para cada schema tenant, verificar quais tabelas existem
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema LIKE 'tenant_%'
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- 3. Verificar tabelas no schema public
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 4. Verificar todas as RPCs no schema public
SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_%'
ORDER BY routine_name;

-- 5. Verificar foreign keys em schemas tenant
SELECT 
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema LIKE 'tenant_%'
ORDER BY tc.table_schema, tc.table_name;

-- 6. Verificar índices em schemas tenant
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname LIKE 'tenant_%'
ORDER BY schemaname, tablename, indexname;

-- 7. Verificar triggers em schemas tenant
SELECT 
  trigger_schema,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema LIKE 'tenant_%'
ORDER BY trigger_schema, event_object_table;

-- 8. Verificar se há tabela 'transacoes_financeiras' em algum schema
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_name = 'transacoes_financeiras'
ORDER BY table_schema;

-- 9. Verificar se há tabela 'financeiro' em schemas tenant
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_name = 'financeiro'
  AND table_schema LIKE 'tenant_%'
ORDER BY table_schema;

-- 10. Verificar se há tabelas de comissões em schemas tenant
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_name IN ('comissoes', 'comissoes_regras')
  AND table_schema LIKE 'tenant_%'
ORDER BY table_schema, table_name;
