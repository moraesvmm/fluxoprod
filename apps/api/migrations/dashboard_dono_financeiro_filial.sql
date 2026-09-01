-- Dashboard do dono e financeiro por filial. A filtragem e a autorizacao vivem no banco.

CREATE OR REPLACE FUNCTION public.provisionar_hook_dashboard_dono_filial(p_schema TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_filial_id UUID;
BEGIN
  PERFORM public.validar_schema_tenant_provisionamento(p_schema);
  EXECUTE format('ALTER TABLE %I.financeiro ADD COLUMN IF NOT EXISTS filial_id UUID', p_schema);
  EXECUTE format('SELECT id FROM %I.locais_estoque WHERE ativo AND tipo IN (''filial'', ''loja'') ORDER BY criado_em LIMIT 1', p_schema) INTO v_filial_id;
  IF v_filial_id IS NULL THEN RAISE EXCEPTION 'Schema % nao possui filial ativa', p_schema; END IF;
  EXECUTE format('UPDATE %I.financeiro SET filial_id = $1 WHERE filial_id IS NULL', p_schema) USING v_filial_id;
  EXECUTE format('ALTER TABLE %I.financeiro ALTER COLUMN filial_id SET NOT NULL', p_schema);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=p_schema AND t.relname='financeiro' AND c.conname='financeiro_filial_id_fkey') THEN
    EXECUTE format('ALTER TABLE %I.financeiro ADD CONSTRAINT financeiro_filial_id_fkey FOREIGN KEY (filial_id) REFERENCES %I.locais_estoque(id) ON DELETE RESTRICT', p_schema, p_schema);
  END IF;
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_financeiro_filial ON %I.financeiro(filial_id, data_vencimento DESC) WHERE deleted_at IS NULL', p_schema, p_schema);

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION %I.tenant_listar_financeiro_filial(p_filial_id UUID DEFAULT NULL)
    RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = %I, pg_temp AS $func$
    DECLARE v_filial UUID := p_filial_id; v_role TEXT;
    BEGIN
      SELECT profile.role INTO v_role FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id=profile.empresa_id WHERE profile.user_id=auth.uid() AND empresa.schema_name=current_schema() LIMIT 1;
      IF v_role <> 'tenant_admin' THEN
        IF v_filial IS NULL THEN SELECT filial_id INTO v_filial FROM usuarios_filiais WHERE user_id=auth.uid() AND ativo ORDER BY filial_id LIMIT 1; END IF;
        IF v_filial IS NULL OR NOT tenant_usuario_pode_acessar_filial(v_filial, FALSE) THEN RAISE EXCEPTION 'Acesso negado a filial'; END IF;
      ELSIF v_filial IS NOT NULL AND NOT EXISTS (SELECT 1 FROM locais_estoque WHERE id=v_filial AND ativo AND tipo IN ('filial','loja')) THEN
        RAISE EXCEPTION 'Filial invalida';
      END IF;
      RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',f.id,'descricao',f.descricao,'valor',f.valor,'tipo',f.tipo,'categoria',f.categoria,'status',f.status,'criado_em',f.criado_em,'data_vencimento',f.data_vencimento,'filial_id',f.filial_id) ORDER BY f.data_vencimento DESC, f.criado_em DESC) FROM financeiro f WHERE f.deleted_at IS NULL AND (v_filial IS NULL OR f.filial_id=v_filial)), '[]'::JSONB);
    EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
    $func$
  $sql$, p_schema, p_schema);

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION %I.tenant_obter_dashboard_dono(p_filial_id UUID DEFAULT NULL)
    RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = %I, pg_temp AS $func$
    DECLARE v_filial UUID := p_filial_id; v_role TEXT; v_hoje DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    BEGIN
      SELECT profile.role INTO v_role FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id=profile.empresa_id WHERE profile.user_id=auth.uid() AND empresa.schema_name=current_schema() LIMIT 1;
      IF v_role <> 'tenant_admin' THEN
        IF v_filial IS NULL THEN SELECT filial_id INTO v_filial FROM usuarios_filiais WHERE user_id=auth.uid() AND ativo ORDER BY filial_id LIMIT 1; END IF;
        IF v_filial IS NULL OR NOT tenant_usuario_pode_acessar_filial(v_filial, FALSE) THEN RAISE EXCEPTION 'Acesso negado a filial'; END IF;
      END IF;
      RETURN jsonb_build_object(
        'faturamento_hoje', COALESCE((SELECT SUM(valor_total) FROM vendas WHERE deleted_at IS NULL AND lower(status) NOT LIKE 'cancel%%' AND data_venda=v_hoje AND (v_filial IS NULL OR filial_id=v_filial)),0),
        'faturamento_mes', COALESCE((SELECT SUM(valor_total) FROM vendas WHERE deleted_at IS NULL AND lower(status) NOT LIKE 'cancel%%' AND data_venda>=date_trunc('month',v_hoje)::DATE AND (v_filial IS NULL OR filial_id=v_filial)),0),
        'vendas_mes', COALESCE((SELECT COUNT(*) FROM vendas WHERE deleted_at IS NULL AND lower(status) NOT LIKE 'cancel%%' AND data_venda>=date_trunc('month',v_hoje)::DATE AND (v_filial IS NULL OR filial_id=v_filial)),0),
        'saldo_financeiro', COALESCE((SELECT SUM(CASE WHEN tipo IN ('receber','receita') THEN valor ELSE -valor END) FROM financeiro WHERE deleted_at IS NULL AND status IN ('pago','concluido') AND (v_filial IS NULL OR filial_id=v_filial)),0),
        'contas_vencidas', COALESCE((SELECT COUNT(*) FROM financeiro WHERE deleted_at IS NULL AND status IN ('pendente','atrasado') AND data_vencimento<v_hoje AND (v_filial IS NULL OR filial_id=v_filial)),0),
        'filial_id', v_filial,
        'visao', CASE WHEN v_filial IS NULL THEN 'geral' ELSE 'filial' END
      );
    EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
    $func$
  $sql$, p_schema, p_schema);
  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION %I.tenant_criar_financeiro_filial(p_filial_id UUID, p_tipo TEXT, p_descricao TEXT, p_valor NUMERIC, p_data_vencimento DATE, p_status TEXT, p_categoria TEXT DEFAULT NULL)
    RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = %I, pg_temp AS $func$
    DECLARE v_id UUID;
    BEGIN
      IF NOT tenant_usuario_pode_acessar_filial(p_filial_id, FALSE) THEN RAISE EXCEPTION 'Acesso negado a filial'; END IF;
      IF BTRIM(COALESCE(p_descricao,''))='' OR p_valor<0 THEN RAISE EXCEPTION 'Lancamento financeiro invalido'; END IF;
      INSERT INTO financeiro (filial_id,tipo,descricao,valor,data_vencimento,status,categoria) VALUES (p_filial_id,p_tipo,p_descricao,p_valor,p_data_vencimento,p_status,p_categoria) RETURNING id INTO v_id;
      RETURN jsonb_build_object('success',TRUE,'financeiro_id',v_id);
    EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',FALSE,'error',SQLERRM); END;
    $func$
  $sql$, p_schema, p_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_listar_financeiro_filial(UUID) FROM PUBLIC, anon, authenticated', p_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_obter_dashboard_dono(UUID) FROM PUBLIC, anon, authenticated', p_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.tenant_criar_financeiro_filial(UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,TEXT) FROM PUBLIC, anon, authenticated', p_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.tenant_listar_financeiro_filial(UUID), %I.tenant_obter_dashboard_dono(UUID), %I.tenant_criar_financeiro_filial(UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,TEXT) TO service_role', p_schema, p_schema, p_schema);
