-- Migration: Criar RPC tenant_dashboard_metricas para KPIs avançados do CRM
-- Execute este script no Supabase SQL Editor com SERVICE_ROLE
-- Esta migration é idempotente e pode ser executada múltiplas vezes

DO $$
DECLARE
    tenant_schema RECORD;
BEGIN
    -- Iterar sobre todos os schemas tenant
    FOR tenant_schema IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- Criar RPC tenant_dashboard_metricas
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_dashboard_metricas()
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $func$
            DECLARE
                v_result JSONB;
                v_total_clientes INT;
                v_clientes_ativos INT;
                v_clientes_inativos_30d INT;
                v_ltv_medio NUMERIC;
                v_churn_rate NUMERIC;
                v_funil_counts JSONB;
                v_taxa_conversao JSONB;
                v_velocidade_media NUMERIC;
            BEGIN
                -- Total de clientes
                SELECT COUNT(*) INTO v_total_clientes
                FROM clientes
                WHERE deleted_at IS NULL;
                
                -- Clientes ativos
                SELECT COUNT(*) INTO v_clientes_ativos
                FROM clientes
                WHERE deleted_at IS NULL AND status = ''ativo'';
                
                -- Clientes inativos nos últimos 30 dias
                SELECT COUNT(*) INTO v_clientes_inativos_30d
                FROM clientes
                WHERE deleted_at IS NULL 
                    AND status IN (''inativo'', ''bloqueado'')
                    AND atualizado_em >= NOW() - INTERVAL ''30 days'';
                
                -- LTV médio (Lifetime Value - ticket médio total por cliente)
                SELECT COALESCE(AVG(total_gasto), 0) INTO v_ltv_medio
                FROM (
                    SELECT SUM(valor_total) as total_gasto
                    FROM vendas
                    WHERE deleted_at IS NULL AND status = ''concluido''
                    GROUP BY cliente_id
                ) as subquery;
                
                -- Churn rate mensal
                IF v_clientes_ativos > 0 THEN
                    v_churn_rate := (v_clientes_inativos_30d::NUMERIC / (v_clientes_ativos + v_clientes_inativos_30d)::NUMERIC) * 100;
                ELSE
                    v_churn_rate := 0;
                END IF;
                
                -- Contagem por fase do funil
                SELECT json_build_object(
                    ''lead'', COUNT(*) FILTER (WHERE funil_fase = ''lead''),
                    ''qualificado'', COUNT(*) FILTER (WHERE funil_fase = ''qualificado''),
                    ''proposta'', COUNT(*) FILTER (WHERE funil_fase = ''proposta''),
                    ''negociacao'', COUNT(*) FILTER (WHERE funil_fase = ''negociacao''),
                    ''fechado'', COUNT(*) FILTER (WHERE funil_fase = ''fechado''),
                    ''perdido'', COUNT(*) FILTER (WHERE funil_fase = ''perdido'')
                ) INTO v_funil_counts
                FROM clientes
                WHERE deleted_at IS NULL;
                
                -- Taxa de conversão por fase
                SELECT json_build_object(
                    ''lead_to_qualificado'', CASE 
                        WHEN (v_funil_counts->>''lead'')::INT > 0 
                        THEN ROUND(((v_funil_counts->>''qualificado'')::NUMERIC / (v_funil_counts->>''lead'')::NUMERIC) * 100, 2)
                        ELSE 0 
                    END,
                    ''qualificado_to_proposta'', CASE 
                        WHEN (v_funil_counts->>''qualificado'')::INT > 0 
                        THEN ROUND(((v_funil_counts->>''proposta'')::NUMERIC / (v_funil_counts->>''qualificado'')::NUMERIC) * 100, 2)
                        ELSE 0 
                    END,
                    ''proposta_to_negociacao'', CASE 
                        WHEN (v_funil_counts->>''proposta'')::INT > 0 
                        THEN ROUND(((v_funil_counts->>''negociacao'')::NUMERIC / (v_funil_counts->>''proposta'')::NUMERIC) * 100, 2)
                        ELSE 0 
                    END,
                    ''negociacao_to_fechado'', CASE 
                        WHEN (v_funil_counts->>''negociacao'')::INT > 0 
                        THEN ROUND(((v_funil_counts->>''fechado'')::NUMERIC / (v_funil_counts->>''negociacao'')::NUMERIC) * 100, 2)
                        ELSE 0 
                    END
                ) INTO v_taxa_conversao;
                
                -- Velocidade média do pipeline (dias entre lead e fechado)
                SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (atualizado_em - criado_em)) / 86400), 0) INTO v_velocidade_media
                FROM clientes
                WHERE deleted_at IS NULL 
                    AND funil_fase = ''fechado''
                    AND criado_em >= NOW() - INTERVAL ''90 days'';
                
                -- Montar resultado final
                v_result := json_build_object(
                    ''total_clientes'', v_total_clientes,
                    ''clientes_ativos'', v_clientes_ativos,
                    ''clientes_inativos_30d'', v_clientes_inativos_30d,
                    ''ltv_medio'', v_ltv_medio,
                    ''churn_rate'', v_churn_rate,
                    ''funil_counts'', v_funil_counts,
                    ''taxa_conversao'', v_taxa_conversao,
                    ''velocidade_media'', v_velocidade_media
                );
                
                RETURN v_result;
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION ''Erro ao calcular métricas do dashboard: %%'', SQLERRM;
            END;
            $func$;
        ', tenant_schema.schema_name, tenant_schema.schema_name);
        RAISE NOTICE 'RPC tenant_dashboard_metricas criada em %', tenant_schema.schema_name;
    END LOOP;
END $$;
