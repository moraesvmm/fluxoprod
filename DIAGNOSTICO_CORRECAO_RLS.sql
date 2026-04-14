-- ==========================================
-- DIAGNÓSTICO E CORREÇÃO RLS - RECURSÃO INFINITA
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Data: 14/04/2026
-- Objetivo: Diagnosticar e corrigir recursão infinita em policies RLS
-- Permissão: Use a service_role para executar este SQL

-- ==========================================
-- PARTE 1: DIAGNÓSTICO
-- ==========================================

-- 1. Verificar se RLS está ativo nas tabelas
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('empresas', 'user_profiles', 'usuarios')
ORDER BY tablename;

-- 2. Verificar políticas RLS atuais
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
  AND tablename IN ('empresas', 'user_profiles', 'usuarios')
ORDER BY tablename, policyname;

-- 3. Verificar função is_master
SELECT 
  proname,
  prosecdef,
  prokind,
  prosrc
FROM pg_proc 
WHERE proname = 'is_master';

-- 4. Verificar se há tabela usuarios (pode estar causando confusão)
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'usuarios';

-- ==========================================
-- PARTE 2: CORREÇÃO
-- ==========================================

-- ==========================================
-- 2.1 REMOVER TODAS AS POLÍTICAS RLS
-- ==========================================

-- Empresas
DROP POLICY IF EXISTS master_all_empresas ON public.empresas;
DROP POLICY IF EXISTS tenant_read_own_empresa ON public.empresas;
DROP POLICY IF EXISTS authenticated_read_empresas ON public.empresas;

-- User Profiles
DROP POLICY IF EXISTS master_all_user_profiles ON public.user_profiles;
DROP POLICY IF EXISTS user_read_own_profile ON public.user_profiles;

-- Modulos Catalogo
DROP POLICY IF EXISTS master_all_modulos_catalogo ON public.modulos_catalogo;
DROP POLICY IF EXISTS tenant_read_modulos_catalogo ON public.modulos_catalogo;

-- Empresa Modulos
DROP POLICY IF EXISTS master_all_empresa_modulos ON public.empresa_modulos;
DROP POLICY IF EXISTS tenant_read_own_empresa_modulos ON public.empresa_modulos;

-- ==========================================
-- 2.2 CRIAR FUNÇÕES SECURITY DEFINER PARA RLS
-- ==========================================

-- Função is_master com SECURITY DEFINER
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

-- Função para obter empresa_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.empresa_id
  FROM public.user_profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

-- Função para obter role do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.user_profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

-- Função para verificar se usuário é tenant de uma empresa específica
CREATE OR REPLACE FUNCTION public.is_tenant_of(p_empresa_id UUID)
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
      AND p.empresa_id = p_empresa_id
      AND p.role IN ('tenant_admin', 'tenant_user')
  );
$$;

-- ==========================================
-- 2.3 DESATIVAR RLS EM user_profiles
-- ==========================================
-- user_profiles é uma tabela de metadados usada pelas funções RLS
-- Não pode ter RLS para evitar recursão infinita
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2.4 ATIVAR RLS E CRIAR POLÍTICAS CORRETAS
-- ==========================================

-- Empresas - RLS Ativado
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Policy: Master pode tudo em empresas
CREATE POLICY master_all_empresas ON public.empresas
  FOR ALL
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- Policy: Tenant pode ler apenas sua empresa
CREATE POLICY tenant_read_own_empresa ON public.empresas
  FOR SELECT
  USING (public.is_tenant_of(public.empresas.id));

-- Modulos Catalogo - RLS Ativado
ALTER TABLE public.modulos_catalogo ENABLE ROW LEVEL SECURITY;

-- Policy: Master pode tudo em modulos_catalogo
CREATE POLICY master_all_modulos_catalogo ON public.modulos_catalogo
  FOR ALL
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- Policy: Usuários autenticados podem ler modulos_catalogo
CREATE POLICY authenticated_read_modulos_catalogo ON public.modulos_catalogo
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Empresa Modulos - RLS Ativado
ALTER TABLE public.empresa_modulos ENABLE ROW LEVEL SECURITY;

-- Policy: Master pode tudo em empresa_modulos
CREATE POLICY master_all_empresa_modulos ON public.empresa_modulos
  FOR ALL
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- Policy: Tenant pode ler apenas seus modulos
CREATE POLICY tenant_read_own_empresa_modulos ON public.empresa_modulos
  FOR SELECT
  USING (public.is_tenant_of(public.empresa_modulos.empresa_id));

-- ==========================================
-- 2.5 GRANT PERMISSÕES
-- ==========================================

-- Permissões de schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Permissões de tabela empresas
GRANT SELECT ON public.empresas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.empresas TO authenticated;

-- Permissões de tabela user_profiles
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Permissões de tabela modulos_catalogo
GRANT SELECT ON public.modulos_catalogo TO anon, authenticated;

-- Permissões de tabela empresa_modulos
GRANT SELECT ON public.empresa_modulos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.empresa_modulos TO authenticated;

-- ==========================================
-- PARTE 3: VALIDAÇÃO
-- ==========================================

-- Verificar se há usuários sem perfil
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.role,
  p.empresa_id
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;

-- Se houver usuários sem perfil, crie manualmente:
-- INSERT INTO public.user_profiles (user_id, role)
-- VALUES ('UUID_DO_USUARIO', 'master');

-- ==========================================
-- PARTE 4: TESTE DE QUERY
-- ==========================================

-- Teste de query em empresas (deve funcionar sem erro)
SELECT 
  id, 
  cnpj, 
  razao_social, 
  porte, 
  segmento, 
  schema_name, 
  status, 
  criado_em
FROM public.empresas
ORDER BY criado_em DESC
LIMIT 50;
