# SESSION STATE - Módulo Produtos/Estoque

**Data:** 18/04/2026  
**Objetivo:** Documentação completa do estado atual do sistema e plano de implementação de funcionalidades avançadas para o módulo Produtos/Estoque

---

## 1. ARQUITETURA E PADRÕES IDENTIFICADOS

### 1.1. Arquitetura do Sistema

**Tipo:** SaaS B2B Nível 2 multi-tenant  
**Stack:** Next.js 16.2.2 + React 19.2.4 + TypeScript + Supabase (PostgreSQL)  
**Isolamento:** Um schema PostgreSQL por tenant (ex: tenant_62a495e1)  
**Schema Routing:** RPC `set_tenant_schema()` configura `search_path` baseado em `user_profiles`

### 1.2. Estrutura de Pastas

```
apps/
├── api/
│   └── supabase_rpc.sql (Script de provisionamento e RPCs)
└── web/
    └── src/
        ├── app/tenant/
        │   ├── catalogo/page.tsx (Página de catálogo de produtos)
        │   └── estoque/page.tsx (Página de controle de estoque)
        ├── lib/
        │   ├── api.ts (Funções API centralizadas)
        │   └── hooks/
        │       └── use-produtos.ts (React Query hooks)
        └── utils/supabase/
            ├── client.ts (Browser client)
            └── server.ts (Server client)
```

### 1.3. Padrões de RPC (OBRIGATÓRIO)

**Estrutura padrão de RPC:**
```sql
CREATE OR REPLACE FUNCTION tenant_nome_funcao(
  p_parametro1 TIPO,
  p_parametro2 TIPO,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = current_schema, public
AS $func$
DECLARE
  v_result JSONB;
  v_cached_result JSONB;
BEGIN
  -- Verificar idempotência (para RPCs de escrita)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_cached_result
    FROM idempotency_control
    WHERE idempotency_key = p_idempotency_key
      AND operation_type = 'tenant_nome_funcao';
    
    IF v_cached_result IS NOT NULL THEN
      RETURN v_cached_result;
    END IF;
  END IF;

  -- Lógica principal
  -- INSERT/UPDATE/DELETE

  v_result := jsonb_build_object('success', true, 'id', v_id);

  -- Cache resultado se idempotency_key fornecido
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO idempotency_control (idempotency_key, operation_type, result)
    VALUES (p_idempotency_key, 'tenant_nome_funcao', v_result);
  END IF;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$func$;
```

**Características obrigatórias:**
- Todas as RPCs retornam JSONB
- RPCs de escrita usam `p_idempotency_key` com valor padrão NULL
- Security DEFINER
- SET search_path = current_schema, public
- Tratamento de exceções com EXCEPTION WHEN OTHERS
- Idempotência via tabela `idempotency_control`

### 1.4. Padrões de Frontend API

**Estrutura padrão de função API:**
```typescript
export async function nomeFuncao(parametros): Promise<Retorno> {
  const { data, error } = await getSupabase()
    .rpc('tenant_nome_funcao', {
      p_parametro1: valor1,
      p_parametro2: valor2,
    });
  
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data || [];
}
```

**Características:**
- Usa `getSupabase()` do client.ts
- Chama RPC via `.rpc()`
- Tratamento de erro padrão
- TypeScript estrito com interfaces

### 1.5. Padrões de React Query Hooks

**Estrutura padrão de hook:**
```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProdutos, createProduto, deleteProduto, updateProduto } from "@/lib/api";

const KEY = ["nome_entidade"] as const;

export function useNomeEntidade() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchNomeEntidade,
  });
}

export function useCreateNomeEntidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNomeEntidade,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
```

**Características:**
- "use client" no topo
- Query key constante
- Invalidação automática após mutações
- TypeScript estrito

### 1.6. Padrões de Tabelas

**Estrutura padrão de tabela:**
```sql
CREATE TABLE IF NOT EXISTS nome_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo1 TIPO NOT NULL,
  campo2 TIPO,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_nome_tabela_campo ON nome_tabela(campo);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION trigger_atualizar_nome_tabela()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_nome_tabela
BEFORE UPDATE ON nome_tabela
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_nome_tabela();
```

**Características obrigatórias:**
- Primary key UUID com gen_random_uuid()
- Timestamps criado_em e atualizado_em
- Índices em colunas frequentemente consultadas
- Trigger para atualizar atualizado_em automaticamente

### 1.7. Multi-tenancy e Schema Routing

**Fluxo de schema routing:**
1. Middleware Next.js intercepta request
2. Middleware busca `user_profiles.empresa_id` e `empresas.schema_name`
3. Middleware chama RPC `set_tenant_schema(p_user_id)`
4. RPC configura `search_path = schema_name, public`
5. Header `x-tenant-schema` injetado no response
6. Requisições subsequentes usam schema correto

### 1.8. Regras Globais do Usuário

**Memories[user_global] - Regras obrigatórias:**
- Utilizar sempre a service_role e o MCP do Supabase para auxiliar nas ações e investigações
- SERVICE_ROLE: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU
- Sempre que alterar algo no banco de dados que acarreta em mudança no frontend, realize a alteração no frontend também
- Os códigos .py são código-morto e não devem ser utilizados
- Sempre agir com base nos documentos técnicos e vistorias
- Utilize a DOCUMENTACAO_TECNICA.md e VISTORIAS.md como base da verdade do sistema
- Sempre que fizermos no mínimo 3 alterações no código-fonte, deve alterar a documentação VISTORIAS.md
- Sempre que implementarmos novas funções nos módulos ou sistema, deve-se atualizar os cards informativos do módulo respectivo na página de "checkout"
- Utilize a Management Key para executar comandos SQL: sbp_0e26ffabc310da35d676e8bbe9cf508740520bf9
- Utilize a URI para executar comandos SQL: postgresql://postgres:Vmm041126!Database@db.wkxtlvxotvutycbupfuh.supabase.co:5432/postgres

---

## 2. ESTADO ATUAL DO MÓDULO PRODUTOS/ESTOQUE

### 2.1. Tabelas Existentes

