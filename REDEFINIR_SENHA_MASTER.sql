-- ==========================================
-- REDEFINIR SENHA DO USUÁRIO MASTER
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Redefinir a senha do usuário master
-- Permissão: Use a service_role para executar este SQL

-- Redefinir senha do usuário master para "FluxoMaster#123"
-- Email do usuário master: moraesvmm@fluxo.local
-- ID do usuário master: 11111111-1111-1111-1111-111111111111

-- Use UPDATE direto em auth.users com crypt (método alternativo)
UPDATE auth.users 
SET encrypted_password = crypt('FluxoMaster#123', gen_salt('bf'))
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Após executar este SQL, você pode fazer login com:
-- Email: moraesvmm@fluxo.local
-- Senha: FluxoMaster#123
