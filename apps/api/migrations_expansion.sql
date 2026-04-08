-- ==========================================
-- MIGRAÇÕES DE EXPANSÃO - FLUXO SaaS
-- ==========================================
-- Execute este arquivo no SQL Editor do Supabase
-- Após executar, execute: SELECT * FROM public.modulos_catalogo; para verificar novos módulos

-- ==========================================
-- 1. ADICIONAR NOVOS MÓDULOS AO CATÁLOGO
-- ==========================================
INSERT INTO public.modulos_catalogo (key, nome, descricao) VALUES
  ('obras', 'Obras', 'Gestão de obras e projetos com integração com OS e vendas.'),
  ('comissoes', 'Comissões', 'Regras de comissão por colaborador e cálculo automático.')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 2. TABELA vendas_itens (CRÍTICA - INTEGRAÇÃO VENDAS ↔ ESTOQUE)
-- ==========================================
-- Esta tabela deve existir em cada schema tenant
-- Execute para cada schema existente ou adicione à função provisionar_empresa

-- Exemplo para schema específico (substitua 'tenant_empresa_x' pelo schema real)
-- Se você já tem schemas criados, execute este bloco para cada um:

-- DROP TABLE IF EXISTS tenant_empresa_x.vendas_itens CASCADE;
-- CREATE TABLE tenant_empresa_x.vendas_itens (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     venda_id UUID NOT NULL REFERENCES tenant_empresa_x.vendas(id) ON DELETE CASCADE,
--     produto_id UUID NOT NULL REFERENCES tenant_empresa_x.estoque(id) ON DELETE RESTRICT,
--     quantidade INTEGER NOT NULL CHECK (quantidade > 0),
--     preco_unitario NUMERIC(10, 2) NOT NULL,
--     subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
--     criado_em TIMESTAMPTZ DEFAULT NOW()
-- );

-- Índices para performance
-- CREATE INDEX idx_vendas_itens_venda ON tenant_empresa_x.vendas_itens(venda_id);
-- CREATE INDEX idx_vendas_itens_produto ON tenant_empresa_x.vendas_itens(produto_id);
-- CREATE INDEX idx_vendas_itens_data ON tenant_empresa_x.vendas_itens(criado_em);

-- ==========================================
-- 3. ATUALIZAR FUNÇÃO provisionar_empresa PARA INCLUIR TABELAS NOVAS
-- ==========================================
-- Execute para atualizar a função existente:

