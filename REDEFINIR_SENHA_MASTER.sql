-- ==========================================
-- REDEFINIR SENHA DO USUÁRIO MASTER
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Redefinir a senha do usuário master
-- Permissão: Use a service_role para executar este SQL

-- Redefinir senha do usuário master para "FluxoMaster#123"
-- Email do usuário master: moraesvmm@fluxo.local
-- ID do usuário master: 11111111-1111-1111-1111-111111111111

SELECT auth.admin.reset_password(
  '11111111-1111-1111-1111-111111111111',
  'FluxoMaster#123'
);

-- Após executar este SQL, você pode fazer login com:
-- Email: moraesvmm@fluxo.local
-- Senha: FluxoMaster#123

-- Se a função reset_password não estiver disponível, use:
-- UPDATE auth.users 
-- SET encrypted_password = crypt('FluxoMaster#123', gen_salt('bf'))
-- WHERE id = '11111111-1111-1111-1111-111111111111';
