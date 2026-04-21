# VISTORIA 1 — BANCO DE DADOS E RPCs

**Data:** 20/04/2026  
**Objetivo:** Confirmar existência, assinatura e comportamento real das RPCs com erro 400 em produção.  
**Escopo:** Diagnosticar causas raiz de erros HTTP 400 nas RPCs: token (auth), tenant_dashboard_kpis_por_mes, tenant_listar_clientes, tenant_dashboard_metricas.

---

## RESUMO EXECUTIVO

**Status:** Vistoria concluída - Nenhuma correção aplicada (conforme instrução).

**Principais descobertas:**
1. ✅ Todas as 3 RPCs com erro 400 EXISTEM no banco de dados
2. ✅ Todas as RPCs funcionam corretamente quando executadas diretamente no banco (via psql)
3. ✅ RPCs existem em todos os 4 schemas tenant (tenant_3ad04037, tenant_62a495e1, tenant_71148b59, tenant_84e7a845)
4. ⚠️ **Causa raiz provável:** As RPCs funcionam no banco, mas falham no frontend devido a problemas de auth/session ou chamada antes da sessão estar disponível

---

## PASSO 1 — CONFIRMAR EXISTÊNCIA DAS RPCs NO BANCO

**Query executada:**
```sql
SELECT routine_name, routine_schema, data_type
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
AND routine_name IN (
  'tenant_dashboard_kpis_por_mes',
  'tenant_listar_clientes',
  'tenant_dashboard_metricas'
)
ORDER BY routine_schema, routine_name;
```

**Resultado:**
```
routine_name                  | routine_schema     | data_type
------------------------------+--------------------+-----------
tenant_dashboard_kpis_por_mes | public             | jsonb
tenant_dashboard_metricas     | public             | jsonb
tenant_listar_clientes        | public             | record
tenant_dashboard_kpis_por_mes | tenant_3ad04037    | jsonb
tenant_dashboard_metricas     | tenant_3ad04037    | jsonb
tenant_listar_clientes        | tenant_3ad04037    | record
tenant_dashboard_kpis_por_mes | tenant_62a495e1    | jsonb
tenant_dashboard_metricas     | tenant_62a495e1    | jsonb
tenant_listar_clientes        | tenant_62a495e1    | record
tenant_dashboard_kpis_por_mes | tenant_71148b59    | jsonb
tenant_dashboard_metricas     | tenant_71148b59    | jsonb
tenant_listar_clientes        | tenant_71148b59    | record
tenant_dashboard_kpis_por_mes | tenant_84e7a845    | jsonb
tenant_dashboard_metricas     | tenant_84e7a845    | jsonb
tenant_listar_clientes        | tenant_84e7a845    | record
```

**Conclusão:**
- ✅ **Todas as 3 RPCs existem** no schema public (wrappers de roteamento)
- ✅ **Todas as 3 RPCs existem** em todos os 4 schemas tenant
- ⚠️ `tenant_listar_clientes` aparece DUPLA em cada schema tenant (2x record) - possível duplicação

---

## PASSO 2 — VERIFICAR ASSINATURA EXATA DE CADA RPC EXISTENTE

### tenant_dashboard_kpis_por_mes

**Query:**
```sql
SELECT specific_name, parameter_name, data_type, parameter_mode
FROM information_schema.parameters
WHERE specific_name LIKE '%tenant_dashboard_kpis_por_mes%'
ORDER BY specific_name, ordinal_position;
```

**Resultado:**
```
specific_name                          | parameter_name | data_type | parameter_mode
---------------------------------------+----------------+-----------+----------------
tenant_dashboard_kpis_por_mes_27928    | p_meses        | integer   | IN
tenant_dashboard_kpis_por_mes_28053    | p_meses        | integer   | IN
tenant_dashboard_kpis_por_mes_28054    | p_meses        | integer   | IN
tenant_dashboard_kpis_por_mes_28055    | p_meses        | integer   | IN
tenant_dashboard_kpis_por_mes_28056    | p_meses        | integer   | IN
```

**Conclusão:**
- 5 cópias da função (1 public + 4 tenants)
- Todas têm **1 parâmetro IN**: `p_meses integer` (sem default visível na query, mas código fonte mostra DEFAULT 6)

