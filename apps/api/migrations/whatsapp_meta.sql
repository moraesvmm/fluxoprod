-- WhatsApp Cloud API por tenant.
-- Defina WHATSAPP_META_TOKEN_SECRET no backend antes de aceitar tokens em producao.

CREATE TABLE IF NOT EXISTS public.empresa_whatsapp_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  waba_id text,
  access_token_ciphertext text NOT NULL,
  app_secret_ciphertext text,
  verify_token_hash text,
  display_phone_number text,
  verified_name text,
  status text NOT NULL DEFAULT 'configured' CHECK (status IN ('configured', 'connected', 'disabled', 'error')),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_whatsapp_meta_empresa_id
  ON public.empresa_whatsapp_meta(empresa_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  wa_message_id text NOT NULL,
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL DEFAULT 'text',
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, wa_message_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_empresa_phone
  ON public.whatsapp_messages_meta(empresa_id, phone, occurred_at DESC);

ALTER TABLE public.empresa_whatsapp_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS empresa_whatsapp_meta_select ON public.empresa_whatsapp_meta;
CREATE POLICY empresa_whatsapp_meta_select ON public.empresa_whatsapp_meta
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = auth.uid()
      AND p.empresa_id = empresa_whatsapp_meta.empresa_id
      AND p.deleted_at IS NULL
  ));

DROP POLICY IF EXISTS whatsapp_messages_meta_select ON public.whatsapp_messages_meta;
CREATE POLICY whatsapp_messages_meta_select ON public.whatsapp_messages_meta
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = auth.uid()
      AND p.empresa_id = whatsapp_messages_meta.empresa_id
      AND p.deleted_at IS NULL
  ));

REVOKE ALL ON public.empresa_whatsapp_meta FROM anon;
REVOKE ALL ON public.whatsapp_messages_meta FROM anon;
GRANT SELECT ON public.empresa_whatsapp_meta TO authenticated;
GRANT SELECT ON public.whatsapp_messages_meta TO authenticated;
GRANT ALL ON public.empresa_whatsapp_meta TO service_role;
GRANT ALL ON public.whatsapp_messages_meta TO service_role;
