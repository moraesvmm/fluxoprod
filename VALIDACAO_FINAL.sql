-- ==========================================
-- VALIDAÇÃO FINAL DAS CORREÇÕES APLICADAS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Validar todas as correções aplicadas e gerar resumo
-- Permissão: Use a service_role para executar este SQL

-- 1. Verificar tabelas no schema tenant_62a495e1
SELECT 'TABELAS NO TENANT_62A495E1' AS validacao;
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('clientes', 'produtos', 'estoque', 'vendas', 'vendas_itens', 'financeiro', 'funcionarios', 'ordens_servico', 'obras', 'regras_comissao', 'comissoes') 
        THEN 'OK' 
        ELSE 'INCOMPLETO' 
    END AS status
FROM information_schema.tables
WHERE table_schema = 'tenant_62a495e1'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Verificar políticas RLS
SELECT 'POLÍTICAS RLS' AS validacao;
SELECT 
    tablename,
    COUNT(*) AS qtd_politicas
FROM pg_policies
WHERE schemaname = 'tenant_62a495e1'
GROUP BY tablename
ORDER BY tablename;

-- 3. Verificar RPCs de listagem
SELECT 'RPCs DE LISTAGEM' AS validacao;
SELECT 
    routine_name,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_listar_%'
ORDER BY routine_name;

-- 4. Verificar RPCs de criação
SELECT 'RPCs DE CRIAÇÃO' AS validacao;
SELECT 
    routine_name,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_criar_%'
ORDER BY routine_name;

-- 5. Verificar RPCs de exclusão
SELECT 'RPCs DE EXCLUSÃO' AS validacao;
SELECT 
    routine_name,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_excluir_%'
ORDER BY routine_name;

-- 6. Verificar RPCs de atualização
SELECT 'RPCs DE ATUALIZAÇÃO' AS validacao;
SELECT 
    routine_name,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'tenant_atualizar_%'
ORDER BY routine_name;

-- 7. Verificar RPCs de processamento
SELECT 'RPCs DE PROCESSAMENTO' AS validacao;
SELECT 
    routine_name,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('tenant_processar_venda', 'tenant_dashboard_kpis')
ORDER BY routine_name;

-- 8. Verificar triggers no schema tenant_62a495e1
SELECT 'TRIGGERS NO TENANT_62A495E1' AS validacao;
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'tenant_62a495e1'
ORDER BY event_object_table, trigger_name;

-- 9. Resumo final
SELECT 'RESUMO FINAL' AS validacao;
SELECT 
    'Tabelas criadas' AS item,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'tenant_62a495e1' AND table_type = 'BASE TABLE') AS valor
UNION ALL
SELECT 
    'Políticas RLS criadas' AS item,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'tenant_62a495e1') AS valor
UNION ALL
SELECT 
    'RPCs de listagem' AS item,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'tenant_listar_%') AS valor
UNION ALL
SELECT 
    'RPCs de criação' AS item,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'tenant_criar_%') AS valor
UNION ALL
SELECT 
    'RPCs de exclusão' AS item,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'tenant_excluir_%') AS valor
UNION ALL
SELECT 
    'RPCs de atualização' AS item,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'tenant_atualizar_%') AS valor
UNION ALL
SELECT 
    'RPCs de processamento' AS item,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('tenant_processar_venda', 'tenant_dashboard_kpis')) AS valor
UNION ALL
SELECT 
    'Triggers criados' AS item,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'tenant_62a495e1') AS valor;