END;
$$;
REVOKE ALL ON FUNCTION public.provisionar_hook_dashboard_dono_filial(TEXT) FROM PUBLIC, anon, authenticated;
INSERT INTO public.provisionamento_hooks (hook_key,ordem,hook_function) VALUES ('dashboard_dono_filial',90,'public.provisionar_hook_dashboard_dono_filial(text)'::REGPROCEDURE) ON CONFLICT (hook_key) DO UPDATE SET ordem=EXCLUDED.ordem,hook_function=EXCLUDED.hook_function,ativo=TRUE;
DO $$ DECLARE v_schema TEXT; BEGIN FOR v_schema IN SELECT schema_name FROM public.empresas WHERE schema_name LIKE 'tenant\_%' AND to_regnamespace(schema_name) IS NOT NULL ORDER BY schema_name LOOP PERFORM public.provisionar_hook_dashboard_dono_filial(v_schema); END LOOP; END $$;

CREATE OR REPLACE FUNCTION public.tenant_listar_financeiro_filial(p_filial_id UUID DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB; BEGIN SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id=profile.empresa_id WHERE profile.user_id=auth.uid() LIMIT 1; IF v_schema IS NULL THEN RETURN jsonb_build_object('error','Tenant nao identificado'); END IF; EXECUTE format('SELECT %I.tenant_listar_financeiro_filial($1)',v_schema) INTO v_result USING p_filial_id; RETURN v_result; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error',SQLERRM); END;
$$;
CREATE OR REPLACE FUNCTION public.tenant_obter_dashboard_dono(p_filial_id UUID DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB; BEGIN SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id=profile.empresa_id WHERE profile.user_id=auth.uid() LIMIT 1; IF v_schema IS NULL THEN RETURN jsonb_build_object('error','Tenant nao identificado'); END IF; EXECUTE format('SELECT %I.tenant_obter_dashboard_dono($1)',v_schema) INTO v_result USING p_filial_id; RETURN v_result; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error',SQLERRM); END;
$$;
CREATE OR REPLACE FUNCTION public.tenant_criar_financeiro_filial(p_filial_id UUID,p_tipo TEXT,p_descricao TEXT,p_valor NUMERIC,p_data_vencimento DATE,p_status TEXT,p_categoria TEXT DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_schema TEXT; v_result JSONB; BEGIN SELECT empresa.schema_name INTO v_schema FROM public.user_profiles profile JOIN public.empresas empresa ON empresa.id=profile.empresa_id WHERE profile.user_id=auth.uid() LIMIT 1; IF v_schema IS NULL THEN RETURN jsonb_build_object('error','Tenant nao identificado'); END IF; EXECUTE format('SELECT %I.tenant_criar_financeiro_filial($1,$2,$3,$4,$5,$6,$7)',v_schema) INTO v_result USING p_filial_id,p_tipo,p_descricao,p_valor,p_data_vencimento,p_status,p_categoria; RETURN v_result; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error',SQLERRM); END;
$$;
REVOKE ALL ON FUNCTION public.tenant_listar_financeiro_filial(UUID), public.tenant_obter_dashboard_dono(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_criar_financeiro_filial(UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_listar_financeiro_filial(UUID), public.tenant_obter_dashboard_dono(UUID), public.tenant_criar_financeiro_filial(UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';