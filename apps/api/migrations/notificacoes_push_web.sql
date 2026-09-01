-- Assinaturas Web Push por empresa e usuario. Dados de entrega ficam no schema public
-- porque devem sobreviver a qualquer alteracao estrutural de um tenant.

CREATE TABLE IF NOT EXISTS public.push_assinaturas (
    endpoint TEXT PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_assinaturas_empresa
ON public.push_assinaturas(empresa_id);

CREATE INDEX IF NOT EXISTS idx_push_assinaturas_usuario
ON public.push_assinaturas(user_id);

ALTER TABLE public.push_assinaturas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_assinaturas FROM PUBLIC, anon, authenticated;