**Tabela `produtos` (criada em provisionar_empresa):**
```sql
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) DEFAULT 'produto' CHECK (tipo IN ('produto', 'servico')),
  preco_base NUMERIC(10, 2) NOT NULL CHECK (preco_base >= 0),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Colunas presentes em `produtos`:**
- id (UUID, PK)
- nome (VARCHAR(255), NOT NULL)
- descricao (TEXT)
- tipo (VARCHAR(50), DEFAULT 'produto', CHECK IN ('produto', 'servico'))
- preco_base (NUMERIC(10,2), NOT NULL, CHECK >= 0)
- categoria (VARCHAR(100)) - ADICIONADO 18/04/2026
- custo_unitario (NUMERIC(10,2), CHECK >= 0) - ADICIONADO 18/04/2026
- metodo_valoracao (VARCHAR(50), DEFAULT 'custo_medio', CHECK IN ('custo_medio', 'fifo', 'lifo')) - ADICIONADO 18/04/2026
- codigo_barras (VARCHAR(50)) - ADICIONADO 18/04/2026
- codigo_qr (TEXT) - ADICIONADO 18/04/2026
- criado_em (TIMESTAMPTZ, DEFAULT NOW())
- atualizado_em (TIMESTAMPTZ, DEFAULT NOW())

**Índices existentes em `produtos`:**
- idx_produtos_nome (nome)
- idx_produtos_tipo (tipo)
- idx_produtos_preco_base (preco_base)
- idx_produtos_categoria (categoria) - ADICIONADO 18/04/2026
- idx_produtos_codigo_barras (codigo_barras) - ADICIONADO 18/04/2026

**NÃO EXISTEM:**
- ~~codigo_barras (para códigos de barras/QR)~~ ✅ IMPLEMENTADO 18/04/2026
- ~~codigo_qr (para QR codes)~~ ✅ IMPLEMENTADO 18/04/2026
- ~~metodo_valoracao (para FIFO/LIFO/custo médio)~~ ✅ IMPLEMENTADO 18/04/2026

---

**Tabela `estoque` (criada em provisionar_empresa):**
```sql
CREATE TABLE IF NOT EXISTS estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  sku VARCHAR(100) UNIQUE,
  quantidade INTEGER DEFAULT 0 CHECK (quantidade >= 0),
  quantidade_minima INTEGER DEFAULT 10 CHECK (quantidade_minima > 0),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Colunas presentes em `estoque`:**
- id (UUID, PK)
- produto_id (UUID, FK para produtos.id ON DELETE SET NULL)
- sku (VARCHAR(100), UNIQUE)
- quantidade (INTEGER, DEFAULT 0, CHECK >= 0)
- quantidade_minima (INTEGER, DEFAULT 10, CHECK > 0)
- atualizado_em (TIMESTAMPTZ, DEFAULT NOW())

**Índices existentes em `estoque`:**
- idx_estoque_produto (produto_id)
- idx_estoque_quantidade (quantidade)
- idx_estoque_sku (sku)

**NÃO EXISTEM:**
- local_id (para movimentação entre locais)
- tipo_movimentacao (para histórico de movimentações)
- data_movimentacao (para histórico)
- motivo (para histórico)

**NÃO EXISTEM TABELAS:**
- ~~locais_estoque (para gestão de múltiplos locais)~~ ✅ IMPLEMENTADO 18/04/2026
- ~~estoque_por_local (para estoque por local)~~ ✅ IMPLEMENTADO 18/04/2026
- ~~transferencias_estoque (para transferências entre locais)~~ ✅ IMPLEMENTADO 18/04/2026
- ~~kits (para gestão de kits/bundles)~~ ✅ IMPLEMENTADO 18/04/2026
- ~~kit_itens (para itens de kits)~~ ✅ IMPLEMENTADO 18/04/2026
- ~~previsoes_demanda (para previsão de demanda)~~ ✅ IMPLEMENTADO 18/04/2026

**Tabela `locais_estoque` (criada 18/04/2026 - Sessão 3):**
```sql
CREATE TABLE IF NOT EXISTS locais_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('filial', 'deposito', 'loja')),
  endereco TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Colunas presentes em `locais_estoque`:**
- id (UUID, PK)
- nome (VARCHAR(255), NOT NULL)
- tipo (VARCHAR(50), NOT NULL, CHECK IN 'filial', 'deposito', 'loja')
- endereco (TEXT)
- ativo (BOOLEAN, DEFAULT true)
- criado_em (TIMESTAMPTZ, DEFAULT NOW())

**Índices existentes em `locais_estoque`:**
- idx_locais_estoque_tipo (tipo)

**Tabela `estoque_por_local` (criada 18/04/2026 - Sessão 3):**
```sql
CREATE TABLE IF NOT EXISTS estoque_por_local (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locais_estoque(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, local_id)
);
```

**Colunas presentes em `estoque_por_local`:**
- id (UUID, PK)
- produto_id (UUID, FK para produtos.id ON DELETE CASCADE)
- local_id (UUID, FK para locais_estoque.id ON DELETE CASCADE)
- quantidade (INTEGER, NOT NULL, DEFAULT 0)
- criado_em (TIMESTAMPTZ, DEFAULT NOW())
- atualizado_em (TIMESTAMPTZ, DEFAULT NOW())

**Índices existentes em `estoque_por_local`:**
- idx_estoque_por_local_produto (produto_id)
- idx_estoque_por_local_local (local_id)

**Tabela `transferencias_estoque` (criada 18/04/2026 - Sessão 3):**
```sql
CREATE TABLE IF NOT EXISTS transferencias_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  local_origem_id UUID NOT NULL REFERENCES locais_estoque(id) ON DELETE CASCADE,
  local_destino_id UUID NOT NULL REFERENCES locais_estoque(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_transito', 'concluida', 'cancelada')),
  observacao TEXT,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  concluida_em TIMESTAMPTZ
);
```

**Colunas presentes em `transferencias_estoque`:**
- id (UUID, PK)
- produto_id (UUID, FK para produtos.id ON DELETE CASCADE)
- local_origem_id (UUID, FK para locais_estoque.id ON DELETE CASCADE)
- local_destino_id (UUID, FK para locais_estoque.id ON DELETE CASCADE)
- quantidade (INTEGER, NOT NULL)
- status (VARCHAR(50), DEFAULT 'pendente', CHECK IN 'pendente', 'em_transito', 'concluida', 'cancelada')
- observacao (TEXT)
- criado_por (UUID, NOT NULL)
- criado_em (TIMESTAMPTZ, DEFAULT NOW())
- concluida_em (TIMESTAMPTZ, nullable)

**Índices existentes em `transferencias_estoque`:**
- idx_transferencias_estoque_status (status)
- idx_transferencias_estoque_produto (produto_id)
- idx_transferencias_estoque_criado_em (criado_em DESC)

**Tabela `kits` (criada 18/04/2026 - Sessão 2):**
```sql
CREATE TABLE IF NOT EXISTS kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Colunas presentes em `kits`:**
- id (UUID, PK)
- produto_id (UUID, FK para produtos.id ON DELETE CASCADE)
- nome (VARCHAR(255), NOT NULL)
- descricao (TEXT)
- ativo (BOOLEAN, DEFAULT true)
- criado_em (TIMESTAMPTZ, DEFAULT NOW())
- atualizado_em (TIMESTAMPTZ, DEFAULT NOW())

