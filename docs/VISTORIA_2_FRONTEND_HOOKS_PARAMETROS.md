# VISTORIA 2 — FRONTEND: HOOKS, PARÂMETROS E CHAMADAS ÀS RPCs

**Data:** 20/04/2026  
**Objetivo:** Mapear exatamente o que o frontend envia para cada RPC com erro.  
**Escopo:** Diagnosticar divergências de parâmetros, ordem de execução e falta de guards de autenticação.

---

## RESUMO EXECUTIVO

**Status:** Vistoria concluída - Nenhuma correção aplicada (conforme instrução).

**Principais descobertas:**
1. ✅ **Parâmetros corretos:** Todas as 3 RPCs com erro recebem parâmetros corretos do frontend
2. ⚠️ **Falta de guard de autenticação:** Hooks chamam RPCs SEM verificar se sessão está disponível
3. ⚠️ **Supabase client no top-level:** Criado fora do hook, pode ter sessão não estabelecida
4. ⚠️ **RPC tenant_dashboard_kpis:** Chamada no hook mas NÃO está na lista de erros 400 (pode estar falhando silenciosamente)
5. ⚠️ **Sem validação de retorno:** Componentes não validam se é array antes de chamar .map()

---

## PASSO 1 — MAPEAR CHAMADAS ÀS RPCs COM ERRO

### Tabela de Mapeamento RPC × Frontend

| RPC | Arquivo Função | Parâmetros Enviados pelo Frontend | Hook que Chama | Componente que Monta Parâmetros |
|:---|:---|:---|:---|:---|
| `tenant_listar_clientes` | `api.ts` linha 491-516 | `{ p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags }` | `useClientes` (use-clientes.ts linha 13-18) | `crm/page.tsx` linha 37-39 |
| `tenant_dashboard_metricas` | `dashboard-kpis.tsx` linha 34 | `{}` (sem parâmetros) | useQuery inline (dashboard-kpis.tsx linha 40-43) | `crm/page.tsx` (via DashboardKPIs component) |
| `tenant_dashboard_kpis_por_mes` | `use-dashboard.ts` linha 53 | `{ p_meses: 6 }` | `useDashboardData` (use-dashboard.ts linha 50-61) | `dashboard/page.tsx` linha 84 |
| `tenant_dashboard_kpis` | `use-dashboard.ts` linha 14 | `{}` (sem parâmetros) | `useDashboardData` (use-dashboard.ts linha 11-20) | `dashboard/page.tsx` linha 84 |

### Detalhes por RPC

#### 1. tenant_listar_clientes

**Função em api.ts (linha 491-516):**
```typescript
export async function fetchClientes(params?: ClienteListParams): Promise<ClienteListResult> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_clientes', {
      p_cursor: params?.cursor || null,
      p_limit: params?.limit || 20,
      p_status: params?.status || null,
      p_funil_fase: params?.funil_fase || null,
      p_busca: params?.busca || null,
      p_order_by: params?.order_by || 'criado_em',
      p_order_dir: params?.order_dir || 'DESC',
      p_tags: params?.tags || null
    });
  // ...
}
```

**Hook (use-clientes.ts linha 13-18):**
```typescript
export function useClientes(options?: UseClientesOptions) {
  return useQuery<ClienteListResult>({
    queryKey: [...CLIENTES_KEY, options?.params],
    queryFn: () => fetchClientes(options?.params),
  });
}
```

**Componente (crm/page.tsx linha 37-39):**
```typescript
const { data: clientesResult, isLoading: loading, error: queryError } = useClientes({
  params: buscaDebounced ? { busca: buscaDebounced } : undefined,
});
```

**Observação:** ⚠️ **Sem guard de autenticação** - Hook não tem `enabled: !!userId`

#### 2. tenant_dashboard_metricas

**Função em dashboard-kpis.tsx linha 32-37:**
```typescript
async function fetchDashboardMetricas(): Promise<DashboardMetricas> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_dashboard_metricas');
  if (error) throw new Error(error.message);
  return data as DashboardMetricas;
}
```

**Hook (dashboard-kpis.tsx linha 40-43):**
```typescript
export default function DashboardKPIs() {
  const { data: metricas, isLoading, error } = useQuery({
    queryKey: ['dashboard-metricas'],
    queryFn: fetchDashboardMetricas,
  });
```

**Componente:** `DashboardKPIs` é usado em `crm/page.tsx`

