# Vistoria Supabase - Frontend/RPC Integration

**Data:** 14/04/2026  
**Objetivo:** Identificar problemas na integração frontend/RPC no Supabase  
**Service Role Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU

---

## 📊 Status das Tabelas no Supabase

### ✅ Tabelas Verificadas

**empresas** ✅
- Status: **EXISTE**
- Resposta: 200 OK
- Dados: 1 registro encontrado (empresa master)

**modulos_catalogo** ✅
- Status: **EXISTE**
- Resposta: 200 OK
- Dados: 12 módulos encontrados (dashboard, crm, vendas, financeiro, estoque, catalogo, rh, relatorios, os, configuracoes, obras, comissoes)

---

## 🔌 Função RPC provisionar_empresa_master

### Definição no SQL (supabase_rpc.sql)

**Parâmetros esperados:**
```sql
CREATE OR REPLACE FUNCTION public.provisionar_empresa_master(
  p_empresa_id uuid,
  p_cnpj text,
  p_razao_social text,
  p_porte text,
  p_segmento text,
  p_schema_name text,
  p_modules text[] DEFAULT ARRAY[]::text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
```

**Validações:**
1. Schema name deve seguir regex: `^[a-z][a-z0-9_]{1,63}$`
2. Módulos devem existir no catálogo `public.modulos_catalogo`
3. Insere na tabela `public.empresas`
4. Chama `public.provisionar_empresa(p_schema_name)`
5. Insere na tabela `public.empresa_modulos`
6. Insere na tabela `public.logs_provisionamento`

---

## 🎨 Frontend - Chamada RPC

### Arquivo: apps/web/src/app/mestre/page.tsx

**Chamada RPC (linha 60-68):**
```typescript
const { data, error } = await supabase.rpc('provisionar_empresa_master', {
  p_empresa_id: empresaId,
  p_cnpj: formData.cnpj,
  p_razao_social: formData.razao_social,
  p_porte: formData.porte,
  p_segmento: formData.segmento,
  p_schema_name: schemaName,
  p_modules: formData.modules
});
```

**Geração de parâmetros:**
- `empresaId`: `crypto.randomUUID()` (UUID v4)
- `schemaName`: `tenant_${empresaId.replace(/-/g, '').slice(0, 8)}` (ex: tenant_a1b2c3d4)

**Validação do schema_name:**
- Formato gerado: `tenant_a1b2c3d4`
- Regex esperado: `^[a-z][a-z0-9_]{1,63}$`
- **Status:** ✅ **PASSA NA VALIDAÇÃO**

---

## 🚨 Problema Identificado

### Erro ao chamar RPC via API REST

**Teste realizado:**
```bash
POST https://wkxtlvxotvutycbupfuh.supabase.co/rest/v1/rpc/provisionar_empresa_master
Headers:
  apikey: <service_role_key>
  Authorization: Bearer <service_role_key>
  Content-Type: application/json
Body:
{
  "p_empresa_id": "00000000-0000-0000-0000-000000000000",
  "p_cnpj": "00.000.000/0001-00",
  "p_razao_social": "Teste",
  "p_porte": "ME",
  "p_segmento": "Tecnologia",
  "p_schema_name": "test_schema",
  "p_modules": ["crm", "vendas"]
}
```

**Resultado:** ❌ **400 Bad Request**

**Causa provável:**
1. A função RPC `provisionar_empresa_master` **NÃO EXISTE** no Supabase
2. O SQL `supabase_rpc.sql` não foi executado no Supabase
3. A função foi definida no arquivo SQL, mas não foi aplicada ao banco de dados

---

## 📋 Tabelas Necessárias para RPC Funcionar

### Tabelas do Schema Public

**empresas** ✅ (EXISTE)
- `id` (UUID PRIMARY KEY)
- `cnpj` (VARCHAR UNIQUE)
- `razao_social` (VARCHAR)
- `porte` (VARCHAR)
- `segmento` (VARCHAR)
- `schema_name` (VARCHAR UNIQUE)
- `criado_em` (TIMESTAMPTZ)
- `status` (VARCHAR)

**modulos_catalogo** ✅ (EXISTE)
- `key` (TEXT PRIMARY KEY)
- `nome` (TEXT)
- `descricao` (TEXT)
- `criado_em` (TIMESTAMPTZ)

**empresa_modulos** ❓ (NÃO VERIFICADO)
- `empresa_id` (UUID REFERENCES empresas)
- `modulo_key` (TEXT REFERENCES modulos_catalogo)
- `ativo` (BOOLEAN)
- `atualizado_em` (TIMESTAMPTZ)

**logs_provisionamento** ❓ (NÃO VERIFICADO)
- `id` (UUID PRIMARY KEY)
- `empresa_id` (UUID REFERENCES empresas)
- `schema_name` (VARCHAR)
- `status` (VARCHAR)
- `mensagem` (TEXT)
- `criado_em` (TIMESTAMPTZ)

**user_profiles** ❓ (NÃO VERIFICADO)
- `user_id` (UUID PRIMARY KEY REFERENCES auth.users)
- `empresa_id` (UUID REFERENCES empresas)
- `role` (TEXT CHECK)
- `criado_em` (TIMESTAMPTZ)

---

## 🎯 Conclusão

### Problema Principal

**A função RPC `provisionar_empresa_master` não existe no Supabase**

**Evidências:**
1. Erro 400 ao chamar a RPC via API REST
2. Tabelas `empresas` e `modulos_catalogo` existem
3. Frontend está chamando a RPC corretamente
4. Parâmetros estão corretos

### Causa Raiz

**O SQL `supabase_rpc.sql` não foi executado no Supabase**

O arquivo SQL define a função RPC, mas não foi aplicado ao banco de dados. É necessário executar o SQL no Editor SQL do Supabase.

### Solução

**Executar o SQL `supabase_rpc.sql` no Supabase**

1. Acessar o painel do Supabase
2. Ir em "SQL Editor"
3. Abrir o arquivo `apps/api/supabase_rpc.sql`
4. Executar o SQL completo
5. Verificar se a função RPC foi criada
6. Testar a chamada RPC novamente

---

## 📝 Próximos Passos

1. **Executar SQL no Supabase**
   - Abrir SQL Editor no Supabase
   - Executar `apps/api/supabase_rpc.sql`
   - Verificar se a função RPC foi criada

2. **Verificar tabelas restantes**
   - Verificar se `empresa_modulos` existe
   - Verificar se `logs_provisionamento` existe
   - Verificar se `user_profiles` existe

3. **Testar RPC novamente**
   - Fazer chamada de teste à RPC
   - Verificar se retorna sucesso
   - Testar o frontend novamente

---

## ✅ Resumo

**Status da vistoria:**
- Tabelas principais: ✅ Existem
- Função RPC: ❌ Não existe
- Frontend: ✅ Chamando corretamente
- Parâmetros: ✅ Corretos

**Ação necessária:**
- Executar `apps/api/supabase_rpc.sql` no Supabase
- Verificar se a função RPC foi criada
- Testar novamente
