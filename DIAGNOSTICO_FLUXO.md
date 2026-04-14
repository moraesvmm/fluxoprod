# Diagnóstico Sistema Fluxo - FASE 1

**Data:** 14/04/2026  
**Objetivo:** Identificar erros 500, 400, 504 e inconsistências no sistema Fluxo  
**Service Role Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU

---

## 📊 RPCs Testadas

### ❌ RPCs Não Existentes (Erros Críticos)

**1. provisionar_empresa_master**
- **Status:** ❌ 400 Bad Request
- **Impacto:** Onboarding completamente quebrado
- **Causa:** RPC não existe no Supabase
- **Frontend:** apps/web/src/app/mestre/page.tsx (linha 60)
- **Ação necessária:** Executar SQL supabase_rpc.sql no Supabase

**2. set_tenant_schema**
- **Status:** ❌ 404 Not Found
- **Impacto:** Middleware quebrado, schema routing não funciona
- **Causa:** RPC não existe no Supabase
- **Frontend:** apps/web/src/middleware.ts (linha 80)
- **Ação necessária:** Criar RPC de schema routing

**3. tenant_processar_venda**
- **Status:** ❌ 404 Not Found
- **Impacto:** PDV completamente quebrado
- **Causa:** RPC não existe no Supabase
- **Frontend:** apps/web/src/app/tenant/vendas/pdv/page.tsx (linha 163)
- **Ação necessária:** Criar RPC de processamento de vendas

### ⚠️ RPCs Existentes com Problemas

**4. tenant_dashboard_kpis**
- **Status:** ⚠️ 200 OK mas retorna erro
- **Erro:** "Schema não encontrado para usuário"
- **Impacto:** Dashboard não carrega KPIs
- **Causa:** Schema routing não configurado ou usuário não tem schema
- **Frontend:** apps/web/src/lib/hooks/use-dashboard.ts (linha 14)
- **Ação necessária:** Corrigir schema routing ou configurar schema para usuário

### ✅ RPCs Existentes Funcionando

**5. tenant_listar_vendas**
- **Status:** ✅ 200 OK
- **Retorno:** Array vazio (esperado, não há vendas)
- **Frontend:** apps/web/src/lib/hooks/use-dashboard.ts (linha 25)

**6. tenant_listar_funcionarios**
- **Status:** ✅ 200 OK
- **Retorno:** Array vazio (esperado, não há funcionários)
- **Frontend:** apps/web/src/app/tenant/vendas/pdv/page.tsx (linha 94)
- **Frontend:** apps/web/src/app/tenant/os/page.tsx (linha 52)

---

## 📊 Tabelas Testadas

### ✅ Tabelas Existentes com Dados

**1. empresas**
- **Status:** ✅ 200 OK
- **Registros:** 1 (empresa master)
- **Schema:** public

**2. modulos_catalogo**
- **Status:** ✅ 200 OK
- **Registros:** 12 (todos os módulos do catálogo)
- **Schema:** public

**3. clientes**
- **Status:** ✅ 200 OK
- **Registros:** 1 (Cliente Teste Producao)
- **Schema:** public

**4. user_profiles**
- **Status:** ✅ 200 OK
- **Registros:** 5 (perfis de usuários)
- **Schema:** public

### ✅ Tabelas Existentes Vazias

**5. vendas**
- **Status:** ✅ 200 OK
- **Registros:** 0 (vazio)
- **Schema:** public

**6. transacoes_financeiras**
- **Status:** ✅ 200 OK
- **Registros:** 0 (vazio)
- **Schema:** public

**7. produtos**
- **Status:** ✅ 200 OK
- **Registros:** 0 (vazio)
- **Schema:** public

**8. funcionarios**
- **Status:** ✅ 200 OK
- **Registros:** 0 (vazio)
- **Schema:** public

**9. comissoes**
- **Status:** ✅ 200 OK
- **Registros:** 0 (vazio)
- **Schema:** public

**10. comissoes_regras**
- **Status:** ✅ 200 OK
- **Registros:** 0 (vazio)
- **Schema:** public

---

## 🚨 Problemas Críticos Identificados

### 1. Onboarding Quebrado (Erro 400)
- **RPC:** `provisionar_empresa_master` não existe
- **Impacto:** Não é possível criar novas empresas
- **Causa:** SQL supabase_rpc.sql não foi executado
- **Prioridade:** CRÍTICA

### 2. Schema Routing Quebrado (Erro 404)
- **RPC:** `set_tenant_schema` não existe
- **Impacto:** Middleware não funciona, multi-tenancy não funciona
- **Causa:** RPC não implementada
- **Prioridade:** CRÍTICA

### 3. PDV Quebrado (Erro 404)
- **RPC:** `tenant_processar_venda` não existe
- **Impacto:** Não é possível registrar vendas
- **Causa:** RPC não implementada
- **Prioridade:** CRÍTICA

### 4. Dashboard com Erro de Schema
- **RPC:** `tenant_dashboard_kpis` retorna erro
- **Erro:** "Schema não encontrado para usuário"
- **Impacto:** Dashboard não carrega KPIs
- **Causa:** Schema routing não configurado
- **Prioridade:** ALTA

---

## 🎯 Análise de Arquitetura

### Problema de Multi-tenancy
O sistema foi desenhado para multi-tenancy com schemas isolados por empresa, mas:
1. A RPC de schema routing (`set_tenant_schema`) não existe
2. As tabelas estão no schema `public` em vez de schemas de tenant
3. Não há schemas de tenant criados no banco

### Inconsistência Frontend ↔ Backend
- Frontend espera RPCs que não existem no Supabase
- Frontend chama tabelas em schemas de tenant, mas tabelas estão em public
- Schema routing não funciona, então o sistema opera como single-tenant

---

## 📋 Próximos Passos - FASE 2

### Correção Imediata (Prioridade CRÍTICA)
1. Executar SQL supabase_rpc.sql no Supabase
2. Criar RPC `set_tenant_schema` para schema routing
3. Criar RPC `tenant_processar_venda` para PDV
4. Verificar e corrigir schema routing

### Correção Secundária (Prioridade ALTA)
5. Criar schemas de tenant para empresas existentes
6. Migrar dados de public para schemas de tenant
7. Configurar RLS para multi-tenancy
8. Testar fluxo completo de onboarding

---

## ✅ Resumo

**Status do Diagnóstico:**
- RPCs não existentes: 3 (CRÍTICO)
- RPCs com problemas: 1 (ALTO)
- RPCs funcionando: 2
- Tabelas existentes: 10
- Tabelas com dados: 4
- Tabelas vazias: 6

**Problemas principais:**
1. Onboarding quebrado (RPC não existe)
2. Schema routing quebrado (RPC não existe)
3. PDV quebrado (RPC não existe)
4. Dashboard com erro de schema

**Causa raiz:**
- SQL supabase_rpc.sql não foi executado
- RPCs de schema routing não foram implementadas
- Sistema opera como single-tenant em vez de multi-tenant
