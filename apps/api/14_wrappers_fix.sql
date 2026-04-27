-- 1. tenant_atualizar_custo_produto
CREATE OR REPLACE FUNCTION public.tenant_atualizar_custo_produto(p_produto_id uuid, p_custo_unitario numeric, p_metodo_valoracao character varying DEFAULT 'custo_medio'::character varying, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_atualizar_custo_produto($1, $2, $3, $4)', v_schema_name) INTO v_result USING p_produto_id, p_custo_unitario, p_metodo_valoracao, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_custo_produto TO authenticated, anon, service_role;

-- 2. tenant_atualizar_demanda_real
CREATE OR REPLACE FUNCTION public.tenant_atualizar_demanda_real(p_previsao_id uuid, p_demanda_real integer, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_atualizar_demanda_real($1, $2, $3)', v_schema_name) INTO v_result USING p_previsao_id, p_demanda_real, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_atualizar_demanda_real TO authenticated, anon, service_role;

-- 3. tenant_buscar_produto_por_codigo
CREATE OR REPLACE FUNCTION public.tenant_buscar_produto_por_codigo(p_codigo character varying)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_buscar_produto_por_codigo($1)', v_schema_name) INTO v_result USING p_codigo;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_buscar_produto_por_codigo TO authenticated, anon, service_role;

-- 4. tenant_cancelar_transferencia
CREATE OR REPLACE FUNCTION public.tenant_cancelar_transferencia(p_transferencia_id uuid, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_cancelar_transferencia($1, $2)', v_schema_name) INTO v_result USING p_transferencia_id, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_cancelar_transferencia TO authenticated, anon, service_role;

-- 5. tenant_concluir_transferencia
CREATE OR REPLACE FUNCTION public.tenant_concluir_transferencia(p_transferencia_id uuid, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_concluir_transferencia($1, $2)', v_schema_name) INTO v_result USING p_transferencia_id, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_concluir_transferencia TO authenticated, anon, service_role;

-- 6. tenant_criar_kit
CREATE OR REPLACE FUNCTION public.tenant_criar_kit(p_produto_id uuid, p_nome character varying, p_descricao text, p_itens jsonb, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_criar_kit($1, $2, $3, $4, $5)', v_schema_name) INTO v_result USING p_produto_id, p_nome, p_descricao, p_itens, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_criar_kit TO authenticated, anon, service_role;

-- 7. tenant_criar_local_estoque
CREATE OR REPLACE FUNCTION public.tenant_criar_local_estoque(p_nome character varying, p_tipo character varying, p_endereco text, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_criar_local_estoque($1, $2, $3, $4)', v_schema_name) INTO v_result USING p_nome, p_tipo, p_endereco, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_criar_local_estoque TO authenticated, anon, service_role;

-- 8. tenant_criar_transferencia
CREATE OR REPLACE FUNCTION public.tenant_criar_transferencia(p_produto_id uuid, p_local_origem_id uuid, p_local_destino_id uuid, p_quantidade integer, p_observacao text, p_criado_por uuid, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_criar_transferencia($1, $2, $3, $4, $5, $6, $7)', v_schema_name) INTO v_result USING p_produto_id, p_local_origem_id, p_local_destino_id, p_quantidade, p_observacao, p_criado_por, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_criar_transferencia TO authenticated, anon, service_role;

-- 9. tenant_desativar_local_estoque
CREATE OR REPLACE FUNCTION public.tenant_desativar_local_estoque(p_local_id uuid, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_desativar_local_estoque($1, $2)', v_schema_name) INTO v_result USING p_local_id, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_desativar_local_estoque TO authenticated, anon, service_role;

-- 10. tenant_enviar_campanha
CREATE OR REPLACE FUNCTION public.tenant_enviar_campanha(p_cliente_ids uuid[], p_titulo text, p_mensagem text, p_tipo text DEFAULT 'email'::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_enviar_campanha($1, $2, $3, $4)', v_schema_name) INTO v_result USING p_cliente_ids, p_titulo, p_mensagem, p_tipo;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_enviar_campanha TO authenticated, anon, service_role;

-- 11. tenant_excluir_kit
CREATE OR REPLACE FUNCTION public.tenant_excluir_kit(p_kit_id uuid, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_excluir_kit($1, $2)', v_schema_name) INTO v_result USING p_kit_id, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_excluir_kit TO authenticated, anon, service_role;

-- 12. tenant_gerar_codigo_barras
CREATE OR REPLACE FUNCTION public.tenant_gerar_codigo_barras(p_produto_id uuid, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_gerar_codigo_barras($1, $2)', v_schema_name) INTO v_result USING p_produto_id, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_gerar_codigo_barras TO authenticated, anon, service_role;

-- 13. tenant_gerar_previsao_demanda
CREATE OR REPLACE FUNCTION public.tenant_gerar_previsao_demanda(p_produto_id uuid, p_dias_analise integer DEFAULT 30, p_dias_previsao integer DEFAULT 30, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_gerar_previsao_demanda($1, $2, $3, $4)', v_schema_name) INTO v_result USING p_produto_id, p_dias_analise, p_dias_previsao, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_gerar_previsao_demanda TO authenticated, anon, service_role;

-- 14. tenant_vender_kit
CREATE OR REPLACE FUNCTION public.tenant_vender_kit(p_kit_id uuid, p_quantidade integer DEFAULT 1, p_idempotency_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_schema_name TEXT; v_result JSONB;
BEGIN
    v_schema_name := (SELECT e.schema_name FROM public.user_profiles up JOIN public.empresas e ON e.id = up.empresa_id WHERE up.user_id = auth.uid() LIMIT 1);
    IF v_schema_name IS NULL OR v_schema_name = 'public' THEN RETURN '{"error": "Tenant não encontrado"}'::JSONB; END IF;
    EXECUTE format('SELECT %I.tenant_vender_kit($1, $2, $3)', v_schema_name) INTO v_result USING p_kit_id, p_quantidade, p_idempotency_key;
    RETURN COALESCE(v_result, '{"error": "Sem retorno"}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.tenant_vender_kit TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
