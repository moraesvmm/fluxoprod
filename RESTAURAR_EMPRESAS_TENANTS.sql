-- ==========================================
-- RESTAURAR EMPRESAS COM BASE EM SCHEMAS DE TENANTS
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar empresas para os schemas de tenants encontrados
-- Permissão: Use a service_role para executar este SQL

-- Criar empresas para os schemas de tenants encontrados
-- Isso irá inserir as empresas na tabela empresas para que possam ser visualizadas no módulo do usuário-master

INSERT INTO public.empresas (id, cnpj, razao_social, porte, segmento, schema_name, status, criado_em)
VALUES 
  (gen_random_uuid(), '00.000.000/0002-00', 'Tenant 00000000', 'ME', 'Tecnologia', 'tenant_00000000', 'ativo', now()),
  (gen_random_uuid(), '00.000.000/0003-00', 'Tenant 09000134', 'ME', 'Tecnologia', 'tenant_09000134', 'ativo', now()),
  (gen_random_uuid(), '00.000.000/0004-00', 'Tenant 33054c42', 'ME', 'Tecnologia', 'tenant_33054c42', 'ativo', now()),
  (gen_random_uuid(), '00.000.000/0005-00', 'Tech Solutions Ltda', 'ME', 'Tecnologia', 'tenant_techsolutionsltda_cd722c', 'ativo', now()),
  (gen_random_uuid(), '44.444.444/0001-44', 'Empresa Teste 4', 'ME', 'Tecnologia', 'tenant_test_4', 'ativo', now()),
  (gen_random_uuid(), '00.000.000/0007-00', 'Tenant Test Check', 'ME', 'Tecnologia', 'tenant_test_check', 'ativo', now()),
  (gen_random_uuid(), '00.000.000/0008-00', 'Tenant Test FF974F', 'ME', 'Tecnologia', 'tenant_test_ff974f', 'ativo', now()),
  (gen_random_uuid(), '00.000.000/0009-00', 'Vida Nova Imobiliária', 'ME', 'Imobiliária', 'tenant_vidanovaimobiliria_c19798', 'ativo', now())
ON CONFLICT (schema_name) DO UPDATE SET
  razao_social = EXCLUDED.razao_social,
  status = EXCLUDED.status;

-- Verificar se as empresas foram criadas
SELECT 
  id,
  cnpj,
  razao_social,
  porte,
  segmento,
  schema_name,
  status,
  criado_em
FROM public.empresas
ORDER BY criado_em DESC;
