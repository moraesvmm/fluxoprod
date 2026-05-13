-- =============================================================================
-- HOTFIX: índices public ausentes após verify_public_indexes_from_migrations.sql
-- (resultado típico: idx_empresas_not_deleted, idx_user_profiles_not_deleted,
--  idx_webhook_audit_log_ext_tx = false — demais true)
-- Idempotente: CREATE INDEX IF NOT EXISTS
-- Executar: Supabase → SQL Editor
-- Fonte: add_soft_delete_all_entities.sql + fix_indexes_checkout_webhook.sql
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_webhook_audit_log_ext_tx
  ON public.webhook_audit_log(external_transaction_id);

-- user_profiles: PK é user_id (não existe coluna id)
CREATE INDEX IF NOT EXISTS idx_user_profiles_not_deleted
  ON public.user_profiles(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_empresas_not_deleted
  ON public.empresas(id)
  WHERE deleted_at IS NULL;
