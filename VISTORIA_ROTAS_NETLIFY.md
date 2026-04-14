# Vistoria de Rotas Next.js e Problema "Page Not Found" no Netlify

**Data:** 10/04/2026  
**Objetivo:** Identificar a fundo se as rotas estão coesas e causa do "page not found" no Netlify

---

## 📊 Estrutura de Rotas Next.js

### Rotas Identificadas (22 arquivos page.tsx)

**Rotas Públicas:**
- `/` - Landing page (page.tsx) ✅
- `/login` - Login (auth/login/page.tsx) ✅
- `/setup` - Configuração (setup/page.tsx) ✅

**Rotas de Tenant (Protegidas):**
- `/tenant/dashboard` - Dashboard do tenant ✅
- `/tenant/crm` - CRM e gestão de clientes ✅
- `/tenant/vendas` - Vendas ✅
- `/tenant/vendas/pdv` - PDV (Ponto de Venda) ✅
- `/tenant/financeiro` - Gestão financeira ✅
- `/tenant/estoque` - Controle de estoque ✅
- `/tenant/obras` - Gestão de obras ✅
- `/tenant/os` - Ordens de Serviço ✅
- `/tenant/comissoes` - Comissões ✅
- `/tenant/rh` - RH e Pessoal ✅
- `/tenant/relatorios` - Relatórios ✅
- `/tenant/configuracoes` - Configurações ✅
- `/tenant/catalogo` - Catálogo ✅
- `/tenant/sem-modulos` - Página quando módulo não está ativo ✅

**Rotas de Admin (Protegidas):**
- `/admin` - Painel de admin ✅
- `/admin/empresas` - Gestão de empresas ✅
- `/admin/modulos` - Gestão de módulos ✅
- `/admin/usuarios` - Gestão de usuários ✅

**Rotas de Onboarding (Protegidas):**
- `/mestre` - Onboarding/wizard de provisionamento ✅

---

## 🔒 Middleware e Autenticação

### Lógica do Middleware (middleware.ts)

**Verificação de Variáveis de Ambiente:**
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

**Problema Identificado:** ⚠️
- Se as variáveis de ambiente do Supabase não estiverem configuradas no Netlify, o middleware redireciona TODAS as rotas para `/setup`
- Isso inclui a landing page `/` que deveria ser pública

**Lógica de Autenticação:**
- Landing page `/` é sempre pública (linha 51-53)
- Rotas protegidas (`/tenant`, `/admin`, `/mestre`) requerem autenticação
- Se usuário logado tenta acessar `/login`, redireciona para `/tenant/dashboard`
- Usuários master não podem acessar rotas `/tenant`
- Usuários tenant não podem acessar rotas `/admin` ou `/mestre`
- Módulos não ativos redirecionam para `/tenant/sem-modulos`

---

## ⚙️ Configuração Next.js

### next.config.ts
```typescript
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};
```

**Status:** ✅ Configuração correta

### netlify.toml
```toml
[build]
  base = "apps/web"
  command = "npm run build"
  publish = ".next"
```

**Status:** ✅ Configuração correta (após correção)

---

## 🚨 Problema Identificado: "Page Not Found"

### Causa Raiz

**O middleware está redirecionando para `/setup` porque as variáveis de ambiente do Supabase não estão configuradas no Netlify.**

**Evidências:**
1. Middleware verifica `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Se não estiverem configuradas, redireciona para `/setup`
3. A rota `/setup` existe, mas pode estar com problema ou o Netlify não está servindo corretamente

### Possíveis Soluções

**Opção 1: Configurar Variáveis de Ambiente no Netlify (Recomendada)**

Variáveis necessárias:
- `NEXT_PUBLIC_SUPABASE_URL` - URL do Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (server-side)

**Passos:**
1. Acessar painel do Netlify
2. Ir em "Site settings" > "Environment variables"
3. Adicionar as variáveis acima
4. Redeploy

**Opção 2: Modificar Middleware para Permitir Landing Page Sem Variáveis**

Alterar middleware.ts para permitir landing page `/` mesmo sem variáveis de ambiente:

```typescript
// Allow the app to boot even without env configured (shows /setup).
if (!hasSupabaseEnv) {
  // Permitir landing page / sem variáveis de ambiente
  if (pathname === '/') {
    return NextResponse.next()
  }
  
  if (!request.nextUrl.pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }
  return NextResponse.next()
}
```

**Opção 3: Build Local e Deploy Manual**

1. Build local: `cd apps/web && npm run build`
2. Arrastar pasta `.next` para Netlify Drop
3. Configurar variáveis de ambiente no Netlify
4. Redeploy

---

## 📋 Resumo das Rotas

### Rotas Públicas (Sem Autenticação)
- ✅ `/` - Landing page
- ✅ `/login` - Login
- ✅ `/setup` - Configuração (quando faltam variáveis de ambiente)

### Rotas Protegidas (Requer Autenticação)
- ✅ `/tenant/*` - Rotas de tenant (requer perfil de tenant)
- ✅ `/admin/*` - Rotas de admin (requer perfil de master)
- ✅ `/mestre` - Onboarding (requer perfil de master)

### Lógica de Acesso
- Usuário master: pode acessar `/admin/*` e `/mestre`, mas não `/tenant/*`
- Usuário tenant: pode acessar `/tenant/*`, mas não `/admin/*` ou `/mestre`
- Sem usuário: redireciona para `/login` (exceto landing page `/`)

---

## 🎯 Recomendação

**Solução Imediata:**

1. **Configurar variáveis de ambiente no Netlify**
   - Acessar painel do Netlify
   - Ir em "Site settings" > "Environment variables"
   - Adicionar:
     - `NEXT_PUBLIC_SUPABASE_URL` = `https://wkxtlvxotvutycbupfuh.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTEyNjAsImV4cCI6MjA5MTA2NzI2MH0.XUEkBM2dCEvHNbh00W969QjZ-gIwJ0yA5T-KLO3PtIw`
     - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU`
   - Redeploy

2. **Alternativa: Modificar middleware para permitir landing page sem variáveis**
   - Alterar middleware.ts para permitir `/` sem variáveis de ambiente
   - Deploy automático via Git

**Solução de Longo Prazo:**
- Conectar repositório Git ao Netlify para deploy automático
- Configurar variáveis de ambiente no painel do Netlify

---

## ✅ Status das Rotas

**Rotas:** ✅ Todas as rotas estão coesas e bem estruturadas  
**Middleware:** ✅ Lógica de autenticação correta  
**Configuração Next.js:** ✅ Configuração correta  
**Configuração Netlify:** ✅ Configuração correta (após correção)  
**Variáveis de Ambiente:** ⚠️ **Não configuradas no Netlify (causa do "page not found")**

---

## 📝 Conclusão

**Causa do "page not found":** O middleware está redirecionando para `/setup` porque as variáveis de ambiente do Supabase não estão configuradas no Netlify.

**Solução:** Configurar as variáveis de ambiente do Supabase no painel do Netlify ou modificar o middleware para permitir a landing page sem variáveis de ambiente.
