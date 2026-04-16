-- ==========================================
-- VERIFICAR E CONFIGURAR TABELAS DO TENANT_62A495E1
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Verificar se as tabelas foram criadas e configurar permissões
-- Permissão: Use a service_role para executar este SQL

-- 1. Verificar tabelas no schema tenant_62a495e1
SELECT 
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'tenant_62a495e1'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Configurar permissões para as tabelas do tenant
-- Habilitar RLS
ALTER TABLE tenant_62a495e1.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.vendas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.regras_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_62a495e1.comissoes ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS para permitir acesso via service_role
DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.clientes;
CREATE POLICY service_role_all ON tenant_62a495e1.clientes
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.produtos;
CREATE POLICY service_role_all ON tenant_62a495e1.produtos
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.estoque;
CREATE POLICY service_role_all ON tenant_62a495e1.estoque
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.vendas;
CREATE POLICY service_role_all ON tenant_62a495e1.vendas
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.vendas_itens;
CREATE POLICY service_role_all ON tenant_62a495e1.vendas_itens
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.financeiro;
CREATE POLICY service_role_all ON tenant_62a495e1.financeiro
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.funcionarios;
CREATE POLICY service_role_all ON tenant_62a495e1.funcionarios
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.ordens_servico;
CREATE POLICY service_role_all ON tenant_62a495e1.ordens_servico
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.obras;
CREATE POLICY service_role_all ON tenant_62a495e1.obras
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.regras_comissao;
CREATE POLICY service_role_all ON tenant_62a495e1.regras_comissao
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_all ON tenant_62a495e1.comissoes;
CREATE POLICY service_role_all ON tenant_62a495e1.comissoes
    FOR ALL USING (auth.role() = 'service_role');

-- 4. Conceder permissões de acesso ao schema
GRANT USAGE ON SCHEMA tenant_62a495e1 TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA tenant_62a495e1 TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA tenant_62a495e1 TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA tenant_62a495e1 TO authenticated;

-- 5. Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'tenant_62a495e1'
ORDER BY tablename, policyname;