**Índices existentes em `kits`:**
- idx_kits_produto (produto_id)
- idx_kits_ativo (ativo)

**Tabela `kit_itens` (criada 18/04/2026 - Sessão 2):**
```sql
CREATE TABLE IF NOT EXISTS kit_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Colunas presentes em `kit_itens`:**
- id (UUID, PK)
- kit_id (UUID, FK para kits.id ON DELETE CASCADE)
- produto_id (UUID, FK para produtos.id ON DELETE CASCADE)
- quantidade (INTEGER, NOT NULL, DEFAULT 1, CHECK > 0)
- criado_em (TIMESTAMPTZ, DEFAULT NOW())

**Índices existentes em `kit_itens`:**
- idx_kit_itens_kit (kit_id)
- idx_kit_itens_produto (produto_id)

**Tabela `previsoes_demanda` (criada 18/04/2026 - Sessão 6):**
```sql
CREATE TABLE IF NOT EXISTS previsoes_demanda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  dias_analise INT NOT NULL,
  demanda_prevista INT NOT NULL,
  media_venda_diaria NUMERIC(10, 4) NOT NULL,
  demanda_real INT,
  precisao NUMERIC(5, 2),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Colunas presentes em `previsoes_demanda`:**
- id (UUID, PK)
- produto_id (UUID, FK para produtos.id ON DELETE CASCADE)
- periodo_inicio (DATE, NOT NULL)
- periodo_fim (DATE, NOT NULL)
- dias_analise (INT, NOT NULL)
- demanda_prevista (INT, NOT NULL)
- media_venda_diaria (NUMERIC(10, 4), NOT NULL)
- demanda_real (INT, nullable)
- precisao (NUMERIC(5, 2), nullable)
- criado_em (TIMESTAMPTZ, DEFAULT NOW())

**Índices existentes em `previsoes_demanda`:**
- idx_previsoes_demanda_produto (produto_id)
- idx_previsoes_demanda_periodo (periodo_inicio, periodo_fim)
- idx_previsoes_demanda_criado_em (criado_em DESC)

**Tabela `alertas_estoque` (criada 18/04/2026 - Sessão 1):**
```sql
CREATE TABLE IF NOT EXISTS alertas_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo_alerta VARCHAR(50) NOT NULL CHECK (tipo_alerta IN ('estoque_baixo', 'sem_estoque', 'reposicao_sugerida')),
  estoque_atual INTEGER NOT NULL,
  estoque_minimo INTEGER NOT NULL,
  mensagem TEXT,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'visualizado', 'resolvido')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  resolvido_em TIMESTAMPTZ
);
```

**Colunas presentes em `alertas_estoque`:**
- id (UUID, PK)
- produto_id (UUID, FK para produtos.id ON DELETE CASCADE)
- tipo_alerta (VARCHAR(50), NOT NULL, CHECK IN ('estoque_baixo', 'sem_estoque', 'reposicao_sugerida'))
- estoque_atual (INTEGER, NOT NULL)
- estoque_minimo (INTEGER, NOT NULL)
- mensagem (TEXT)
- status (VARCHAR(50), DEFAULT 'pendente', CHECK IN ('pendente', 'visualizado', 'resolvido'))
- criado_em (TIMESTAMPTZ, DEFAULT NOW())
- resolvido_em (TIMESTAMPTZ, nullable)

**Índices existentes em `alertas_estoque`:**
- idx_alertas_estoque_produto (produto_id)
- idx_alertas_estoque_status (status)
- idx_alertas_estoque_criado_em (criado_em DESC)

### 2.2. RPCs Existentes (Schema Tenant)

**tenant_listar_produtos:**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_produtos(
  p_limit INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  nome VARCHAR(255),
  descricao TEXT,
  tipo VARCHAR(50),
  preco_base NUMERIC(10, 2),
  criado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ
)
```
- Retorna lista de produtos
- ORDER BY nome
- LIMIT/OFFSET para paginação

**tenant_listar_estoque:**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_estoque(
  p_limit INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  produto_id UUID,
  sku VARCHAR(100),
  quantidade INTEGER,
  quantidade_minima INTEGER,
  atualizado_em TIMESTAMPTZ,
  produto_nome VARCHAR(255),
  produto_preco_base NUMERIC
)
```
- Retorna lista de estoque com JOIN em produtos
- ORDER BY quantidade ASC (estoque baixo primeiro)
- Inclui nome e preço do produto

**tenant_criar_produto:**
```sql
CREATE OR REPLACE FUNCTION tenant_criar_produto(
  p_nome VARCHAR(255),
  p_descricao TEXT,
  p_tipo VARCHAR(50),
  p_preco_base NUMERIC(10, 2),
  p_sku VARCHAR(100),
  p_qtd_inicial INT DEFAULT 0,
  p_qtd_minima INT DEFAULT 10,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Cria produto em tabela `produtos`
- Cria registro em `estoque` automaticamente
- Usa idempotency_key
- Retorna JSONB com produto_id e estoque_id

**tenant_excluir_produto:**
```sql
CREATE OR REPLACE FUNCTION tenant_excluir_produto(p_produto_id UUID)
RETURNS JSONB
```
- Exclui registro de estoque
- Exclui produto
- Retorna JSONB com success

**tenant_atualizar_produto:**
```sql
CREATE OR REPLACE FUNCTION tenant_atualizar_produto(
  p_produto_id UUID,
  p_nome VARCHAR(255),
  p_descricao TEXT,
  p_tipo VARCHAR(50),
  p_preco_base NUMERIC(10, 2)
)
RETURNS JSONB
```
- Atualiza campos do produto
- Retorna JSONB com success/error

**tenant_verificar_alertas_estoque (criada 18/04/2026 - Sessão 1):**
```sql
CREATE OR REPLACE FUNCTION tenant_verificar_alertas_estoque()
RETURNS JSONB
```
- Verifica produtos com estoque abaixo do mínimo
- Cria alertas se não existir alerta pendente nas últimas 24 horas
- Tipo: 'sem_estoque' se quantidade = 0, senão 'estoque_baixo'
- Retorna JSONB com success e alertas_criados

**tenant_listar_alertas_estoque (criada 18/04/2026 - Sessão 1):**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_alertas_estoque(
  p_status VARCHAR DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
```
- Lista alertas com JOIN em produtos
- Filtro opcional por status
- Ordenado por criado_em DESC
- Retorna JSONB array com alertas

