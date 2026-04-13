# ⚠️ DIRETÓRIO OBSOLETO - ARQUIVO LEGADO

Este diretório contém código legado que NÃO deve ser usado no sistema Fluxo ERP atual.

## Status: ÓRFÃO E LEGADO

Conforme a arquitetura definida (Opção A - Arquitetura Correta):

- **NÃO existe backend próprio:** Toda lógica de negócio deve residir no banco via RPC Supabase (PL/pgSQL).
- **Frontend NÃO deve conter regras de negócio críticas:** Apenas orquestrar chamadas RPC e renderizar UI.
- **Backend Python (FastAPI) está desativado:** Não foi analisado, alterado ou considerado na refatoração.

## Arquivos Úteis

O único arquivo que deve ser usado deste diretório é:

- **`supabase_rpc.sql`** - Script SQL principal com todas as RPCs e definições de schema
  - Este arquivo deve ser executado no SQL Editor do Supabase
  - Contém: Schema routing, RPCs de provisionamento, RPCs de leitura, RPCs de escrita transacionais

## Arquivos Legado (Não usar)

- `main.py` - Backend FastAPI obsoleto
- `migrations_expansion.sql` - Mergeado em `supabase_rpc.sql`
- `tabelas_urgentes.sql` - SQL antigo, substituído pelo supabase_rpc.sql
- `tables_completas.sql` - SQL antigo, substituído pelo supabase_rpc.sql
- `models/`, `routers/` - Diretórios vazios do FastAPI
- `requirements.txt` - Dependências do FastAPI não usadas

## Ação Recomendada

Este diretório pode ser arquivado ou removido após garantir que:
1. O arquivo `supabase_rpc.sql` foi movido para um local apropriado (ex: `database/` ou raiz do projeto)
2. O script foi executado no Supabase
3. Não há referências a este diretório no código ativo

---
*Gerado durante refatoração da arquitetura multi-tenant - Data: 2024*