CREATE OR REPLACE FUNCTION provisionar_empresa(novo_schema text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    schema_exists boolean;
BEGIN
    -- 1. Verifica se o schema já existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = novo_schema
    ) INTO schema_exists;

    IF schema_exists THEN
        RETURN json_build_object('status', 'error', 'message', 'O schema da empresa já existe.');
    END IF;

    -- 2. Cria o schema
    EXECUTE format('CREATE SCHEMA %I;', novo_schema);

    -- Endurecimento: por padrão, schemas tenant NÃO devem ser acessíveis por anon/authenticated
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role;', novo_schema);

    -- Default privileges
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM PUBLIC;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM anon;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM authenticated;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO service_role;', novo_schema);

    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM PUBLIC;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM anon;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM authenticated;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO service_role;', novo_schema);

    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM PUBLIC;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM anon;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM authenticated;', novo_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON FUNCTIONS TO service_role;', novo_schema);

    -- 3. MÓDULO 2: CRM & Gestão de Clientes
    EXECUTE format('
        CREATE TABLE %I.clientes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            telefone VARCHAR(50),
            funil_fase VARCHAR(50) DEFAULT ''lead'',
            status VARCHAR(50) DEFAULT ''ativo'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 4. MÓDULO 6: Catálogo de Produtos e Serviços
    EXECUTE format('
        CREATE TABLE %I.produtos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            tipo VARCHAR(50) DEFAULT ''produto'',
            preco_base NUMERIC(10, 2) NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 5. MÓDULO 5: Controle de Estoque
    EXECUTE format('
        CREATE TABLE %I.estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID REFERENCES %I.produtos(id),
            sku VARCHAR(100) UNIQUE,
            quantidade INTEGER DEFAULT 0,
            quantidade_minima INTEGER DEFAULT 10,
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- 6. MÓDULO 3: Vendas & PDV
    EXECUTE format('
        CREATE TABLE %I.vendas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id),
            valor_total NUMERIC(10, 2) NOT NULL,
            metodo_pagamento VARCHAR(50),
            status VARCHAR(50) DEFAULT ''concluido'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- 6.1. Tabela vendas_itens (CRÍTICA - FK para estoque)
    EXECUTE format('
        CREATE TABLE %I.vendas_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            venda_id UUID NOT NULL REFERENCES %I.vendas(id) ON DELETE CASCADE,
            produto_id UUID NOT NULL REFERENCES %I.estoque(id) ON DELETE RESTRICT,
            quantidade INTEGER NOT NULL CHECK (quantidade > 0),
            preco_unitario NUMERIC(10, 2) NOT NULL,
            subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema);

    -- Índices para vendas_itens
    EXECUTE format('CREATE INDEX idx_%I_vendas_itens_venda ON %I.vendas_itens(venda_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_vendas_itens_produto ON %I.vendas_itens(produto_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_vendas_itens_data ON %I.vendas_itens(criado_em);', novo_schema, novo_schema);

    -- Trigger para atualizar estoque após venda
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.atualizar_estoque_apos_venda()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            UPDATE %I.estoque e
            SET quantidade = e.quantidade - NEW.quantidade,
                atualizado_em = NOW()
            WHERE e.id = NEW.produto_id;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION ''Produto não encontrado no estoque'';
            END IF;
            
            IF (SELECT quantidade FROM %I.estoque WHERE id = NEW.produto_id) < 0 THEN
                RAISE EXCEPTION ''Quantidade insuficiente no estoque'';
            END IF;
            
            RETURN NEW;
        END;
        $$;
    ', novo_schema, novo_schema, novo_schema);

    EXECUTE format('
        CREATE TRIGGER trg_%I_vendas_itens_atualizar_estoque
        AFTER INSERT ON %I.vendas_itens
        FOR EACH ROW
        EXECUTE FUNCTION %I.atualizar_estoque_apos_venda();
    ', novo_schema, novo_schema, novo_schema);

    -- 7. MÓDULO 4: Gestão Financeira
    EXECUTE format('
        CREATE TABLE %I.financeiro (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN (''pagar'', ''receber'')),
            descricao TEXT NOT NULL,
            valor NUMERIC(10, 2) NOT NULL,
            data_vencimento DATE NOT NULL,
            status VARCHAR(50) DEFAULT ''pendente'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 8. MÓDULO 7: Departamento Pessoal & RH
    EXECUTE format('
        CREATE TABLE %I.funcionarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            cargo VARCHAR(100),
            salario NUMERIC(10, 2),
            role VARCHAR(50) DEFAULT ''funcionario'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 9. MÓDULO 9: Ordem de Serviço (O.S.)
    EXECUTE format('
        CREATE TABLE %I.ordens_servico (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id) ON DELETE SET NULL,
            colaborador_id UUID REFERENCES %I.funcionarios(id) ON DELETE SET NULL,
            veiculo_equipamento VARCHAR(255),
            descricao_problema TEXT,
            status VARCHAR(50) DEFAULT ''aberta'' CHECK (status IN (''aberta'', ''em_execucao'', ''concluida'', ''cancelada'')),
            valor_orcamento NUMERIC(10, 2),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema);

    -- 9.1. Tabela auxiliar ordens_servico_itens
    EXECUTE format('
        CREATE TABLE %I.ordens_servico_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
            produto_id UUID REFERENCES %I.produtos(id) ON DELETE SET NULL,
            descricao TEXT NOT NULL,
            quantidade INTEGER DEFAULT 1,
            preco_unitario NUMERIC(10, 2),
            subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * COALESCE(preco_unitario, 0)) STORED,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema);

    EXECUTE format('CREATE INDEX idx_%I_os_itens_os ON %I.ordens_servico_itens(ordem_servico_id);', novo_schema, novo_schema);

    -- Trigger para histórico de status da OS
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

    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.registrar_historico_os()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF OLD.status IS DISTINCT FROM NEW.status THEN
                INSERT INTO %I.ordens_servico_historico (ordem_servico_id, status_anterior, status_novo, alterado_por)
                VALUES (NEW.id, OLD.status, NEW.status, current_user);
            END IF;
            NEW.atualizado_em = NOW();
            RETURN NEW;
        END;
        $$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE TRIGGER trg_%I_os_historico
        BEFORE UPDATE ON %I.ordens_servico
        FOR EACH ROW
        EXECUTE FUNCTION %I.registrar_historico_os();
    ', novo_schema, novo_schema, novo_schema);

    -- 10. MÓDULO 11: Obras (NOVO)
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
            status VARCHAR(50) DEFAULT ''planejada'' CHECK (status IN (''planejada'', ''em_andamento'', ''concluida'', ''cancelada'', ''paralisada'')),
            orcamento_total NUMERIC(10, 2),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- Relacionamento obras ↔ ordens_servico (muitos para muitos)
    EXECUTE format('
        CREATE TABLE %I.obras_ordens_servico (
            obra_id UUID NOT NULL REFERENCES %I.obras(id) ON DELETE CASCADE,
            ordem_servico_id UUID NOT NULL REFERENCES %I.ordens_servico(id) ON DELETE CASCADE,
            PRIMARY KEY (obra_id, ordem_servico_id)
        );
    ', novo_schema, novo_schema, novo_schema);

    EXECUTE format('CREATE INDEX idx_%I_obras_cliente ON %I.obras(cliente_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_obras_status ON %I.obras(status);', novo_schema, novo_schema);

    -- 11. MÓDULO 12: Comissões (NOVO)
    EXECUTE format('
        CREATE TABLE %I.regras_comissao (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            colaborador_id UUID NOT NULL REFERENCES %I.funcionarios(id) ON DELETE CASCADE,
            tipo_calculo VARCHAR(20) NOT NULL CHECK (tipo_calculo IN (''percentual'', ''valor_fixo'')),
            valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
            ativo BOOLEAN DEFAULT TRUE,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE TABLE %I.comissoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            colaborador_id UUID NOT NULL REFERENCES %I.funcionarios(id) ON DELETE CASCADE,
            venda_id UUID REFERENCES %I.vendas(id) ON DELETE SET NULL,
            regra_comissao_id UUID REFERENCES %I.regras_comissao(id) ON DELETE SET NULL,
            valor_comissao NUMERIC(10, 2) NOT NULL,
            valor_venda NUMERIC(10, 2),
            periodo_referencia DATE NOT NULL,
            status_pagamento VARCHAR(50) DEFAULT ''pendente'' CHECK (status_pagamento IN (''pendente'', ''pago'', ''cancelado'')),
            data_pagamento DATE,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema, novo_schema, novo_schema);

    EXECUTE format('CREATE INDEX idx_%I_comissoes_colaborador ON %I.comissoes(colaborador_id);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_comissoes_periodo ON %I.comissoes(periodo_referencia);', novo_schema, novo_schema);
    EXECUTE format('CREATE INDEX idx_%I_comissoes_status ON %I.comissoes(status_pagamento);', novo_schema, novo_schema);

    -- Função para calcular comissões automaticamente
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.calcular_comissao_venda(venda_uuid UUID)
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_cliente_id UUID;
            v_colaborador_id UUID;
            v_valor_total NUMERIC(10, 2);
            v_regra_id UUID;
            v_tipo_calculo VARCHAR(20);
            v_regra_valor NUMERIC(10, 2);
            v_comissao NUMERIC(10, 2);
        BEGIN
            -- Buscar dados da venda
            SELECT cliente_id, valor_total INTO v_cliente_id, v_valor_total
            FROM %I.vendas WHERE id = venda_uuid;
            
            -- Buscar colaborador responsável (simplificado: primeiro funcionário ativo)
            SELECT id INTO v_colaborador_id
            FROM %I.funcionarios
            WHERE role = ''funcionario''
            LIMIT 1;
            
            IF v_colaborador_id IS NULL THEN
                RETURN;
            END IF;
            
            -- Buscar regra de comissão ativa para o colaborador
            SELECT id, tipo_calculo, valor INTO v_regra_id, v_tipo_calculo, v_regra_valor
            FROM %I.regras_comissao
            WHERE colaborador_id = v_colaborador_id AND ativo = TRUE
            LIMIT 1;
            
            IF v_regra_id IS NULL THEN
                RETURN;
            END IF;
            
            -- Calcular comissão
            IF v_tipo_calculo = ''percentual'' THEN
                v_comissao := v_valor_total * (v_regra_valor / 100);
            ELSE
                v_comissao := v_regra_valor;
            END IF;
            
            -- Inserir comissão
            INSERT INTO %I.comissoes (colaborador_id, venda_id, regra_comissao_id, valor_comissao, valor_venda, periodo_referencia)
            VALUES (v_colaborador_id, venda_uuid, v_regra_id, v_comissao, v_valor_total, DATE_TRUNC(''month'', NOW())::DATE);
        END;
        $$;
    ', novo_schema, novo_schema, novo_schema, novo_schema, novo_schema);

    -- Trigger para calcular comissão após venda concluída
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.trigger_calcular_comissao()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF NEW.status = ''concluido'' THEN
                PERFORM %I.calcular_comissao_venda(NEW.id);
            END IF;
            RETURN NEW;
        END;
        $$;
    ', novo_schema, novo_schema);

    EXECUTE format('
        CREATE TRIGGER trg_%I_vendas_calcular_comissao
        AFTER INSERT OR UPDATE ON %I.vendas
        FOR EACH ROW
        EXECUTE FUNCTION %I.trigger_calcular_comissao();
    ', novo_schema, novo_schema, novo_schema);

    -- 12. MÓDULO 13: Configurações do Tenant
    EXECUTE format('
        CREATE TABLE %I.configuracoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chave VARCHAR(100) UNIQUE NOT NULL,
            valor JSONB NOT NULL,
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- Garantir que as tabelas criadas também não sejam acessíveis por anon/authenticated
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon;', novo_schema);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated;', novo_schema);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role;', novo_schema);

    RETURN json_build_object(
        'status', 'success', 
        'message', 'Ambiente Multi-Tenant provisionado com sucesso para todos os módulos!',
        'schema_name', novo_schema
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- ==========================================
-- 4. VIEWS PARA RELATÓRIOS (para cada schema tenant)
-- ==========================================
-- Execute para cada schema existente (substitua 'tenant_empresa_x')

-- DROP VIEW IF EXISTS tenant_empresa_x.vw_relatorio_vendas CASCADE;
-- CREATE VIEW tenant_empresa_x.vw_relatorio_vendas AS
-- SELECT 
--     v.id,
--     v.criado_em as data_venda,
--     c.nome as cliente_nome,
--     v.valor_total,
--     v.metodo_pagamento,
--     v.status,
--     COUNT(vi.id) as itens_quantidade,
--     STRING_AGG(p.nome, ', ') as produtos
-- FROM tenant_empresa_x.vendas v
-- LEFT JOIN tenant_empresa_x.clientes c ON v.cliente_id = c.id
-- LEFT JOIN tenant_empresa_x.vendas_itens vi ON v.id = vi.venda_id
-- LEFT JOIN tenant_empresa_x.estoque e ON vi.produto_id = e.id
-- LEFT JOIN tenant_empresa_x.produtos p ON e.produto_id = p.id
-- GROUP BY v.id, c.nome;

-- DROP VIEW IF EXISTS tenant_empresa_x.vw_relatorio_financeiro CASCADE;
-- CREATE VIEW tenant_empresa_x.vw_relatorio_financeiro AS
-- SELECT 
--     id,
--     criado_em as data_lancamento,
--     tipo,
--     descricao,
--     valor,
--     data_vencimento,
--     status
-- FROM tenant_empresa_x.financeiro;

-- DROP VIEW IF EXISTS tenant_empresa_x.vw_relatorio_estoque CASCADE;
-- CREATE VIEW tenant_empresa_x.vw_relatorio_estoque AS
-- SELECT 
--     e.id,
--     e.sku,
--     p.nome as produto_nome,
--     e.quantidade,
--     e.quantidade_minima,
--     CASE 
--         WHEN e.quantidade <= e.quantidade_minima THEN 'critico'
--         WHEN e.quantidade <= e.quantidade_minima * 2 THEN 'baixo'
--         ELSE 'normal'
--     END as status_estoque,
--     e.atualizado_em
-- FROM tenant_empresa_x.estoque e
-- JOIN tenant_empresa_x.produtos p ON e.produto_id = p.id;

-- DROP VIEW IF EXISTS tenant_empresa_x.vw_relatorio_crm CASCADE;
-- CREATE VIEW tenant_empresa_x.vw_relatorio_crm AS
-- SELECT 
--     id,
--     nome,
--     email,
--     telefone,
--     funil_fase,
--     status,
--     criado_em as data_cadastro,
--     CASE 
--         WHEN criado_em < NOW() - INTERVAL '60 days' THEN 'risco'
--         WHEN criado_em < NOW() - INTERVAL '30 days' THEN 'inativo'
--         ELSE 'ativo'
--     END as status_engajamento
-- FROM tenant_empresa_x.clientes;