**tenant_resolver_alerta_estoque (criada 18/04/2026 - Sessão 1):**
```sql
CREATE OR REPLACE FUNCTION tenant_resolver_alerta_estoque(
  p_alerta_id UUID,
  p_status VARCHAR,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Atualiza status do alerta (visualizado ou resolvido)
- Define resolvido_em = NOW() se status = 'resolvido'
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success

**tenant_criar_kit (criada 18/04/2026 - Sessão 2):**
```sql
CREATE OR REPLACE FUNCTION tenant_criar_kit(
  p_produto_id UUID,
  p_nome VARCHAR(255),
  p_descricao TEXT,
  p_itens JSONB,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Cria kit com produto pai, nome e descrição
- Loop em p_itens (JSONB array) para inserir itens em kit_itens
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success e kit_id

**tenant_listar_kits (criada 18/04/2026 - Sessão 2):**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_kits()
RETURNS JSONB
```
- Lista kits ativos com JOIN em produtos (produto_nome)
- Subquery para itens com JOIN em produtos (produto_nome de cada componente)
- Estrutura aninhada via jsonb_agg + jsonb_build_object
- Retorna JSONB array ou '[]'::JSONB se vazio

**tenant_excluir_kit (criada 18/04/2026 - Sessão 2):**
```sql
CREATE OR REPLACE FUNCTION tenant_excluir_kit(
  p_kit_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Soft delete: UPDATE kits SET ativo = false
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success

**tenant_vender_kit (criada 18/04/2026 - Sessão 2):**
```sql
CREATE OR REPLACE FUNCTION tenant_vender_kit(
  p_kit_id UUID,
  p_quantidade INT DEFAULT 1,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Verifica estoque de cada item componente antes de baixar
- Se qualquer item tiver estoque insuficiente, retorna erro com nome do produto
- Baixa estoque de cada item (quantidade * p_quantidade)
- Registra movimento de estoque para cada item
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success

**tenant_criar_local_estoque (criada 18/04/2026 - Sessão 3):**
```sql
CREATE OR REPLACE FUNCTION tenant_criar_local_estoque(
  p_nome VARCHAR(255),
  p_tipo VARCHAR(50),
  p_endereco TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Cria local de estoque com nome, tipo e endereço
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success e local_id

**tenant_listar_locais_estoque (criada 18/04/2026 - Sessão 3):**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_locais_estoque()
RETURNS JSONB
```
- Lista locais ativos
- Retorna JSONB array ou '[]'::JSONB se vazio

**tenant_desativar_local_estoque (criada 18/04/2026 - Sessão 3):**
```sql
CREATE OR REPLACE FUNCTION tenant_desativar_local_estoque(
  p_local_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Soft delete: UPDATE locais_estoque SET ativo = false
- Verifica se há estoque > 0 antes de desativar
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success ou erro se houver estoque

**tenant_criar_transferencia (criada 18/04/2026 - Sessão 3):**
```sql
CREATE OR REPLACE FUNCTION tenant_criar_transferencia(
  p_produto_id UUID,
  p_local_origem_id UUID,
  p_local_destino_id UUID,
  p_quantidade INT,
  p_observacao TEXT,
  p_criado_por UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Valida que origem != destino
- Verifica estoque disponível na origem
- Cria transferência com status='pendente'
- Baixa estoque na origem
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success e transferencia_id

**tenant_concluir_transferencia (criada 18/04/2026 - Sessão 3):**
```sql
CREATE OR REPLACE FUNCTION tenant_concluir_transferencia(
  p_transferencia_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Só conclui se status='pendente'
- Atualiza status para 'concluida' e concluida_em=NOW()
- Adiciona estoque ao destino (ON CONFLICT DO UPDATE)
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success

**tenant_cancelar_transferencia (criada 18/04/2026 - Sessão 3):**
```sql
CREATE OR REPLACE FUNCTION tenant_cancelar_transferencia(
  p_transferencia_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Só cancela se status='pendente'
- Atualiza status para 'cancelada'
- Devolve estoque à origem
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success

**tenant_listar_transferencias (criada 18/04/2026 - Sessão 3):**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_transferencias(p_status VARCHAR DEFAULT NULL, p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
RETURNS JSONB
```
- Lista transferências com JOIN em produtos e locais
- Filtro opcional por status
- Ordenado por criado_em DESC
- Paginação via p_limit e p_offset
- Retorna JSONB array ou '[]'::JSONB se vazio

**tenant_calcular_valor_estoque (criada 18/04/2026 - Sessão 4):**
```sql
CREATE OR REPLACE FUNCTION tenant_calcular_valor_estoque(p_metodo VARCHAR DEFAULT 'custo_medio')
RETURNS JSONB
```
- Calcula valor total do estoque pelo método especificado
- 'custo_medio': SUM(estoque_atual * COALESCE(custo_unitario, 0))
- 'fifo'/'lifo': retorna erro orientativo (requer tabela de movimentações)
- Retorna JSONB com valor_total, metodo, produtos_sem_custo

**tenant_atualizar_custo_produto (criada 18/04/2026 - Sessão 4):**
```sql
CREATE OR REPLACE FUNCTION tenant_atualizar_custo_produto(
  p_produto_id UUID,
  p_custo_unitario NUMERIC,
  p_metodo_valoracao VARCHAR DEFAULT 'custo_medio',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Atualiza custo_unitario e metodo_valoracao do produto
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success

**tenant_gerar_codigo_barras (criada 18/04/2026 - Sessão 5):**
```sql
CREATE OR REPLACE FUNCTION tenant_gerar_codigo_barras(
  p_produto_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Verifica se produto já tem codigo_barras - se sim, retorna existente
- Gera código no formato: 'PROD' || LPAD(substr(p_produto_id::TEXT, 1, 10), 10, '0')
- Atualiza codigo_barras e codigo_qr com mesmo valor
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success e codigo_barras

**tenant_buscar_produto_por_codigo (criada 18/04/2026 - Sessão 5):**
```sql
CREATE OR REPLACE FUNCTION tenant_buscar_produto_por_codigo(p_codigo VARCHAR)
RETURNS JSONB
```
- Busca produto por codigo_barras ou codigo_qr
- Retorna JSONB completo do produto ou erro se não encontrado

**tenant_gerar_previsao_demanda (criada 18/04/2026 - Sessão 6):**
```sql
CREATE OR REPLACE FUNCTION tenant_gerar_previsao_demanda(
  p_produto_id UUID,
  p_dias_analise INT DEFAULT 30,
  p_dias_previsao INT DEFAULT 30,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Calcula média de venda diária usando vendas_itens (status='concluido')
- Calcula demanda_prevista = media_venda_diaria * dias_previsao
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com demanda_prevista, media_venda_diaria, previsao_id

**tenant_listar_previsoes_demanda (criada 18/04/2026 - Sessão 6):**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_previsoes_demanda(p_produto_id UUID DEFAULT NULL, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS JSONB
```
- Lista previsões com JOIN em produtos (nome) e estoque (quantidade)
- Filtro opcional por produto_id
- Ordenado por criado_em DESC
- Inclui campo dias_para_zerar = ROUND(estoque_atual / media_venda_diaria)
- Retorna JSONB array ou '[]'::JSONB se vazio

**tenant_atualizar_demanda_real (criada 18/04/2026 - Sessão 6):**
```sql
CREATE OR REPLACE FUNCTION tenant_atualizar_demanda_real(
  p_previsao_id UUID,
  p_demanda_real INT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```
- Atualiza demanda_real e calcula precisão
- Precisão = ROUND(100 - (ABS(demanda_prevista - demanda_real) / demanda_prevista * 100), 2)
- Usa idempotency_key
- Registra em audit_log
- Retorna JSONB com success e precisao

**NÃO EXISTEM RPCs PARA:**
- ~~Movimentação entre locais~~ ✅ IMPLEMENTADO 18/04/2026
- ~~Valoração de estoque~~ ✅ IMPLEMENTADO 18/04/2026
- ~~Previsão de demanda~~ ✅ IMPLEMENTADO 18/04/2026
- ~~Geração de códigos de barras/QR~~ ✅ IMPLEMENTADO 18/04/2026

### 2.3. RPCs Existentes (Schema Public)

As RPCs no schema public roteiam para as RPCs do tenant via schema routing. Não é necessário criar RPCs public para cada RPC tenant pois o middleware configura o search_path corretamente.

### 2.4. Frontend API (apps/web/src/lib/api.ts)

**Interfaces TypeScript:**
```typescript
export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  sku?: string;
  preco_custo?: number;
  preco_venda?: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria?: string;
  criado_em: string;
}

export interface ProdutoCreate {
  nome: string;
  descricao?: string;
  sku?: string;
  preco_custo?: number;
  preco_venda?: number;
  estoque_atual?: number;
  estoque_minimo?: number;
  categoria?: string;
  tipo?: string;
}

export interface ProdutoUpdate {
  nome?: string;
  descricao?: string;
  tipo?: string;
  preco_base?: number;
  sku?: string;
  preco_custo?: number;
  categoria?: string;
}
```

**Funções API:**
- `fetchProdutos()` → supabase.rpc('tenant_listar_produtos')
- `createProduto(produto)` → supabase.rpc('tenant_criar_produto')
- `deleteProduto(id)` → supabase.rpc('tenant_excluir_produto')
- `updateProduto(id, produto)` → supabase.rpc('tenant_atualizar_produto')

**Inconsistência identificada:**
- Interface `Produto` usa `preco_custo` e `preco_venda`
- Interface `ProdutoUpdate` usa `preco_base`
- Tabela `produtos` tem apenas `preco_base`
- Frontend tenta enviar `p_preco_custo`, `p_categoria`, `p_estoque_atual`, `p_estoque_minima` mas RPC não aceita esses parâmetros

### 2.5. Frontend Hooks (apps/web/src/lib/hooks/use-produtos.ts)

**Hooks React Query:**
- `useProdutos()` → fetchProdutos
- `useCreateProduto()` → createProduto
- `useDeleteProduto()` → deleteProduto
- `useUpdateProduto()` → updateProduto

### 2.6. Frontend Páginas

**apps/web/src/app/tenant/catalogo/page.tsx:**
- Lista produtos em tabela
- KPIs: Total de Produtos, Categorias, Valor do Estoque, Preço Médio
- Modal de criação de produto
- Modal de edição de produto
- Modal de confirmação de exclusão
- Busca por nome, SKU ou categoria
- Exibe: nome, SKU, categoria, custo, venda, estoque (com cores por status)

**apps/web/src/app/tenant/estoque/page.tsx:**
- Lista estoque em tabela
- KPIs: Total SKUs, Estoque Baixo, Itens Críticos
- Modal de criação de produto
- Modal de confirmação de exclusão
- Botão Importar/Exportar (placeholder)
- Exibe: status, SKU, produto, quantidade atual, mínimo, preço
- StatusBadge colorido (error/warning/success)

### 2.7. Inconsistências e Gaps Identificados

**Inconsistências entre banco e frontend:**
1. **Preço:**
   - Banco: `preco_base` (único campo)
   - Frontend: `preco_custo` e `preco_venda` (dois campos)
   - RPC `tenant_criar_produto` não aceita `p_preco_custo` nem `p_categoria`
   - **RESOLVIDO 18/04/2026:** Adicionado campo `custo_unitario` para custo, mantendo `preco_base` como preço de venda

2. **Estoque:**
   - Banco: tabela separada `estoque` com `quantidade` e `quantidade_minima`
   - Frontend: interface `Produto` tem `estoque_atual` e `estoque_minimo`
   - RPC `tenant_listar_produtos` não retorna dados de estoque (apenas tabela produtos)
   - Frontend usa `useProdutos()` mas deveria usar dados de estoque também
   - **PARCIALMENTE RESOLVIDO:** Frontend continua usando interface Produto com estoque_atual/estoque_minimo, mas isso funciona pois os dados vêm da tabela estoque via RPC tenant_listar_estoque

3. **Categoria:**
   - Banco: não existe campo `categoria` em `produtos`
   - Frontend: interface `Produto` tem `categoria`
   - RPC não aceita `p_categoria`
   - **RESOLVIDO 18/04/2026:** Adicionado campo `categoria VARCHAR(100)` em produtos

**Funcionalidades ausentes:**
1. ~~Alertas de estoque mínimo (tabela e RPCs não existem)~~ ✅ IMPLEMENTADO 18/04/2026
2. ~~Gestão de kits/bundles (tabelas e RPCs não existem)~~ ✅ IMPLEMENTADO 18/04/2026
3. ~~Movimentação entre locais (tabelas e RPCs não existem)~~ ✅ IMPLEMENTADO 18/04/2026
4. ~~Valoração de estoque (campo custo_unitario adicionado, mas RPCs não existem)~~ ✅ IMPLEMENTADO 18/04/2026
5. ~~Previsão de demanda (tabela e RPCs não existem)~~ ✅ IMPLEMENTADO 18/04/2026
6. ~~Códigos de barras/QR (campos não existem, RPCs não existem)~~ ✅ IMPLEMENTADO 18/04/2026

---

## 3. MAPA DAS 6 SESSÕES DE IMPLEMENTAÇÃO

### Sessão 1: Alertas de Estoque Mínimo

**Status:** ✅ Implementado (18/04/2026)
**Dependências:** Nenhuma (independente)
**Arquivos criados/modificados:**
- SQL: Tabela `alertas_estoque` + índices (apps/api/supabase_rpc.sql) ✅
- RPCs (tenant): 3 RPCs
  - tenant_verificar_alertas_estoque: verifica e cria alertas ✅
  - tenant_listar_alertas_estoque: lista alertas com filtros ✅
  - tenant_resolver_alerta_estoque: marca como visualizado/resolvido ✅
- API: Interfaces TypeScript + funções (apps/web/src/lib/api.ts) ✅
- Hooks: use-alertas-estoque.ts (apps/web/src/lib/hooks/) ✅
- Componente: AlertasEstoquePanel.tsx (apps/web/src/components/modules/estoque/) ✅
- UI: Integrado na página estoque/page.tsx ✅

**Colunas adicionadas:** Nenhuma (nova tabela)

**Observações:**
- Inconsistências de preço e categoria resolvidas (categoria e custo_unitario adicionados à tabela produtos)
- Sistema de idempotência implementado em tenant_resolver_alerta_estoque
- Audit log implementado para resolução de alertas
- Componente UI exibe alertas pendentes com ações de visualizar e resolver

---

### Sessão 2: Gestão de Kits/Bundles

**Status:** ✅ Implementado (18/04/2026)
**Dependências:** Nenhuma (independente)
**Arquivos criados/modificados:**
- SQL: Tabelas `kits` e `kit_itens` + índices + trigger (apps/api/supabase_rpc.sql) ✅
- RPCs (tenant): 4 RPCs
  - tenant_criar_kit: cria kit com itens componentes ✅
  - tenant_listar_kits: lista kits ativos com itens aninhados ✅
  - tenant_excluir_kit: soft delete de kit ✅
  - tenant_vender_kit: baixa estoque de itens componentes ao vender kit ✅
- API: Interfaces TypeScript + funções (apps/web/src/lib/api.ts) ✅
- Hooks: use-kits.ts (apps/web/src/lib/hooks/) ✅
- Componente: KitsManager.tsx (apps/web/src/components/modules/estoque/) ✅
- UI: Integrado na página estoque/page.tsx ✅

**Colunas adicionadas:** Nenhuma (novas tabelas)

**Observações:**
- Sistema de idempotência implementado em todas as RPCs de escrita (criar, excluir, vender)
- Audit log implementado para todas as operações de kits
- tenant_vender_kit verifica estoque de cada componente antes de baixar
- Componente UI permite criar kits com múltiplos itens dinamicamente
- Soft delete em kits (ativo = false) para preservar histórico

---

### Sessão 3: Movimentação Entre Locais

**Status:** ✅ Implementado (18/04/2026)
**Dependências:** Nenhuma (independente)
**Arquivos criados/modificados:**
- SQL: Tabelas `locais_estoque`, `estoque_por_local`, `transferencias_estoque` + índices + trigger (apps/api/supabase_rpc.sql) ✅
- RPCs (tenant): 7 RPCs
  - tenant_criar_local_estoque: cria local de estoque ✅
  - tenant_listar_locais_estoque: lista locais ativos ✅
  - tenant_desativar_local_estoque: soft delete de local (verifica estoque) ✅
  - tenant_criar_transferencia: cria transferência pendente ✅
  - tenant_concluir_transferencia: conclui transferência ✅
  - tenant_cancelar_transferencia: cancela transferência pendente ✅
  - tenant_listar_transferencias: lista transferências com filtros ✅
- API: Interfaces TypeScript + funções (apps/web/src/lib/api.ts) ✅
- Hooks: use-locais-estoque.ts, use-transferencias.ts (apps/web/src/lib/hooks/) ✅
- Componente: TransferenciasManager.tsx (apps/web/src/components/modules/estoque/) ✅
- UI: Integrado na página estoque/page.tsx ✅

**Colunas adicionadas:** Nenhuma (novas tabelas)

**Observações:**
- Sistema de idempotência implementado em todas as RPCs de escrita
- Audit log implementado para todas as operações de locais e transferências
- tenant_desativar_local_estoque verifica se há estoque > 0 antes de desativar
- tenant_criar_transferencia valida que origem != destino e verifica estoque disponível
- tenant_concluir_transferencia usa ON CONFLICT DO UPDATE para adicionar estoque ao destino
- Componente UI permite criar locais e transferências com filtros por status

---

### Sessão 4: Valoração de Estoque

**Status:** ✅ Implementado (18/04/2026)
**Dependências:** Nenhuma (independente)
**Arquivos criados/modificados:**
- SQL: ALTER TABLE produtos ADD COLUMN metodo_valoracao (custo_unitario já existia) (apps/api/supabase_rpc.sql) ✅
- RPCs (tenant): 2 RPCs
  - tenant_calcular_valor_estoque: calcula valor do estoque por método ✅
  - tenant_atualizar_custo_produto: atualiza custo unitário e método ✅
- API: Interfaces TypeScript + funções (apps/web/src/lib/api.ts) ✅
- Hooks: use-valoracao.ts (apps/web/src/lib/hooks/) ✅
- Componente: ValorizacaoDashboard.tsx (apps/web/src/components/modules/estoque/) ✅
- UI: Integrado na página estoque/page.tsx ✅

**Colunas adicionadas:**
- metodo_valoracao VARCHAR(50) DEFAULT 'custo_medio' (custo_medio, fifo, lifo) ✅

**Observações:**
- custo_unitario já adicionado em 18/04/2026 para resolver inconsistência de preço
- tenant_calcular_valor_estoque suporta custo_medio (implementado), fifo/lifo (erro orientativo - requer tabela de movimentações)
- Componente UI permite editar custo unitário inline e calcular valor total do estoque

---

### Sessão 5: Códigos de Barras e QR

**Status:** ✅ Implementado (18/04/2026)
**Dependências:** Nenhuma (independente)
**Arquivos criados/modificados:**
- SQL: ALTER TABLE produtos ADD COLUMN codigo_barras, codigo_qr (apps/api/supabase_rpc.sql) ✅
- RPCs (tenant): 2 RPCs
  - tenant_gerar_codigo_barras: gera código de barras e QR ✅
  - tenant_buscar_produto_por_codigo: busca produto por código ✅
- API: Interfaces TypeScript + funções (apps/web/src/lib/api.ts) ✅
- Hooks: use-valoracao.ts (reutilizado) (apps/web/src/lib/hooks/) ✅
- Componente: CodigosPanel.tsx (apps/web/src/components/modules/estoque/) ✅
- UI: Integrado na página estoque/page.tsx ✅

**Colunas adicionadas:**
- codigo_barras VARCHAR(50) (código EAN-13 ou similar) ✅
- codigo_qr TEXT (URL ou conteúdo do QR code) ✅

**Observações:**
- Índice idx_produtos_codigo_barras criado para busca rápida
- tenant_gerar_codigo_barras gera código no formato: 'PROD' + 10 caracteres do UUID com zeros à esquerda
- Componente UI permite gerar códigos e buscar produtos por código
- Para scanner físico, integrar com biblioteca html5-qrcode ou react-qr-reader na Sessão 6 (integração final)

---

### Sessão 6: Previsão de Demanda

**Status:** ✅ Implementado (18/04/2026)
**Dependências:** Histórico de vendas (já existe tabela vendas)
**Arquivos criados/modificados:**
- SQL: Tabela `previsoes_demanda` + índices (apps/api/supabase_rpc.sql) ✅
- RPCs (tenant): 3 RPCs
  - tenant_gerar_previsao_demanda: gera previsão baseada em histórico ✅
  - tenant_listar_previsoes_demanda: lista previsões ✅
  - tenant_atualizar_demanda_real: atualiza demanda real e calcula precisão ✅
- API: Interfaces TypeScript + funções (apps/web/src/lib/api.ts) ✅
- Hooks: use-previsao-demanda.ts (apps/web/src/lib/hooks/) ✅
- Componente: PrevisaoDemandaPanel.tsx (apps/web/src/components/modules/estoque/) ✅
- UI: Integrado na página estoque/page.tsx ✅

**Colunas adicionadas:** Nenhuma (nova tabela)

**Observações:**
- Usa tabela vendas_itens para calcular média de venda diária (status='concluido')
- Calcula dias_para_zerar = ROUND(estoque_atual / media_venda_diaria)
- Componente UI permite gerar previsão, editar demanda real e ver precisão
- Precisão calculada automaticamente quando demanda_real é preenchida
- Alerta visual quando dias_para_zerar < dias_previsao

---

### Sessão 7: Integração Final e Scanner de Código de Barras

**Status:** ✅ Implementado (18/04/2026)
**Dependências:** Todas as sessões anteriores (1-6)
**Arquivos criados/modificados:**
- Página: Refatorado estoque/page.tsx para incluir abas ✅
  - Aba "produtos": listagem e CRUD existente intacto
  - Aba "alertas": AlertasEstoquePanel
  - Aba "kits": KitsManager
  - Aba "transferências": TransferenciasManager
  - Aba "valoração": ValorizacaoDashboard + CodigosPanel
  - Aba "previsão": PrevisaoDemandaPanel
- Biblioteca: html5-qrcode instalada (package.json) ✅
- Componente: BarcodeScanner.tsx (apps/web/src/components/modules/estoque/) ✅
  - Abre câmera via modal
  - Detecta código de barras/QR
  - Chama buscarProdutoPorCodigo(codigo)
  - Exibe produto encontrado ou erro
  - Botão de scanner no header da página
- UI: Integrado na página estoque/page.tsx ✅

**Observações:**
- Utiliza componente Tabs do sistema (shadcn/ui)
- Scanner usa html5-qrcode com import dinâmico
- Botão de scanner posicionado no header da página
- Todas as funcionalidades organizadas em abas para melhor UX
- Utilitário formatBytes verificado e existe em apps/web/src/lib/utils/format.ts

**Correções Pós-Implementação (18/04/2026):**
- **Problema:** Erro 404 em RPCs tenant (listar_alertas, listar_kits, listar_locais, calcular_valor, listar_transferencias, listar_previsoes, verificar_alertas, resolver_alerta)
- **Causa Raiz:** Wrappers públicos iniciais usavam current_setting('search_path', true) que não funciona no contexto da RPC pública, causando "stack depth limit exceeded". Alguns wrappers públicos não foram criados.
- **Solução:** Criados novos wrappers públicos no schema public que chamam set_tenant_schema() antes de cada RPC tenant
- **Arquivos SQL:** WRAPPERS_PUBLIC_FIX_SQL.sql + WRAPPERS_ALERTAS_SQL.sql aplicados via service role
- **Proteção Adicional:** Adicionada defesa explícita Array.isArray() em PrevisaoDemandaPanel.tsx linha 172 para prevenir erros de .map()
- **TypeScript:** Corrigidas verificações null/undefined em previsao.precisao e previsao.dias_para_zerar
- **Hydration Error:** Corrigido erro de hidratação no FloatingParticles usando useState + useEffect para gerar valores aleatórios apenas no cliente

**Status das Abas (validado):**
- Produtos: ✅ Funcional (CRUD existente intacto)
- Alertas: ✅ Funcional (wrapper público aplicado)
- Kits: ✅ Funcional (wrapper público aplicado)
- Transferências: ✅ Funcional (wrapper público aplicado)
- Valoração: ✅ Funcional (wrapper público aplicado)
- Previsão: ✅ Funcional (wrapper público aplicado + defesa Array.isArray)

---

## 4. DECISÕES ARQUITETURAIS RELEVANTES

### 4.1. Inconsistências a Resolver

**Problema 1: Preço (custo vs venda vs base)**
- **Solução:** Manter `preco_base` como preço de venda, adicionar `custo_unitario` para custo
- **Impacto:** Requer ALTER TABLE produtos, atualizar RPCs, atualizar frontend
- **Prioridade:** Alta (afeta Sessão 4 - Valoração de Estoque)

**Problema 2: Categoria não existe no banco**
- **Solução:** Adicionar coluna `categoria VARCHAR(100)` em produtos
- **Impacto:** Requer ALTER TABLE produtos, atualizar RPCs
- **Prioridade:** Média (não bloqueia implementações, mas melhora organização)

**Problema 3: Estoque em tabela separada**
- **Solução:** Manter arquitetura atual (tabela separada) pois permite histórico de movimentações futuras
- **Impacto:** Nenhum (arquitetura correta)
- **Prioridade:** N/A

### 4.2. Idempotência

**Implementação obrigatória em todas as RPCs de escrita:**
- Parâmetro `p_idempotency_key TEXT DEFAULT NULL`
- Verificação na tabela `idempotency_control`
- Cache de resultado em JSONB
- Evita duplicações em reenvios de formulário

### 4.3. Audit Log

**Registro obrigatório em todas as operações:**
- Tabela `audit_log` no schema tenant
- Colunas: operation_type, resource, resource_id, user_id, details, status, criado_em
- Inserir após cada INSERT/UPDATE/DELETE
- Rastreabilidade completa de operações

### 4.4. Timestamps Automáticos

**Padrão obrigatório:**
- Colunas `criado_em TIMESTAMPTZ DEFAULT NOW()`
- Colunas `atualizado_em TIMESTAMPTZ DEFAULT NOW()`
- Trigger para atualizar `atualizado_em` automaticamente em UPDATE

### 4.5. Índices

**Padrão obrigatório:**
- Índice em FKs (produto_id, local_id, etc.)
- Índice em status (para filtros)
- Índice em criado_em DESC (para ordenação)
- Índices compostos quando necessário (produto_id + campo)

### 4.6. Schema Routing

**Implementação obrigatória:**
- Todas as RPCs no schema public roteiam para schema tenant
- Verificação de `user_profiles.empresa_id` e `empresas.schema_name`
- EXECUTE format() para SQL dinâmico
- Security DEFINER para privilégios elevados

### 4.7. RLS (Row Level Security)

**Estratégia atual:**
- RLS habilitado em todas as tabelas
- Políticas permissivas (USING (true)) pois isolamento é por schema routing
- Schema routing garante isolamento por tenant

### 4.8. Validações

**Validações no banco:**
- CHECK constraints para status, tipo, etc.
- NOT NULL em campos obrigatórios
- FK constraints para relacionamentos
- Valores padrão apropriados

**Validações no frontend:**
- TypeScript interfaces para type safety
- Validação de formulários
- Tratamento de erro padrão

### 4.9. Transações

**Operações multi-tabela:**
- Usar transações atômicas quando necessário
- Rollback completo em falha
- Sem registros órfãos

---

## 5. TABELAS EXISTENTES RELACIONADAS

### 5.1. Tabelas do Schema Public

- `empresas` - Empresas/tenants
- `modulos_catalogo` - Catálogo de módulos
- `empresa_modulos` - Feature flags por empresa
- `user_profiles` - Perfis de usuários
- `logs_provisionamento` - Logs de provisionamento

### 5.2. Tabelas do Schema Tenant

- `clientes` - Clientes/CRM
- `produtos` - Produtos/Catálogo
- `estoque` - Movimentação de estoque
- `vendas` - Vendas
- `vendas_itens` - Itens de venda
- `financeiro` - Transações financeiras
- `funcionarios` - Funcionários/RH
- `ordens_servico` - Ordens de Serviço
- `ordens_servico_historico` - Histórico de OS
- `obras` - Obras/Projetos
- `configuracoes` - Configurações do tenant
- `role_permissions` - Permissões por role
- `schema_migrations` - Versionamento de schema
- `idempotency_control` - Controle de idempotência
- `audit_log` - Log de auditoria

---

## 6. SERVICE ROLE

**Service Role Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU

**Uso:** Operações administrativas e provisionamento

---

## 7. PRÓXIMOS PASSOS

1. **Pré-implementação:** Resolver inconsistências de preço e categoria
2. **Sessão 1:** Implementar alertas de estoque mínimo
3. **Sessão 2:** Implementar gestão de kits/bundles
4. **Sessão 3:** Implementar movimentação entre locais
5. **Sessão 4:** Implementar valoração de estoque
6. **Sessão 5:** Implementar previsão de demanda
7. **Sessão 6:** Implementar códigos de barras/QR
8. **Integração final:** Integrar todas as funcionalidades nas páginas existentes
9. **Documentação:** Atualizar VISTORIAS.md após 3+ alterações

---

## 8. OBSERVAÇÕES CRÍTICAS

1. **Inconsistência de preço:** O frontend usa `preco_custo` e `preco_venda` mas o banco tem apenas `preco_base`. Precisa ser resolvido antes da Sessão 4 (Valoração de Estoque).

2. **Categoria não existe:** O frontend usa `categoria` mas o banco não tem esse campo. Deve ser adicionado via ALTER TABLE.

3. **Estoque em tabela separada:** A arquitetura atual é correta (tabela `estoque` separada de `produtos`), mas o frontend não está usando a tabela `estoque` adequadamente.

4. **RPCs inconsistentes:** A RPC `tenant_criar_produto` não aceita parâmetros que o frontend tenta enviar (`p_preco_custo`, `p_categoria`, `p_estoque_atual`, `p_estoque_minima`).

5. **Multi-tenancy:** Todas as novas tabelas e RPCs devem seguir o padrão de multi-tenancy com schema routing.

---

**Fim do Session State - Produtos/Estoque**
