-- ==========================================
-- CRIAR PERFIL DO USUÁRIO MORAESVMM
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar perfil do usuário moraesvmm em user_profiles
-- Permissão: Use a service_role para executar este SQL

-- Obter o ID do usuário moraesvmm@fluxo.local no auth.users
SELECT id, email, is_super_admin
FROM auth.users
WHERE email = 'moraesvmm@fluxo.local';

-- Verificar se o usuário já tem perfil em user_profiles
SELECT 
  up.user_id,
  up.role,
  up.empresa_id,
  up.criado_em
FROM public.user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE u.email = 'moraesvmm@fluxo.local';

-- Se não tiver perfil, crie usando o ID obtido no primeiro SELECT
-- Substitua 'ID_DO_USUARIO' pelo ID retornado pelo primeiro SELECT
-- Exemplo:
-- INSERT INTO public.user_profiles (user_id, role)
-- VALUES ('ID_DO_USUARIO', 'master')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'master';

-- Após criar o perfil, teste o login com:
-- Email: moraesvmm@fluxo.local
-- Senha: moraesvmm
