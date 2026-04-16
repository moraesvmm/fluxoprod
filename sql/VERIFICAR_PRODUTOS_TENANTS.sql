-- ==========================================
-- VERIFICAR PRODUTOS NOS SCHEMAS DE TENANTS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Verificar se há produtos nos schemas de tenants
-- Permissão: Use a service_role para executar este SQL

-- Verificar se há tabela produtos nos schemas de tenants
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema LIKE 'tenant_%'
  AND table_name = 'produtos'
ORDER BY table_schema;

-- Verificar se há produtos nos schemas de tenants
-- Descomente e execute para cada schema encontrado:
-- SELECT * FROM tenant_00000000.produtos LIMIT 10;
-- SELECT * FROM tenant_09000134.produtos LIMIT 10;
-- SELECT * FROM tenant_33054c42.produtos LIMIT 10;
-- SELECT * FROM tenant_techsolutionsltda_cd722c.produtos LIMIT 10;
-- SELECT * FROM tenant_test_4.produtos LIMIT 10;
-- SELECT * FROM tenant_test_check.produtos LIMIT 10;
-- SELECT * FROM tenant_test_ff974f.produtos LIMIT 10;
-- SELECT * FROM tenant_vidanovaimobiliria_c19798.produtos LIMIT 10;
