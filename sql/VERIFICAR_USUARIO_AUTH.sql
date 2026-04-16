-- ==========================================
-- VERIFICAR SE USUÁRIO EXISTE NO AUTH.USERS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Verificar se o usuário moraesvmm@fluxo.local existe no auth.users

-- Verificar se o usuário moraesvmm@fluxo.local existe no auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'moraesvmm@fluxo.local';

-- Se não existir, o usuário precisa ser criado no auth.users
-- O usuário moraesvmm existe na tabela usuarios (id: 11111111-1111-1111-1111-111111111111)
-- mas pode não existir no auth.users, o que causa erro de login

-- Se o SELECT acima não retornar resultados, execute o SQL CRIAR_USUARIO_MASTER.sql
-- para criar um novo usuário master com credenciais conhecidas
