-- Script para limpar dados fictícios dos módulos do Supabase
-- Mantém empresas, usuários e configurações base intactos
-- Limpa dados dos schemas específicos de cada empresa (tenant)

-- VERIFICAR SCHEMAS EXISTENTES
SELECT schema_name FROM public.empresas WHERE schema_name IS NOT NULL;

-- LIMPAR DADOS FICTÍCIOS DOS SCHEMAS ESPECÍFICOS
-- Substitua pelos nomes dos schemas que existem no seu banco

-- Exemplo para limpar dados do schema 'techsolutions' (se existir)
-- DELETE FROM techsolutions.vendas;
-- DELETE FROM techsolutions.vendas_itens;
-- DELETE FROM techsolutions.clientes;
-- DELETE FROM techsolutions.produtos;
-- DELETE FROM techsolutions.estoque;
-- DELETE FROM techsolutions.financeiro;
-- DELETE FROM techsolutions.funcionarios;
-- DELETE FROM techsolutions.ordens_servico;
-- DELETE FROM techsolutions.ordens_servico_itens;

-- Exemplo para limpar dados do schema 'vidanovaimobiliaria' (se existir)
-- DELETE FROM vidanovaimobiliaria.vendas;
-- DELETE FROM vidanovaimobiliaria.vendas_itens;
-- DELETE FROM vidanovaimobiliaria.clientes;
-- DELETE FROM vidanovaimobiliaria.produtos;
-- DELETE FROM vidanovaimobiliaria.estoque;
-- DELETE FROM vidanovaimobiliaria.financeiro;
-- DELETE FROM vidanovaimobiliaria.funcionarios;
-- DELETE FROM vidanovaimobiliaria.ordens_servico;
-- DELETE FROM vidanovaimobiliaria.ordens_servico_itens;

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
