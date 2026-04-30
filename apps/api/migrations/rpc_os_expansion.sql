-- ==========================================
-- EXPANSAO DO MODULO DE ORDENS DE SERVICO (O.S.)
-- ==========================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- Verificar se a tabela base de OS existe no schema
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = r.schema_name AND table_name = 'ordens_servico') THEN
            -- 1. Garantir colunas base na ordens_servico
            EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS numero BIGSERIAL;', r.schema_name);
            EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS tempo_total_minutos INTEGER DEFAULT 0;', r.schema_name);
            EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS timer_iniciado_em TIMESTAMPTZ;', r.schema_name);
            EXECUTE format('ALTER TABLE %I.ordens_servico ADD COLUMN IF NOT EXISTS valor_servico NUMERIC(10, 2) DEFAULT 0;', r.schema_name);
            
            -- 2. Garantir coluna de custo nos itens da OS (se a tabela de itens existir)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = r.schema_name AND table_name = 'ordens_servico_itens') THEN
                EXECUTE format('ALTER TABLE %I.ordens_servico_itens ADD COLUMN IF NOT EXISTS valor_custo NUMERIC(10, 2) DEFAULT 0;', r.schema_name);
            END IF;
            
            -- 3. Índice para o número da OS
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_os_numero ON %I.ordens_servico(numero);', r.schema_name, r.schema_name);
        
        -- 4. Função para calcular lucro da OS
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_obter_lucro_os(p_os_id UUID)
            RETURNS JSONB AS $func$
            DECLARE
                v_total_venda NUMERIC;
                v_total_custo NUMERIC;
                v_mao_de_obra NUMERIC;
            BEGIN
                SELECT valor_orcamento INTO v_mao_de_obra FROM %I.ordens_servico WHERE id = p_os_id;
                
                SELECT 
                    COALESCE(SUM(subtotal), 0),
                    COALESCE(SUM(quantidade * valor_custo), 0)
                INTO v_total_venda, v_total_custo
                FROM %I.ordens_servico_itens
                WHERE ordem_servico_id = p_os_id;
                
                RETURN jsonb_build_object(
                    ''total_venda'', v_total_venda + v_mao_de_obra,
                    ''total_custo'', v_total_custo,
                    ''lucro'', (v_total_venda + v_mao_de_obra) - v_total_custo
                );
            END;
            $func$ LANGUAGE plpgsql;', r.schema_name, r.schema_name, r.schema_name);

        -- 5. Função para gerenciar Timer
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_gerenciar_timer_os(p_os_id UUID, p_acao TEXT)
            RETURNS VOID AS $func$
            BEGIN
                IF p_acao = ''iniciar'' THEN
                    UPDATE %I.ordens_servico SET timer_iniciado_em = NOW() WHERE id = p_os_id;
                ELSIF p_acao = ''parar'' THEN
                    UPDATE %I.ordens_servico 
                    SET tempo_total_minutos = tempo_total_minutos + EXTRACT(EPOCH FROM (NOW() - timer_iniciado_em))/60,
                        timer_iniciado_em = NULL 
                    WHERE id = p_os_id AND timer_iniciado_em IS NOT NULL;
                END IF;
            END;
            $func$ LANGUAGE plpgsql;', r.schema_name, r.schema_name, r.schema_name);
        END IF;
    END LOOP;
END $$;

-- 6. Wrappers Públicos
CREATE OR REPLACE FUNCTION public.tenant_obter_lucro_os(p_os_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_schema TEXT;
    v_result JSONB;
BEGIN
    SELECT e.schema_name INTO v_schema FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid();
    EXECUTE format('SELECT %I.tenant_obter_lucro_os($1)', v_schema) INTO v_result USING p_os_id;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.tenant_gerenciar_timer_os(p_os_id UUID, p_acao TEXT)
RETURNS VOID AS $$
DECLARE
    v_schema TEXT;
BEGIN
    SELECT e.schema_name INTO v_schema FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid();
    EXECUTE format('SELECT %I.tenant_gerenciar_timer_os($1, $2)', v_schema) USING p_os_id, p_acao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
