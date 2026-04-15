-- ==========================================
-- REDEFINIR SENHA DO USUÁRIO MORAESVMM
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Redefinir a senha do usuário moraesvmm@fluxo.local
-- Permissão: Use a service_role para executar este SQL

-- Redefinir senha do usuário moraesvmm@fluxo.local para "moraesvmm"
UPDATE auth.users 
SET encrypted_password = crypt('moraesvmm', gen_salt('bf'))
WHERE email = 'moraesvmm@fluxo.local';

-- Verificar se o usuário existe e obter o ID
SELECT 
  id,
  email,
  is_super_admin,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'moraesvmm@fluxo.local';

-- Após executar este SQL:
-- 1. Anote o ID do usuário retornado pelo SELECT
-- 2. Execute o INSERT abaixo para criar o perfil em user_profiles (se não existir):
-- INSERT INTO public.user_profiles (user_id, role)
-- VALUES ('ID_DO_USUARIO_ACIMA', 'master')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'master';

-- 3. Faça login com:
-- Email: moraesvmm@fluxo.local
-- Senha: moraesvmm
