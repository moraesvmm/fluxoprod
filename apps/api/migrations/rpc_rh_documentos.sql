-- ==========================================
-- GESTAO DE DOCUMENTOS DO RH
-- ==========================================

-- 1. Adicionar colunas de dados pessoais em todos os schemas tenant
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);', r.schema_name);
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS rg VARCHAR(20);', r.schema_name);
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS data_nascimento DATE;', r.schema_name);
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS nome_mae VARCHAR(255);', r.schema_name);
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS endereco TEXT;', r.schema_name);
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS pis_pasep VARCHAR(20);', r.schema_name);
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS ctps VARCHAR(30);', r.schema_name);
            EXECUTE format('ALTER TABLE %I.funcionarios ADD COLUMN IF NOT EXISTS data_admissao DATE;', r.schema_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao alterar funcionarios em %: %', r.schema_name, SQLERRM;
        END;
    END LOOP;
END
$$;

-- 2. Criar tabela documentos_funcionarios em todos os schemas tenant
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
    LOOP
        BEGIN
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.documentos_funcionarios (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    funcionario_id UUID NOT NULL REFERENCES %I.funcionarios(id) ON DELETE CASCADE,
                    tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
                        ''rg'', ''cpf'', ''cnh'', ''ctps'', ''contrato'',
                        ''holerite'', ''comprovante_residencia'', ''atestado'', ''outros''
                    )),
                    nome_arquivo VARCHAR(255) NOT NULL,
                    tamanho_bytes BIGINT NOT NULL,
                    mime_type VARCHAR(100) NOT NULL,
                    storage_path TEXT NOT NULL,
                    dados_extraidos JSONB,
                    criado_em TIMESTAMPTZ DEFAULT NOW()
                );
            ', r.schema_name, r.schema_name);

            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_docs_func_id ON %I.documentos_funcionarios(funcionario_id);', r.schema_name, r.schema_name);
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_docs_tipo ON %I.documentos_funcionarios(tipo);', r.schema_name, r.schema_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar documentos_funcionarios em %: %', r.schema_name, SQLERRM;
        END;
    END LOOP;
END
$$;

-- 3. RPC: Listar documentos de um funcionario
DROP FUNCTION IF EXISTS public.tenant_listar_documentos(UUID);

CREATE OR REPLACE FUNCTION public.tenant_listar_documentos(
    p_funcionario_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT schema_name INTO v_tenant_schema
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid();

    IF v_tenant_schema IS NULL THEN
        RETURN jsonb_build_object('error', 'Tenant nao encontrado');
    END IF;

    EXECUTE format('
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                ''id'', d.id,
                ''funcionario_id'', d.funcionario_id,
                ''tipo'', d.tipo,
                ''nome_arquivo'', d.nome_arquivo,
                ''tamanho_bytes'', d.tamanho_bytes,
                ''mime_type'', d.mime_type,
                ''storage_path'', d.storage_path,
                ''dados_extraidos'', d.dados_extraidos,
                ''criado_em'', d.criado_em
            ) ORDER BY d.criado_em DESC
        ), ''[]''::jsonb)
        FROM %I.documentos_funcionarios d
        WHERE d.funcionario_id = $1
    ', v_tenant_schema)
    USING p_funcionario_id
    INTO v_result;

    RETURN v_result;
END;
$$;

