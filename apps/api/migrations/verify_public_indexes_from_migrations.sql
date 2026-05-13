-- =============================================================================
-- VERIFICAÇÃO (somente leitura): índices em public esperados pelas migrações
-- Fonte: apps/api/migrations/*.sql com CREATE INDEX IF NOT EXISTS em public.*
-- Executar no: Supabase → SQL Editor (service_role / postgres)
-- =============================================================================

WITH expected(name) AS (
  VALUES
    ('idx_checkout_vendas_ext_tx'),
    ('idx_webhook_audit_log_ext_tx'),
    ('idx_webhook_audit_log_status'),
    ('idx_webhook_audit_log_ts'),
    ('idx_cupons_codigo'),
    ('idx_cupons_ativo'),
    ('idx_planos_key'),
    ('idx_planos_ativo'),
    ('idx_modulos_avulsos_key'),
    ('idx_modulos_avulsos_ativo'),
    ('idx_historico_precos_ref'),
    ('idx_historico_precos_data'),
    ('idx_audit_log_registro'),
    ('idx_audit_log_usuario'),
    ('idx_audit_log_criado'),
    ('idx_audit_log_tabela'),
    ('idx_audit_log_empresa'),
    ('idx_user_profiles_not_deleted'),
    ('idx_empresas_not_deleted')
),
live AS (
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
)
SELECT
  e.name AS expected_index,
  EXISTS (SELECT 1 FROM live l WHERE l.indexname = e.name) AS present_in_db
FROM expected e
ORDER BY e.name;

-- Detalhe: todos os índices nas tabelas críticas do webhook (public)
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN ('checkout_vendas', 'webhook_audit_log')
-- ORDER BY tablename, indexname;
