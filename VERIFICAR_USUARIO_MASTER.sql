-- ==========================================
-- VERIFICAR USUÁRIO MASTER
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Verificar email do usuário master para garantir que as credenciais estão corretas

-- Verificar usuário master e email
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.role,
  p.empresa_id,
  p.criado_em
FROM auth.users u
JOIN public.user_profiles p ON u.id = p.user_id
WHERE p.role = 'master'
ORDER BY u.created_at;

-- Se não houver usuário master, crie manualmente:
-- 1. Crie o usuário no Supabase Dashboard (Authentication → Users)
-- 2. Use as credenciais padrão: master@fluxo.local / FluxoMaster#123
-- 3. Execute o INSERT abaixo para criar o perfil:
-- INSERT INTO public.user_profiles (user_id, role)
-- VALUES ('UUID_DO_USUARIO', 'master');
