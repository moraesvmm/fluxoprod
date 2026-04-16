# DIAGNÓSTICO - POR QUE O RESEND NÃO ESTÁ ENVIANDO E-MAILS

**Data:** 15/04/2026
**Problema:** Resend não está enviando e-mails aos novos users
**Status:** Identificadas 3 causas principais

---

## CAUSAS IDENTIFICADAS

### CAUSA 1: Edge Function Não Deployada (CRÍTICA)
**Descrição:** A Edge Function `send-email` existe localmente mas não está deployada no Supabase
**Localização:** `/Users/macbook/fluxoprod/supabase/functions/send-email/index.ts`
**Problema:** Edge Functions não podem ser deployadas via CLI, precisam de deploy manual via dashboard
**Impacto:** CRÍTICO - Sem a Edge Function deployada, nenhum e-mail pode ser enviado
**Evidência:** DOCUMENTACAO_TECNICA.md linha 716: "Edge Functions: Deploy via dashboard (CLI não disponível)"
**Evidência:** VISTORIAS.md linha 100: "Edge Function de e-mail precisa ser deployada via dashboard (CLI não disponível)"

### CAUSA 2: RESEND_API_KEY Não Configurada (CRÍTICA)
**Descrição:** A variável de ambiente `RESEND_API_KEY` não está configurada no Supabase
**Localização:** Edge Function `send-email` linha 4-5
**Problema:** A Edge Function retorna erro 500 se `RESEND_API_KEY` não estiver configurada
**Impacto:** CRÍTICO - Sem a API key, a Edge Function não pode autenticar com a API do Resend
**Código:**
```typescript
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

// Validação da API key
if (!RESEND_API_KEY) {
  return new Response('RESEND_API_KEY not configured', { 
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### CAUSA 3: RESEND_FROM_EMAIL Usando Default (ALTA)
**Descrição:** A variável de ambiente `RESEND_FROM_EMAIL` não está configurada, usando default 'onboarding@resend.dev'
**Localização:** Edge Function `send-email` linha 5
**Problema:** O remetente padrão 'onboarding@resend.dev' pode não funcionar corretamente ou pode estar bloqueado
**Impacto:** ALTA - E-mails podem ser enviados mas com remetente incorreto ou podem ser bloqueados
**Evidência:** DOCUMENTACAO_TECNICA.md linha 717: "Environment Variables: RESEND_API_KEY, RESEND_FROM_EMAIL"
**Evidência:** VISTORIAS.md linha 101: "API key do Resend configurada mas e-mail remetente padrão é `onboarding@resend.dev`"
**Evidência:** implementacoes_futuras_melhorias.md linhas 217-240: "Verificação de E-mail no Resend"

---

## FLUXO DE ENVIO DE E-MAIL

### 1. Frontend (CRM)
**Arquivo:** `/Users/macbook/fluxoprod/apps/web/src/app/tenant/crm/page.tsx`
**Código:**
```typescript
import { sendEmail } from "@/lib/hooks/use-email";

// Após criar cliente
await sendEmail({
  to: formData.email,
  subject: 'Bem-vindo ao Fluxo!',
  html: emailHtml
});
```

### 2. Hook (use-email.ts)
**Arquivo:** `/Users/macbook/fluxoprod/apps/web/src/lib/hooks/use-email.ts`
**Código:**
```typescript
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html }
    });

    if (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao invocar função de e-mail:', error);
    throw error;
  }
}
```

### 3. Edge Function (send-email)
**Arquivo:** `/Users/macbook/fluxoprod/supabase/functions/send-email/index.ts`
**Código:**
```typescript
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

