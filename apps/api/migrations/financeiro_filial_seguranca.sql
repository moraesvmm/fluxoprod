-- Corrige escrita e conciliacao do financeiro com escopo obrigatorio de filial.

CREATE OR REPLACE FUNCTION public.provisionar_hook_financeiro_filial_seguranca(p_schema TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.validar_schema_tenant_provisionamento(p_schema);
  IF to_regclass(format('%I.financeiro', p_schema)) IS NULL THEN RAISE EXCEPTION 'Schema % nao possui financeiro', p_schema; END IF;

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION %I.tenant_atualizar_financeiro_filial(p_filial_id UUID,p_financeiro_id UUID,p_tipo TEXT,p_descricao TEXT,p_valor NUMERIC,p_data_vencimento DATE,p_status TEXT,p_categoria TEXT DEFAULT NULL)
    RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = %I, pg_temp AS $func$
    DECLARE v_id UUID;
    BEGIN
      IF NOT tenant_usuario_pode_acessar_filial(p_filial_id,FALSE) THEN RAISE EXCEPTION 'Acesso negado a filial'; END IF;
      IF BTRIM(COALESCE(p_descricao,''))='' OR p_valor<0 THEN RAISE EXCEPTION 'Lancamento financeiro invalido'; END IF;
      UPDATE financeiro SET tipo=p_tipo,descricao=p_descricao,valor=p_valor,data_vencimento=p_data_vencimento,status=p_status,categoria=p_categoria,atualizado_em=NOW() WHERE id=p_financeiro_id AND filial_id=p_filial_id AND deleted_at IS NULL RETURNING id INTO v_id;
      IF v_id IS NULL THEN RAISE EXCEPTION 'Lancamento nao encontrado nesta filial'; END IF;
      RETURN jsonb_build_object('success',TRUE,'financeiro_id',v_id);
    EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',FALSE,'error',SQLERRM); END;
    $func$
  $sql$,p_schema,p_schema);
  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION %I.tenant_excluir_financeiro_filial(p_filial_id UUID,p_financeiro_id UUID)
    RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = %I, pg_temp AS $func$
    DECLARE v_id UUID;
    BEGIN
      IF NOT tenant_usuario_pode_acessar_filial(p_filial_id,FALSE) THEN RAISE EXCEPTION 'Acesso negado a filial'; END IF;
      UPDATE financeiro SET deleted_at=NOW(),atualizado_em=NOW() WHERE id=p_financeiro_id AND filial_id=p_filial_id AND deleted_at IS NULL RETURNING id INTO v_id;
      IF v_id IS NULL THEN RAISE EXCEPTION 'Lancamento nao encontrado nesta filial'; END IF;
      RETURN jsonb_build_object('success',TRUE,'financeiro_id',v_id);
    EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',FALSE,'error',SQLERRM); END;
    $func$
  $sql$,p_schema,p_schema);
  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION %I.tenant_conciliar_financeiro_filial(p_filial_id UUID,p_conciliacoes JSONB)
    RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = %I, pg_temp AS $func$
    DECLARE v_item RECORD; v_total INTEGER := 0;
    BEGIN
      IF NOT tenant_usuario_pode_acessar_filial(p_filial_id,FALSE) THEN RAISE EXCEPTION 'Acesso negado a filial'; END IF;
      IF jsonb_typeof(p_conciliacoes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_conciliacoes)=0 THEN RAISE EXCEPTION 'Conciliacoes invalidas'; END IF;
      FOR v_item IN SELECT * FROM jsonb_to_recordset(p_conciliacoes) AS item(financeiro_id UUID,banco_transacao_id TEXT,banco_nome TEXT,data_conciliacao TIMESTAMPTZ) LOOP
        UPDATE financeiro SET conciliado=TRUE,banco_transacao_id=v_item.banco_transacao_id,banco_nome=COALESCE(v_item.banco_nome,'Extrato OFX'),data_conciliacao=COALESCE(v_item.data_conciliacao,NOW()),status='concluido',atualizado_em=NOW() WHERE id=v_item.financeiro_id AND filial_id=p_filial_id AND deleted_at IS NULL;
        IF NOT FOUND THEN RAISE EXCEPTION 'Lancamento nao encontrado nesta filial'; END IF;
        v_total := v_total + 1;
      END LOOP;
      RETURN jsonb_build_object('success',TRUE,'conciliados',v_total);
    EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',FALSE,'error',SQLERRM); END;
    $func$
  $sql$,p_schema,p_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_atualizar_financeiro_filial(UUID,UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,TEXT), %I.tenant_excluir_financeiro_filial(UUID,UUID), %I.tenant_conciliar_financeiro_filial(UUID,JSONB) FROM PUBLIC, anon, authenticated',p_schema,p_schema,p_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_atualizar_financeiro_filial(UUID,UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,TEXT), %I.tenant_excluir_financeiro_filial(UUID,UUID), %I.tenant_conciliar_financeiro_filial(UUID,JSONB) TO service_role',p_schema,p_schema,p_schema);
