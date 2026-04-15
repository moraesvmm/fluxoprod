-- ==========================================
-- BUSCAR NOMES REAIS DAS EMPRESAS (razao_social)
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Buscar nomes reais das empresas nos schemas de tenants para atualizar razao_social
-- Permissão: Use a service_role para executar este SQL

-- Verificar se há tabela de configuração ou clientes nos schemas de tenants
-- que contenha o nome real da empresa

-- 1. Verificar tabelas existentes nos schemas de tenants
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema LIKE 'tenant_%'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('configuracao', 'empresa', 'empresa_config', 'clientes', 'settings')
ORDER BY table_schema, table_name;

-- 2. Se não encontrar tabelas específicas, verificar todas as tabelas
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema LIKE 'tenant_%'
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- Após identificar as tabelas, podemos buscar os nomes reais das empresas
-- Por exemplo, se houver tabela 'configuracao' com campo 'nome_empresa':
-- SELECT table_schema, nome_empresa FROM tenant_00000000.configuracao;
