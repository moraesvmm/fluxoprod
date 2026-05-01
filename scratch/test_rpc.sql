DO $$
DECLARE
    v_schema_name TEXT;
    v_result JSONB;
BEGIN
    SELECT e.schema_name INTO v_schema_name
    FROM public.user_profiles up
    JOIN public.empresas e ON e.id = up.empresa_id
    WHERE up.email = 'admin@seufluxoerp.com.br' -- Ou qual for o email, ou pegando o primeiro ativo
    LIMIT 1;

    EXECUTE format('SELECT %I.tenant_dashboard_metricas()', v_schema_name)
    INTO v_result;

    RAISE NOTICE 'RESULTADO DA RPC: %', v_result;
END;
$$;
