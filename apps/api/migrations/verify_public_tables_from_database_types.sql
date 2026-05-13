-- =============================================================================
-- VERIFICAÇÃO (somente leitura): tabelas public esperadas em database.types.ts
-- GERADO POR: node scripts/generate-verify-sql-from-types.mjs
-- NÃO EDITAR À MÃO — regenere após atualizar database.types.ts
-- Total: 31 nomes
-- Executar: Supabase → SQL Editor
-- =============================================================================

WITH expected(name) AS (
  VALUES
    ('audit_log'),
    ('checkout_vendas'),
    ('clientes'),
    ('comissoes'),
    ('comissoes_regras'),
    ('cupons'),
    ('cupons_utilizados'),
    ('custom_modules'),
    ('edge_function_logs'),
    ('empresa_modulos'),
    ('empresas'),
    ('fiscal_series'),
    ('funcionarios'),
    ('historico_precos'),
    ('logs_provisionamento'),
    ('modulos_ativos'),
    ('modulos_avulsos'),
    ('modulos_catalogo'),
    ('obras'),
    ('ordens_servico'),
    ('planos'),
    ('produtos'),
    ('tenants'),
    ('transacoes_financeiras'),
    ('user_profiles'),
    ('user_roles'),
    ('usuario_modulos_permitidos'),
    ('usuarios'),
    ('vendas'),
    ('vendas_itens'),
    ('webhook_audit_log')
),
live AS (
  SELECT table_name AS name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT
  e.name AS expected_table,
  EXISTS (SELECT 1 FROM live l WHERE l.name = e.name) AS present_in_db
FROM expected e
ORDER BY e.name;