END;
$$;
REVOKE ALL ON FUNCTION public.provisionar_hook_financeiro_filial_seguranca(TEXT) FROM PUBLIC, anon, authenticated;
INSERT INTO public.provisionamento_hooks (hook_key,ordem,hook_function) VALUES ('financeiro_filial_seguranca',95,'public.provisionar_hook_financeiro_filial_seguranca(text)'::REGPROCEDURE) ON CONFLICT (hook_key) DO UPDATE SET ordem=EXCLUDED.ordem,hook_function=EXCLUDED.hook_function,ativo=TRUE;
DO $$ DECLARE v_schema TEXT; BEGIN FOR v_schema IN SELECT schema_name FROM public.empresas WHERE schema_name LIKE 'tenant\_%' AND to_regnamespace(schema_name) IS NOT NULL ORDER BY schema_name LOOP PERFORM public.provisionar_hook_financeiro_filial_seguranca(v_schema); END LOOP; END $$;

CREATE OR REPLACE FUNCTION public.tenant_atualizar_financeiro_filial(p_filial_id UUID,p_financeiro_id UUID,p_tipo TEXT,p_descricao TEXT,p_valor NUMERIC,p_data_vencimento DATE,p_status TEXT,p_categoria TEXT DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$ DECLARE v_schema TEXT; v_result JSONB; BEGIN SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id=profile.empresa_id WHERE profile.user_id=auth.uid() LIMIT 1; IF v_schema IS NULL THEN RETURN jsonb_build_object('error','Tenant nao identificado'); END IF; EXECUTE format('SELECT %I.tenant_atualizar_financeiro_filial($1,$2,$3,$4,$5,$6,$7,$8)',v_schema) INTO v_result USING p_filial_id,p_financeiro_id,p_tipo,p_descricao,p_valor,p_data_vencimento,p_status,p_categoria; RETURN v_result; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error',SQLERRM); END; $$;
CREATE OR REPLACE FUNCTION public.tenant_excluir_financeiro_filial(p_filial_id UUID,p_financeiro_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$ DECLARE v_schema TEXT; v_result JSONB; BEGIN SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id=profile.empresa_id WHERE profile.user_id=auth.uid() LIMIT 1; IF v_schema IS NULL THEN RETURN jsonb_build_object('error','Tenant nao identificado'); END IF; EXECUTE format('SELECT %I.tenant_excluir_financeiro_filial($1,$2)',v_schema) INTO v_result USING p_filial_id,p_financeiro_id; RETURN v_result; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error',SQLERRM); END; $$;
CREATE OR REPLACE FUNCTION public.tenant_conciliar_financeiro_filial(p_filial_id UUID,p_conciliacoes JSONB) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$ DECLARE v_schema TEXT; v_result JSONB; BEGIN SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id=profile.empresa_id WHERE profile.user_id=auth.uid() LIMIT 1; IF v_schema IS NULL THEN RETURN jsonb_build_object('error','Tenant nao identificado'); END IF; EXECUTE format('SELECT %I.tenant_conciliar_financeiro_filial($1,$2)',v_schema) INTO v_result USING p_filial_id,p_conciliacoes; RETURN v_result; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error',SQLERRM); END; $$;
REVOKE ALL ON FUNCTION public.tenant_atualizar_financeiro_filial(UUID,UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,TEXT),public.tenant_excluir_financeiro_filial(UUID,UUID),public.tenant_conciliar_financeiro_filial(UUID,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_financeiro_filial(UUID,UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,TEXT),public.tenant_excluir_financeiro_filial(UUID,UUID),public.tenant_conciliar_financeiro_filial(UUID,JSONB) TO authenticated;
DO $$
BEGIN
  IF to_regprocedure('public.tenant_listar_financeiro(integer,integer)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.tenant_listar_financeiro(INTEGER, INTEGER) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.tenant_listar_financeiro(INTEGER, INTEGER) TO authenticated;
  END IF;
  IF to_regprocedure('public.tenant_criar_financeiro(character varying,text,numeric,date,character varying,character varying)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.tenant_criar_financeiro(VARCHAR, TEXT, NUMERIC, DATE, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.tenant_atualizar_financeiro(uuid,character varying,text,numeric,date,character varying,character varying)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.tenant_atualizar_financeiro(UUID, VARCHAR, TEXT, NUMERIC, DATE, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.tenant_excluir_financeiro(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.tenant_excluir_financeiro(UUID) FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;
NOTIFY pgrst, 'reload schema';