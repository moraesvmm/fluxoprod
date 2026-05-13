# Alinhamento 100% SQL (repositório ↔ Supabase live)

Objetivo: comprovar que o **schema `public`** no PostgreSQL do projeto contém as mesmas **tabelas**, **views** e **funções (RPCs)** que o frontend considera contrato em `apps/web/src/types/database.types.ts`, além dos **índices `public`** previstos nas migrações versionadas.

> **Regra:** após qualquer alteração no banco ou após regenerar `database.types.ts`, rode de novo o fluxo abaixo e trate todo `present_in_db = false` antes de declarar deploy alinhado. Ver regra no topo de [`DOCUMENTACAO_TECNICA.md`](DOCUMENTACAO_TECNICA.md).

---

## 1. Regenerar os scripts de verificação a partir dos tipos

Na **raiz do repositório**:

```bash
node scripts/generate-verify-sql-from-types.mjs
```

Ou:

```bash
npm run sql:verify-gen
```

Isso **sobrescreve** (não edite à mão):

| Arquivo | Conteúdo |
|---------|----------|
| `apps/api/migrations/verify_public_tables_from_database_types.sql` | Tabelas `public` esperadas pelo `database.types.ts` |
| `apps/api/migrations/verify_public_views_from_database_types.sql` | Views `public` esperadas |
| `apps/api/migrations/verify_public_functions_from_database_types.sql` | RPCs/funções `public` esperadas |

Sempre que o arquivo `database.types.ts` mudar (por `supabase gen types` ou merge), **rode o gerador de novo** antes de comparar com o banco.

---

## 2. Rodar as verificações no Supabase (SQL Editor)

Ordem sugerida (somente leitura, exceto correções que você aplicar depois):

1. **`verify_public_indexes_from_migrations.sql`** — índices `public` definidos explicitamente nas migrações (lista curada; não vem do gerador).
2. **`verify_public_tables_from_database_types.sql`** — todas as linhas com `present_in_db = true`.
3. **`verify_public_views_from_database_types.sql`**
4. **`verify_public_functions_from_database_types.sql`**

Interpretação:

- **`false`** em tabela/view/função: objeto **falta** no live → aplicar a migração correspondente em `apps/api/migrations/` (ou RPC consolidada) e repetir o passo 1 da documentação técnica (`gen types`).
- **`false`** em índice da lista curada: rodar o trecho `CREATE INDEX` correspondente (ex.: `fix_indexes_checkout_webhook.sql`, `hotfix_public_indexes_verify_gaps.sql`).

---

## 3. O que ainda não é “100%” automatizado aqui

| Escopo | Situação |
|--------|----------|
| **Schemas `tenant_*`** | Tabelas/RPCs por tenant vêm de `provisionar_empresa` / migrações em loop; não estão no `database.types.ts` como lista por schema. Validar com `upgrade_all_tenants`, amostragem por tenant ou scripts dedicados. |
| **Funções só em SQL de migração** | Se existir função `public` criada por `.sql` mas **removida** do `database.types.ts`, o verificador atual não acusa (o contrato é “o que o types exige existe no DB”). Para drift reverso, use o bloco comentado no final de `verify_public_functions_from_database_types.sql`. |
| **Políticas RLS, triggers, grants** | Não cobertos pelos scripts gerados; revisar migrações e painel quando relevante. |

---

## 4. Checklist rápido pós-correção

- [ ] `node scripts/generate-verify-sql-from-types.mjs`
- [ ] Rodar os quatro `.sql` de verificação no SQL Editor — sem `false`
- [ ] `supabase gen types typescript` → revisar diff em `database.types.ts`
- [ ] `tsc --noEmit` em `apps/web`

Quando os quatro scripts estiverem só com `true` e o tipos estiver sincronizado, o **schema `public` está alinhado ao contrato tipado + índices curados** do repositório, dentro do escopo deste documento.
