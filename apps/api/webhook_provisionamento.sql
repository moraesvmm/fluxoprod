-- ==========================================
-- ESTRUTURA PARA COMPRA SAAS E PROVISIONAMENTO
-- ==========================================

-- Extensão necessária para encriptação da senha (caso o cliente digite no checkout)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Tabela para rastreabilidade global das vendas da plataforma SaaS
CREATE TABLE IF NOT EXISTS public.checkout_vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_transaction_id TEXT UNIQUE NOT NULL,
    cliente_nome TEXT NOT NULL,
    email TEXT NOT NULL,
    valor_total NUMERIC NOT NULL,
    config_payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, paga, falha
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Logs de Webhook (Auditoria Indepedente e Idempotência)
CREATE TABLE IF NOT EXISTS public.webhook_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_transaction_id TEXT,
    status TEXT,
    payload JSONB,
    detalhes TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitando RLS mas como estamos operando via RPC SECURITY DEFINER, ela passará livremente
ALTER TABLE public.checkout_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_audit_log ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RPC TRANSACIONAL: Webhook -> Auth -> Tenant
-- ==========================================
CREATE OR REPLACE FUNCTION public.webhook_provisionar_assinatura(
    p_transaction_id TEXT,
    p_cliente_nome TEXT,
    p_email TEXT,
    p_senha TEXT,
    p_cnpj TEXT,
    p_razao_social TEXT,
    p_porte TEXT,
    p_segmento TEXT,
    p_valor_total NUMERIC,
    p_modules TEXT[],
    p_gateway_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_checkout_id UUID;
    v_current_status TEXT;
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_empresa_id UUID;
    v_schema_name TEXT;
    v_provision_result JSON;
BEGIN
    -- 1. Idempotência e Auditoria Básica
    SELECT id, status INTO v_checkout_id, v_current_status
    FROM public.checkout_vendas
    WHERE external_transaction_id = p_transaction_id;

    IF v_current_status = 'paga' THEN
        INSERT INTO public.webhook_audit_log (external_transaction_id, status, payload, detalhes)
        VALUES (p_transaction_id, 'ignorado', p_gateway_payload, 'Transação já foi processada anteriormente.');
        
        RETURN jsonb_build_object('status', 'success', 'message', 'Pagamento já processado (Idempotência).');
    END IF;

    -- 2. Atualizar ou Criar o registro da Venda Paga
    IF v_checkout_id IS NULL THEN
        INSERT INTO public.checkout_vendas (
            external_transaction_id, cliente_nome, email, valor_total, config_payload, status
        ) VALUES (
            p_transaction_id, p_cliente_nome, p_email, p_valor_total, p_gateway_payload, 'paga'
        ) RETURNING id INTO v_checkout_id;
    ELSE
        UPDATE public.checkout_vendas
        SET status = 'paga', atualizado_em = NOW(), config_payload = p_gateway_payload
        WHERE id = v_checkout_id;
    END IF;

    -- 3. Inserir o Cliente no auth.users do Supabase diretamente (Transação de banco!)
    -- Se o cliente já tiver um e-mail cadastrado, nós o captamos. Senão, criamos.
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        v_encrypted_pw := crypt(p_senha, gen_salt('bf'));

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', p_email, v_encrypted_pw, 
            NOW(), NOW(), NOW(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb
        );
        
        -- Identity exigido pelo goTrue
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_user_id, v_user_id, format('{"sub":"%s","email":"%s"}', v_user_id::text, p_email)::jsonb, 'email', NOW(), NOW(), NOW()
        );
    END IF;

    -- 4. Provisionamento Master (Gira as regras da Opt A da arquitetura técnica)
    v_empresa_id := gen_random_uuid();
    v_schema_name := 'tenant_' || regexp_replace(lower(p_razao_social), '[^a-z0-9]', '', 'g') || '_' || substr(md5(random()::text), 1, 6);

    SELECT public.provisionar_empresa_master(
        v_empresa_id, p_cnpj, p_razao_social, p_porte, p_segmento, v_schema_name, p_modules
    ) INTO v_provision_result;

    -- 5. Vincular Usuário ao seu Tenant
    INSERT INTO public.user_profiles (user_id, role, empresa_id)
    VALUES (v_user_id, 'tenant_admin', v_empresa_id)
    ON CONFLICT (user_id) DO UPDATE SET role = 'tenant_admin', empresa_id = v_empresa_id;

    -- Log Sucesso
    INSERT INTO public.webhook_audit_log (external_transaction_id, status, payload, detalhes)
    VALUES (p_transaction_id, 'sucesso', p_gateway_payload, 'Tenant e Auth User criados atomicamente.');

    RETURN jsonb_build_object(
        'status', 'success', 
        'user_id', v_user_id,
        'schema_name', v_schema_name,
        'message', 'Assinatura Paga! Tenant provisionado e cliente criado globalmente no banco.'
    );
EXCEPTION WHEN OTHERS THEN
    -- Em caso de qualquer quebra (schema validation, constraint violation), todo o bloco rola para trás.
    -- Faremos apenas um Log compensatório que fica invisível para essa transação, mas documenta.
    -- (No PostgreSQL, EXCEPTION rola para trás as modificações DB, portanto precisamos gravar em um log autônomo, 
    -- mas isso só seria estritamente local, então apenas re-elevamos o erro).
    RAISE EXCEPTION 'Falha ao processar Assinatura: % %', SQLERRM, SQLSTATE;
END;
$$;
