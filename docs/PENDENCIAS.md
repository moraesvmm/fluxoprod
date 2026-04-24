# 📌 PENDÊNCIAS TÉCNICAS - FLUXO ERP

> [!IMPORTANT]
> **REGRA DE OURO:** Toda vez que este documento for lido por um agente ou desenvolvedor, ele deve ser atualizado. Pendências que foram resolvidas durante a sessão devem ser obrigatoriamente retiradas deste arquivo antes do encerramento da tarefa.

---

## 🔴 PENDÊNCIAS CRÍTICAS

### 1. Divergência de Fases do Funil de Vendas (CRM vs Banco)
**Status:** CRÍTICO
**Módulo:** CRM / Vendas
**Descrição:** Existe divergência entre os valores do campo `funil_fase` definidos no banco de dados e os utilizados no frontend.

**Banco de Dados** (`tenant.clientes` - CHECK constraint):
- `lead`
- `prospect`
- `oportunidade`
- `cliente`
- `recuperacao`

**Frontend** (`use-pipeline.ts` - Kanban):
- `lead`
- `qualificado`
- `proposta`
- `negociacao`
- `fechado`
- `perdido`

**Impacto:** Inconsistência de dados, possíveis erros ao mover clientes entre fases, filtros não funcionando corretamente.

**Ação Necessária:**
- Alinhar valores entre banco e frontend
- Decidir qual padrão será adotado (recomendado: padrão do frontend mais completo)
- Atualizar CHECK constraint no banco
- Atualizar RPCs `tenant_criar_cliente` e `tenant_atualizar_cliente`
- Testar fluxo completo do Kanban após correção

**Arquivos Envolvidos:**
- `apps/api/supabase_rpc.sql` (provisionar_empresa - CREATE TABLE clientes)
- `apps/web/src/lib/hooks/use-pipeline.ts`
- `apps/web/src/components/crm/kanban-pipeline.tsx`

---

### 2. Módulo de Comissões - RPCs Não Publicadas
**Status:** CRÍTICO
**Módulo:** Comissões
**Descrição:** O módulo de comissões está degradado pois as RPCs necessárias para gestão de regras ainda não foram publicadas no banco live.

**RPCs Ausentes:**
- `tenant_listar_regras_comissao`
- `tenant_criar_regra_comissao`
- `tenant_excluir_regra_comissao`

**Impacto:** Gestão de regras de comissão não funciona, cálculo de comissões em vendas pode falhar.

**Ação Necessária:**
- Publicar o script SQL: `apps/api/migrations/rpc_comissoes_regras.sql`
- **Método de Execução:** Utilizar o Editor SQL do Supabase ou URI de conexão via `psql`
- **URI de Conexão:** `postgresql://postgres:Vmm041126!Database@db.wkxtlvxotvutycbupfuh.supabase.co:5432/postgres`
- Validar funcionamento após publicação

---

### 3. Geração de Recibo PDF no PDV
**Status:** ALTA PRIORIDADE
**Módulo:** Vendas / PDV
**Descrição:** A funcionalidade de geração de recibo PDF é visual apenas, sem implementação real.

**Impacto:** Usuários não podem emitir recibos oficiais de vendas.

**Ação Necessária:**
- Implementar geração de PDF via `jsPDF` ou biblioteca similar
- Adicionar dados da venda: cliente, itens, valores, forma de pagamento
- Adicionar logo da empresa (se configurado)
- Implementar botão de download/impressão
- Testar layout e impressão

**Arquivos Envolvidos:**
- `apps/web/src/app/tenant/vendas/page.tsx`

---

### 4. KPI "Método Favorito" Hardcoded
**Status:** MÉDIA PRIORIDADE
**Módulo:** Vendas / Dashboard
**Descrição:** O KPI "Método Favorito" no dashboard de vendas está hardcoded como "-", sem cálculo real.

**Impacto:** Dados de métricas de vendas incompletos, impossibilidade de identificar método de pagamento mais utilizado.

**Ação Necessária:**
- Implementar cálculo baseado em dados reais de `tenant.vendas`
- Contar ocorrências de cada `metodo_pagamento`
- Retornar o método mais frequente no período
- Atualizar hook `useDashboard` ou criar RPC específica

**Arquivos Envolvidos:**
- `apps/web/src/app/tenant/vendas/page.tsx`
- `apps/web/src/lib/hooks/use-dashboard.ts`

---

## 🟠 PENDÊNCIAS DE MÉDIO PRAZO

### 1. Re-vistoria Técnica Pós-Migração
**Descrição:** Após a execução do script de comissões, deve-se realizar uma vistoria completa para validar se os erros de RPC sumiram do frontend.
**Referência:** Vistoria 17 em [VISTORIAS.md](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/VISTORIAS.md).

---

## ✅ HISTÓRICO DE RESOLUÇÕES RECENTES (22/04/2026)
- [x] Atualização da Documentação Técnica (V2.2) baseada nas Vistorias 16 e 17.
- [x] Saneamento de segurança no Checkout (remoção de senhas do metadata).
- [x] Orquestração de provisionamento via backend.
- [x] Correção de erros de build (fontes Google e html5-qrcode).