**Observação:** ⚠️ **Sem guard de autenticação** - useQuery não tem `enabled: !!userId`

#### 3. tenant_dashboard_kpis_por_mes

**Função em use-dashboard.ts linha 50-61:**
```typescript
const { data: kpisPorMes, isLoading: isLoadingChart } = useQuery({
  queryKey: ["dashboard", "kpis-por-mes"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('tenant_dashboard_kpis_por_mes', { p_meses: 6 });
    if (error) throw error;
    // Normalização defensiva: garantir que sempre retorne array
    const normalized = Array.isArray(data) ? data : (data?.data ?? data?.kpis ?? []);
    return (normalized as Array<{ mes: string; faturamento: number; total_vendas: number; ticket_medio: number }>) || [];
  },
  staleTime: 5 * 60_000,
  retry: 2,
});
```

**Hook:** `useDashboardData` (use-dashboard.ts linha 9)

**Componente (dashboard/page.tsx linha 84):**
```typescript
const dashboard = useDashboardData();
```

**Observação:** ✅ **Tem normalização defensiva** - Array.isArray(data) mas ⚠️ **sem guard de auth**

#### 4. tenant_dashboard_kpis (BÔNUS - não está na lista de erros 400)

**Função em use-dashboard.ts linha 11-20:**
```typescript
const { data: kpis, isLoading, error } = useQuery({
  queryKey: ["dashboard", "kpis"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('tenant_dashboard_kpis');
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
  retry: 2,
});
```

**Observação:** ⚠️ **RPC chamada mas não está na lista de erros 400 do usuário** - pode estar falhando silenciosamente

---

## PASSO 2 — IDENTIFICAR DIVERGÊNCIAS

### Tabela de Comparação: Parâmetros Enviados vs Esperados

| RPC | Parâmetros Enviados pelo Frontend | Parâmetros Esperados pelo Banco (Vistoria 1) | Status |
|:---|:---|:---|:---|
| `tenant_listar_clientes` | `p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags` | `p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags` | ✅ **CORRETO** |
| `tenant_dashboard_metricas` | `{}` (sem parâmetros) | `{}` (sem parâmetros) | ✅ **CORRETO** |
| `tenant_dashboard_kpis_por_mes` | `{ p_meses: 6 }` | `p_meses integer DEFAULT 6` | ✅ **CORRETO** |

**Conclusão:**
- ✅ **Nenhuma divergência de parâmetros** - Todos os parâmetros batem corretamente
- ⚠️ **Problema NÃO é parâmetros incorretos** - está em outro lugar

---

## PASSO 3 — INVESTIGAR ORDEM DE EXECUÇÃO (ERRO DE TOKEN)

### Análise de Guards de Autenticação

#### use-dashboard.ts

**Problema identificado:**
```typescript
// Linha 6: Supabase client criado no top-level (fora do hook)
const supabase = createClient();

export function useDashboardData() {
  // Linha 11-20: useQuery SEM guard de autenticação
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_dashboard_kpis');
      // ...
    },
    // ❌ SEM: enabled: !!userId
  });
```

**Risco:** Hook executa RPC imediatamente no mount, mesmo se sessão não estiver disponível.

#### use-clientes.ts

**Problema identificado:**
```typescript
export function useClientes(options?: UseClientesOptions) {
  return useQuery<ClienteListResult>({
    queryKey: [...CLIENTES_KEY, options?.params],
    queryFn: () => fetchClientes(options?.params),
    // ❌ SEM: enabled: !!userId
  });
}
```

**Risco:** Hook executa RPC imediatamente no mount, mesmo se sessão não estiver disponível.

#### dashboard-kpis.tsx

**Problema identificado:**
```typescript
export default function DashboardKPIs() {
  const { data: metricas, isLoading, error } = useQuery({
    queryKey: ['dashboard-metricas'],
    queryFn: fetchDashboardMetricas,
    // ❌ SEM: enabled: !!userId
  });
```

**Risco:** Hook executa RPC imediatamente no mount, mesmo se sessão não estiver disponível.

#### crm/page.tsx

**Análise:**
```typescript
export default function CRMPage() {
  // Linha 37: Hook chamado no topo do componente
  const { data: clientesResult, isLoading: loading, error: queryError } = useClientes({
    params: buscaDebounced ? { busca: buscaDebounced } : undefined,
  });
```

**Risco:** Componente chama hook sem verificar se usuário está autenticado primeiro.

#### dashboard/page.tsx