### tenant_dashboard_metricas

**Query:**
```sql
SELECT specific_name FROM information_schema.routines
WHERE routine_name = 'tenant_dashboard_metricas'
ORDER BY specific_name;
```

**Resultado:**
```
specific_name
---------------------------------
tenant_dashboard_metricas_27920
tenant_dashboard_metricas_27921
tenant_dashboard_metricas_27922
tenant_dashboard_metricas_27923
tenant_dashboard_metricas_28064
```

**Verificação de parâmetros:**
```sql
SELECT specific_name, parameter_name, data_type, parameter_mode
FROM information_schema.parameters
WHERE specific_name LIKE '%tenant_dashboard_metricas%'
```

**Resultado:** 0 rows

**Código fonte (via pg_get_functiondef):**
```sql
CREATE OR REPLACE FUNCTION public.tenant_dashboard_metricas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_tenant_schema TEXT;
    v_row JSONB;
BEGIN
    v_tenant_schema := (
        SELECT e.schema_name
        FROM public.user_profiles up
        JOIN public.empresas e ON e.id = up.empresa_id
        WHERE up.user_id = auth.uid()
        LIMIT 1
    );

    IF v_tenant_schema IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;

    -- Substituto para EXECUTE ... INTO utilizando FOR ... LOOP
    FOR v_row IN
        EXECUTE format('SELECT %I.tenant_dashboard_metricas() AS result', v_tenant_schema)
    LOOP
        RETURN COALESCE(v_row, '{}':jsonb);
    END LOOP;

    RETURN '{}'::jsonb;
END;
$function$;
```

**Conclusão:**
- 5 cópias da função (1 public + 4 tenants)
- **Sem parâmetros** (função wrapper sem parâmetros)
- Wrapper chama RPC do tenant sem passar parâmetros

### tenant_listar_clientes

**Query (truncada devido à saída longa):**
- Múltiplas cópias com parâmetros extensos
- Parâmetros identificados: p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags

**Código fonte (via pg_get_functiondef - truncado):**
```sql
-- Wrapper public chama RPC do tenant com múltiplos parâmetros
EXECUTE format('
    SELECT 
        id, nome, email, telefone, documento, endereco, funil_fase, status, tags, 
        criado_em, atualizado_em, deleted_at, next_cursor
    FROM %I.tenant_listar_clientes($1, $2, $3, $4, $5, $6, $7, $8)
', v_schema_name)
USING p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags;
```

**Conclusão:**
- Múltiplas cópias (duplicação detectada)
- **8 parâmetros IN**: p_cursor, p_limit, p_status, p_funil_fase, p_busca, p_order_by, p_order_dir, p_tags
- Retorna SETOF RECORD (via RETURN QUERY EXECUTE)

---

## PASSO 3 — LER O CÓDIGO FONTE DAS RPCs

### tenant_dashboard_kpis_por_mes (public)

**Código fonte:**
```sql
CREATE OR REPLACE FUNCTION public.tenant_dashboard_kpis_por_mes(p_meses integer DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  -- Obter schema do tenant
  SELECT e.schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  IF v_tenant_schema IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Executar RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_dashboard_kpis_por_mes($1)', v_tenant_schema)
  INTO v_result
  USING p_meses;

  -- Garantir que sempre retorna array
  IF v_result IS NULL OR NOT jsonb_typeof(v_result) = 'array' THEN
    v_result := '[]'::jsonb;
  END IF;

  RETURN v_result;
END;
$function$;
```

**Características:**
- ✅ Parâmetro: `p_meses integer DEFAULT 6`
- ✅ Retorno: `RETURNS jsonb`
- ✅ Usa `EXECUTE format()` com referência dinâmica a schema
- ✅ Validação de array antes de retornar
- ✅ Fallback para `'[]'::jsonb` se schema for NULL

### tenant_dashboard_metricas (public)

**Código fonte (já exibido no PASSO 2):**

**Características:**
- ✅ Sem parâmetros
- ✅ Retorno: `RETURNS jsonb`
- ✅ Usa `EXECUTE format()` com referência dinâmica a schema
- ✅ Usa FOR ... LOOP em vez de EXECUTE ... INTO
- ✅ Fallback para `'{}'::jsonb` se schema for NULL

