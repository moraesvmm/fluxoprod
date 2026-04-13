-- ==========================================
-- TESTES DE CONTRATO DE RPC (SQL-ONLY)
-- ==========================================
-- Este arquivo contém testes de contrato simplificados para validar as RPCs críticas do Fluxo ERP
-- Executar no SQL Editor do Supabase após configurar o ambiente
--
-- IMPORTANTE: Estes testes validam o CONTRATO das RPCs, não a UI
-- Eles testam parâmetros, tipos, respostas e cenários de erro

-- ==========================================
-- 1. RPC: public.provisionar_empresa_master
-- ==========================================
-- CONTRATO:
--   - p_empresa_id: UUID (obrigatório)
--   - p_cnpj: TEXT (obrigatório, formato CNPJ)
--   - p_razao_social: TEXT (obrigatório)
--   - p_porte: TEXT (opcional)
--   - p_segmento: TEXT (opcional)
--   - p_schema_name: TEXT (obrigatório, regex `[a-z][a-z0-9_]{2,62}`)
--   - p_modules: TEXT[] (opcional, array de chaves de módulos)
--
-- RETORNO: JSONB
--   - Sucesso: {status: 'success', empresa_id: UUID, schema_name: TEXT, message: TEXT}
--   - Erro: {status: 'error', message: TEXT}

-- TESTE 1.1: Chamada válida
SELECT public.provisionar_empresa_master(
  '11111111-1111-1111-1111-111111111111'::UUID,
  '12.345.678/0001-99',
  'Empresa Teste Ltda',
  'ME',
  'Construção',
  'tenant_teste_001',
  ARRAY['dashboard', 'crm', 'vendas']
) AS resultado;

-- Esperado: {status: 'success', empresa_id: '11111111-1111-1111-1111-111111111111', schema_name: 'tenant_teste_001', message: 'Empresa, schema e módulos provisionados com sucesso.'}

-- TESTE 1.2: Schema name inválido (formato incorreto)
SELECT public.provisionar_empresa_master(
  '22222222-2222-2222-2222-222222222222'::UUID,
  '12.345.678/0002-99',
  'Empresa Teste 2',
  'ME',
  'Construção',
  'Schema-Invalido-Com-Hifen',  -- Inválido: contém hífen
  ARRAY['dashboard']
) AS resultado;

-- Esperado: ERRO - schema_name inválido (deve ser [a-z][a-z0-9_]{2,62})

-- TESTE 1.3: Módulo inválido no payload
SELECT public.provisionar_empresa_master(
  '33333333-3333-3333-3333-333333333333'::UUID,
  '12.345.678/0003-99',
  'Empresa Teste 3',
  'ME',
  'Construção',
  'tenant_teste_003',
  ARRAY['modulo_inexistente']  -- Módulo não existe no catálogo
) AS resultado;

-- Esperado: ERRO - Módulos inválidos no payload: modulo_inexistente

-- ==========================================
-- LIMPEZA (OPCIONAL)
-- ==========================================

-- Limpar dados de teste
-- DELETE FROM public.empresas WHERE id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM public.empresas WHERE id = '22222222-2222-2222-2222-222222222222';
-- DELETE FROM public.empresas WHERE id = '33333333-3333-3333-3333-333333333333';

-- Limpar schema tenant de teste (CUIDADO: apaga todos os dados)
-- DROP SCHEMA IF EXISTS tenant_teste_001 CASCADE;
