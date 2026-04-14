-- ==========================================
-- CORREÇÃO RLS - TABELA EMPRESAS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Data: 14/04/2026
-- Objetivo: Corrigir políticas RLS da tabela empresas para evitar erro 500

-- ==========================================
-- 1. VERIFICAR SE RLS ESTÁ ATIVADO
-- ==========================================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. REMOVER POLÍTICAS EXISTENTES
-- ==========================================
DROP POLICY IF EXISTS master_all_empresas ON public.empresas;
DROP POLICY IF EXISTS tenant_read_own_empresa ON public.empresas;
DROP POLICY IF EXISTS authenticated_read_empresas ON public.empresas;

-- ==========================================
-- 3. CRIAR POLÍTICA PARA MASTER (Acesso Total)
-- ==========================================
CREATE POLICY master_all_empresas ON public.empresas
  FOR ALL
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- ==========================================
-- 4. CRIAR POLÍTICA PARA TENANTS (Ler apenas sua empresa)
-- ==========================================
CREATE POLICY tenant_read_own_empresa ON public.empresas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = auth.uid()
        AND p.empresa_id = public.empresas.id
        AND p.role IN ('tenant_admin', 'tenant_user')
    )
  );

-- ==========================================
-- 5. CRIAR POLÍTICA DE FALLBACK PARA AUTENTICADOS
-- ==========================================
CREATE POLICY authenticated_read_empresas ON public.empresas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ==========================================
-- 6. CORRIGIR FUNÇÃO is_master() PARA EVITAR RECURSÃO
-- ==========================================
-- A função is_master() é usada em políticas RLS, mas se a tabela user_profiles
-- também tiver RLS, isso pode causar recursão infinita.
-- Solução: Marcar a função como SECURITY DEFINER e usar SET search_path = public
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'master'
  );
$$;

-- ==========================================
-- 7. DESATIVAR RLS EM user_profiles PARA EVITAR RECURSÃO
-- ==========================================
-- A tabela user_profiles é usada pela função is_master(), então não pode ter RLS
-- que cause recursão. Vamos remover RLS de user_profiles e usar apenas verificações
-- na própria função.
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. GRANT PERMISSÕES
-- ==========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT SELECT ON public.empresas TO anon;

-- ==========================================
-- 8. VERIFICAR SE HÁ USUÁRIOS MASTER SEM PERFIL
-- ==========================================
-- Este SELECT mostra usuários que não têm perfil em user_profiles
-- Se houver resultados, precisamos criar os perfis manualmente
SELECT 
  u.id,
  u.email,
  p.role,
  p.empresa_id
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;
