-- ==========================================
-- VISTORIA TÉCNICA PROFUNDA - ERRO HTTP 500
-- ==========================================
-- Objetivo: Identificar causa do erro 500 ao cadastrar produtos
-- Credenciais: service_role (acesso administrativo total)
-- Data: 14/04/2026
-- Modo: READ-ONLY + TESTES CONTROLADOS
-- 
-- EXECUTAR NO SUPABASE DASHBOARD (SQL Editor)
-- ==========================================

-- ==========================================
-- PARTE 1: IDENTIFICAR TABELAS RELACIONADAS AO ESTOQUE
-- ==========================================

-- 1. Listar todas as tabelas que contenham 'produto', 'produtos', 'estoque', 'inventory', 'item'
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND (
    tablename ILIKE '%produto%' OR
    tablename ILIKE '%estoque%' OR
    tablename ILIKE '%inventory%' OR
    tablename ILIKE '%item%'
  )
ORDER BY schemaname, tablename;

-- 2. Listar schemas de tenant (tenant_*)
SELECT 
  nspname as schemaname
FROM pg_namespace 
WHERE nspname LIKE 'tenant_%'
ORDER BY nspname;

-- ==========================================
-- PARTE 2: VALIDAR ESTRUTURA DE TABELAS DE ESTOQUE
-- ==========================================

-- 3. Para cada tabela encontrada, verificar estrutura
-- (Substitua 'nome_da_tabela' pelos nomes encontrados na Parte 1)

-- Exemplo para tabela de produtos (ajustar nome conforme encontrado)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'produtos'
ORDER BY ordinal_position;

-- 4. Verificar constraints NOT NULL
SELECT
  k.table_schema,
  k.table_name,
  k.column_name,
  k.constraint_name
FROM information_schema.key_column_usage k
JOIN information_schema.table_constraints c
  ON k.constraint_name = c.constraint_name
WHERE c.constraint_type = 'PRIMARY KEY'
  AND k.table_schema = 'public'
  AND k.table_name ILIKE '%produto%';

-- 5. Verificar foreign keys
SELECT 
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name ILIKE '%produto%';

-- 6. Verificar triggers em tabelas de estoque
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table ILIKE '%produto%'
ORDER BY event_object_table, trigger_name;

-- 7. Verificar funções SQL relacionadas a produtos
SELECT 
  proname,
  prokind,
  prosecdef,
  prosrc
FROM pg_proc 
WHERE proname ILIKE '%produto%'
  OR proname ILIKE '%estoque%'
ORDER BY proname;

-- ==========================================
-- PARTE 3: SIMULAR INSERÇÃO CONTROLADA
-- ==========================================

-- 8. Testar INSERT mínimo em tabela de produtos
-- (AJUSTAR NOME DA TABELA E COLUNAS CONFORME ESTRUTURA ENCONTRADA)

-- Teste 1: INSERT com valores mínimos
-- Substitua conforme estrutura real da tabela
DO $$
DECLARE
  v_result TEXT;
