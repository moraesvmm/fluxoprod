/**
 * Lê apps/web/src/types/database.types.ts e gera SQL de verificação (schema public):
 * - Funções → pg_proc
 * - Tabelas → information_schema.tables (BASE TABLE)
 * - Views   → information_schema.tables (VIEW)
 *
 * Uso (na raiz do repositório):
 *   node scripts/generate-verify-sql-from-types.mjs
 *
 * Saída (sempre sobrescrita):
 *   apps/api/migrations/verify_public_functions_from_database_types.sql
 *   apps/api/migrations/verify_public_tables_from_database_types.sql
 *   apps/api/migrations/verify_public_views_from_database_types.sql
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const typesPath = path.join(root, "apps/web/src/types/database.types.ts");
const text = fs.readFileSync(typesPath, "utf8");
const lines = text.split(/\r?\n/);

/** Nomes de primeiro nível sob um bloco (indent 6), até linha que casa endLineTest */
function extractTopLevelKeys(startLineIdx, endLineTest) {
  const names = new Set();
  for (let i = startLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (endLineTest(line)) break;

    const mInline = line.match(/^\s{6}([a-z_][a-z0-9_]*):\s*\{/);
    if (mInline) {
      names.add(mInline[1]);
      continue;
    }
    const mPipe = line.match(/^\s{6}([a-z_][a-z0-9_]*):\s*\|\s*$/);
    if (mPipe) {
      names.add(mPipe[1]);
      continue;
    }
    const mBrace = line.match(/^\s{6}([a-z_][a-z0-9_]*):\s*\{\s*$/);
    if (mBrace) {
      names.add(mBrace[1]);
      continue;
    }
    const mBare = line.match(/^\s{6}([a-z_][a-z0-9_]*):\s*$/);
    if (mBare) {
      names.add(mBare[1]);
      continue;
    }
  }
  return names;
}

let tablesStart = -1;
let viewsStart = -1;
let functionsStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("    Tables: {")) tablesStart = i;
  if (lines[i].includes("    Views: {")) viewsStart = i;
  if (lines[i].includes("    Functions: {")) functionsStart = i;
}
if (tablesStart === -1 || viewsStart === -1 || functionsStart === -1) {
  throw new Error("Bloco Tables, Views ou Functions não encontrado em database.types.ts");
}

const tableNames = extractTopLevelKeys(tablesStart, (line) => /^\s{4}Views:\s*\{/.test(line));
const viewNames = extractTopLevelKeys(viewsStart, (line) => /^\s{4}Functions:\s*\{/.test(line));
const functionNames = extractTopLevelKeys(functionsStart, (line) => /^\s{4}Enums:\s*\{/.test(line));

function sqlHeader(title, total) {
  return `-- =============================================================================
-- VERIFICAÇÃO (somente leitura): ${title}
-- GERADO POR: node scripts/generate-verify-sql-from-types.mjs
-- NÃO EDITAR À MÃO — regenere após atualizar database.types.ts
-- Total: ${total} nomes
-- Executar: Supabase → SQL Editor
-- =============================================================================

`;
}

function valuesList(names) {
  const sorted = [...names].sort();
  return sorted.map((n) => `    ('${n.replace(/'/g, "''")}')`).join(",\n");
}

const tablesSql =
  sqlHeader("tabelas public esperadas em database.types.ts", tableNames.size) +
  `WITH expected(name) AS (
  VALUES
${valuesList(tableNames)}
),
live AS (
  SELECT table_name AS name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT
  e.name AS expected_table,
  EXISTS (SELECT 1 FROM live l WHERE l.name = e.name) AS present_in_db
FROM expected e
ORDER BY e.name;
`;

const viewsSql =
  sqlHeader("views public esperadas em database.types.ts", viewNames.size) +
  `WITH expected(name) AS (
  VALUES
${valuesList(viewNames)}
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
`;

const functionsSql =
  sqlHeader("funções public esperadas em database.types.ts", functionNames.size) +
  `WITH expected(name) AS (
  VALUES
${valuesList(functionNames)}
),
live AS (
  SELECT DISTINCT p.proname AS name
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')
)
SELECT
  e.name AS expected_function,
  EXISTS (SELECT 1 FROM live l WHERE l.name = e.name) AS present_in_db
FROM expected e
ORDER BY e.name;

-- Opcional: funções em public que NÃO estão no types (drift reverso)
-- SELECT l.name
-- FROM live l
-- WHERE NOT EXISTS (SELECT 1 FROM expected e WHERE e.name = l.name)
-- ORDER BY 1;
`;

const outDir = path.join(root, "apps/api/migrations");
fs.writeFileSync(path.join(outDir, "verify_public_tables_from_database_types.sql"), tablesSql, "utf8");
fs.writeFileSync(path.join(outDir, "verify_public_views_from_database_types.sql"), viewsSql, "utf8");
fs.writeFileSync(path.join(outDir, "verify_public_functions_from_database_types.sql"), functionsSql, "utf8");

console.error(
  `OK: tables=${tableNames.size}, views=${viewNames.size}, functions=${functionNames.size} → ${outDir}/verify_public_*`
);