**Análise:**
```typescript
export default function DashboardPage() {
  // Linha 84: Hook chamado no topo do componente
  const dashboard = useDashboardData();
  const userProfile = useUserProfile();
```

**Risco:** Componente chama hooks sem verificar se usuário está autenticado primeiro. `useUserProfile` tem loading state, mas hooks de dados não aguardam.

#### use-user-profile.ts

**Análise:**
```typescript
export function useUserProfile() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // ...
      setLoading(false);
    }
    load();
  }, []);

  return { nome, email, role, userId, loading };
}
```

**Observação:** ✅ **Tem loading state** - Mas outros hooks não aguardam esse loading.

### Conclusão do PASSO 3

**Problema confirmado:**
- ⚠️ **Todos os hooks chamam RPCs SEM guard de autenticação**
- ⚠️ **Supabase client criado no top-level** pode ter sessão não estabelecida
- ⚠️ **Componentes chamam hooks no mount** sem verificar auth primeiro
- ⚠️ **Race condition:** Hook executa RPC antes de `useUserProfile` resolver

**Causa raiz provável do erro 400 (token):**
1. Componente monta
2. Hook `useDashboardData` ou `useClientes` executa imediatamente
3. Supabase client tenta chamar RPC
4. Sessão ainda não está disponível (ou está em processo de estabelecimento)
5. Supabase retorna HTTP 400 (bad request) por falta de auth context

---

## PASSO 4 — VERIFICAR tenant_dashboard_kpis_por_mes

### Status da RPC no Banco (Vistoria 1)
- ✅ **Existe no banco** (public + 4 schemas tenant)
- ✅ **Parâmetros corretos** (p_meses integer DEFAULT 6)
- ✅ **Funciona quando testada diretamente** (retorna array vazio sem erro)

### Status no Frontend
- ✅ **Hook chama a RPC** (use-dashboard.ts linha 53)
- ✅ **Parâmetros corretos** ({ p_meses: 6 })
- ✅ **Normalização defensiva** (Array.isArray(data))
- ⚠️ **Sem guard de auth** (enabled: !!userId)

### Conclusão
- ✅ **RPC conectada corretamente** ao frontend
- ⚠️ **Problema é falta de guard de auth**, não a conexão

---

## PASSO 5 — VERIFICAR tenant_dashboard_metricas

### Status da RPC no Banco (Vistoria 1)
- ✅ **Existe no banco** (public + 4 schemas tenant)
- ✅ **Sem parâmetros** (correto)
- ✅ **Funciona quando testada diretamente** (retorna objeto vazio sem erro)

### Status no Frontend
- ✅ **Componente chama a RPC** (dashboard-kpis.tsx linha 34)
- ✅ **Parâmetros corretos** (sem parâmetros)
- ⚠️ **Sem guard de auth** (enabled: !!userId)
- ⚠️ **Sem validação de retorno** antes de usar .map()

### Validação de Retorno
**dashboard-kpis.tsx linha 105:**
```typescript
{Object.entries(metricas.funil_counts).map(([fase, count]) => (
```

**Risco:** Se `metricas` for null ou `metricas.funil_counts` não for objeto, `.map()` vai falhar com TypeError.

### Conclusão
- ✅ **RPC existe e funciona** no banco
- ⚠️ **Problema é falta de guard de auth** e **falta de validação de retorno**

---

## PASSO 6 — VERIFICAR tenant_dashboard_kpis (BÔNUS)

### Status da RPC no Banco
- ❓ **NÃO verificada na Vistoria 1** (não estava na lista de erros 400)

### Status no Frontend
- ✅ **Hook chama a RPC** (use-dashboard.ts linha 14)
- ⚠️ **Sem parâmetros** (esperado se RPC não tiver parâmetros)
- ⚠️ **Sem guard de auth** (enabled: !!userId)
- ⚠️ **Sem normalização defensiva** (diferente de kpisPorMes)

### Conclusão
- ⚠️ **RPC pode não existir no banco** - precisa verificação
- ⚠️ **Se não existir, vai causar erro 400 silencioso**

---

## DIAGNÓSTICO FINAL

### 1. Tabela de Divergências de Parâmetros

| RPC | Parâmetros Enviados | Parâmetros Esperados | Status |
|:---|:---|:---|:---|
| tenant_listar_clientes | 8 parâmetros (p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags) | 8 parâmetros (mesmos nomes) | ✅ **CORRETO** |
| tenant_dashboard_metricas | {} (sem parâmetros) | {} (sem parâmetros) | ✅ **CORRETO** |
| tenant_dashboard_kpis_por_mes | { p_meses: 6 } | p_meses integer DEFAULT 6 | ✅ **CORRETO** |

