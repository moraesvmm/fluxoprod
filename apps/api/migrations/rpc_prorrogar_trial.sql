-- ==========================================
-- RPC PRORROGAR TRIAL DE EMPRESAS
-- ==========================================
-- Apenas usuário-master pode executar

CREATE OR REPLACE FUNCTION public.mestre_prorrogar_trial_empresa(
  p_empresa_id uuid,
  p_dias_trial int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_nova_data_vencimento TIMESTAMPTZ;
  v_criado_em TIMESTAMPTZ;
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
    RETURN json_build_object('status', 'error', 'message', 'Apenas usuário-master pode alterar o trial de empresas');
  END IF;

  -- 3. Obter data de criacao da empresa
  SELECT criado_em INTO v_criado_em
  FROM public.empresas
  WHERE id = p_empresa_id;

  IF v_criado_em IS NULL THEN
    RETURN json_build_object('status', 'error', 'message', 'Empresa não encontrada');
  END IF;

  -- 4. Definir a nova data de vencimento
  IF p_dias_trial >= 9999 THEN
    v_nova_data_vencimento := '2099-12-31 23:59:59'::TIMESTAMPTZ;
  ELSE
    -- O cálculo se dá a partir da data de criação original (para não inflacionar dias a partir do dia atual toda vez que recarregar)
    -- Alternativa seria calcular a partir de CURRENT_TIMESTAMP se quisermos "mais N dias a partir de hoje"
    -- Como a instrução diz "de 7 para 14 ou 21", então é sobre a data de criação.
    v_nova_data_vencimento := v_criado_em + (p_dias_trial || ' days')::interval;
  END IF;

  -- 5. Atualizar empresa
  UPDATE public.empresas
  SET data_vencimento = v_nova_data_vencimento,
      status = 'ativo',
      subscription_status = 'TRIAL'
  WHERE id = p_empresa_id;

  RETURN json_build_object(
    'status', 'success',
    'message', 'Período de trial atualizado com sucesso.',
    'nova_data', v_nova_data_vencimento
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'status', 'error',
    'message', SQLERRM
  );
END;
$$;

-- Permissoes
REVOKE ALL ON FUNCTION public.mestre_prorrogar_trial_empresa(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mestre_prorrogar_trial_empresa(UUID, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.mestre_prorrogar_trial_empresa(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mestre_prorrogar_trial_empresa(UUID, INT) TO service_role;
