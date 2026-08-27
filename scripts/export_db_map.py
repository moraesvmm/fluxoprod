"""Exporta o mapa do banco e aponta divergencias contra o codigo.

Uso (raiz do repositorio):
    $env:DATABASE_URL = "postgresql://usuario:senha@host:5432/postgres"
    python scripts/export_db_map.py

Saidas:
    docs/diagnosticos/db-map.json
    docs/diagnosticos/db-drift.md
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "diagnosticos"
WEB_SOURCE_DIR = ROOT / "apps" / "web" / "src"
RPC_CALL_PATTERN = re.compile(r"""\.rpc\(\s*['"]([a-zA-Z0-9_]+)['"]""")


def fetch_all(cur, query, params=None):
    cur.execute(query, params or ())
    columns = [column.name for column in cur.description]
    return [dict(zip(columns, row)) for row in cur.fetchall()]


def collect_public_schema(cur):
    tables = fetch_all(cur, """
        SELECT c.relname AS tabela,
               c.relkind AS tipo,
               a.attname AS coluna,
               format_type(a.atttypid, a.atttypmod) AS tipo_coluna,
               a.attnotnull AS obrigatoria,
               pg_get_expr(d.adbin, d.adrelid) AS valor_padrao
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm')
        ORDER BY c.relname, a.attnum
    """)

    relations = defaultdict(lambda: {"tipo": None, "colunas": []})
    for row in tables:
        entry = relations[row["tabela"]]
        entry["tipo"] = {"r": "tabela", "v": "view", "m": "view_materializada"}[row["tipo"]]
        entry["colunas"].append({
            "nome": row["coluna"],
            "tipo": row["tipo_coluna"],
            "obrigatoria": row["obrigatoria"],
            "padrao": row["valor_padrao"],
        })

    constraints = fetch_all(cur, """
        SELECT c.relname AS tabela,
               con.conname AS nome,
               CASE con.contype WHEN 'p' THEN 'primary_key'
                                WHEN 'f' THEN 'foreign_key'
                                WHEN 'u' THEN 'unique'
                                WHEN 'c' THEN 'check' END AS tipo,
               pg_get_constraintdef(con.oid) AS definicao
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        ORDER BY c.relname, con.conname
    """)
    for row in constraints:
        relations[row["tabela"]].setdefault("restricoes", []).append({
            "nome": row["nome"],
            "tipo": row["tipo"],
            "definicao": row["definicao"],
        })

    return relations


def collect_functions(cur):
    return fetch_all(cur, """
        SELECT p.proname AS nome,
               p.oid::regprocedure::TEXT AS assinatura,
               pg_get_function_result(p.oid) AS retorno,
               p.prosecdef AS security_definer,
               p.proconfig AS configuracao,
               ARRAY(
                   SELECT r.rolname FROM pg_roles r
                   WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
                     AND has_function_privilege(r.rolname, p.oid, 'EXECUTE')
                   ORDER BY r.rolname
               ) AS executavel_por
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        ORDER BY p.proname, assinatura
    """)


def collect_tenants(cur):
    schemas = [row["schema_name"] for row in fetch_all(cur, """
        SELECT e.schema_name
        FROM public.empresas e
        WHERE e.schema_name LIKE 'tenant\\_%%'
          AND to_regnamespace(e.schema_name) IS NOT NULL
        ORDER BY e.schema_name
    """)]
    if not schemas:
        return {}, {}

    columns = fetch_all(cur, """
        SELECT table_schema AS esquema, table_name AS tabela, column_name AS coluna
        FROM information_schema.columns
        WHERE table_schema = ANY(%s)
        ORDER BY table_schema, table_name, ordinal_position
    """, (schemas,))

    routines = fetch_all(cur, """
        SELECT n.nspname AS esquema, p.oid::regprocedure::TEXT AS assinatura
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = ANY(%s)
        ORDER BY n.nspname, assinatura
    """, (schemas,))

    tenants = {schema: {"tabelas": defaultdict(list), "funcoes": []} for schema in schemas}
    for row in columns:
        tenants[row["esquema"]]["tabelas"][row["tabela"]].append(row["coluna"])
    for row in routines:
        tenants[row["esquema"]]["funcoes"].append(row["assinatura"])

    return tenants, {schema: dict(data["tabelas"]) for schema, data in tenants.items()}


def collect_hooks(cur):
    exists = fetch_all(cur, "SELECT to_regclass('public.provisionamento_hooks') IS NOT NULL AS existe")[0]["existe"]
    if not exists:
        return []
    return fetch_all(cur, """
        SELECT hook_key, ordem, ativo, hook_function::TEXT AS funcao
        FROM public.provisionamento_hooks
        ORDER BY ordem
    """)


def collect_code_rpc_calls():
    calls = defaultdict(list)
    if not WEB_SOURCE_DIR.exists():
        return calls
    for path in WEB_SOURCE_DIR.rglob("*.ts*"):
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for name in RPC_CALL_PATTERN.findall(content):
            calls[name].append(str(path.relative_to(ROOT)).replace("\\", "/"))
    return calls


def build_drift_report(functions, tenant_tables, code_calls, hooks):
    overloads = defaultdict(list)
    for function in functions:
        overloads[function["nome"]].append(function["assinatura"])
    duplicated = {name: items for name, items in overloads.items() if len(items) > 1}

    db_function_names = set(overloads)
    missing_in_db = {name: paths for name, paths in code_calls.items() if name not in db_function_names}

    union_by_table = defaultdict(set)
    for tables in tenant_tables.values():
        for table, columns in tables.items():
            union_by_table[table].update(columns)

    divergences = []
    for table, expected in sorted(union_by_table.items()):
        for schema, tables in sorted(tenant_tables.items()):
            if table not in tables:
                divergences.append((table, schema, ["<tabela ausente>"]))
                continue
            missing = sorted(expected - set(tables[table]))
            if missing:
                divergences.append((table, schema, missing))

    exposed = [
        function for function in functions
        if function["security_definer"] and set(function["executavel_por"]) & {"anon"}
    ]

    lines = ["# Divergencias entre banco e codigo", ""]

    lines.append(f"## Funcoes publicas com mais de uma assinatura ({len(duplicated)})")
    lines.append("")
    if duplicated:
        lines.append("Chamadas por parametros nomeados podem ficar ambiguas no PostgREST.")
        lines.append("")
        for name, items in sorted(duplicated.items()):
            lines.append(f"- `{name}`")
            lines.extend(f"  - `{item}`" for item in items)
    else:
        lines.append("Nenhuma.")
    lines.append("")

    lines.append(f"## RPCs chamadas no codigo e ausentes no banco ({len(missing_in_db)})")
    lines.append("")
    if missing_in_db:
        for name, paths in sorted(missing_in_db.items()):
            lines.append(f"- `{name}` — {', '.join(sorted(set(paths))[:5])}")
    else:
        lines.append("Nenhuma.")
    lines.append("")

    lines.append(f"## Colunas divergentes entre tenants ({len(divergences)})")
    lines.append("")
    if divergences:
        for table, schema, missing in divergences:
            lines.append(f"- `{schema}.{table}` sem: {', '.join(missing)}")
    else:
        lines.append("Nenhuma.")
    lines.append("")

    lines.append(f"## Funcoes SECURITY DEFINER expostas a anon ({len(exposed)})")
    lines.append("")
    if exposed:
        for function in exposed:
            lines.append(f"- `{function['assinatura']}`")
    else:
        lines.append("Nenhuma.")
    lines.append("")

    active_hooks = [hook for hook in hooks if hook["ativo"]]
    lines.append(f"## Hooks de provisionamento ativos ({len(active_hooks)})")
    lines.append("")
    if active_hooks:
        for hook in active_hooks:
            lines.append(f"- `{hook['hook_key']}` (ordem {hook['ordem']}) — `{hook['funcao']}`")
    else:
        lines.append("Nenhum. Tenants novos nao recebem as correcoes automaticamente.")
    lines.append("")

    summary = {
        "assinaturas_duplicadas": len(duplicated),
        "rpcs_ausentes_no_banco": len(missing_in_db),
        "colunas_divergentes_entre_tenants": len(divergences),
        "funcoes_definer_expostas_a_anon": len(exposed),
        "hooks_ativos": len(active_hooks),
    }
    return "\n".join(lines), summary


def main() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("Defina DATABASE_URL antes de executar.", file=sys.stderr)
        return 2

    conn = psycopg2.connect(database_url)
    conn.set_session(readonly=True)
    try:
        with conn.cursor() as cur:
            public_relations = collect_public_schema(cur)
            functions = collect_functions(cur)
            tenants, tenant_tables = collect_tenants(cur)
            hooks = collect_hooks(cur)
    finally:
        conn.rollback()
        conn.close()

    code_calls = collect_code_rpc_calls()
    report, summary = build_drift_report(functions, tenant_tables, code_calls, hooks)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "db-map.json").write_text(json.dumps({
        "public": public_relations,
        "funcoes_public": functions,
        "tenants": {schema: {"tabelas": tables, "funcoes": tenants[schema]["funcoes"]}
                    for schema, tables in tenant_tables.items()},
        "hooks_provisionamento": hooks,
        "rpcs_chamadas_no_codigo": {name: sorted(set(paths)) for name, paths in sorted(code_calls.items())},
    }, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    (OUTPUT_DIR / "db-drift.md").write_text(report, encoding="utf-8")

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
