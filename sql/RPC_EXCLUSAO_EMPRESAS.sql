-- ==========================================
-- RPC DE EXCLUSÃO COMPLETA DE EMPRESAS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar RPC para exclusão completa de empresas (destrutiva)
-- Apenas usuário-master pode executar

-- ==========================================
-- RPC deletar_empresa_master
-- ==========================================
CREATE OR REPLACE FUNCTION public.deletar_empresa_master(
  p_empresa_id uuid,
  p_confirmacao_exclusao boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name TEXT;
  v_razao_social TEXT;
  v_cnpj TEXT;
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_schema_count INTEGER;
  v_logs_count INTEGER;
BEGIN
  -- 1. Verificar se usuário está autenticado
  IF v_user_id IS NULL THEN
    RETURN json_build_object('status', 'error', 'message', 'Usuário não autenticado');
  END IF;

  -- 2. Verificar se usuário é master
  SELECT role INTO v_user_role
  FROM public.user_profiles
  WHERE user_id = v_user_id;

  IF v_user_role IS NULL OR v_user_role != 'master' THEN
    RETURN json_build_object('status', 'error', 'message', 'Apenas usuário-master pode excluir empresas');
  END IF;

  -- 3. Verificar confirmação explícita
  IF NOT p_confirmacao_exclusao THEN
    RETURN json_build_object('status', 'error', 'message', 'Confirmação de exclusão não fornecida. Set p_confirmacao_exclusao=true para confirmar.');
  END IF;

  -- 4. Obter dados da empresa
  SELECT schema_name, razao_social, cnpj INTO v_schema_name, v_razao_social, v_cnpj
  FROM public.empresas
  WHERE id = p_empresa_id;

  IF v_schema_name IS NULL THEN
    RETURN json_build_object('status', 'error', 'message', 'Empresa não encontrada');
  END IF;

  -- 5. Proteger empresa master (não pode ser excluída)
  IF v_schema_name = 'public' OR v_cnpj = '00.000.000/0001-00' THEN
    RETURN json_build_object('status', 'error', 'message', 'Empresa master não pode ser excluída');
  END IF;

  -- 6. Verificar se schema existe
  SELECT COUNT(*) INTO v_schema_count
  FROM information_schema.schemata
  WHERE schema_name = v_schema_name;

  IF v_schema_count = 0 THEN
    RETURN json_build_object('status', 'error', 'message', 'Schema da empresa não encontrado');
  END IF;

  -- 7. Iniciar transação de exclusão
  BEGIN
    -- 7.1. Remover módulos da empresa
    DELETE FROM public.empresa_modulos
    WHERE empresa_id = p_empresa_id;

    -- 7.2. Remover perfis de usuário da empresa
    DELETE FROM public.user_profiles
    WHERE empresa_id = p_empresa_id;

    -- 7.3. Deletar schema da empresa (CASCADE deleta todas as tabelas)
    EXECUTE format('DROP SCHEMA %I CASCADE;', v_schema_name);

    -- 7.4. Remover logs de provisionamento
    DELETE FROM public.logs_provisionamento
    WHERE empresa_id = p_empresa_id;

    -- 7.5. Remover empresa da tabela master
    DELETE FROM public.empresas
    WHERE id = p_empresa_id;

    -- 8. Log de sucesso
    INSERT INTO public.logs_provisionamento (empresa_id, schema_name, status, mensagem)
    VALUES (p_empresa_id, v_schema_name, 'deleted', 'Empresa e schema excluídos completamente por usuário-master');

    RETURN json_build_object(
      'status', 'success',
      'empresa_id', p_empresa_id,
      'schema_name', v_schema_name,
      'razao_social', v_razao_social,
      'message', 'Empresa, schema e todos os dados relacionados excluídos com sucesso.'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log de erro
    INSERT INTO public.logs_provisionamento (empresa_id, schema_name, status, mensagem)
    VALUES (p_empresa_id, v_schema_name, 'error', SQLERRM);

    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
  END;
END;
$$;

-- Configurar permissões da RPC
REVOKE ALL ON FUNCTION public.deletar_empresa_master(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deletar_empresa_master(UUID, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.deletar_empresa_master(UUID, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deletar_empresa_master(UUID, BOOLEAN) TO service_role;

-- ==========================================
-- FIM DA RPC DE EXCLUSÃO
-- ==========================================
