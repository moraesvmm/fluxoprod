-- Script para limpar dados fictícios dos módulos do Supabase
-- Mantém empresas, usuários e configurações base intactos
-- Limpa dados do schema específico da empresa vidanovaimobiliaria

-- LIMPAR DADOS FICTÍCIOS DO SCHEMA tenant_vidanovaimobiliria_c19798
-- Tabelas existentes: vendas, clientes, vendas_itens, funcionarios, regras_comissao, comissoes, produtos, estoque

DELETE FROM tenant_vidanovaimobiliria_c19798.vendas;
DELETE FROM tenant_vidanovaimobiliria_c19798.vendas_itens;
DELETE FROM tenant_vidanovaimobiliria_c19798.clientes;
DELETE FROM tenant_vidanovaimobiliria_c19798.funcionarios;
DELETE FROM tenant_vidanovaimobiliria_c19798.regras_comissao;
DELETE FROM tenant_vidanovaimobiliria_c19798.comissoes;
DELETE FROM tenant_vidanovaimobiliria_c19798.produtos;
DELETE FROM tenant_vidanovaimobiliria_c19798.estoque;

-- Limpar logs de provisionamento antigos (opcional)
DELETE FROM public.logs_provisionamento WHERE criado_em < NOW() - INTERVAL '7 days';

-- VERIFICAÇÃO APÓS LIMPEZA

-- Verificar empresas existentes (devem permanecer intactas)
SELECT id, razao_social, cnpj, schema_name, status FROM public.empresas;

-- Verificar usuários existentes (devem permanecer intactos)
SELECT up.user_id, up.empresa_id, up.role, up.criado_em, e.razao_social 
FROM public.user_profiles up 
LEFT JOIN public.empresas e ON up.empresa_id = e.id
ORDER BY up.criado_em DESC;

-- Verificar módulos ativos por empresa (devem permanecer intactos)
SELECT em.empresa_id, e.razao_social, em.modulo_key, em.ativo 
FROM public.empresa_modulos em
JOIN public.empresas e ON em.empresa_id = e.id
WHERE em.ativo = true
ORDER BY e.razao_social, em.modulo_key;
