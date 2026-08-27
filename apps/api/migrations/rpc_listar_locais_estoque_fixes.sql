-- Corrige a listagem de locais, que ordenava uma coluna fora do jsonb_agg.

DO $$
DECLARE
    tenant_schema RECORD;
BEGIN
    FOR tenant_schema IN
        SELECT e.schema_name
        FROM public.empresas e
        WHERE e.schema_name LIKE 'tenant_%'
          AND EXISTS (
              SELECT 1
              FROM information_schema.tables t
              WHERE t.table_schema = e.schema_name
                AND t.table_name = 'locais_estoque'
          )
    LOOP
        EXECUTE format($sql$
            CREATE OR REPLACE FUNCTION %I.tenant_listar_locais_estoque()
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I, pg_temp
            AS $func$
            DECLARE
                v_result JSONB;
            BEGIN
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', l.id,
                            'nome', l.nome,
                            'tipo', l.tipo,
                            'endereco', l.endereco,
                            'ativo', l.ativo,
                            'criado_em', l.criado_em
                        ) ORDER BY l.criado_em DESC
                    ),
                    '[]'::JSONB
                )
                INTO v_result
                FROM locais_estoque l
                WHERE l.ativo = TRUE;

                RETURN v_result;
            END;
            $func$;
        $sql$, tenant_schema.schema_name, tenant_schema.schema_name);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';