BEGIN
  -- Tentar inserção mínima
  INSERT INTO public.produtos (
    nome,
    preco,
    sku,
    estoque_atual,
    estoque_minimo,
    data_cadastro,
    status
  ) VALUES (
    'Produto Teste Diagnóstico',
    100.00,
    'SKU-TEST-001',
    10,
    5,
    NOW(),
    'ativo'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_result;

  RAISE NOTICE 'INSERT bem-sucedido. ID: %', v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO NO INSERT: %', SQLERRM;
END $$;

-- ==========================================
-- PARTE 4: VERIFICAÇÃO DE RLS
-- ==========================================

-- 9. Verificar políticas RLS em tabelas de estoque
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename ILIKE '%produto%'
ORDER BY tablename, policyname;

-- 10. Verificar se RLS está ativo em tabelas de estoque
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename ILIKE '%produto%'
ORDER BY tablename;

-- ==========================================
-- PARTE 5: VERIFICAÇÃO DE LOGS
-- ==========================================

-- 11. Verificar conexões ativas (substituto para logs)
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query ILIKE '%produto%'
ORDER BY query_start DESC
LIMIT 50;

-- 12. Verificar se há tabelas de log customizadas
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND (
    tablename ILIKE '%log%' OR
    tablename ILIKE '%error%' OR
    tablename ILIKE '%audit%'
  )
ORDER BY schemaname, tablename;

-- ==========================================
-- PARTE 6: AUDITORIA DE OUTROS MÓDULOS
-- ==========================================

-- 13. Testar INSERT em clientes
DO $$
BEGIN
  INSERT INTO public.clientes (
    nome,
    documento,
    contato,
    email,
    endereco,
    data_cadastro,
    status
  ) VALUES (
    'Cliente Teste Diagnóstico',
    '12345678900',
    '11999999999',
    'cliente@teste.com',
    'Endereço Teste',
    NOW(),
    'ativo'
  )
  ON CONFLICT DO NOTHING;
  RAISE NOTICE 'INSERT clientes: OK';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'INSERT clientes: ERRO - %', SQLERRM;
END $$;

-- 14. Testar INSERT em vendas
DO $$
BEGIN
  INSERT INTO public.vendas (
    cliente_id,
    data_venda,
    total,
    status,
    metodo_pagamento,
    observacoes
  ) VALUES (
    gen_random_uuid(),
    NOW(),
    100.00,
    'concluido',
    'dinheiro',
    'Teste diagnóstico'
  )
  ON CONFLICT DO NOTHING;
  RAISE NOTICE 'INSERT vendas: OK';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'INSERT vendas: ERRO - %', SQLERRM;
END $$;

-- 15. Testar INSERT em financeiro
DO $$
BEGIN
  INSERT INTO public.financeiro (
    tipo_transacao,
    valor,
    vencimento,
    status,
    descricao,
    categoria,
    data_cadastro
  ) VALUES (
    'receita',
    100.00,
    NOW() + INTERVAL '30 days',
    'pendente',
    'Teste diagnóstico',
    'venda',
    NOW()
  )
  ON CONFLICT DO NOTHING;
  RAISE NOTICE 'INSERT financeiro: OK';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'INSERT financeiro: ERRO - %', SQLERRM;
END $$;

-- ==========================================
-- PARTE 7: AUDITORIA ESTRUTURAL GLOBAL
-- ==========================================

-- 16. Verificar funções inválidas
SELECT 
  proname,
  prokind,
  prosecdef,
  prosrc
FROM pg_proc 
WHERE proname ILIKE '%tenant%'
  OR proname ILIKE '%provisionar%'
ORDER BY proname;

-- 17. Verificar triggers quebradas
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 18. Verificar dependências inconsistentes
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 19. Verificar se há schemas tenant criados
SELECT 
  nspname as schemaname
FROM pg_namespace 
WHERE nspname LIKE 'tenant_%'
ORDER BY nspname;

-- 20. Verificar tabelas em schemas tenant
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname LIKE 'tenant_%'
ORDER BY schemaname, tablename
LIMIT 100;

-- ==========================================
-- PARTE 8: DIAGNÓSTICO DE ERROS HTTP 500
-- ==========================================

-- 21. Verificar se há funções RPC relacionadas a produtos
SELECT 
  proname,
  prokind,
  prosecdef,
  prosrc
FROM pg_proc 
WHERE proname ILIKE '%produto%'
  OR proname ILIKE '%estoque%'
ORDER BY proname;

-- 22. Testar RPC de listar produtos (se existir)
DO $$
BEGIN
  -- Substitua pelo nome correto da RPC se existir
  -- SELECT * FROM public.tenant_listar_produtos(100, 0);
  RAISE NOTICE 'RPC tenant_listar_produtos: Não testado (verificar se existe)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RPC tenant_listar_produtos: ERRO - %', SQLERRM;
END $$;

-- ==========================================
-- PARTE 9: VERIFICAÇÃO DE CONFIGURAÇÃO SUPABASE
-- ==========================================

-- 23. Verificar extensões instaladas
SELECT 
  extname,
  extversion,
  nspname
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;

-- 24. Verificar se há tabelas do Supabase Auth
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'auth'
ORDER BY tablename;

-- ==========================================
-- PARTE 10: RELATÓRIO DE DIAGNÓSTICO
-- ==========================================

-- 25. Resumo de tabelas encontradas
SELECT
  'TABELAS PUBLIC' as categoria,
  COUNT(*) as total
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT
  'SCHEMAS TENANT' as categoria,
  COUNT(*) as total
FROM pg_namespace
WHERE nspname LIKE 'tenant_%'

UNION ALL

SELECT
  'POLÍTICAS RLS' as categoria,
  COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
  'TRIGGERS' as categoria,
  COUNT(*) as total
FROM information_schema.triggers
WHERE event_object_schema = 'public'

UNION ALL

SELECT
  'FUNÇÕES SQL' as categoria,
  COUNT(*) as total
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ==========================================
-- INSTRUÇÕES FINAIS
-- ==========================================
-- 1. Execute este script completo no Supabase Dashboard
-- 2. Analise os resultados de cada seção
-- 3. Identifique erros em INSERT tests
-- 4. Verifique se há triggers ou funções causando problemas
-- 5. Documente todos os erros encontrados
-- 6. NÃO execute correções sem autorização explícita
