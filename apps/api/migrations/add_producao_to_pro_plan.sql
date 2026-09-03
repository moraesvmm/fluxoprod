-- Produção (MRP) é funcionalidade contratada exclusivamente pelo plano Pro.
INSERT INTO public.modulos_catalogo (key, nome, descricao)
VALUES ('producao', 'Produção (MRP)', 'Fichas técnicas e ordens de produção.')
ON CONFLICT (key) DO UPDATE
SET nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao;

UPDATE public.planos
SET modulos_incluidos = ARRAY(
    SELECT DISTINCT modulo_key
    FROM unnest(COALESCE(modulos_incluidos, ARRAY[]::TEXT[]) || ARRAY['producao']) AS modulo_key
    ORDER BY modulo_key
)
WHERE key = 'pro';

NOTIFY pgrst, 'reload schema';