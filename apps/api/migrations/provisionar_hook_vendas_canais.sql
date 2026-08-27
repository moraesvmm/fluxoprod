-- Canais de venda e colunas fiscais de vendas nunca entraram no provisionamento base.
-- Tenants novos nasciam sem a tabela, quebrando a listagem de canais no PDV.

CREATE OR REPLACE FUNCTION public.provisionar_hook_vendas_canais(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.canais_venda (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            ativo BOOLEAN DEFAULT TRUE,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        );
    ', p_schema);

    IF to_regclass(format('%I.vendas', p_schema)) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS canal_venda_id UUID', p_schema);
        EXECUTE format('ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS nfe_chave VARCHAR(44)', p_schema);
        EXECUTE format('ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS nfe_xml_url TEXT', p_schema);
        EXECUTE format('ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS nfe_pdf_url TEXT', p_schema);
        EXECUTE format('ALTER TABLE %I.vendas ADD COLUMN IF NOT EXISTS nfe_protocolo TEXT', p_schema);

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = p_schema
              AND c.relname = 'vendas'
              AND con.conname = 'vendas_canal_venda_id_fkey'
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.vendas
                 ADD CONSTRAINT vendas_canal_venda_id_fkey
                 FOREIGN KEY (canal_venda_id) REFERENCES %I.canais_venda(id) ON DELETE SET NULL',
                p_schema, p_schema
            );
        END IF;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_hook_vendas_canais(TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('vendas_canais', 55, 'public.provisionar_hook_vendas_canais(text)'::REGPROCEDURE)
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
        PERFORM public.provisionar_hook_vendas_canais(v_schema);
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