Deno.serve(async (req) => {
  // Validação da API key
  if (!RESEND_API_KEY) {
    return new Response('RESEND_API_KEY not configured', { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });
  
  // ...
});
```

---

## SOLUÇÕES

### SOLUÇÃO 1: Deploy da Edge Function (IMEDIATO)
**Passos:**
1. Acessar Supabase Dashboard
2. Navegar para Edge Functions
3. Criar nova Edge Function chamada `send-email`
4. Copiar o conteúdo de `/Users/macbook/fluxoprod/supabase/functions/send-email/index.ts`
5. Colar no editor da Edge Function
6. Deploy da Edge Function
7. Testar a Edge Function

**Comando para testar:**
```bash
curl -X POST https://wkxtlvxotvuttycbupfuh.supabase.co/functions/v1/send-email \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"to": "test@example.com", "subject": "Test", "html": "<h1>Test</h1>"}'
```

### SOLUÇÃO 2: Configurar RESEND_API_KEY (IMEDIATO)
**Passos:**
1. Acessar Supabase Dashboard
2. Navegar para Edge Functions
3. Clicar na Edge Function `send-email`
4. Navegar para Environment Variables
5. Adicionar variável `RESEND_API_KEY`
6. Colar a API key do Resend
7. Salvar
8. Redeploy da Edge Function

**Obter API key do Resend:**
1. Acessar https://resend.com/api-keys
2. Criar nova API key
3. Copiar a API key

### SOLUÇÃO 3: Configurar RESEND_FROM_EMAIL (ALTA PRIORIDADE)
**Passos:**
1. Acessar https://resend.com/domains
2. Adicionar domínio ou e-mail pessoal
3. Verificar o e-mail (clicar no link de confirmação)
4. Copiar o e-mail verificado
5. Acessar Supabase Dashboard
6. Navegar para Edge Functions → send-email
7. Navegar para Environment Variables
8. Adicionar variável `RESEND_FROM_EMAIL`
9. Colar o e-mail verificado
10. Salvar
11. Redeploy da Edge Function

**Evidência:** implementacoes_futuras_melhorias.md linhas 217-240

---

## VERIFICAÇÃO

### Verificar se Edge Function está deployada
**Passos:**
1. Acessar Supabase Dashboard
2. Navegar para Edge Functions
3. Verificar se `send-email` aparece na lista

### Verificar se Environment Variables estão configuradas
**Passos:**
1. Acessar Supabase Dashboard
2. Navegar para Edge Functions → send-email
3. Navegar para Environment Variables
4. Verificar se `RESEND_API_KEY` está configurada
5. Verificar se `RESEND_FROM_EMAIL` está configurada

### Verificar logs da Edge Function
**Passos:**
1. Acessar Supabase Dashboard
2. Navegar para Edge Functions → send-email
3. Navegar para Logs
4. Verificar se há erros nos logs

---

## ERROS POSSÍVEIS

### Erro 1: "Function not found"
**Causa:** Edge Function não está deployada
**Solução:** Deploy da Edge Function (Solução 1)

### Erro 2: "RESEND_API_KEY not configured"
**Causa:** Variável de ambiente `RESEND_API_KEY` não está configurada
**Solução:** Configurar `RESEND_API_KEY` (Solução 2)

### Erro 3: "Invalid from address"
**Causa:** `RESEND_FROM_EMAIL` está usando default 'onboarding@resend.dev' ou e-mail não verificado
**Solução:** Configurar `RESEND_FROM_EMAIL` com e-mail verificado (Solução 3)

### Erro 4: "Unauthorized"
**Causa:** `RESEND_API_KEY` está incorreta ou inválida
**Solução:** Verificar API key do Resend, atualizar se necessário

---

## RESUMO

### Causas Principais
1. Edge Function não está deployada no Supabase (CRÍTICA)
2. RESEND_API_KEY não está configurada (CRÍTICA)
3. RESEND_FROM_EMAIL está usando default 'onboarding@resend.dev' (ALTA)

### Soluções Imediatas
1. Deploy da Edge Function `send-email` via Supabase Dashboard
2. Configurar `RESEND_API_KEY` nas Environment Variables
3. Configurar `RESEND_FROM_EMAIL` com e-mail verificado

### Prioridade
- **IMEDIATO:** Deploy da Edge Function + Configurar RESEND_API_KEY
- **ALTA:** Configurar RESEND_FROM_EMAIL com e-mail verificado

---

## REFERÊNCIAS

- DOCUMENTACAO_TECNICA.md linha 716-717
- VISTORIAS.md linha 100-101
- implementacoes_futuras_melhorias.md linhas 217-240
- ESTUDO_SISTEMA_LEITURA4_CONSOLIDACAO_VALIDACAO.md linhas 101-105
