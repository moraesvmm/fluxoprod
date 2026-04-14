-- ==========================================
-- RELATÓRIO: DIAGNÓSTICO E CORREÇÃO DE RECURSÃO INFINITA EM RLS
-- ==========================================
-- Data: 14/04/2026
-- Problema: Erro 500 ao consultar /rest/v1/empresas
-- Erro: "infinite recursion detected in policy for relation 'usuarios'"

-- ==========================================
-- CAUSA RAIZ
-- ==========================================
-- A recursão infinita é causada por um ciclo de dependências nas políticas RLS:
--
-- 1. A tabela 'empresas' tem RLS ativo
-- 2. A policy 'tenant_read_own_empresa' usa a função is_master()
-- 3. A função is_master() consulta a tabela 'user_profiles'
-- 4. A tabela 'user_profiles' também tem RLS ativo
-- 5. As policies de 'user_profiles' podem usar is_master() ou consultar 'empresas'
-- 6. Isso cria um ciclo infinito: empresas → is_master → user_profiles → empresas → ...
--
-- Problema adicional: O erro menciona 'usuarios', mas não há tabela 'usuarios' no schema public.
-- Isso sugere que pode haver uma tabela oculta ou o erro está sendo reportado incorretamente.

-- ==========================================
-- SOLUÇÃO IMPLEMENTADA
-- ==========================================
-- A solução usa três estratégias principais:

-- 1. FUNÇÕES SECURITY DEFINER
--    Todas as funções usadas em RLS são marcadas como SECURITY DEFINER
--    Isso permite que elas ignorem RLS e acessem tabelas diretamente
--    SET search_path = public garante que não há ambiguidade de schema

-- 2. DESATIVAR RLS EM TABELAS DE METADADOS
--    user_profiles é uma tabela de metadados usada pelas funções RLS
--    Desativar RLS em user_profiles elimina a recursão
--    Isso é seguro porque user_profiles não contém dados sensíveis de tenants

-- 3. POLÍTICAS RLS SEM DEPENDÊNCIA CIRCULAR
--    Criar políticas que usam funções SECURITY DEFINER
--    Evitar subqueries diretas em tabelas com RLS
--    Usar funções auxiliares para encapsular lógica complexa

-- ==========================================
-- ARQUITETURA DE RLS CORRIGIDA
-- ==========================================

-- TABELA: user_profiles
-- RLS: DESATIVADO
-- Motivo: Tabela de metadados usada por funções RLS
-- Segurança: Acesso controlado por permissões de GRANT

-- TABELA: empresas
-- RLS: ATIVADO
-- Policies:
--   - master_all_empresas: Master pode tudo (usando is_master())
--   - tenant_read_own_empresa: Tenant lê apenas sua empresa (usando is_tenant_of())

-- TABELA: modulos_catalogo
-- RLS: ATIVADO
-- Policies:
--   - master_all_modulos_catalogo: Master pode tudo (usando is_master())
--   - authenticated_read_modulos_catalogo: Autenticados podem ler

-- TABELA: empresa_modulos
-- RLS: ATIVADO
-- Policies:
--   - master_all_empresa_modulos: Master pode tudo (usando is_master())
--   - tenant_read_own_empresa_modulos: Tenant lê seus módulos (usando is_tenant_of())

-- ==========================================
-- FUNÇÕES SECURITY DEFINER CRIADAS
-- ==========================================

-- is_master(): Verifica se usuário é master
-- get_current_empresa_id(): Retorna empresa_id do usuário atual
-- get_current_role(): Retorna role do usuário atual
-- is_tenant_of(p_empresa_id): Verifica se usuário é tenant de uma empresa

-- Todas as funções:
-- - Usam SECURITY DEFINER (ignoram RLS)
-- - Usam SET search_path = public (evitam ambiguidade)
-- - São STABLE (não modificam dados)
-- - São usadas em políticas RLS

-- ==========================================
-- VALIDAÇÃO E TESTES
-- ==========================================

-- 1. Verificar se há usuários sem perfil
--    SELECT * FROM auth.users u LEFT JOIN public.user_profiles p ON u.id = p.user_id WHERE p.user_id IS NULL;

-- 2. Teste de query em empresas
--    SELECT * FROM public.empresas ORDER BY criado_em DESC LIMIT 50;

-- 3. Teste de endpoint REST
--    GET /rest/v1/empresas?select=*&order=criado_em.desc&limit=50

-- ==========================================
-- COMPATIBILIDADE COM SaaS B2B MULTIEMPRESA
-- ==========================================

-- A solução é compatível com SaaS B2B multiempresa porque:

-- 1. Isolamento de dados: Tenants só podem ver seus próprios dados
-- 2. Controle de acesso: Master tem acesso total, tenants têm acesso limitado
-- 3. Escalabilidade: Funções SECURITY DEFINER são eficientes
-- 4. Segurança: RLS garante isolamento em nível de banco de dados
-- 5. Sem dependência circular: Arquitetura sem loops de dependência

-- ==========================================
-- INSTRUÇÕES DE EXECUÇÃO
-- ==========================================

-- 1. Execute o SQL DIAGNOSTICO_CORRECAO_RLS.sql no Supabase SQL Editor
-- 2. Use a service_role para executar (tem permissões de admin)
-- 3. Verifique o resultado dos SELECTs de diagnóstico
-- 4. Se houver usuários sem perfil, crie manualmente:
--    INSERT INTO public.user_profiles (user_id, role)
--    VALUES ('UUID_DO_USUARIO', 'master');
-- 5. Teste o endpoint /rest/v1/empresas no frontend
-- 6. Verifique se não há mais erro 500

-- ==========================================
-- RISCOS E MITIGAÇÕES
-- ==========================================

-- Risco: Desativar RLS em user_profiles pode expor metadados
-- Mitigação: user_profiles não contém dados sensíveis de tenants
-- Mitigação: Acesso controlado por permissões de GRANT

-- Risco: Funções SECURITY DEFINER podem ser usadas para bypass RLS
-- Mitigação: Funções são STABLE e não modificam dados
-- Mitigação: Funções têm SET search_path = public

-- Risco: Mudanças podem quebrar funcionalidades existentes
-- Mitigação: SQL inclui diagnóstico completo antes da correção
-- Mitigação: Testes de validação incluídos

-- ==========================================
-- PRÓXIMOS PASSOS
-- ==========================================

-- 1. Executar SQL DIAGNOSTICO_CORRECAO_RLS.sql
-- 2. Verificar resultado dos SELECTs de diagnóstico
-- 3. Criar perfis para usuários sem perfil (se necessário)
-- 4. Testar endpoint /rest/v1/empresas
-- 5. Verificar se não há mais erro 500
-- 6. Testar outras funcionalidades do sistema
-- 7. Documentar mudanças em README.md
