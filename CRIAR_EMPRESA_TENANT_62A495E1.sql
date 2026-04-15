-- ==========================================
-- CRIAR EMPRESA PARA TENANT_62A495E1
-- ==========================================
-- Execute este SQL no painel do Supabase (SQL Editor)
-- Objetivo: Criar empresa correspondente ao schema tenant_62a495e1
-- Permissão: Use a service_role para executar este SQL

-- Criar empresa para o schema tenant_62a495e1
INSERT INTO public.empresas (id, cnpj, razao_social, porte, segmento, schema_name, status, criado_em)
VALUES 
  ('62a495e1-c499-4150-96c6-0144e7e7c04e', '00.000.000/0001-00', 'Tenant 62a495e1', 'ME', 'Tecnologia', 'tenant_62a495e1', 'ativo', now())
ON CONFLICT (id) DO UPDATE SET
  razao_social = EXCLUDED.razao_social,
  schema_name = EXCLUDED.schema_name,
  status = EXCLUDED.status;

-- Verificar se a empresa foi criada
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
WHERE schema_name = 'tenant_62a495e1';
