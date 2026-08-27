-- Paridade de schema entre tenants para os modulos ativos (exceto Obras).
-- Estruturas adicionadas historicamente por scripts avulsos nunca entraram no
-- provisionamento, entao cada tenant novo nascia incompleto.

CREATE OR REPLACE FUNCTION public.provisionar_hook_paridade_tenants(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tabela TEXT;
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    -- Soft delete usado pelas listagens
    FOREACH v_tabela IN ARRAY ARRAY[
        'estoque', 'estoque_por_local', 'locais_estoque', 'previsoes_demanda',
        'regras_comissao', 'transferencias_estoque', 'vendas_itens', 'interacoes_clientes',
        'ordens_servico_itens'
    ] LOOP
        IF to_regclass(format('%I.%I', p_schema, v_tabela)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', p_schema, v_tabela);
        END IF;
    END LOOP;

    -- CRM: tags e metricas de recompra
    IF to_regclass(format('%I.clientes', p_schema)) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ''{}''::TEXT[]', p_schema);
        EXECUTE format('ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS data_ultima_compra TIMESTAMPTZ', p_schema);
        EXECUTE format('ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS total_pedidos INTEGER DEFAULT 0', p_schema);
        EXECUTE format('ALTER TABLE %I.clientes ADD COLUMN IF NOT EXISTS endereco TEXT', p_schema);
    END IF;

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.tags_catalog (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome TEXT NOT NULL UNIQUE,
            cor TEXT DEFAULT ''#6366f1'',
            uso_count INTEGER DEFAULT 0,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.crm_nurturing_alertas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID,
            tipo VARCHAR(50) NOT NULL,
            produto_servico VARCHAR(255),
            data_alerta TIMESTAMPTZ NOT NULL,
            mensagem_sugerida TEXT,
            status VARCHAR(20) DEFAULT ''pendente'',
            metadata JSONB DEFAULT ''{}''::JSONB,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.notas_fiscais (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN (''entrada'', ''saida'')),
            numero VARCHAR(20),
            serie VARCHAR(10),
            chave_acesso VARCHAR(44),
            emitente_nome VARCHAR(255),
            emitente_cnpj VARCHAR(14),
            destinatario_nome VARCHAR(255),
            destinatario_cnpj VARCHAR(14),
            valor_total NUMERIC(12, 2) NOT NULL,
            data_emissao TIMESTAMPTZ NOT NULL,
            data_entrada_saida TIMESTAMPTZ,
            status VARCHAR(20) DEFAULT ''ativa'' CHECK (status IN (''ativa'', ''cancelada'', ''inutilizada'')),
            venda_id UUID,
            xml_url TEXT,
            pdf_url TEXT,
            observacoes TEXT,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        );
    ', p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.configuracoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chave VARCHAR(100) NOT NULL UNIQUE,
            valor JSONB NOT NULL,
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            operation_type VARCHAR(50) NOT NULL,
            resource_type VARCHAR(50) NOT NULL,
            resource_id UUID,
            user_id UUID,
            changes JSONB,
            status VARCHAR(50) DEFAULT ''success'',
            error_message TEXT,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', p_schema);

    EXECUTE format('ALTER TABLE %I.audit_log ADD COLUMN IF NOT EXISTS resource VARCHAR(50)', p_schema);
    EXECUTE format('ALTER TABLE %I.audit_log ADD COLUMN IF NOT EXISTS details JSONB', p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.idempotency_control (
            idempotency_key TEXT PRIMARY KEY,
            operation_type VARCHAR(50) NOT NULL,
            result JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role VARCHAR(50) NOT NULL CHECK (role IN (''tenant_admin'', ''tenant_user'')),
            resource VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            allowed BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.schema_migrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            version INTEGER NOT NULL UNIQUE,
            description TEXT NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', p_schema);

    -- Fechamento mensal
    IF to_regclass(format('%I.fechamentos_mensais', p_schema)) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.fechamentos_mensais ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW()', p_schema);
        EXECUTE format('ALTER TABLE %I.fechamentos_mensais ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT ''aberto''', p_schema);
        EXECUTE format('ALTER TABLE %I.fechamentos_mensais ADD COLUMN IF NOT EXISTS visto BOOLEAN DEFAULT FALSE', p_schema);
    END IF;

    -- Ordem de servico (modulo OS, nao confundir com Obras)
    IF to_regclass(format('%I.ordens_servico', p_schema)) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS numero BIGSERIAL', p_schema);
        EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS tempo_total_minutos INTEGER DEFAULT 0', p_schema);
        EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS timer_iniciado_em TIMESTAMPTZ', p_schema);
        EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS valor_servico NUMERIC(10, 2) DEFAULT 0', p_schema);
        EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS equipamento_serial TEXT', p_schema);
        EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS laudo_tecnico TEXT', p_schema);
        EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS checklist_entrada JSONB', p_schema);

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.ordens_servico_itens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
                produto_id UUID,
                descricao TEXT NOT NULL,
                quantidade INTEGER DEFAULT 1 CHECK (quantidade > 0),
                preco_unitario NUMERIC(10, 2) CHECK (preco_unitario >= 0),
                subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * COALESCE(preco_unitario, 0)) STORED,
                valor_custo NUMERIC(10, 2) DEFAULT 0,
                criado_em TIMESTAMPTZ DEFAULT NOW()
            );
        ', p_schema, p_schema);

        EXECUTE format('ALTER TABLE %I.ordens_servico_itens ADD COLUMN IF NOT EXISTS valor_custo NUMERIC(10, 2) DEFAULT 0', p_schema);
        EXECUTE format('ALTER TABLE %I.ordens_servico_itens ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', p_schema);

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.ordens_servico_historico (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
                status_anterior VARCHAR(50),
                status_novo VARCHAR(50) NOT NULL,
                alterado_por TEXT,
                alterado_em TIMESTAMPTZ DEFAULT NOW()
            );
        ', p_schema, p_schema);
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_paridade_tenants(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_hook_paridade_tenants(TEXT) TO service_role;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('paridade_tenants', 15, 'public.provisionar_hook_paridade_tenants(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem,
    hook_function = EXCLUDED.hook_function,
    ativo = TRUE;

DO $$
DECLARE
    v_schema TEXT;
BEGIN
    FOR v_schema IN
        SELECT e.schema_name
        FROM public.empresas e
        WHERE e.schema_name LIKE 'tenant\_%'
          AND to_regnamespace(e.schema_name) IS NOT NULL
        ORDER BY e.schema_name
    LOOP
        PERFORM public.provisionar_hook_paridade_tenants(v_schema);
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
