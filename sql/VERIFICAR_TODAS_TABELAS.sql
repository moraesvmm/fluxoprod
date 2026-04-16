-- ==========================================
-- VERIFICAR TODAS AS TABELAS NO SCHEMA PUBLIC
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Encontrar a tabela "usuarios" que está causando recursão infinita

-- 1. Verificar todas as tabelas no schema public
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificar se há tabela "usuarios"
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'usuarios';

-- 3. Verificar políticas RLS em todas as tabelas
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
ORDER BY tablename, policyname;

-- 4. Verificar se há tabelas com RLS ativo
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
ORDER BY tablename;
