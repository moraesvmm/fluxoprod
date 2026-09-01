-- Caixa diario por filial, com sessao, livro de movimentos e fechamento auditavel.
-- A regra de acesso fica nas RPCs locais; a interface nao e uma fronteira de seguranca.

CREATE OR REPLACE FUNCTION public.provisionar_hook_caixa_diario(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_filial_id UUID;
    v_caixa_id UUID;
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    IF to_regclass(format('%I.locais_estoque', p_schema)) IS NULL
       OR to_regclass(format('%I.vendas', p_schema)) IS NULL THEN
        RAISE EXCEPTION 'Schema % nao possui locais_estoque e vendas', p_schema;
    END IF;

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.usuarios_filiais (
            user_id UUID NOT NULL,
            filial_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE CASCADE,
            papel TEXT NOT NULL DEFAULT 'operador'
                CHECK (papel IN ('operador', 'supervisor', 'gerente')),
            ativo BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id, filial_id)
        )
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.caixas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            filial_id UUID NOT NULL REFERENCES %I.locais_estoque(id) ON DELETE RESTRICT,
            codigo TEXT NOT NULL,
            nome TEXT NOT NULL,
            ativo BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (filial_id, codigo)
        )
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.caixa_sessoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            caixa_id UUID NOT NULL REFERENCES %I.caixas(id) ON DELETE RESTRICT,
            data_operacional DATE NOT NULL,
            status TEXT NOT NULL DEFAULT 'aberto'
                CHECK (status IN ('aberto', 'fechado', 'reaberto')),
            aberto_por UUID NOT NULL,
            aberto_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            valor_abertura NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (valor_abertura >= 0),
            fechado_em TIMESTAMPTZ,
            fechado_por UUID,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (caixa_id, data_operacional)
        )
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.caixa_movimentos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sessao_id UUID NOT NULL REFERENCES %I.caixa_sessoes(id) ON DELETE RESTRICT,
            tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'estorno', 'ajuste', 'suprimento')),
            valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
            forma_pagamento TEXT NOT NULL,
            origem_tipo TEXT NOT NULL CHECK (origem_tipo IN ('venda', 'devolucao', 'abertura', 'sangria', 'suprimento', 'ajuste')),
            origem_id UUID,
            descricao TEXT NOT NULL,
            criado_por UUID NOT NULL,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            cancelado_em TIMESTAMPTZ,
            cancelado_por UUID
        )
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS %I.fechamentos_caixa (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sessao_id UUID NOT NULL REFERENCES %I.caixa_sessoes(id) ON DELETE RESTRICT,
            versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
            status TEXT NOT NULL DEFAULT 'fechado' CHECK (status IN ('fechado', 'reaberto')),
            valor_esperado NUMERIC(12, 2) NOT NULL,
            valor_informado NUMERIC(12, 2) NOT NULL,
            diferenca NUMERIC(12, 2) NOT NULL,
            resumo_por_forma JSONB NOT NULL DEFAULT '{}'::JSONB,
            valores_contados JSONB NOT NULL DEFAULT '{}'::JSONB,
            observacao TEXT,
            fechado_por UUID NOT NULL,
            fechado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            reaberto_por UUID,
            reaberto_em TIMESTAMPTZ,
            motivo_reabertura TEXT,
            UNIQUE (sessao_id, versao)
        )
    $sql$, p_schema, p_schema);

    EXECUTE format(
        'ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS data_venda DATE',
        p_schema
    );
    EXECUTE format(
        'ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS filial_id UUID',
        p_schema
    );
    EXECUTE format(
        'ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS caixa_id UUID',
        p_schema
    );

    EXECUTE format($sql$
        SELECT id
        FROM %I.locais_estoque
        WHERE ativo = TRUE
          AND tipo IN ('filial', 'loja')
        ORDER BY criado_em, id
        LIMIT 1
    $sql$, p_schema)
    INTO v_filial_id;

    IF v_filial_id IS NULL THEN
        EXECUTE format($sql$
            INSERT INTO %I.locais_estoque (nome, tipo, ativo)
            VALUES ('Matriz', 'filial', TRUE)
            RETURNING id
        $sql$, p_schema)
        INTO v_filial_id;
    END IF;

    EXECUTE format($sql$
        INSERT INTO %I.caixas (filial_id, codigo, nome, ativo)
        VALUES ($1, 'principal', 'Caixa principal', TRUE)
        ON CONFLICT (filial_id, codigo) DO UPDATE SET ativo = TRUE
        RETURNING id
    $sql$, p_schema)
    INTO v_caixa_id
    USING v_filial_id;

    EXECUTE format(
        'UPDATE %I.vendas
         SET data_venda = COALESCE(data_venda, (criado_em AT TIME ZONE ''America/Sao_Paulo'')::DATE),
             filial_id = COALESCE(filial_id, $1),
             caixa_id = COALESCE(caixa_id, $2)
         WHERE data_venda IS NULL OR filial_id IS NULL OR caixa_id IS NULL',
        p_schema
    ) USING v_filial_id, v_caixa_id;

    EXECUTE format('ALTER TABLE %I.vendas ALTER COLUMN data_venda SET NOT NULL', p_schema);
    EXECUTE format('ALTER TABLE %I.vendas ALTER COLUMN filial_id SET NOT NULL', p_schema);
    EXECUTE format('ALTER TABLE %I.vendas ALTER COLUMN caixa_id SET NOT NULL', p_schema);

    EXECUTE format(
        'ALTER TABLE %I.vendas ALTER COLUMN data_venda SET DEFAULT (NOW() AT TIME ZONE ''America/Sao_Paulo'')::DATE',
        p_schema
    );

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_item
        JOIN pg_class table_item ON table_item.oid = constraint_item.conrelid
        JOIN pg_namespace namespace_item ON namespace_item.oid = table_item.relnamespace
        WHERE namespace_item.nspname = p_schema
          AND table_item.relname = 'vendas'
          AND constraint_item.conname = 'vendas_filial_id_fkey'
    ) THEN
        EXECUTE format(
            'ALTER TABLE %I.vendas ADD CONSTRAINT vendas_filial_id_fkey
             FOREIGN KEY (filial_id) REFERENCES %I.locais_estoque(id) ON DELETE RESTRICT',
            p_schema, p_schema
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_item
        JOIN pg_class table_item ON table_item.oid = constraint_item.conrelid
        JOIN pg_namespace namespace_item ON namespace_item.oid = table_item.relnamespace
        WHERE namespace_item.nspname = p_schema
          AND table_item.relname = 'vendas'
          AND constraint_item.conname = 'vendas_caixa_id_fkey'
    ) THEN
        EXECUTE format(
            'ALTER TABLE %I.vendas ADD CONSTRAINT vendas_caixa_id_fkey
             FOREIGN KEY (caixa_id) REFERENCES %I.caixas(id) ON DELETE RESTRICT',
            p_schema, p_schema
        );
    END IF;

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_usuarios_filiais_filial ON %I.usuarios_filiais(filial_id) WHERE ativo = TRUE',
        p_schema, p_schema
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_caixas_filial ON %I.caixas(filial_id) WHERE ativo = TRUE',
        p_schema, p_schema
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_caixa_movimentos_sessao ON %I.caixa_movimentos(sessao_id, forma_pagamento, criado_em DESC) WHERE cancelado_em IS NULL',
        p_schema, p_schema
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_vendas_filial_data ON %I.vendas(filial_id, data_venda DESC, criado_em DESC) WHERE deleted_at IS NULL',
        p_schema, p_schema
    );

    -- Mantem os usuarios existentes operacionais na filial inicial; filiais adicionais
    -- exigem atribuicao explicita para usuarios comuns.
    EXECUTE format($sql$
        INSERT INTO %I.usuarios_filiais (user_id, filial_id, papel, ativo)
        SELECT profile.user_id,
               $1,
               CASE WHEN profile.role = 'tenant_admin' THEN 'gerente' ELSE 'operador' END,
               TRUE
        FROM public.user_profiles profile
        JOIN public.empresas empresa ON empresa.id = profile.empresa_id
        WHERE empresa.schema_name = $2
          AND profile.role IN ('tenant_admin', 'tenant_user')
        ON CONFLICT (user_id, filial_id) DO NOTHING
    $sql$, p_schema)
    USING v_filial_id, p_schema;

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_usuario_pode_acessar_filial(
            p_filial_id UUID,
            p_exige_gerencia BOOLEAN DEFAULT FALSE
        )
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_role TEXT;
        BEGIN
            SELECT profile.role
            INTO v_role
            FROM public.user_profiles profile
            JOIN public.empresas empresa ON empresa.id = profile.empresa_id
            WHERE profile.user_id = auth.uid()
              AND empresa.schema_name = current_schema()
            LIMIT 1;

            IF v_role = 'tenant_admin' THEN
                RETURN TRUE;
            END IF;

            RETURN EXISTS (
                SELECT 1
                FROM usuarios_filiais usuario_filial
                WHERE usuario_filial.user_id = auth.uid()
                  AND usuario_filial.filial_id = p_filial_id
                  AND usuario_filial.ativo = TRUE
                  AND (NOT p_exige_gerencia OR usuario_filial.papel IN ('supervisor', 'gerente'))
            );
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_listar_contextos_caixa()
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_role TEXT;
        BEGIN
            SELECT profile.role INTO v_role
            FROM public.user_profiles profile
            JOIN public.empresas empresa ON empresa.id = profile.empresa_id
            WHERE profile.user_id = auth.uid() AND empresa.schema_name = current_schema()
            LIMIT 1;

            RETURN COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'filial_id', filial.id,
                    'filial_nome', filial.nome,
                    'caixa_id', caixa.id,
                    'caixa_codigo', caixa.codigo,
                    'caixa_nome', caixa.nome,
                    'papel', COALESCE(usuario_filial.papel, 'gerente')
                ) ORDER BY filial.nome, caixa.nome)
                FROM caixas caixa
                JOIN locais_estoque filial ON filial.id = caixa.filial_id AND filial.ativo = TRUE
                LEFT JOIN usuarios_filiais usuario_filial
                  ON usuario_filial.filial_id = filial.id
                 AND usuario_filial.user_id = auth.uid()
                 AND usuario_filial.ativo = TRUE
                WHERE caixa.ativo = TRUE
                  AND (v_role = 'tenant_admin' OR usuario_filial.user_id IS NOT NULL)
            ), '[]'::JSONB);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_abrir_caixa(
            p_filial_id UUID,
            p_caixa_id UUID,
            p_valor_abertura NUMERIC DEFAULT 0
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_sessao_id UUID;
            v_data DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
        BEGIN
            IF NOT tenant_usuario_pode_acessar_filial(p_filial_id, FALSE) THEN
                RAISE EXCEPTION 'Acesso negado a filial';
            END IF;
            IF p_valor_abertura < 0 THEN
                RAISE EXCEPTION 'Valor de abertura invalido';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM caixas WHERE id = p_caixa_id AND filial_id = p_filial_id AND ativo) THEN
                RAISE EXCEPTION 'Caixa nao pertence a filial';
            END IF;

            INSERT INTO caixa_sessoes (caixa_id, data_operacional, aberto_por, valor_abertura)
            VALUES (p_caixa_id, v_data, auth.uid(), p_valor_abertura)
            ON CONFLICT (caixa_id, data_operacional) DO NOTHING
            RETURNING id INTO v_sessao_id;

            IF v_sessao_id IS NULL THEN
                SELECT id INTO v_sessao_id
                FROM caixa_sessoes
                WHERE caixa_id = p_caixa_id AND data_operacional = v_data;
            END IF;

            RETURN jsonb_build_object('success', TRUE, 'sessao_id', v_sessao_id, 'data_operacional', v_data);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_obter_resumo_caixa(
            p_filial_id UUID,
            p_caixa_id UUID,
            p_data DATE DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_data DATE := COALESCE(p_data, (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE);
            v_sessao caixa_sessoes%%ROWTYPE;
            v_formas JSONB;
            v_circuito_por_forma JSONB;
            v_movimentos JSONB;
            v_total NUMERIC := 0;
            v_fechamento_id UUID;
        BEGIN
            IF NOT tenant_usuario_pode_acessar_filial(p_filial_id, FALSE) THEN
                RAISE EXCEPTION 'Acesso negado a filial';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM caixas WHERE id = p_caixa_id AND filial_id = p_filial_id) THEN
                RAISE EXCEPTION 'Caixa nao pertence a filial';
            END IF;

            SELECT * INTO v_sessao
            FROM caixa_sessoes
            WHERE caixa_id = p_caixa_id AND data_operacional = v_data;

            IF NOT FOUND THEN
                RETURN jsonb_build_object(
                    'success', TRUE, 'status', 'nao_aberto', 'data_operacional', v_data,
                    'valor_abertura', 0, 'valor_esperado', 0, 'formas', '{}'::JSONB, 'movimentos', '[]'::JSONB
                );
            END IF;

            SELECT
                COALESCE(jsonb_object_agg(forma_pagamento, saldo), '{}'::JSONB),
                COALESCE(jsonb_object_agg(forma_pagamento, jsonb_build_object(
                    'entradas', entradas,
                    'estornos', estornos,
                    'saidas', saidas,
                    'saldo', saldo
                )), '{}'::JSONB),
                COALESCE(SUM(saldo), 0)
            INTO v_formas, v_circuito_por_forma, v_total
            FROM (
                SELECT movimento.forma_pagamento,
                       COALESCE(SUM(CASE WHEN movimento.tipo IN ('entrada', 'suprimento') THEN movimento.valor ELSE 0 END), 0) AS entradas,
                       COALESCE(SUM(CASE WHEN movimento.tipo = 'estorno' THEN movimento.valor ELSE 0 END), 0) AS estornos,
                       COALESCE(SUM(CASE WHEN movimento.tipo IN ('saida', 'ajuste') THEN movimento.valor ELSE 0 END), 0) AS saidas,
                       SUM(CASE WHEN movimento.tipo IN ('entrada', 'suprimento') THEN movimento.valor ELSE -movimento.valor END) AS saldo
                FROM caixa_movimentos movimento
                WHERE movimento.sessao_id = v_sessao.id
                  AND movimento.cancelado_em IS NULL
                GROUP BY movimento.forma_pagamento
            ) totais;

            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', movimento.id,
                'tipo', movimento.tipo,
                'valor', movimento.valor,
                'forma_pagamento', movimento.forma_pagamento,
                'origem_tipo', movimento.origem_tipo,
                'origem_id', movimento.origem_id,
                'descricao', movimento.descricao,
                'criado_em', movimento.criado_em
            ) ORDER BY movimento.criado_em DESC), '[]'::JSONB)
            INTO v_movimentos
            FROM caixa_movimentos movimento
            WHERE movimento.sessao_id = v_sessao.id
              AND movimento.cancelado_em IS NULL;

                        SELECT fechamento.id INTO v_fechamento_id
                        FROM fechamentos_caixa fechamento
                        WHERE fechamento.sessao_id = v_sessao.id
                            AND fechamento.status = 'fechado'
                        ORDER BY fechamento.versao DESC
                        LIMIT 1;

            RETURN jsonb_build_object(
                'success', TRUE,
                'sessao_id', v_sessao.id,
                                'fechamento_id', v_fechamento_id,
                'status', v_sessao.status,
                'data_operacional', v_data,
                'valor_abertura', v_sessao.valor_abertura,
                'valor_esperado', v_sessao.valor_abertura + v_total,
                'formas', v_formas,
                'circuito_por_forma', v_circuito_por_forma,
                'movimentos', v_movimentos
            );
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_registrar_movimento_caixa(
            p_filial_id UUID,
            p_caixa_id UUID,
            p_tipo TEXT,
            p_valor NUMERIC,
            p_forma_pagamento TEXT,
            p_motivo TEXT
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_sessao_id UUID;
            v_data DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
            v_origem TEXT;
        BEGIN
            IF NOT tenant_usuario_pode_acessar_filial(p_filial_id, FALSE) THEN
                RAISE EXCEPTION 'Acesso negado a filial';
            END IF;
            IF p_tipo NOT IN ('saida', 'suprimento', 'ajuste') OR p_valor <= 0 OR BTRIM(COALESCE(p_motivo, '')) = '' THEN
                RAISE EXCEPTION 'Movimento de caixa invalido';
            END IF;

            SELECT id INTO v_sessao_id
            FROM caixa_sessoes
            WHERE caixa_id = p_caixa_id AND data_operacional = v_data AND status IN ('aberto', 'reaberto')
            FOR UPDATE;
            IF v_sessao_id IS NULL THEN
                RAISE EXCEPTION 'Caixa nao esta aberto';
            END IF;

            v_origem := CASE p_tipo WHEN 'saida' THEN 'sangria' WHEN 'suprimento' THEN 'suprimento' ELSE 'ajuste' END;
            INSERT INTO caixa_movimentos (sessao_id, tipo, valor, forma_pagamento, origem_tipo, descricao, criado_por)
            VALUES (v_sessao_id, p_tipo, p_valor, p_forma_pagamento, v_origem, p_motivo, auth.uid());

            RETURN jsonb_build_object('success', TRUE);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_fechar_caixa(
            p_filial_id UUID,
            p_caixa_id UUID,
            p_data DATE,
            p_valores_contados JSONB,
            p_observacao TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_sessao caixa_sessoes%%ROWTYPE;
            v_resumo JSONB;
            v_esperado NUMERIC;
            v_informado NUMERIC;
            v_fechamento_id UUID;
            v_formas JSONB;
        BEGIN
            IF NOT tenant_usuario_pode_acessar_filial(p_filial_id, FALSE) THEN
                RAISE EXCEPTION 'Usuario sem permissao para fechar este caixa';
            END IF;
            IF jsonb_typeof(p_valores_contados) IS DISTINCT FROM 'object' THEN
                RAISE EXCEPTION 'Valores contados devem ser um objeto';
            END IF;

            SELECT sessao.* INTO v_sessao
            FROM caixa_sessoes sessao
            JOIN caixas caixa ON caixa.id = sessao.caixa_id
            WHERE sessao.caixa_id = p_caixa_id
              AND caixa.filial_id = p_filial_id
              AND sessao.data_operacional = p_data
            FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Caixa nao foi aberto nesta data';
            END IF;
            IF v_sessao.status = 'fechado' THEN
                RAISE EXCEPTION 'Caixa ja foi fechado';
            END IF;

            v_resumo := tenant_obter_resumo_caixa(p_filial_id, p_caixa_id, p_data);
            IF COALESCE(v_resumo->>'success', 'false') <> 'true' THEN
                RAISE EXCEPTION '%%', COALESCE(v_resumo->>'error', 'Nao foi possivel calcular o resumo');
            END IF;
            v_esperado := (v_resumo->>'valor_esperado')::NUMERIC;
            SELECT COALESCE(SUM(valor::NUMERIC), 0)
            INTO v_informado
            FROM jsonb_each_text(p_valores_contados) valor_item(forma, valor);
            IF v_esperado <> v_informado AND BTRIM(COALESCE(p_observacao, '')) = '' THEN
                RAISE EXCEPTION 'Observacao obrigatoria quando houver diferenca';
            END IF;

            v_formas := COALESCE(v_resumo->'formas', '{}'::JSONB);
            UPDATE caixa_sessoes
            SET status = 'fechado', fechado_por = auth.uid(), fechado_em = NOW()
            WHERE id = v_sessao.id;
            INSERT INTO fechamentos_caixa (
                sessao_id, valor_esperado, valor_informado, diferenca, resumo_por_forma,
                valores_contados, observacao, fechado_por
            ) VALUES (
                v_sessao.id, v_esperado, v_informado, v_informado - v_esperado, v_formas,
                p_valores_contados, p_observacao, auth.uid()
            ) RETURNING id INTO v_fechamento_id;

            RETURN jsonb_build_object(
                'success', TRUE, 'fechamento_id', v_fechamento_id,
                'valor_esperado', v_esperado, 'valor_informado', v_informado,
                'diferenca', v_informado - v_esperado
            );
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_reabrir_caixa(p_fechamento_id UUID, p_motivo TEXT)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_sessao_id UUID;
            v_filial_id UUID;
        BEGIN
            IF BTRIM(COALESCE(p_motivo, '')) = '' THEN
                RAISE EXCEPTION 'Motivo de reabertura obrigatorio';
            END IF;
            SELECT sessao.id, caixa.filial_id INTO v_sessao_id, v_filial_id
            FROM fechamentos_caixa fechamento
            JOIN caixa_sessoes sessao ON sessao.id = fechamento.sessao_id
            JOIN caixas caixa ON caixa.id = sessao.caixa_id
            WHERE fechamento.id = p_fechamento_id AND fechamento.status = 'fechado'
            FOR UPDATE;
            IF NOT FOUND OR NOT tenant_usuario_pode_acessar_filial(v_filial_id, TRUE) THEN
                RAISE EXCEPTION 'Fechamento nao encontrado ou acesso negado';
            END IF;
            UPDATE fechamentos_caixa
            SET status = 'reaberto', reaberto_por = auth.uid(), reaberto_em = NOW(), motivo_reabertura = p_motivo
            WHERE id = p_fechamento_id;
            UPDATE caixa_sessoes SET status = 'reaberto', fechado_por = NULL, fechado_em = NULL WHERE id = v_sessao_id;
            RETURN jsonb_build_object('success', TRUE, 'sessao_id', v_sessao_id);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_listar_vendas(
            p_filial_id UUID DEFAULT NULL,
            p_data DATE DEFAULT NULL,
            p_busca TEXT DEFAULT NULL,
            p_limit INTEGER DEFAULT 100,
            p_offset INTEGER DEFAULT 0
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_filial_id UUID := p_filial_id;
        BEGIN
            IF v_filial_id IS NULL THEN
                SELECT caixa.filial_id INTO v_filial_id
                FROM caixas caixa
                WHERE caixa.ativo
                  AND tenant_usuario_pode_acessar_filial(caixa.filial_id, FALSE)
                ORDER BY caixa.criado_em
                LIMIT 1;
            END IF;
            IF v_filial_id IS NULL OR NOT tenant_usuario_pode_acessar_filial(v_filial_id, FALSE) THEN
                RAISE EXCEPTION 'Acesso negado a filial';
            END IF;

            RETURN COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', venda.id,
                    'cliente', COALESCE(venda.cliente_nome, cliente.nome, 'Cliente Avulso'),
                    'valor', venda.valor_total,
                    'metodo', venda.metodo_pagamento,
                    'status', venda.status,
                    'vendedor_id', venda.vendedor_id,
                    'vendedor_nome', venda.vendedor_nome,
                    'criado_em', venda.criado_em,
                    'data_venda', venda.data_venda
                ) ORDER BY venda.data_venda DESC, venda.criado_em DESC, venda.id DESC)
                FROM (
                    SELECT * FROM vendas venda_interna
                    WHERE venda_interna.filial_id = v_filial_id
                      AND (p_data IS NULL OR venda_interna.data_venda = p_data)
                      AND venda_interna.deleted_at IS NULL
                      AND (p_busca IS NULL OR venda_interna.id::TEXT ILIKE '%%' || p_busca || '%%')
                    ORDER BY venda_interna.data_venda DESC, venda_interna.criado_em DESC, venda_interna.id DESC
                    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500))
                    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
                ) venda
                LEFT JOIN clientes cliente ON cliente.id = venda.cliente_id
            ), '[]'::JSONB);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format($sql$
        DROP FUNCTION IF EXISTS %I.tenant_processar_venda(UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID);
        CREATE OR REPLACE FUNCTION %I.tenant_processar_venda(
            p_cliente_id UUID,
            p_cliente_nome TEXT,
            p_itens JSONB,
            p_vendedor_id UUID DEFAULT NULL,
            p_vendedor_nome TEXT DEFAULT NULL,
            p_metodo_pagamento TEXT DEFAULT 'dinheiro',
            p_valor_total NUMERIC DEFAULT 0,
            p_desconto NUMERIC DEFAULT 0,
            p_emitir_nfe BOOLEAN DEFAULT FALSE,
            p_canal_venda_id UUID DEFAULT NULL,
            p_filial_id UUID DEFAULT NULL,
            p_caixa_id UUID DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_cliente_id UUID := p_cliente_id;
            v_venda_id UUID;
            v_sessao_id UUID;
            v_filial_id UUID := p_filial_id;
            v_caixa_id UUID := p_caixa_id;
            v_item RECORD;
            v_estoque_atual INTEGER;
            v_total_calculado NUMERIC := 0;
            v_total_final NUMERIC;
            v_data DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
        BEGIN
            IF jsonb_typeof(p_itens) IS DISTINCT FROM 'array' OR jsonb_array_length(p_itens) = 0 THEN
                RAISE EXCEPTION 'A venda deve possuir ao menos um item';
            END IF;
            IF v_filial_id IS NULL OR v_caixa_id IS NULL THEN
                SELECT caixa.filial_id, caixa.id INTO v_filial_id, v_caixa_id
                FROM caixas caixa
                WHERE caixa.ativo
                  AND tenant_usuario_pode_acessar_filial(caixa.filial_id, FALSE)
                ORDER BY caixa.criado_em
                LIMIT 1;
            END IF;
            IF v_filial_id IS NULL OR NOT tenant_usuario_pode_acessar_filial(v_filial_id, FALSE) THEN
                RAISE EXCEPTION 'Acesso negado a filial';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM caixas WHERE id = v_caixa_id AND filial_id = v_filial_id AND ativo) THEN
                RAISE EXCEPTION 'Caixa nao pertence a filial';
            END IF;

            IF v_cliente_id IS NULL AND BTRIM(COALESCE(p_cliente_nome, '')) <> '' THEN
                SELECT id INTO v_cliente_id FROM clientes WHERE nome = p_cliente_nome AND deleted_at IS NULL LIMIT 1;
                IF v_cliente_id IS NULL THEN
                    INSERT INTO clientes (nome, funil_fase, status)
                    VALUES (p_cliente_nome, 'lead', 'ativo') RETURNING id INTO v_cliente_id;
                END IF;
            END IF;
            IF v_cliente_id IS NULL THEN
                RAISE EXCEPTION 'Cliente nao identificado';
            END IF;

            FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS item(produto_id UUID, qtd INTEGER, preco NUMERIC) LOOP
                IF v_item.produto_id IS NULL OR v_item.qtd IS NULL OR v_item.qtd <= 0 OR v_item.preco IS NULL OR v_item.preco < 0 THEN
                    RAISE EXCEPTION 'Item de venda invalido';
                END IF;
                SELECT quantidade INTO v_estoque_atual FROM estoque WHERE id = v_item.produto_id FOR UPDATE;
                IF NOT FOUND OR v_estoque_atual < v_item.qtd THEN
                    RAISE EXCEPTION 'Estoque insuficiente para o produto';
                END IF;
                v_total_calculado := v_total_calculado + (v_item.qtd * v_item.preco);
            END LOOP;
            v_total_final := GREATEST(0, v_total_calculado - COALESCE(p_desconto, 0));

            SELECT id INTO v_sessao_id FROM caixa_sessoes
            WHERE caixa_id = v_caixa_id AND data_operacional = v_data
            FOR UPDATE;
            IF v_sessao_id IS NULL THEN
                INSERT INTO caixa_sessoes (caixa_id, data_operacional, aberto_por, valor_abertura)
                VALUES (v_caixa_id, v_data, auth.uid(), 0) RETURNING id INTO v_sessao_id;
            ELSIF NOT EXISTS (SELECT 1 FROM caixa_sessoes WHERE id = v_sessao_id AND status IN ('aberto', 'reaberto')) THEN
                RAISE EXCEPTION 'Caixa fechado para esta data';
            END IF;

            INSERT INTO vendas (
                cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total,
                desconto_aplicado, metodo_pagamento, status, data_venda, filial_id, caixa_id
            ) VALUES (
                v_cliente_id, p_cliente_nome, p_vendedor_id, p_vendedor_nome, v_total_final,
                COALESCE(p_desconto, 0), p_metodo_pagamento, 'concluido', v_data, v_filial_id, v_caixa_id
            ) RETURNING id INTO v_venda_id;

            FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS item(produto_id UUID, qtd INTEGER, preco NUMERIC) LOOP
                INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
                VALUES (v_venda_id, v_item.produto_id, v_item.qtd, v_item.preco);
                UPDATE estoque SET quantidade = quantidade - v_item.qtd, atualizado_em = NOW() WHERE id = v_item.produto_id;
            END LOOP;

            INSERT INTO caixa_movimentos (sessao_id, tipo, valor, forma_pagamento, origem_tipo, origem_id, descricao, criado_por)
            VALUES (v_sessao_id, 'entrada', v_total_final, p_metodo_pagamento, 'venda', v_venda_id, 'Venda #' || SUBSTRING(v_venda_id::TEXT FROM 1 FOR 8), auth.uid());

            RETURN jsonb_build_object('success', TRUE, 'venda_id', v_venda_id, 'total', v_total_final, 'sessao_id', v_sessao_id);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema, p_schema);

    EXECUTE format($sql$
        CREATE OR REPLACE FUNCTION %I.tenant_cancelar_venda(p_venda_id UUID)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = %I, pg_temp
        AS $func$
        DECLARE
            v_venda vendas%%ROWTYPE;
            v_sessao_id UUID;
            v_item RECORD;
        BEGIN
            SELECT * INTO v_venda FROM vendas WHERE id = p_venda_id FOR UPDATE;
            IF NOT FOUND THEN RAISE EXCEPTION 'Venda nao encontrada'; END IF;
            IF NOT tenant_usuario_pode_acessar_filial(v_venda.filial_id, FALSE) THEN RAISE EXCEPTION 'Acesso negado a filial'; END IF;
            IF LOWER(v_venda.status) = 'cancelado' THEN RAISE EXCEPTION 'Esta venda ja esta cancelada'; END IF;

            SELECT id INTO v_sessao_id FROM caixa_sessoes WHERE caixa_id = v_venda.caixa_id AND data_operacional = v_venda.data_venda FOR UPDATE;
            IF v_sessao_id IS NULL THEN RAISE EXCEPTION 'Sessao de caixa da venda nao encontrada'; END IF;
            IF NOT EXISTS (SELECT 1 FROM caixa_sessoes WHERE id = v_sessao_id AND status IN ('aberto', 'reaberto')) THEN RAISE EXCEPTION 'Caixa fechado; solicite reabertura'; END IF;

            UPDATE vendas SET status = 'cancelado', atualizado_em = NOW() WHERE id = p_venda_id;
            FOR v_item IN SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = p_venda_id LOOP
                UPDATE estoque SET quantidade = quantidade + v_item.quantidade, atualizado_em = NOW() WHERE id = v_item.produto_id;
            END LOOP;
            INSERT INTO caixa_movimentos (sessao_id, tipo, valor, forma_pagamento, origem_tipo, origem_id, descricao, criado_por)
            VALUES (v_sessao_id, 'estorno', v_venda.valor_total, v_venda.metodo_pagamento, 'devolucao', p_venda_id, 'Cancelamento da venda #' || SUBSTRING(p_venda_id::TEXT FROM 1 FOR 8), auth.uid());
            RETURN jsonb_build_object('success', TRUE, 'venda_id', p_venda_id);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
        END;
        $func$
    $sql$, p_schema, p_schema);

    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC, anon, authenticated', p_schema);
    EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO service_role', p_schema);
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_caixa_diario(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('caixa_diario', 80, 'public.provisionar_hook_caixa_diario(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem,
    hook_function = EXCLUDED.hook_function,
    ativo = TRUE;

DO $$
DECLARE
    v_schema TEXT;
BEGIN
    FOR v_schema IN
        SELECT empresa.schema_name
        FROM public.empresas empresa
        WHERE empresa.schema_name LIKE 'tenant\_%'
          AND to_regnamespace(empresa.schema_name) IS NOT NULL
        ORDER BY empresa.schema_name
    LOOP
        PERFORM public.provisionar_hook_caixa_diario(v_schema);
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.tenant_listar_vendas(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.tenant_listar_vendas(INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.tenant_processar_venda(UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS public.tenant_cancelar_venda(UUID);

CREATE OR REPLACE FUNCTION public.tenant_listar_contextos_caixa()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_listar_contextos_caixa()', v_schema) INTO v_result;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_abrir_caixa(p_filial_id UUID, p_caixa_id UUID, p_valor_abertura NUMERIC DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_abrir_caixa($1,$2,$3)', v_schema) INTO v_result USING p_filial_id, p_caixa_id, p_valor_abertura;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_obter_resumo_caixa(p_filial_id UUID, p_caixa_id UUID, p_data DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_obter_resumo_caixa($1,$2,$3)', v_schema) INTO v_result USING p_filial_id, p_caixa_id, p_data;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_registrar_movimento_caixa(p_filial_id UUID, p_caixa_id UUID, p_tipo TEXT, p_valor NUMERIC, p_forma_pagamento TEXT, p_motivo TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_registrar_movimento_caixa($1,$2,$3,$4,$5,$6)', v_schema) INTO v_result USING p_filial_id, p_caixa_id, p_tipo, p_valor, p_forma_pagamento, p_motivo;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_fechar_caixa(p_filial_id UUID, p_caixa_id UUID, p_data DATE, p_valores_contados JSONB, p_observacao TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_fechar_caixa($1,$2,$3,$4,$5)', v_schema) INTO v_result USING p_filial_id, p_caixa_id, p_data, p_valores_contados, p_observacao;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_reabrir_caixa(p_fechamento_id UUID, p_motivo TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_reabrir_caixa($1,$2)', v_schema) INTO v_result USING p_fechamento_id, p_motivo;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_listar_vendas(
    p_filial_id UUID DEFAULT NULL,
    p_data DATE DEFAULT NULL,
    p_busca TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_listar_vendas($1,$2,$3,$4,$5)', v_schema) INTO v_result USING p_filial_id, p_data, p_busca, p_limit, p_offset;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_processar_venda(
    p_cliente_id UUID,
    p_cliente_nome TEXT,
    p_itens JSONB,
    p_vendedor_id UUID DEFAULT NULL,
    p_vendedor_nome TEXT DEFAULT NULL,
    p_metodo_pagamento TEXT DEFAULT 'dinheiro',
    p_valor_total NUMERIC DEFAULT 0,
    p_desconto NUMERIC DEFAULT 0,
    p_emitir_nfe BOOLEAN DEFAULT FALSE,
    p_canal_venda_id UUID DEFAULT NULL,
    p_filial_id UUID DEFAULT NULL,
    p_caixa_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_processar_venda($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', v_schema)
    INTO v_result USING p_cliente_id, p_cliente_nome, p_itens, p_vendedor_id, p_vendedor_nome, p_metodo_pagamento, p_valor_total, p_desconto, p_emitir_nfe, p_canal_venda_id, p_filial_id, p_caixa_id;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM); END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_cancelar_venda(p_venda_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB;
BEGIN
    SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id = profile.empresa_id WHERE profile.user_id = auth.uid() LIMIT 1;
    IF v_schema IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Tenant nao identificado'); END IF;
    EXECUTE format('SELECT %I.tenant_cancelar_venda($1)', v_schema) INTO v_result USING p_venda_id;
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM); END;
$$;

REVOKE ALL ON FUNCTION public.tenant_listar_contextos_caixa() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_abrir_caixa(UUID, UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_obter_resumo_caixa(UUID, UUID, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_registrar_movimento_caixa(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_fechar_caixa(UUID, UUID, DATE, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_reabrir_caixa(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_listar_vendas(UUID, DATE, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_processar_venda(UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_cancelar_venda(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.tenant_listar_contextos_caixa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_abrir_caixa(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_obter_resumo_caixa(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_registrar_movimento_caixa(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_fechar_caixa(UUID, UUID, DATE, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_reabrir_caixa(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_listar_vendas(UUID, DATE, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_processar_venda(UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_cancelar_venda(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';