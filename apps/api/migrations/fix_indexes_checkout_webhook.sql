-- ============================================================
-- MIGRAÇÃO: Índices de Performance e Correção de Schema
-- Data: 11/05/2026
-- Auditoria: Vistoria 70 — Correções P0/P1 de Provisionamento
-- Aplicar em: Supabase SQL Editor (Dashboard)
-- ============================================================

-- INC-02: Índice ausente em checkout_vendas.external_transaction_id
-- Este campo é usado como lookup crítico no webhook de pagamento (full table scan sem índice)
CREATE INDEX IF NOT EXISTS idx_checkout_vendas_ext_tx
  ON public.checkout_vendas(external_transaction_id);

-- INC-02: Índices de suporte ao webhook_audit_log para rastreio e diagnóstico
-- Colunas reais da tabela: id, external_transaction_id, status, payload, detalhes, criado_em
CREATE INDEX IF NOT EXISTS idx_webhook_audit_log_status
  ON public.webhook_audit_log(status);

CREATE INDEX IF NOT EXISTS idx_webhook_audit_log_ts
  ON public.webhook_audit_log(criado_em DESC);

-- INC-01: Corrigir tenants com subscription_status = PENDING e plan_name = NULL
-- (Tenants órfãos criados antes da Vistoria 69)
-- NOTA: Executar apenas após confirmar que os tenants abaixo são registros legítimos de teste.
-- A empresa 00000000-... é a empresa seed master (schema=public) — manter como está.
-- As demais sem plan_name são tenants de teste antigos.

-- Verificação prévia (rodar antes do UPDATE):
-- SELECT id, schema_name, subscription_status, plan_name FROM public.empresas WHERE subscription_status = 'PENDING' AND plan_name IS NULL;

-- UPDATE de segurança para tenants de teste sem plano (exceto a empresa master):
-- UPDATE public.empresas
--   SET subscription_status = 'INACTIVE', atualizado_em = NOW()
--   WHERE subscription_status = 'PENDING'
--     AND plan_name IS NULL
--     AND id != '00000000-0000-0000-0000-000000000000'
--     AND schema_name != 'public';