-- 4. RPC: Registrar metadados de um documento
DROP FUNCTION IF EXISTS public.tenant_registrar_documento(UUID, VARCHAR, VARCHAR, BIGINT, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION public.tenant_registrar_documento(
    p_funcionario_id UUID,
    p_tipo VARCHAR(50),
    p_nome_arquivo VARCHAR(255),
    p_tamanho_bytes BIGINT,
    p_mime_type VARCHAR(100),
    p_storage_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT schema_name INTO v_tenant_schema
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid();

    IF v_tenant_schema IS NULL THEN
        RETURN jsonb_build_object('error', 'Tenant nao encontrado');
    END IF;

    EXECUTE format('
        INSERT INTO %I.documentos_funcionarios (funcionario_id, tipo, nome_arquivo, tamanho_bytes, mime_type, storage_path)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING jsonb_build_object(''id'', id, ''funcionario_id'', funcionario_id, ''tipo'', tipo, ''nome_arquivo'', nome_arquivo, ''criado_em'', criado_em)
    ', v_tenant_schema)
    USING p_funcionario_id, p_tipo, p_nome_arquivo, p_tamanho_bytes, p_mime_type, p_storage_path
    INTO v_result;

    RETURN v_result;
END;
$$;

-- 5. RPC: Excluir documento (retorna storage_path para o frontend limpar o storage)
DROP FUNCTION IF EXISTS public.tenant_excluir_documento(UUID);

CREATE OR REPLACE FUNCTION public.tenant_excluir_documento(
    p_documento_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_storage_path TEXT;
BEGIN
    SELECT schema_name INTO v_tenant_schema
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid();

    IF v_tenant_schema IS NULL THEN
        RETURN jsonb_build_object('error', 'Tenant nao encontrado');
    END IF;

    EXECUTE format('DELETE FROM %I.documentos_funcionarios WHERE id = $1 RETURNING storage_path', v_tenant_schema)
    USING p_documento_id
    INTO v_storage_path;

    IF v_storage_path IS NULL THEN
        RETURN jsonb_build_object('error', 'Documento nao encontrado');
    END IF;

    RETURN jsonb_build_object('success', true, 'storage_path', v_storage_path);
END;
$$;

-- 6. RPC: Obter storage_path de um documento (para gerar signed URL)
DROP FUNCTION IF EXISTS public.tenant_obter_documento(UUID);

CREATE OR REPLACE FUNCTION public.tenant_obter_documento(
    p_documento_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT schema_name INTO v_tenant_schema
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid();

    IF v_tenant_schema IS NULL THEN
        RETURN jsonb_build_object('error', 'Tenant nao encontrado');
    END IF;

    EXECUTE format('
        SELECT jsonb_build_object(
            ''id'', d.id,
            ''storage_path'', d.storage_path,
            ''nome_arquivo'', d.nome_arquivo,
            ''mime_type'', d.mime_type
        )
        FROM %I.documentos_funcionarios d
        WHERE d.id = $1
    ', v_tenant_schema)
    USING p_documento_id
    INTO v_result;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('error', 'Documento nao encontrado');
    END IF;

    RETURN v_result;
END;
$$;

-- 7. RPC: Atualizar dados pessoais do funcionario
DROP FUNCTION IF EXISTS public.tenant_atualizar_dados_pessoais(UUID, VARCHAR, VARCHAR, DATE, VARCHAR, TEXT, VARCHAR, VARCHAR, DATE);

CREATE OR REPLACE FUNCTION public.tenant_atualizar_dados_pessoais(
    p_funcionario_id UUID,
    p_cpf VARCHAR(14) DEFAULT NULL,
    p_rg VARCHAR(20) DEFAULT NULL,
    p_data_nascimento DATE DEFAULT NULL,
    p_nome_mae VARCHAR(255) DEFAULT NULL,
    p_endereco TEXT DEFAULT NULL,
    p_pis_pasep VARCHAR(20) DEFAULT NULL,
    p_ctps VARCHAR(30) DEFAULT NULL,
    p_data_admissao DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT schema_name INTO v_tenant_schema
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.user_id = auth.uid();

    IF v_tenant_schema IS NULL THEN
        RETURN jsonb_build_object('error', 'Tenant nao encontrado');
    END IF;

    EXECUTE format('
        UPDATE %I.funcionarios SET
            cpf = COALESCE($2, cpf),
            rg = COALESCE($3, rg),
            data_nascimento = COALESCE($4, data_nascimento),
            nome_mae = COALESCE($5, nome_mae),
            endereco = COALESCE($6, endereco),
            pis_pasep = COALESCE($7, pis_pasep),
            ctps = COALESCE($8, ctps),
            data_admissao = COALESCE($9, data_admissao),
            atualizado_em = NOW()
        WHERE id = $1
        RETURNING id
    ', v_tenant_schema)
    USING p_funcionario_id, p_cpf, p_rg, p_data_nascimento, p_nome_mae, p_endereco, p_pis_pasep, p_ctps, p_data_admissao
    INTO v_result;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('error', 'Funcionario nao encontrado');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Grants
GRANT EXECUTE ON FUNCTION public.tenant_listar_documentos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_registrar_documento(UUID, VARCHAR, VARCHAR, BIGINT, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_documento(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_obter_documento(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_dados_pessoais(UUID, VARCHAR, VARCHAR, DATE, VARCHAR, TEXT, VARCHAR, VARCHAR, DATE) TO authenticated;

-- 9. Criar bucket de storage (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documentos-rh',
    'documentos-rh',
    false,
    10485760,  -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 10. Politica de storage: apenas service_role pode ler/escrever
-- (O upload/download é sempre feito via API Route server-side)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "service_role_insert_documentos_rh" ON storage.objects;
    DROP POLICY IF EXISTS "service_role_select_documentos_rh" ON storage.objects;
    DROP POLICY IF EXISTS "service_role_delete_documentos_rh" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    NULL;
END
$$;
