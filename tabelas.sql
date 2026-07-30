CREATE OR REPLACE FUNCTION public._provisionar_tabelas(novo_schema text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO service_role;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO service_role;', novo_schema);

    -- clientes: %I count = 6 (tabela, idx_status, idx_funil, idx_nome, idx_deleted)
    -- mas o índice filtrado WHERE deleted_at IS NULL também usa %I para o nome da tabela
    -- Contagem real: 1(tabela) + 1(idx status) + 1(idx funil) + 1(idx nome) + 1(idx deleted) = 5 %I se apenas schema
    -- PORÉM cada CREATE INDEX ON %I.tabela conta como 1 %I
    -- clientes tem 4 índices, portanto 1 + 4 = 5 %I
    EXECUTE format('
        CREATE TABLE %I.clientes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            telefone VARCHAR(50),
            cpf_cnpj VARCHAR(20),
            funil_fase VARCHAR(50) DEFAULT ''lead'' CHECK (funil_fase IN (''lead'',''prospect'',''oportunidade'',''cliente'',''recuperacao'',''qualificado'',''proposta'',''negociacao'',''fechado'',''perdido'')),
            status VARCHAR(50) DEFAULT ''ativo'' CHECK (status IN (''ativo'',''inativo'',''bloqueado'')),
            endereco TEXT,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.clientes(status);
        CREATE INDEX ON %I.clientes(funil_fase);
        CREATE INDEX ON %I.clientes(nome);
        CREATE INDEX ON %I.clientes(deleted_at);
    ', novo_schema, novo_schema, novo_schema, novo_schema, novo_schema);

    -- produtos: 1(tabela) + 3(indices) = 4 %I
    EXECUTE format('
        CREATE TABLE %I.produtos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            tipo VARCHAR(50) DEFAULT ''produto'' CHECK (tipo IN (''produto'',''servico'')),
            preco_base NUMERIC(10,2) NOT NULL CHECK (preco_base >= 0),
            categoria VARCHAR(100),
            custo_unitario NUMERIC(10,2),
            metodo_valoracao VARCHAR(50) DEFAULT ''custo_medio'',
            codigo_barras VARCHAR(50),
            codigo_qr TEXT,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.produtos(nome);
        CREATE INDEX ON %I.produtos(tipo);
        CREATE INDEX ON %I.produtos(deleted_at);
    ', novo_schema, novo_schema, novo_schema, novo_schema);

    -- estoque: 1(tabela) + 1(FK ref schema) + 1(índice) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID REFERENCES %I.produtos(id) ON DELETE SET NULL,
            sku VARCHAR(100) UNIQUE,
            quantidade INTEGER DEFAULT 0 CHECK (quantidade >= 0),
            quantidade_minima INTEGER DEFAULT 10,
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.estoque(produto_id);
    ', novo_schema, novo_schema, novo_schema);

    -- funcionarios: 1(tabela) + 2(índices) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.funcionarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            cargo VARCHAR(100),
            salario NUMERIC(10,2),
            role VARCHAR(50) DEFAULT ''funcionario'' CHECK (role IN (''funcionario'',''gerente'',''admin'',''colaborador'')),
            ultimo_mes_pago VARCHAR(7),
            dia_pagamento INTEGER,
            cpf VARCHAR(14),
            rg VARCHAR(20),
            data_nascimento DATE,
            nome_mae VARCHAR(255),
            endereco TEXT,
            pis_pasep VARCHAR(20),
            ctps VARCHAR(30),
            data_admissao DATE,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.funcionarios(nome);
        CREATE INDEX ON %I.funcionarios(deleted_at);
    ', novo_schema, novo_schema, novo_schema);

    -- financeiro: 1(tabela) + 4(índices) = 5 %I
    EXECUTE format('
        CREATE TABLE %I.financeiro (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN (''pagar'',''receber'')),
            descricao TEXT NOT NULL,
            valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
            data_vencimento DATE NOT NULL,
            status VARCHAR(50) DEFAULT ''pendente'' CHECK (status IN (''pendente'',''pago'',''cancelado'',''atrasado'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.financeiro(tipo);
        CREATE INDEX ON %I.financeiro(status);
        CREATE INDEX ON %I.financeiro(data_vencimento);
        CREATE INDEX ON %I.financeiro(deleted_at);
    ', novo_schema, novo_schema, novo_schema, novo_schema, novo_schema);

    -- vendas: 1(tabela) + 2(FK refs schemas) + 3(índices) = 6 %I
    EXECUTE format('
        CREATE TABLE %I.vendas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            cliente_nome VARCHAR(255),
            vendedor_id UUID REFERENCES %I.funcionarios(id) ON DELETE SET NULL,
            vendedor_nome VARCHAR(255),
            valor_total NUMERIC(10,2) NOT NULL CHECK (valor_total >= 0),
            desconto_aplicado NUMERIC(10,2) DEFAULT 0,
            metodo_pagamento VARCHAR(50),
            status VARCHAR(50) DEFAULT ''concluido'' CHECK (status IN (''pendente'',''concluido'',''cancelado'',''reembolsado'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.vendas(cliente_id);
        CREATE INDEX ON %I.vendas(status);
        CREATE INDEX ON %I.vendas(criado_em DESC);
    ', novo_schema, novo_schema, novo_schema, novo_schema, novo_schema, novo_schema);

    -- vendas_itens: 1(tabela) + 2(FK refs) + 2(índices) = 5 %I
    EXECUTE format('
        CREATE TABLE %I.vendas_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            venda_id UUID NOT NULL REFERENCES %I.vendas(id) ON DELETE CASCADE,
            produto_id UUID NOT NULL REFERENCES %I.estoque(id) ON DELETE RESTRICT,
            quantidade INTEGER NOT NULL CHECK (quantidade > 0),
            preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
            subtotal NUMERIC(10,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.vendas_itens(venda_id);
        CREATE INDEX ON %I.vendas_itens(produto_id);
    ', novo_schema, novo_schema, novo_schema, novo_schema, novo_schema);

    -- ordens_servico: 1(tabela) + 2(FK refs) + 2(índices) = 5 %I
    EXECUTE format('
        CREATE TABLE %I.ordens_servico (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            colaborador_id UUID REFERENCES %I.funcionarios(id) ON DELETE SET NULL,
            veiculo_equipamento VARCHAR(255),
            descricao_problema TEXT,
            status VARCHAR(50) DEFAULT ''aberta'' CHECK (status IN (''aberta'',''em_execucao'',''concluida'',''cancelada'')),
            valor_orcamento NUMERIC(10,2),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.ordens_servico(status);
        CREATE INDEX ON %I.ordens_servico(cliente_id);
    ', novo_schema, novo_schema, novo_schema, novo_schema, novo_schema);

    -- ordens_servico_itens: 1(tabela) + 2(FK refs) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.ordens_servico_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
            produto_id UUID REFERENCES %I.produtos(id) ON DELETE SET NULL,
            descricao TEXT NOT NULL,
            quantidade INTEGER DEFAULT 1,
            preco_unitario NUMERIC(10,2),
            subtotal NUMERIC(10,2) GENERATED ALWAYS AS (quantidade * COALESCE(preco_unitario,0)) STORED,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema, novo_schema);

    -- ordens_servico_historico: 1(tabela) + 1(FK ref) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.ordens_servico_historico (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
            status_anterior VARCHAR(50),
            status_novo VARCHAR(50) NOT NULL,
            alterado_por TEXT,
            alterado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- obras: 1(tabela) + 1(FK ref) + 1(índice) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.obras (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            endereco TEXT,
            data_inicio DATE,
            data_fim_prevista DATE,
            data_fim_real DATE,
            status VARCHAR(50) DEFAULT ''planejada'' CHECK (status IN (''planejada'',''em_andamento'',''concluida'',''cancelada'',''paralisada'')),
            orcamento_total NUMERIC(10,2),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX ON %I.obras(status);
    ', novo_schema, novo_schema, novo_schema);

    -- obras_etapas: 1(tabela) + 1(FK ref) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.obras_etapas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            data_prevista DATE NOT NULL,
            data_conclusao DATE,
            status VARCHAR(50) DEFAULT ''pendente'' CHECK (status IN (''pendente'',''em_andamento'',''concluida'')),
            ordem INTEGER NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema);

    -- obras_custos: 1(tabela) + 1(FK obra) + 1(FK cliente) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.obras_custos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            categoria VARCHAR(100) NOT NULL,
            descricao TEXT,
            valor_previsto NUMERIC(15,2) NOT NULL,
            valor_real NUMERIC(15,2),
            data DATE NOT NULL,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN (''material'',''mao_de_obra'',''equipamento'',''servico'',''outro'')),
            fornecedor_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema, novo_schema);

    -- obras_recursos: 1(tabela) + 1(FK obra) + 1(FK cliente) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.obras_recursos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN (''material'',''mao_de_obra'',''equipamento'')),
            descricao TEXT NOT NULL,
            quantidade NUMERIC(10,2) NOT NULL,
            unidade VARCHAR(20) DEFAULT ''un'',
            custo_unitario NUMERIC(15,2) NOT NULL,
            custo_total NUMERIC(15,2) GENERATED ALWAYS AS (quantidade * custo_unitario) STORED,
            status VARCHAR(50) DEFAULT ''alocado'' CHECK (status IN (''alocado'',''em_uso'',''liberado'')),
            data_alocacao DATE DEFAULT CURRENT_DATE,
            fornecedor_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema, novo_schema);

    -- obras_documentos: 1(tabela) + 1(FK obra) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.obras_documentos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            nome VARCHAR(255) NOT NULL,
            tipo VARCHAR(100) NOT NULL,
            tamanho BIGINT NOT NULL,
            url TEXT NOT NULL,
            caminho_storage TEXT NOT NULL,
            descricao TEXT,
            criado_por UUID NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- obras_ordens_servico: 1(tabela) + 1(FK obra) + 1(FK OS) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.obras_ordens_servico (
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
            PRIMARY KEY (obra_id, ordem_servico_id)
        );
    ', novo_schema, novo_schema, novo_schema);

    -- alertas_estoque: 1(tabela) + 1(FK produto) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.alertas_estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            tipo_alerta VARCHAR(50) NOT NULL,
            estoque_atual INTEGER NOT NULL,
            estoque_minimo INTEGER NOT NULL,
            mensagem TEXT,
            status VARCHAR(50) DEFAULT ''pendente'' CHECK (status IN (''pendente'',''visualizado'',''resolvido'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            resolvido_em TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema);

    -- kits: 1(tabela) + 1(FK produto) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.kits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            ativo BOOLEAN DEFAULT true,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema);

    -- kit_itens: 1(tabela) + 2(FK refs) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.kit_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            kit_id UUID NOT NULL REFERENCES %I.kits(id) ON DELETE CASCADE,
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            quantidade INTEGER NOT NULL DEFAULT 1,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema, novo_schema);

    -- locais_estoque: 1(tabela) = 1 %I
    EXECUTE format('
        CREATE TABLE %I.locais_estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN (''filial'',''deposito'',''loja'')),
            endereco TEXT,
            ativo BOOLEAN DEFAULT true,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema);

    -- estoque_por_local: 1(tabela) + 2(FK refs) = 3 %I
    EXECUTE format('
        CREATE TABLE %I.estoque_por_local (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            local_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE CASCADE,
            quantidade INTEGER NOT NULL DEFAULT 0,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL,
            UNIQUE(produto_id, local_id)
        );
    ', novo_schema, novo_schema, novo_schema);

    -- transferencias_estoque: 1(tabela) + 3(FK refs) = 4 %I
    EXECUTE format('
        CREATE TABLE %I.transferencias_estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            local_origem_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE CASCADE,
            local_destino_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE CASCADE,
            quantidade INTEGER NOT NULL,
            status VARCHAR(50) DEFAULT ''pendente'' CHECK (status IN (''pendente'',''em_transito'',''concluida'',''cancelada'')),
            observacao TEXT,
            criado_por UUID NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            concluida_em TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema, novo_schema, novo_schema);

    -- previsoes_demanda: 1(tabela) + 1(FK ref) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.previsoes_demanda (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES %I.produtos(id) ON DELETE CASCADE,
            periodo_inicio DATE NOT NULL,
            periodo_fim DATE NOT NULL,
            dias_analise INT NOT NULL,
            demanda_prevista INT NOT NULL,
            media_venda_diaria NUMERIC(10,4) NOT NULL,
            demanda_real INT,
            precisao NUMERIC(5,2),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema);

    -- regras_comissao: 1(tabela) + 1(FK ref) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.regras_comissao (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            colaborador_id UUID NOT NULL REFERENCES %I.funcionarios(id) ON DELETE CASCADE,
            tipo_calculo VARCHAR(20) NOT NULL CHECK (tipo_calculo IN (''percentual'',''valor_fixo'')),
            valor NUMERIC(10,2) NOT NULL,
            ativo BOOLEAN DEFAULT TRUE,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema);

    -- comissoes: 1(tabela) + 3(FK refs) = 4 %I
    EXECUTE format('
        CREATE TABLE %I.comissoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            colaborador_id UUID NOT NULL REFERENCES %I.funcionarios(id) ON DELETE CASCADE,
            venda_id UUID REFERENCES %I.vendas(id) ON DELETE SET NULL,
            regra_comissao_id UUID REFERENCES %I.regras_comissao(id) ON DELETE SET NULL,
            valor_comissao NUMERIC(10,2) NOT NULL,
            valor_venda NUMERIC(10,2),
            periodo_referencia DATE NOT NULL,
            status_pagamento VARCHAR(50) DEFAULT ''pendente'' CHECK (status_pagamento IN (''pendente'',''pago'',''cancelado'')),
            data_pagamento DATE,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ DEFAULT NULL
        );
    ', novo_schema, novo_schema, novo_schema, novo_schema);

    -- documentos_funcionarios: 1(tabela) + 1(FK ref) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.documentos_funcionarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            funcionario_id UUID NOT NULL REFERENCES %I.funcionarios(id) ON DELETE CASCADE,
            tipo VARCHAR(50) NOT NULL,
            nome_arquivo VARCHAR(255) NOT NULL,
            tamanho_bytes BIGINT NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            storage_path TEXT NOT NULL,
            dados_extraidos JSONB,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- fechamentos_mensais: 1(tabela) + 1(index) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.fechamentos_mensais (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            mes VARCHAR(7) NOT NULL UNIQUE,
            status VARCHAR(50) DEFAULT ''aberto'' CHECK (status IN (''aberto'',''fechado'')),
            faturamento NUMERIC(12, 2) DEFAULT 0,
            total_vendas INT DEFAULT 0,
            ticket_medio NUMERIC(10, 2) DEFAULT 0,
            visto BOOLEAN DEFAULT FALSE,
            visto_em TIMESTAMPTZ,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX ON %I.fechamentos_mensais(mes);
    ', novo_schema, novo_schema);

    -- configuracoes: 1(tabela) = 1 %I
    EXECUTE format('
        CREATE TABLE %I.configuracoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chave VARCHAR(100) UNIQUE NOT NULL,
            valor JSONB NOT NULL,
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- idempotency_control: 1(tabela) = 1 %I
    EXECUTE format('
        CREATE TABLE %I.idempotency_control (
            idempotency_key TEXT PRIMARY KEY,
            operation_type VARCHAR(50) NOT NULL,
            result JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- role_permissions: 1(tabela) + 1(índice único) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role VARCHAR(50) NOT NULL,
            resource VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            allowed BOOLEAN NOT NULL DEFAULT true,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE UNIQUE INDEX ON %I.role_permissions(role, resource, action);
    ', novo_schema, novo_schema);

    -- schema_migrations: 1(tabela) + 1(INSERT ref) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.schema_migrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            version INTEGER NOT NULL UNIQUE,
            description TEXT NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
        INSERT INTO %I.schema_migrations (version, description)
        VALUES (1, ''Versão inicial do schema tenant - Fluxo ERP v1.0'')
        ON CONFLICT (version) DO NOTHING;
    ', novo_schema, novo_schema);

    -- audit_log: 1(tabela) + 1(índice) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            operation_type VARCHAR(50) NOT NULL,
            resource_type VARCHAR(50),
            resource VARCHAR(50),
            resource_id UUID,
            user_id UUID,
            changes JSONB,
            details JSONB,
            status VARCHAR(50) DEFAULT ''success'',
            error_message TEXT,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX ON %I.audit_log(created_at DESC);
    ', novo_schema, novo_schema);

    -- Permissões finais
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC, anon, authenticated;', novo_schema);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', novo_schema);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO service_role;', novo_schema);

END;
$function$

