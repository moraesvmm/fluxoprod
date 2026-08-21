-- Segredos Meta dedicados por empresa.
-- A chave WHATSAPP_META_TOKEN_SECRET continua sendo global apenas para cifrar estes valores.

ALTER TABLE public.empresa_whatsapp_meta
  ADD COLUMN IF NOT EXISTS app_secret_ciphertext text,
  ADD COLUMN IF NOT EXISTS verify_token_hash text;

CREATE INDEX IF NOT EXISTS idx_empresa_whatsapp_meta_verify_token_hash
  ON public.empresa_whatsapp_meta(verify_token_hash)
  WHERE verify_token_hash IS NOT NULL;

REVOKE SELECT ON public.empresa_whatsapp_meta FROM authenticated;
DROP POLICY IF EXISTS empresa_whatsapp_meta_select ON public.empresa_whatsapp_meta;
