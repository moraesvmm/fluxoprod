# VISTORIA 4 — DIAGNÓSTICO DE ERROS NO MÓDULO DE CRM E CLIENTES

**Data:** 21/04/2026  
**Objetivo:** Identificar causa raiz dos erros 400 e 404 no módulo de CRM e Clientes após 4 tentativas de correção.

---

## LOG DE ERROS

```
[Error] Failed to load resource: the server responded with a status of 400 () (tenant_dashboard_kpis_por_mes, line 0)
[Error] Failed to load resource: the server responded with a status of 400 () (tenant_dashboard_metricas, line 0)
[Error] Failed to load resource: the server responded with a status of 400 () (tenant_listar_clientes, line 0)
[Error] Failed to load resource: the server responded with a status of 404 () (tenant_listar_estoque, line 0)
[Error] Failed to load resource: the server responded with a status of 400 () (tenant_listar_clientes, line 0)
{"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}
```

---

## VISTORIA 1 — CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE NA VERCEL

### Status: ✅ Configuradas

**Variáveis configuradas na Vercel:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Encrypted) - Production, Preview, Development
- `NEXT_PUBLIC_SUPABASE_URL` (Encrypted) - Production, Preview, Development
- `SUPABASE_SERVICE_ROLE_KEY` (Encrypted) - Production, Preview, Development

**Verificação via CLI:**
```bash
vercel env ls
```

**Resultado:** Todas as variáveis necessárias estão configuradas.

---

## VISTORIA 2 — CRIAÇÃO DO SUPABASE CLIENT

### Status: ✅ Correto

**Arquivo: `apps/web/src/utils/supabase/client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Arquivo: `apps/web/src/utils/supabase/server.ts`**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

**Verificação:** O Supabase client está sendo criado corretamente com as variáveis de ambiente.

---

## VISTORIA 3 — RPCs NO BANCO

### Status: ✅ Funcionando

**Teste de RPC no banco:**
```bash
PGPASSWORD='Vmm041126!Database' psql -h db.wkxtlvxotvutycbupfuh.supabase.co -p 5432 -U postgres -d postgres -c "SELECT public.tenant_listar_clientes();"
```

**Resultado:** RPC funciona corretamente (retorna 0 rows).

---

## VISTORIA 4 — MIDDLEWARE

### Status: ✅ Correto

**Arquivo: `apps/web/src/middleware.ts`**

**Verificação de variáveis de ambiente:**
```typescript
const hasSupabaseEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!hasSupabaseEnv) {
  if (!request.nextUrl.pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }
  return NextResponse.next()
}
```

**Verificação:** Middleware verifica se as variáveis de ambiente existem antes de criar o client.

---

## HIPÓTESE DA CAUSA RAIZ

**Erro específico:** `"No API key found in request"` - `"No `apikey` request header or url param was found."`

**Análise:**
1. As variáveis de ambiente estão configuradas na Vercel ✅
2. O Supabase client está sendo criado corretamente ✅
3. As RPCs funcionam no banco ✅
4. O middleware verifica as variáveis de ambiente ✅

**Possível causa:**
O erro "No API key found in request" indica que as chamadas RPC estão sendo feitas SEM a API key, mesmo que as variáveis de ambiente estejam configuradas. Isso pode ocorrer se:

1. **As variáveis de ambiente não estão sendo carregadas no runtime da Vercel** - as variáveis podem estar configuradas mas não injetadas no ambiente de execução
2. **O Supabase client está sendo criado antes das variáveis estarem disponíveis** - race condition no carregamento de variáveis
3. **O middleware está bloqueando as chamadas RPC** - o middleware pode estar interceptando as requisições e removendo os headers

---

## PRÓXIMOS PASSOS

1. **Verificar se as variáveis de ambiente estão sendo carregadas no runtime da Vercel**
   - Adicionar log no middleware para imprimir as variáveis de ambiente
   - Verificar se as variáveis estão disponíveis no console da Vercel

2. **Verificar se há um problema com o middleware**
   - O middleware pode estar interceptando as chamadas RPC
   - Verificar se o middleware está configurado corretamente para permitir chamadas RPC

3. **Verificar se há um problema com o Supabase client no client-side**
   - O createBrowserClient pode não estar recebendo as variáveis de ambiente corretamente
   - Verificar se há um problema com a inicialização do client

---

## STATUS DA VISTORIA

**VISTORIA 1:** ✅ Concluída  
**VISTORIA 2:** ✅ Concluída  
**VISTORIA 3:** ✅ Concluída  
**VISTORIA 4:** ✅ Concluída  

**Próximo passo:** Investigar se as variáveis de ambiente estão sendo carregadas no runtime da Vercel.
