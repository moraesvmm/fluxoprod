-- Verificar módulos ativos da empresa vidanovaimobiliaria
SELECT em.empresa_id, e.razao_social, em.modulo_key, em.ativo 
FROM public.empresa_modulos em
JOIN public.empresas e ON em.empresa_id = e.id
WHERE em.empresa_id = '25af1d7c-4408-4a02-bba7-c9a366f6c888'
ORDER BY em.modulo_key;

-- Verificar catálogo de módulos disponíveis
SELECT key, nome, descricao FROM public.modulos_catalogo ORDER BY key;
