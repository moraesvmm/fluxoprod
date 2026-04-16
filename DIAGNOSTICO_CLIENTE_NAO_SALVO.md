# DIAGNÓSTICO - CLIENTE NÃO ESTÁ SENDO SALVO AO REGISTRAR

**Data:** 15/04/2026
**Problema:** Cliente não está sendo salvo ao registrar, não atualiza informações herdadas do módulo cliente, e não aparece no módulo de Clientes ao tentar registrá-lo
**Status:** Identificado e corrigido

---

## CAUSA RAIZ

### Problema Principal
A tabela `clientes` no schema tenant NÃO tem a coluna `endereco`, mas o frontend envia esse campo no formulário de cadastro.

### Detalhes do Problema

1. **Tabela clientes no schema tenant** (apps/api/supabase_rpc.sql linhas 235-245):
   - Colunas: id, nome, email, telefone, funil_fase, status, criado_em, atualizado_em
   - **SEM coluna endereco**

2. **RPC tenant_criar_cliente no schema tenant** (apps/api/supabase_rpc.sql linhas 975-1023):
   - Parâmetros: p_nome, p_email, p_telefone, p_funil_fase, p_status, p_idempotency_key
   - INSERT INTO clientes (nome, email, telefone, funil_fase, status)
   - **SEM p_endereco e SEM inserção de endereco**

3. **Função createCliente em lib/api.ts** (apps/web/src/lib/api.ts linhas 295-307):
   - Chama RPC com: p_nome, p_email, p_telefone, p_funil_fase, p_status
   - **SEM p_endereco**

4. **CRM page** (apps/web/src/app/tenant/crm/page.tsx linha 30):
   - formData: { nome: '', telefone: '', email: '', endereco: '' }
   - **TEM endereco mas é ignorado**

5. **RPC tenant_listar_clientes no schema tenant** (apps/api/supabase_rpc.sql linhas 721-746):
   - SELECT id, nome, email, telefone, funil_fase, status, criado_em, atualizado_em
   - **SEM endereco no retorno**

6. **RPC public.tenant_listar_clientes**:
   - **NÃO existe** - O frontend chama `supabase.rpc('tenant_listar_clientes')` mas não há RPC no schema public para rotear

---

## CORREÇÕES REALIZADAS

### Correção 1: Script SQL para adicionar coluna endereco
**Arquivo:** `/Users/macbook/fluxoprod/CORRECAO_ADICIONAR_ENDERECO_CLIENTES.sql`

**O que faz:**
1. Adiciona coluna `endereco TEXT` na tabela `clientes` de todos os schemas tenant
2. Atualiza RPC `tenant_criar_cliente` em todos os schemas tenant para aceitar e inserir `p_endereco`
3. Atualiza RPC `public.tenant_criar_cliente` para aceitar e passar `p_endereco`
4. Cria RPC `public.tenant_listar_clientes` para rotear para o schema tenant
5. Verifica se as RPCs foram atualizadas

### Correção 2: Atualizar função createCliente em lib/api.ts
**Arquivo:** `/Users/macbook/fluxoprod/apps/web/src/lib/api.ts` linha 295-307

**Antes:**
```typescript
export async function createCliente(cliente: ClienteCreate): Promise<Cliente> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_cliente', {
      p_nome: cliente.nome,
      p_email: cliente.email,
      p_telefone: cliente.telefone,
      p_funil_fase: 'lead',
      p_status: 'ativo'
    });
  if (error) throw new Error(error.message);
  return { id: data?.cliente_id, ...cliente, criado_em: new Date().toISOString() } as Cliente;
}
```

**Depois:**
```typescript
export async function createCliente(cliente: ClienteCreate): Promise<Cliente> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_cliente', {
      p_nome: cliente.nome,
      p_email: cliente.email,
      p_telefone: cliente.telefone,
      p_endereco: cliente.endereco,
      p_funil_fase: 'lead',
      p_status: 'ativo'
    });
  if (error) throw new Error(error.message);
  return { id: data?.cliente_id, ...cliente, criado_em: new Date().toISOString() } as Cliente;
}
```

