# 🛠️ PENDÊNCIAS TÉCNICAS - FLUXO ERP

Este documento é destinado exclusivamente para o registro de alterações de código pendentes, refatorações, melhorias na arquitetura e riscos de escalabilidade.

---

## 🔴 PRIORIDADE CRÍTICA

### 1. Divergência de Fases do Funil de Vendas (CRM vs Banco)
**Status:** CRÍTICO
**Risco:** Inconsistência de integridade referencial.
**Descrição:** Existe divergência entre os valores do campo `funil_fase` no banco (`lead`, `prospect`, `oportunidade`, `cliente`, `recuperacao`) e no frontend (`lead`, `qualificado`, `proposta`, `negociacao`, `fechado`, `perdido`).
**Ação:** Sincronizar CHECK constraint e tipos no `use-pipeline.ts`.

### 2. Módulo de Comissões - RPCs Não Publicadas
**Status:** CRÍTICO
**Risco:** Falha funcional em produção.
**Descrição:** RPCs de gestão de regras (`tenant_listar_regras_comissao`, etc.) ausentes no banco live.
**Ação:** Publicar `apps/api/migrations/rpc_comissoes_regras.sql`.

---

## 🟠 PRIORIDADE ALTA (DÍVIDA TÉCNICA)

### 1. Geração de Recibo PDF no PDV
**Descrição:** Implementação real da geração de PDF (atualmente é apenas visual).
**Ação:** Integrar `jsPDF` no hook de vendas.

### 2. KPI "Método Favorito" no Dashboard
**Descrição:** Cálculo real baseado em frequências de pagamento.
**Ação:** Atualizar RPC de Dashboard para retornar agregação de métodos.

---

## 🟡 ESCALABILIDADE E MANUTENÇÃO

### 1. Modularização do `provisionar_empresa`
**Risco:** Manutenibilidade (Função com 800+ linhas).
**Ação:** Quebrar o provisionamento em funções menores por módulo.

### 2. Paginação Cursor-Based
**Risco:** Performance em grandes volumes (LIMIT/OFFSET lento em tabelas grandes).
**Ação:** Substituir paginação por chaves (keyset pagination).

---

> [!IMPORTANT]
> **REGRA DE OURO:** Alterações resolvidas devem ser removidas imediatamente deste arquivo.
