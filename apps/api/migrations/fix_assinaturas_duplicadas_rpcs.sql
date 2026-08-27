-- Remove sobrecargas antigas que sobreviveram a cada expansao de campos.
-- Com mais de uma versao publicada, um payload sem campos opcionais vira
-- subconjunto ambiguo e o PostgREST nao consegue escolher a funcao.

DROP FUNCTION IF EXISTS public.tenant_criar_produto(
  CHARACTER VARYING, TEXT, CHARACTER VARYING, NUMERIC, CHARACTER VARYING,
  NUMERIC, CHARACTER VARYING, INTEGER, INTEGER
);
DROP FUNCTION IF EXISTS public.tenant_criar_produto(
  TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, TEXT, INTEGER, INTEGER, JSONB
);

DROP FUNCTION IF EXISTS public.tenant_atualizar_produto(
  UUID, CHARACTER VARYING, TEXT, CHARACTER VARYING, NUMERIC,
  CHARACTER VARYING, NUMERIC, CHARACTER VARYING
);
DROP FUNCTION IF EXISTS public.tenant_atualizar_produto(
  UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, TEXT, INTEGER, JSONB
);

DROP FUNCTION IF EXISTS public.tenant_atualizar_cliente(
  UUID, CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING,
  CHARACTER VARYING, CHARACTER VARYING
);

DROP FUNCTION IF EXISTS public.tenant_atualizar_funcionario(
  UUID, CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING,
  CHARACTER VARYING, NUMERIC, CHARACTER VARYING
);

DROP FUNCTION IF EXISTS public.tenant_processar_venda(
  UUID, TEXT, JSONB, UUID, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER
);

DO $$
DECLARE
    v_duplicadas TEXT;
BEGIN
    SELECT string_agg(nome || ' (' || total || ')', ', ')
    INTO v_duplicadas
    FROM (
        SELECT p.proname AS nome, count(*) AS total
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'tenant_criar_produto',
              'tenant_atualizar_produto',
              'tenant_atualizar_cliente',
              'tenant_atualizar_funcionario',
              'tenant_processar_venda'
          )
        GROUP BY p.proname
        HAVING count(*) <> 1
    ) restantes;

    IF v_duplicadas IS NOT NULL THEN
        RAISE EXCEPTION 'Ainda existem assinaturas duplicadas: %', v_duplicadas;
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