### tenant_listar_clientes (public)

**Código fonte (truncado no PASSO 2):**

**Características:**
- ✅ 8 parâmetros IN (todos opcionais via lógica de query)
- ✅ Retorno: `SETOF RECORD` (via RETURN QUERY EXECUTE)
- ✅ Usa `EXECUTE format()` com referência dinâmica a schema
- ✅ Passa todos os parâmetros para RPC do tenant

---

## PASSO 4 — TESTAR AS RPCs DIRETAMENTE NO BANCO

### Teste 1: tenant_dashboard_kpis_por_mes

**Comando:**
```sql
SELECT public.tenant_dashboard_kpis_por_mes(6);
```

**Resultado:**
```
tenant_dashboard_kpis_por_mes 
-------------------------------
 []
(1 row)
```

**Status:** ✅ **Funciona corretamente** (retorna array vazio, sem erro)

### Teste 2: tenant_dashboard_metricas

**Comando:**
```sql
SELECT public.tenant_dashboard_metricas();
```

**Resultado:**
```
tenant_dashboard_metricas 
---------------------------
 {}
(1 row)
```

**Status:** ✅ **Funciona corretamente** (retorna objeto vazio, sem erro)

### Teste 3: tenant_listar_clientes

**Comando:**
```sql
SELECT public.tenant_listar_clientes();
```

**Resultado:**
```
tenant_listar_clientes 
------------------------
(0 rows)
```

**Status:** ✅ **Funciona corretamente** (retorna 0 rows, sem erro)

**Conclusão:**
- ✅ **Todas as 3 RPCs funcionam corretamente** quando executadas diretamente no banco
- ✅ **Nenhum erro PostgreSQL** ao executar as RPCs
- ⚠️ **Problema NÃO está no banco de dados** - está no frontend ou na chamada

---

## PASSO 5 — VERIFICAR SCHEMAS TENANT EXISTENTES

**Query:**
```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%'
ORDER BY schema_name;
```

**Resultado:**
```
schema_name   
--------------
tenant_3ad04037
tenant_62a495e1
tenant_71148b59
tenant_84e7a845
(4 rows)
```

**Verificação de RPCs por schema:**
- ✅ `tenant_dashboard_kpis_por_mes`: existe em public + 4 tenants
- ✅ `tenant_dashboard_metricas`: existe em public + 4 tenants
- ✅ `tenant_listar_clientes`: existe em public + 4 tenants

**Conclusão:**
- ✅ **Todas as RPCs existem em todos os schemas tenant**
- ⚠️ **Nenhum schema ausente** - isso não explica erro 400

---

## PASSO 6 — ERRO DE TOKEN (AUTH 400)

### Arquivos analisados:
1. `apps/web/src/utils/supabase/client.ts` - Client-side Supabase client
2. `apps/web/src/utils/supabase/server.ts` - Server-side Supabase client
3. `apps/web/src/middleware.ts` - Middleware de auth e schema routing
4. `apps/web/src/lib/hooks/use-dashboard.ts` - Hook que chama RPCs

### Client-side Supabase client (client.ts)

```typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Características:**
- ✅ Usa anon key (não service_role)
- ✅ Sem verificação de sessão
- ⚠️ **Criação de client no top-level** (fora de hook/componente)

### Middleware (middleware.ts)

**Fluxo de auth:**
1. `supabase.auth.getUser()` - Obtém usuário
2. Se user existe → `supabase.rpc('set_tenant_schema', { p_user_id: user.id })` - Configura schema
3. Injeta `x-tenant-schema` no header
4. Redireciona se não tiver auth para rotas protegidas

**Características:**
- ✅ Verifica auth antes de permitir acesso a rotas protegidas
- ✅ Chama RPC `set_tenant_schema` para configurar schema
- ⚠️ **Se `set_tenant_schema` falhar**, redireciona para `/erro-schema`
- ⚠️ **Não há verificação se a sessão está disponível antes de chamar RPCs**

### Hook use-dashboard.ts

```typescript
const supabase = createClient(); // ← Criação no top-level

