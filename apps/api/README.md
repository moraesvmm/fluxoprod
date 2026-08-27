# apps/api — SQL do Fluxo ERP

Este diretório **não** hospeda backend próprio. Toda a lógica de negócio vive no banco, em RPCs PL/pgSQL do Supabase.

Ele é, porém, a **fonte da verdade do SQL versionado**. Leia [AGENTS.md](../../AGENTS.md) antes de qualquer alteração.

## Status: ATIVO para SQL, LEGADO para código Python

Conforme a arquitetura definida (Opção A - Arquitetura Correta):

- **NÃO existe backend próprio:** Toda lógica de negócio deve residir no banco via RPC Supabase (PL/pgSQL).
- **Frontend NÃO deve conter regras de negócio críticas:** Apenas orquestrar chamadas RPC e renderizar UI.
- **Backend Python (FastAPI) está desativado:** Não foi analisado, alterado ou considerado na refatoração.

## Arquivos e diretórios ativos

- **`migrations/`** — onde toda alteração de SQL deve ser criada e commitada.
  - Mudança em schema `tenant_*` exige hook registrado em `public.provisionamento_hooks`, senão empresas novas nascem incompletas.
- **`testes_provisionamento_hooks.sql`** — smoke test transacional do provisionamento. Termina em `ROLLBACK`.
- **`supabase_rpc.sql`** — definição base usada na criação de novos tenants.
  - **NÃO execute este arquivo inteiro em produção.** Ele recria estruturas de provisionamento; use uma migração focada.

## Arquivos Legado (Não usar)

- `main.py` - Backend FastAPI obsoleto
- `migrations_expansion.sql` - Mergeado em `supabase_rpc.sql`
- `tabelas_urgentes.sql` - SQL antigo, substituído pelo supabase_rpc.sql
- `tables_completas.sql` - SQL antigo, substituído pelo supabase_rpc.sql
- `models/`, `routers/` - Diretórios vazios do FastAPI
- `requirements.txt` - Dependências do FastAPI não usadas

## Ação Recomendada

O diretório permanece necessário enquanto abrigar `migrations/`, `supabase_rpc.sql` e os testes de provisionamento. Apenas os arquivos Python legados podem ser removidos.

---
*Gerado durante refatoração da arquitetura multi-tenant - Data: 2024*