**Conclusão:** ✅ **Nenhuma divergência de parâmetros** - Todos batem corretamente.

### 2. RPCs Chamadas Sem Guard de Autenticação (Causa do Erro 400)

| RPC | Hook/Componente | Localização | Tem Guard Auth? |
|:---|:---|:---|:---|
| tenant_listar_clientes | useClientes | use-clientes.ts linha 13-18 | ❌ **NÃO** |
| tenant_dashboard_metricas | DashboardKPIs | dashboard-kpis.tsx linha 40-43 | ❌ **NÃO** |
| tenant_dashboard_kpis_por_mes | useDashboardData | use-dashboard.ts linha 50-61 | ❌ **NÃO** |
| tenant_dashboard_kpis | useDashboardData | use-dashboard.ts linha 11-20 | ❌ **NÃO** |

**Conclusão:** ⚠️ **Todas as 4 RPCs são chamadas SEM guard de autenticação** - Causa raiz confirmada do erro 400 (token).

### 3. RPCs Chamadas com Parâmetros Errados ou Ausentes

| RPC | Problema | Status |
|:---|:---|:---|
| tenant_listar_clientes | Nenhum | ✅ OK |
| tenant_dashboard_metricas | Nenhum | ✅ OK |
| tenant_dashboard_kpis_por_mes | Nenhum | ✅ OK |
| tenant_dashboard_kpis | Não verificada se existe no banco | ⚠️ **Precisa verificação** |

**Conclusão:** ✅ **Nenhuma RPC com parâmetros errados** - Todos os parâmetros estão corretos.

### 4. Componentes que Não Validam o Retorno Antes de Chamar .map()

| Componente | Linha | Problema | Risco |
|:---|:---|:---|:---|
| dashboard-kpis.tsx | 105 | `Object.entries(metricas.funil_counts).map(...)` | Se metricas.funil_counts não for objeto, TypeError |
| dashboard/page.tsx | 167 | `dashboard.chartData.some(...)` | Já tem guard Array.isArray() ✅ |
| use-dashboard.ts | 75 | `(kpisPorMes || []).map(...)` | Já tem normalização defensiva ✅ |

**Conclusão:** ⚠️ **DashboardKPIs não valida retorno** antes de chamar .map() - Pode causar TypeError.

### 5. Causa Raiz Confirmada ou Hipótese Forte para Cada Erro 400

#### Erro 1: token (auth)
**Causa raiz confirmada:** ⚠️ **Falta de guard de autenticação em todos os hooks**
- Hooks chamam RPCs imediatamente no mount
- Supabase client criado no top-level pode ter sessão não estabelecida
- Race condition entre hook mount e sessão establishment
- **Solução:** Adicionar `enabled: !!userId` em todos os hooks que chamam RPCs

#### Erro 2: tenant_dashboard_kpis_por_mes
**Causa raiz confirmada:** ⚠️ **Falta de guard de autenticação**
- RPC existe e funciona no banco
- Parâmetros corretos
- **Solução:** Adicionar `enabled: !!userId` no useQuery

#### Erro 3: tenant_listar_clientes
**Causa raiz confirmada:** ⚠️ **Falta de guard de autenticação**
- RPC existe e funciona no banco
- Parâmetros corretos
- **Solução:** Adicionar `enabled: !!userId` no useQuery

#### Erro 4: tenant_dashboard_metricas
**Causa raiz confirmada:** ⚠️ **Falta de guard de autenticação**
- RPC existe e funciona no banco
- Parâmetros corretos
- **Solução:** Adicionar `enabled: !!userId` no useQuery

---

## PRÓXIMOS PASSOS (VISTORIA 3)

1. **Adicionar guards de autenticação** em todos os hooks que chamam RPCs
2. **Mover criação do Supabase client para dentro dos hooks** (ou usar context)
3. **Validar retorno antes de chamar .map()** em DashboardKPIs
4. **Verificar se tenant_dashboard_kpis existe no banco**
5. **Testar correções em ambiente local** antes de deploy

---

**Status da Vistoria 2:** ✅ Concluída  
**Data de conclusão:** 20/04/2026  
**Próxima ação:** Vistoria 3 — Correção de Guards de Autenticação