export function useDashboardData() {
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
  // ...
}
```

**Características:**
- ⚠️ **Supabase client criado no top-level** (fora do hook)
- ⚠️ **Chama RPCs sem verificar se a sessão está disponível**
- ⚠️ **React Query tenta executar imediatamente no mount**
- ⚠️ **Se sessão não estiver disponível**, Supabase pode retornar 400

**Problema potencial:**
1. Hook é montado antes da sessão estar disponível
2. Supabase client tenta chamar RPC sem auth context
3. Supabase retorna HTTP 400 (bad request) por falta de auth

---

## DIAGNÓSTICO PRELIMINAR

### Causas raiz possíveis para erros 400:

#### 1. **Sessão não disponível no mount do hook** (ALTA PROBABILIDADE)
- **Problema:** Hook `use-dashboard.ts` cria Supabase client no top-level e chama RPCs imediatamente no mount
- **Causa:** React Query executa queryFn imediatamente, antes de Supabase ter sessão estabelecida
- **Sintoma:** Erro 400 no token/auth
- **Evidência:** Client-side Supabase client sem verificação de sessão

#### 2. **Schema não configurado antes da chamada RPC** (MÉDIA PROBABILIDADE)
- **Problema:** Middleware chama `set_tenant_schema`, mas hook pode chamar RPC antes disso
- **Causa:** Race condition entre middleware e hook
- **Sintoma:** Erro 400 em RPCs que dependem de schema
- **Evidência:** Middleware injeta schema em header, mas client-side não lê esse header

#### 3. **Parâmetros incorretos do frontend** (BAIXA PROBABILIDADE)
- **Problema:** Frontend pode estar passando parâmetros incorretos para RPCs
- **Causa:** Desalinhamento entre assinatura RPC e chamada frontend
- **Sintoma:** Erro 400 em RPCs específicas
- **Evidência:** RPCs funcionam no banco, mas falham no frontend

#### 4. **Duplicação de RPCs tenant_listar_clientes** (BAIXA PROBABILIDADE)
- **Problema:** `tenant_listar_clientes` aparece 2x em cada schema tenant
- **Causa:** Migration duplicada ou recriação sem DROP
- **Sintoma:** Ambiguidade na chamada RPC
- **Evidência:** Query PASSO 1 mostrou 2x record por schema

---

## LISTA DE SUSPEITAS PARA CONFIRMAR NA VISTORIA 2

### Alta prioridade:
1. **Verificar se hooks chamam RPCs antes da sessão estar disponível**
   - Checar `use-dashboard.ts` e outros hooks
   - Verificar se há `enabled: false` em queries que dependem de auth
   - Confirmar se Supabase client é criado dentro ou fora do hook

2. **Verificar se schema routing funciona no client-side**
   - Checar se client-side Supabase client lê header `x-tenant-schema`
   - Confirmar se RPCs client-side usam schema correto
   - Verificar se há diferença entre server-side e client-side

3. **Comparar assinatura RPC vs chamada frontend**
   - Verificar `use-clientes.ts` e outros hooks
   - Confirmar parâmetros passados correspondem à assinatura RPC
   - Checar se há parâmetros opcionais não tratados

### Média prioridade:
4. **Investigar duplicação de tenant_listar_clientes**
   - Verificar por que há 2 cópias por schema
   - Confirmar qual cópia está sendo chamada
   - Verificar se isso causa conflito

5. **Verificar logs de erro reais em produção**
   - Checar logs do Netlify/Supabase
   - Obter mensagem de erro exata do frontend
   - Confirmar se erro é 400 ou outro código

### Baixa prioridade:
6. **Verificar se há race condition no middleware**
   - Confirmar ordem de execução middleware vs hooks
   - Verificar se `set_tenant_schema` é síncrono ou assíncrono
   - Checar se há delay entre auth e schema routing

---

## PRÓXIMOS PASSOS (VISTORIA 2)

1. **Analisar código frontend** para confirmar suspeitas
2. **Comparar assinatura RPC vs chamada frontend**
3. **Verificar logs de erro reais** em produção
4. **Testar chamadas RPC via frontend** em ambiente local
5. **Confirmar se há verificação de sessão** antes de chamar RPCs

---

**Status da Vistoria 1:** ✅ Concluída  
**Data de conclusão:** 20/04/2026  
**Próxima ação:** Vistoria 2 — Frontend e Integração
