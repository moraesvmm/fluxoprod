-- ==========================================
-- CRIAR SUPERUSUÁRIO MORAESVMM
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar superusuário moraesvmm@fluxo.local com senha moraesvmm
-- Permissão: Use a service_role para executar este SQL

-- Criar usuário moraesvmm@fluxo.local no auth.users como superusuário
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'moraesvmm@fluxo.local',
  crypt('moraesvmm', gen_salt('bf')),
  now(),
  now(),
  now(),
  null,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Vitor Moraes"}'::jsonb,
  true,
  'authenticated'
);

-- Obter o ID do usuário criado
SELECT id, email, is_super_admin, created_at
FROM auth.users
WHERE email = 'moraesvmm@fluxo.local'
ORDER BY created_at DESC
LIMIT 1;

-- Após executar este SQL, anote o ID do usuário e execute o INSERT abaixo para criar o perfil:
-- INSERT INTO public.user_profiles (user_id, role)
-- VALUES ('ID_DO_USUARIO_ACIMA', 'master');
