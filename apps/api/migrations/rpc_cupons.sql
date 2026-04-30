-- ==========================================
-- SISTEMA DE CUPONS DE DESCONTO (GLOBAL)
-- ==========================================

-- 1. Tabela de Cupons
CREATE TABLE IF NOT EXISTS public.cupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('percentual', 'fixo')),
    valor DECIMAL(10,2) NOT NULL,
    limite_usos INTEGER,
    usos_atuais INTEGER DEFAULT 0,
    data_expiracao TIMESTAMPTZ,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cupons_codigo ON public.cupons(codigo);
CREATE INDEX IF NOT EXISTS idx_cupons_ativo ON public.cupons(ativo) WHERE ativo = TRUE;

-- 2. Tabela de Uso de Cupons (Rastreabilidade)
CREATE TABLE IF NOT EXISTS public.cupons_utilizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cupom_id UUID NOT NULL REFERENCES public.cupons(id),
    empresa_id UUID REFERENCES public.empresas(id),
    email_usuario VARCHAR(255),
    utilizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RPC: Validar Cupom (Público)
CREATE OR REPLACE FUNCTION public.validar_cupom(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cupom RECORD;
BEGIN
    SELECT * INTO v_cupom
    FROM public.cupons
    WHERE UPPER(codigo) = UPPER(p_codigo)
      AND ativo = TRUE
      AND (data_expiracao IS NULL OR data_expiracao > NOW())
      AND (limite_usos IS NULL OR usos_atuais < limite_usos);

    IF v_cupom.id IS NULL THEN
        RETURN jsonb_build_object('error', 'Cupom inválido, expirado ou esgotado');
    END IF;

    RETURN jsonb_build_object(
        'id', v_cupom.id,
        'codigo', v_cupom.codigo,
        'tipo', v_cupom.tipo,
        'valor', v_cupom.valor,
        'usos_atuais', v_cupom.usos_atuais,
        'ativo', v_cupom.ativo,
        'criado_em', v_cupom.criado_em
    );

END;
$$;

-- 4. RPC: Admin - Criar Cupom
CREATE OR REPLACE FUNCTION public.admin_criar_cupom(
    p_codigo TEXT,
    p_tipo TEXT,
    p_valor DECIMAL,
    p_limite_usos INTEGER DEFAULT NULL,
    p_data_expiracao TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Verificar se é admin master
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() AND role = 'master'
    ) THEN
        RETURN jsonb_build_object('error', 'Acesso negado');
    END IF;

    INSERT INTO public.cupons (codigo, tipo, valor, limite_usos, data_expiracao)
    VALUES (UPPER(p_codigo), p_tipo, p_valor, p_limite_usos, p_data_expiracao)
    RETURNING jsonb_build_object('id', id, 'codigo', codigo) INTO v_result;

    RETURN v_result;
END;
$$;

-- 5. RPC: Admin - Listar Cupons
CREATE OR REPLACE FUNCTION public.admin_listar_cupons()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Verificar se é admin master
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() AND role = 'master'
    ) THEN
        RETURN jsonb_build_object('error', 'Acesso negado');
    END IF;

    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT * FROM public.cupons ORDER BY criado_em DESC
    ) t;

    RETURN v_result;
END;
$$;

-- 6. RPC: Admin - Excluir/Desativar Cupom
CREATE OR REPLACE FUNCTION public.admin_excluir_cupom(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se é admin master
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() AND role = 'master'
    ) THEN
        RETURN jsonb_build_object('error', 'Acesso negado');
    END IF;

    UPDATE public.cupons SET ativo = FALSE WHERE id = p_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. RPC: Incrementar Uso do Cupom (Atômico)
CREATE OR REPLACE FUNCTION public.incrementar_uso_cupom(p_cupom_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.cupons 
    SET usos_atuais = usos_atuais + 1 
    WHERE id = p_cupom_id;
END;
$$;

-- 8. Grants
GRANT EXECUTE ON FUNCTION public.validar_cupom(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_criar_cupom(TEXT, TEXT, DECIMAL, INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_cupons() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_excluir_cupom(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.incrementar_uso_cupom(UUID) TO authenticated, service_role;
