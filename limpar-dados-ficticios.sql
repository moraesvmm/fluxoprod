-- Script para limpar dados fictícios dos módulos do Supabase
-- Mantém empresas, usuários e configurações base intactos

-- LIMPAR DADOS FICTÍCIOS DOS MÓDULOS

-- 1. Limpar dados de vendas (todas as empresas)
DELETE FROM public.vendas;
DELETE FROM public.vendas_itens;

-- 2. Limpar dados de clientes (todas as empresas)
DELETE FROM public.clientes;

-- 3. Limpar dados de transações financeiras (todas as empresas)
DELETE FROM public.transacoes_financeiras;

-- 4. Limpar dados de produtos (todas as empresas)
DELETE FROM public.produtos;

-- 5. Limpar dados de ordens de serviço (todas as empresas)
DELETE FROM public.ordens_servico_historico;
DELETE FROM public.ordens_servico;

-- 6. Limpar dados de obras (todas as empresas)
DELETE FROM public.obras;

-- 7. Limpar dados de comissões (todas as empresas)
DELETE FROM public.comissoes;

-- 8. Limpar dados de RH (todas as empresas)
DELETE FROM public.colaboradores;

-- 9. Limpar logs de provisionamento antigos (opcional)
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
