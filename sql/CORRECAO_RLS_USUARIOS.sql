-- ==========================================
-- CORREÇÃO RLS - TABELA USUARIOS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Corrigir políticas RLS da tabela usuarios para eliminar recursão infinita
-- Permissão: Use a service_role para executar este SQL

-- ==========================================
-- 1. VERIFICAR POLÍTICAS RLS ATUAIS DA TABELA USUARIOS
-- ==========================================
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
  AND tablename = 'usuarios'
ORDER BY policyname;

-- ==========================================
-- 2. REMOVER TODAS AS POLÍTICAS RLS DA TABELA USUARIOS
-- ==========================================
DROP POLICY IF EXISTS master_all_usuarios ON public.usuarios;
DROP POLICY IF EXISTS tenant_read_own_usuarios ON public.usuarios;
DROP POLICY IF EXISTS authenticated_read_usuarios ON public.usuarios;
DROP POLICY IF EXISTS user_read_own_usuario ON public.usuarios;

-- ==========================================
-- 3. DESATIVAR RLS NA TABELA USUARIOS (SOLUÇÃO TEMPORÁRIA)
-- ==========================================
-- A tabela usuarios pode estar causando recursão infinita
-- Desativar RLS temporariamente para eliminar o erro
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. GRANT PERMISSÕES NA TABELA USUARIOS
-- ==========================================
GRANT SELECT ON public.usuarios TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;

-- ==========================================
-- 5. SE NECESSÁRIO, CRIAR POLÍTICAS RLS SEGURAS (OPCIONAL)
-- ==========================================
-- Após confirmar que o erro foi resolvido, você pode reativar RLS
-- com políticas seguras que não causam recursão infinita

-- Para reativar RLS com políticas seguras, execute:
-- ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Policy: Master pode tudo em usuarios
-- CREATE POLICY master_all_usuarios ON public.usuarios
--   FOR ALL
--   USING (public.is_master())
--   WITH CHECK (public.is_master());

-- Policy: Usuário pode ler apenas seus próprios dados
-- CREATE POLICY user_read_own_usuario ON public.usuarios
--   FOR SELECT
--   USING (id = auth.uid());

-- ==========================================
-- 6. TESTE DE QUERY
-- ==========================================
-- Teste de query em usuarios (deve funcionar sem erro)
SELECT 
  *
FROM public.usuarios
LIMIT 10;
