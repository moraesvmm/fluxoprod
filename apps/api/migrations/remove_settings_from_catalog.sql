-- Migration: Remover 'configuracoes' do catálogo de módulos (promovido a nativo)
-- Data: 28/04/2026
-- Objetivo: Limpar o catálogo e as flags de empresas, já que o acesso agora é garantido via código (Middleware/Sidebar).

-- 1. Remover do catálogo global
DELETE FROM public.modulos_catalogo 
WHERE key = 'configuracoes';

-- 2. Remover associações existentes para evitar confusão em auditorias
DELETE FROM public.empresa_modulos 
WHERE modulo_key = 'configuracoes';

-- NOTA: A tabela 'configuracoes' dentro dos schemas 'tenant_*' permanece intacta,
-- pois ela armazena os dados reais da empresa (CNPJ, Razão Social, etc).
