-- Remove a sobrecarga legada de provisionamento.
-- Com duas versoes publicadas, o PostgREST nao resolve a chamada de 7 argumentos
-- do cadastro e a versao antiga ainda ignorava os hooks de provisionamento.

DROP FUNCTION IF EXISTS public.provisionar_empresa_master(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]);

REVOKE ALL ON FUNCTION public.provisionar_empresa(TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'provisionar_empresa_master'
  ) <> 1 THEN
    RAISE EXCEPTION 'provisionar_empresa_master deve ter exatamente uma assinatura publicada';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
