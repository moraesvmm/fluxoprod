-- Publica o hook de estoque no fluxo transacional de criacao de empresas.
-- Execute depois de estoque_entradas_movimentacoes.sql.

CREATE OR REPLACE FUNCTION public.provisionar_empresa_master(
  p_empresa_id UUID,
  p_cnpj TEXT,
  p_razao_social TEXT,
  p_porte TEXT,
  p_segmento TEXT,
  p_schema_name TEXT,
  p_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_nome TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rpc JSON;
  v_invalid_modules TEXT[];
BEGIN
  IF p_schema_name IS NULL OR p_schema_name !~ '^[a-z][a-z0-9_]{1,63}$' THEN
    RAISE EXCEPTION 'schema_name invalido';
  END IF;

  SELECT array_agg(m)
  INTO v_invalid_modules
  FROM unnest(COALESCE(p_modules, ARRAY[]::TEXT[])) AS m
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.modulos_catalogo catalogo
    WHERE catalogo.key = m
  );

  IF v_invalid_modules IS NOT NULL THEN
    RAISE EXCEPTION 'Modulos invalidos no payload';
  END IF;

  INSERT INTO public.empresas (
    id, cnpj, razao_social, porte, segmento, schema_name
  ) VALUES (
    p_empresa_id, p_cnpj, p_razao_social, p_porte, p_segmento, p_schema_name
  );

  v_rpc := public.provisionar_empresa(p_schema_name);
  IF COALESCE(v_rpc->>'status', 'error') <> 'success' THEN
    RAISE EXCEPTION 'Falha ao criar schema tenant';
  END IF;

  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS nf_entrada VARCHAR(60)', p_schema_name);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8)', p_schema_name);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS cfop_padrao VARCHAR(4)', p_schema_name);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS origem INTEGER DEFAULT 0', p_schema_name);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', p_schema_name);
  EXECUTE format('ALTER TABLE %I.produtos ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT ''[]''::jsonb', p_schema_name);

  IF to_regprocedure('public.provisionar_estoque_movimentacoes(text)') IS NOT NULL THEN
    PERFORM public.provisionar_estoque_movimentacoes(p_schema_name);
  END IF;

  IF array_length(COALESCE(p_modules, ARRAY[]::TEXT[]), 1) > 0 THEN
    INSERT INTO public.empresa_modulos (empresa_id, modulo_key, ativo)
    SELECT p_empresa_id, m, TRUE
    FROM unnest(p_modules) AS m
    ON CONFLICT (empresa_id, modulo_key)
    DO UPDATE SET ativo = EXCLUDED.ativo, atualizado_em = NOW();
  END IF;

  INSERT INTO public.logs_provisionamento (empresa_id, schema_name, status, mensagem)
  VALUES (p_empresa_id, p_schema_name, 'success', 'Provisionamento transacional concluido');

  RETURN json_build_object(
    'status', 'success',
    'empresa_id', p_empresa_id,
    'schema_name', p_schema_name,
    'message', 'Empresa, schema e modulos provisionados com sucesso.'
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.logs_provisionamento (empresa_id, schema_name, status, mensagem)
  SELECT p_empresa_id, p_schema_name, 'error', SQLERRM
  FROM public.empresas
  WHERE id = p_empresa_id;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_empresa_master(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_empresa_master(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT) TO service_role;
