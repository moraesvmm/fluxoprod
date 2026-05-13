-- =============================================================================
-- VERIFICAÇÃO (somente leitura): views public esperadas em database.types.ts
-- GERADO POR: node scripts/generate-verify-sql-from-types.mjs
-- NÃO EDITAR À MÃO — regenere após atualizar database.types.ts
-- Total: 1 nomes
-- Executar: Supabase → SQL Editor
-- =============================================================================

WITH expected(name) AS (
  VALUES
    ('v_empresa_modulos')
),
live AS (
  SELECT table_name AS name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'VIEW'
)
SELECT
  e.name AS expected_view,
  EXISTS (SELECT 1 FROM live l WHERE l.name = e.name) AS present_in_db
FROM expected e
ORDER BY e.name;