### Correção 3: Atualizar RPC tenant_listar_clientes no schema tenant
**Arquivo:** `/Users/macbook/fluxoprod/apps/api/supabase_rpc.sql` linhas 720-746

**Antes:**
```sql
CREATE OR REPLACE FUNCTION %I.tenant_listar_clientes(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
RETURNS TABLE (
  id UUID,
  nome VARCHAR(255),
  email VARCHAR(255),
  telefone VARCHAR(50),
  funil_fase VARCHAR(50),
  status VARCHAR(50),
  criado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = %I
AS $func$
BEGIN
  RETURN QUERY 
  SELECT 
    id, nome, email, telefone, funil_fase, status, criado_em, atualizado_em 
  FROM clientes 
  ORDER BY criado_em DESC 
  LIMIT p_limit OFFSET p_offset;
END;
$func$;
```

**Depois:**
```sql
CREATE OR REPLACE FUNCTION %I.tenant_listar_clientes(p_limit INT DEFAULT 1000, p_offset INT DEFAULT 0)
RETURNS TABLE (
  id UUID,
  nome VARCHAR(255),
  email VARCHAR(255),
  telefone VARCHAR(50),
  endereco TEXT,
  funil_fase VARCHAR(50),
  status VARCHAR(50),
  criado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = %I
AS $func$
BEGIN
  RETURN QUERY 
  SELECT 
    id, nome, email, telefone, endereco, funil_fase, status, criado_em, atualizado_em 
  FROM clientes 
  ORDER BY criado_em DESC 
  LIMIT p_limit OFFSET p_offset;
END;
$func$;
```

---

## INSTRUÇÕES PARA RESOLVER O PROBLEMA

### Passo 1: Executar script SQL no Supabase
1. Acessar Supabase Dashboard
2. Navegar para SQL Editor
3. Abrir arquivo `/Users/macbook/fluxoprod/CORRECAO_ADICIONAR_ENDERECO_CLIENTES.sql`
4. Executar o script
5. Verificar se a coluna `endereco` foi adicionada em todos os schemas tenant
6. Verificar se as RPCs foram atualizadas

### Passo 2: Verificar correções no frontend
1. Verificar se a função `createCliente` em `lib/api.ts` foi atualizada (já atualizada)
2. Verificar se a RPC `tenant_listar_clientes` no schema tenant foi atualizada (já atualizada)
3. Verificar se a RPC `public.tenant_listar_clientes` foi criada (já criada no script SQL)

### Passo 3: Testar cadastro de cliente
1. Acessar o módulo CRM
2. Tentar cadastrar um novo cliente com endereço
3. Verificar se o cliente aparece na lista
4. Verificar se o endereço foi salvo corretamente

---

## RESUMO DAS CORREÇÕES

### Arquivos Modificados
1. `/Users/macbook/fluxoprod/CORRECAO_ADICIONAR_ENDERECO_CLIENTES.sql` - Criado
2. `/Users/macbook/fluxoprod/apps/web/src/lib/api.ts` - Atualizado (linha 301)
3. `/Users/macbook/fluxoprod/apps/api/supabase_rpc.sql` - Atualizado (linha 727, 740)

### O que foi corrigido
1. Adicionada coluna `endereco` na tabela `clientes` de todos os schemas tenant
2. Atualizada RPC `tenant_criar_cliente` em todos os schemas tenant para aceitar e inserir `p_endereco`
3. Atualizada RPC `public.tenant_criar_cliente` para aceitar e passar `p_endereco`
4. Criada RPC `public.tenant_listar_clientes` para rotear para o schema tenant
5. Atualizada função `createCliente` em lib/api.ts para passar `p_endereco`
6. Atualizada RPC `tenant_listar_clientes` no schema tenant para incluir `endereco` no retorno

### Próximos passos
1. Executar script SQL no Supabase Dashboard
2. Testar cadastro de cliente
3. Verificar se o cliente aparece na lista
4. Verificar se o endereço foi salvo corretamente

---

## REFERÊNCIAS

- DOCUMENTACAO_TECNICA.md - Arquitetura do sistema
- apps/api/supabase_rpc.sql - Definição das RPCs
- apps/web/src/lib/api.ts - Funções API
- apps/web/src/app/tenant/crm/page.tsx - Página CRM
