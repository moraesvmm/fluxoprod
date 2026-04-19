# SESSION STATE - Módulo Obras

**Data:** 18/04/2026  
**Objetivo:** Documentação completa do estado atual do sistema e plano de implementação do módulo Obras

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
        ├── app/tenant/obras/page.tsx (Página do módulo)
        ├── lib/
        │   ├── api.ts (Funções API centralizadas)
        │   └── hooks/
        │       └── use-obras.ts (React Query hooks)
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
import { fetchObras, createObra, deleteObra, updateObra } from "@/lib/api";

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

**RPC de roteamento (public):**
```sql
CREATE OR REPLACE FUNCTION public.tenant_nome_funcao(parametros)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();

  EXECUTE format('SELECT %I.tenant_nome_funcao($1, $2)', v_tenant_schema)
  INTO v_result
  USING parametro1, parametro2;

  RETURN v_result;
END;
$$;
```

---

## 2. ESTADO ATUAL DO MÓDULO OBRAS

### 2.1. Tabelas Existentes

**Tabela `obras` (criada em provisionar_empresa):**
```sql
CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  endereco TEXT,
  data_inicio DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  status VARCHAR(50) DEFAULT 'planejada',
  orcamento_total NUMERIC(10, 2),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices existentes:**
- idx_obras_cliente (cliente_id)
- idx_obras_status (status)
- idx_obras_criado_em (criado_em DESC)

### 2.2. RPCs Existentes (Schema Tenant)

**tenant_listar_obras:**
```sql
CREATE OR REPLACE FUNCTION tenant_listar_obras(
  p_limit INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  cliente_id UUID,
  nome VARCHAR(255),
  descricao TEXT,
  endereco TEXT,
  data_inicio DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  status VARCHAR(50),
  orcamento_total NUMERIC(10, 2),
  criado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ
)
```

**tenant_criar_obra:**
```sql
CREATE OR REPLACE FUNCTION tenant_criar_obra(
  p_cliente_id UUID,
  p_nome VARCHAR(255),
  p_descricao TEXT,
  p_endereco TEXT,
  p_data_inicio DATE,
  p_data_fim_prevista DATE,
  p_status VARCHAR(50),
  p_orcamento_total NUMERIC(10, 2),
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
```

**tenant_excluir_obra:**
```sql
CREATE OR REPLACE FUNCTION tenant_excluir_obra(p_obra_id UUID)
RETURNS JSONB
```

**tenant_atualizar_obra:**
```sql
CREATE OR REPLACE FUNCTION tenant_atualizar_obra(
  p_obra_id UUID,
  p_cliente_id UUID,
  p_nome VARCHAR(255),
  p_descricao TEXT,
  p_endereco TEXT,
  p_data_inicio DATE,
  p_data_fim_prevista DATE,
  p_status VARCHAR(50),
  p_orcamento_total NUMERIC(10, 2)
)
RETURNS JSONB
```

### 2.3. RPCs Existentes (Schema Public)

**public.tenant_listar_obras** - Roteamento para tenant_listar_obras
**public.tenant_criar_obra** - Roteamento para tenant_criar_obra
**public.tenant_excluir_obra** - Roteamento para tenant_excluir_obra
**public.tenant_atualizar_obra** - Roteamento para tenant_atualizar_obra

### 2.4. Frontend API (apps/web/src/lib/api.ts)

**Interfaces TypeScript:**
```typescript
export interface Obra {
  id: string;
  empresa_id?: string;
  nome: string;
  cliente_id?: string;
  endereco?: string;
  data_inicio?: string;
  data_fim_prevista?: string;
  orcamento: number;
  descricao?: string;
  status: string;
  criado_em: string;
  atualizado_em?: string;
  cliente?: { nome: string };
}

export interface ObraCreate {
  nome: string;
  cliente_id?: string;
  endereco?: string;
  data_inicio?: string;
  data_fim_prevista?: string;
  orcamento?: number;
  descricao?: string;
  status?: string;
}

export interface ObraUpdate {
  cliente_id?: string;
  nome?: string;
  descricao?: string;
  endereco?: string;
  data_inicio?: string;
  data_fim_prevista?: string;
  status?: string;
  orcamento_total?: number;
}
```

**Funções API:**
- `fetchObras()` → supabase.rpc('tenant_listar_obras')
- `createObra(obra)` → supabase.rpc('tenant_criar_obra')
- `deleteObra(id)` → supabase.rpc('tenant_excluir_obra')
- `updateObra(id, obra)` → supabase.rpc('tenant_atualizar_obra')

### 2.5. Frontend Hooks (apps/web/src/lib/hooks/use-obras.ts)

**Hooks React Query:**
- `useObras()` → fetchObras
- `useCreateObra()` → createObra
- `useDeleteObra()` → deleteObra
- `useUpdateObra()` → updateObra

### 2.6. Frontend Página (apps/web/src/app/tenant/obras/page.tsx)

**Funcionalidades atuais:**
- Lista de obras em tabela
- Visualização em calendário
- Modal de criação de obra
- Modal de edição de obra
- Modal de confirmação de exclusão
- KPIs (Planejadas, Em Andamento, Concluídas, Investimento Total)
- Busca por nome, cliente ou endereço
- Toggle entre visualização tabela/calendário

---

## 3. MAPA DAS 6 SESSÕES DE IMPLEMENTAÇÃO

### Sessão 1: Atualização de Obras (IMPLEMENTADA EM 18/04/2026)

**Status:** ✅ Completo  
**Dependências:** Nenhuma  
**Arquivos envolvidos:**
- RPC: tenant_atualizar_obra (CRIADA em apps/api/supabase_rpc.sql linha 1241-1317)
  - Inclui idempotência via p_idempotency_key
  - Registra em audit_log
  - Salva resultado em idempotency_control
  - Retorna JSONB com success/error
- RPC Public: Não necessária (sistema usa schema routing via middleware)
- API: updateObra() (já existia em apps/web/src/lib/api.ts linha 454-469)
- Hook: useUpdateObra() (já existia em apps/web/src/lib/hooks/use-obras.ts linha 31-37)
- UI: Modal de edição (já existe em apps/web/src/app/tenant/obras/page.tsx)

**Observações:**
- A RPC tenant_atualizar_obra foi adicionada dentro da função provisionar_empresa
- Segue o padrão do sistema: idempotência, audit_log, retorno JSONB
- O frontend já estava configurado corretamente

### Sessão 2: Gestão de Etapas/Milestones (IMPLEMENTADA EM 18/04/2026)

**Status:** ✅ Completo  
**Dependências:** Nenhuma (independente)  
**Arquivos envolvidos:**
- SQL: Tabela `obras_etapas` + índices + trigger (CRIADA em apps/api/supabase_rpc.sql linha 520-557)
  - Tabela com colunas: id, obra_id, nome, descricao, data_prevista, data_conclusao, status, ordem, criado_em, atualizado_em
  - Índices: idx_obras_etapas_obra, idx_obras_etapas_status, idx_obras_etapas_ordem
  - Trigger: trigger_atualizar_obras_etapas para atualizar atualizado_em
- RPCs (tenant): 5 RPCs criadas em apps/api/supabase_rpc.sql linha 1358-1594
  - tenant_criar_etapa_obra: insere etapa com idempotency_key, registra audit_log
  - tenant_listar_etapas_obra: retorna array JSONB ordenado por ordem
  - tenant_atualizar_etapa_obra: atualiza todos os campos, registra audit_log
  - tenant_excluir_etapa_obra: exclui e registra audit_log
  - tenant_obras_progresso: retorna JSONB com {total, concluidas, em_andamento, pendentes, percentual}
- RPCs (public): Não necessárias (sistema usa schema routing via middleware)
- API: Interfaces TypeScript + funções (CRIADO em apps/web/src/lib/api.ts linha 599-686)
  - Interfaces: ObraEtapa, ObraEtapaCreate, ObraEtapaUpdate, ObraProgresso
  - Funções: fetchObraEtapas, createObraEtapa, updateObraEtapa, deleteObraEtapa, fetchObraProgresso
- Hooks: use-obras-etapas.ts (CRIADO em apps/web/src/lib/hooks/use-obras-etapas.ts)
  - Hooks: useObraEtapas, useCreateObraEtapa, useUpdateObraEtapa, useDeleteObraEtapa, useObraProgresso
- Componente: EtapasTimeline.tsx (CRIADO em apps/web/src/components/modules/obras/EtapasTimeline.tsx)
  - Timeline visual com barra de progresso percentual
  - Listagem de etapas com status colorido e ordem visual
  - Props: etapas, progresso, onEdit, onDelete
- UI: Não integrado na página de obras (aguarda Sessão 6)

**Observações:**
- Tabela obras_etapas aplicada apenas em tenant_62a495e1 (único schema com tabela obras)
- RPCs aplicadas em todos os 4 schemas tenant
- Trigger aplicado em tenant_62a495e1
- Componente pronto para uso, aguarda integração na página de obras

### Sessão 3: Controle Financeiro Detalhado (IMPLEMENTADA EM 18/04/2026)

**Status:** ✅ Completo  
**Dependências:** Nenhuma (independente)  
**Arquivos envolvidos:**
- SQL: Tabela `obras_custos` + índices + trigger (CRIADA em apps/api/supabase_rpc.sql linha 559-597)
  - Tabela com colunas: id, obra_id, categoria, descricao, valor_previsto, valor_real, data, tipo, fornecedor_id, criado_em, atualizado_em
  - Índices: idx_obras_custos_obra, idx_obras_custos_categoria, idx_obras_custos_tipo
  - Trigger: trigger_atualizar_obras_custos para atualizar atualizado_em
- RPCs (tenant): 5 RPCs criadas em apps/api/supabase_rpc.sql linha 1636-1866
  - tenant_criar_custo_obra: insere custo com idempotency_key, registra audit_log
  - tenant_listar_custos_obra: retorna array JSONB ordenado por data
  - tenant_atualizar_custo_obra: atualiza todos os campos incluindo valor_real, registra audit_log
  - tenant_excluir_custo_obra: exclui, registra audit_log
  - tenant_obras_resumo_financeiro: retorna JSONB com {orcamento_total, total_previsto, total_real, variacao, percentual_orcamento_utilizado}
- RPCs (public): Não necessárias (sistema usa schema routing via middleware)
- API: Interfaces TypeScript + funções (CRIADO em apps/web/src/lib/api.ts linha 688-780)
  - Interfaces: ObraCusto, ObraCustoCreate, ObraCustoUpdate, ObraResumoFinanceiro
  - Funções: fetchObraCustos, createObraCusto, updateObraCusto, deleteObraCusto, fetchObraResumoFinanceiro
- Hooks: use-obras-custos.ts (CRIADO em apps/web/src/lib/hooks/use-obras-custos.ts)
  - Hooks: useObraCustos, useCreateObraCusto, useUpdateObraCusto, useDeleteObraCusto, useObraResumoFinanceiro
- Componente: FinanceiroDashboard.tsx (CRIADO em apps/web/src/components/modules/obras/FinanceiroDashboard.tsx)
  - Dashboard financeiro com cards de métricas (orçamento, previsto, real, variação)
  - Barra de progresso do orçamento utilizado
  - Tabela de custos com filtro por tipo/categoria
  - Props: resumo, custos, onAdd, onEdit, onDelete
- UI: Não integrado na página de obras (aguarda Sessão 6)

**Observações:**
- Tabela obras_custos aplicada apenas em tenant_62a495e1 (único schema com tabela obras)
- RPCs aplicadas em todos os 4 schemas tenant
- Trigger aplicado em tenant_62a495e1
- Componente pronto para uso, aguarda integração na página de obras

### Sessão 4: Gestão de Recursos/Alocação (IMPLEMENTADA EM 18/04/2026)

**Status:** ✅ Completo  
**Dependências:** Nenhuma (independente)  
**Arquivos envolvidos:**
- SQL: Tabela `obras_recursos` + índices + trigger (CRIADA em apps/api/supabase_rpc.sql linha 599-639)
  - Tabela com colunas: id, obra_id, tipo, descricao, quantidade, unidade, custo_unitario, custo_total (GENERATED), status, data_alocacao, fornecedor_id, criado_em, atualizado_em
  - Índices: idx_obras_recursos_obra, idx_obras_recursos_tipo, idx_obras_recursos_status
  - Trigger: trigger_atualizar_obras_recursos para atualizar atualizado_em
  - Coluna gerada custo_total = quantidade * custo_unitario
- RPCs (tenant): 4 RPCs criadas em apps/api/supabase_rpc.sql linha 1910-2102
  - tenant_alocar_recurso_obra: insere recurso com idempotency_key, registra audit_log
  - tenant_listar_recursos_obra: retorna array JSONB com custo_total calculado
  - tenant_atualizar_recurso_obra: atualiza campos (exceto custo_total que é GENERATED), registra audit_log
  - tenant_excluir_recurso_obra: exclui, registra audit_log
- RPCs (public): Não necessárias (sistema usa schema routing via middleware)
- API: Interfaces TypeScript + funções (CRIADO em apps/web/src/lib/api.ts linha 782-867)
  - Interfaces: ObraRecurso, ObraRecursoCreate, ObraRecursoUpdate
  - Funções: fetchObrasRecursos, alocarRecursoObra, updateObraRecurso, deleteObraRecurso
- Hooks: use-obras-recursos.ts (CRIADO em apps/web/src/lib/hooks/use-obras-recursos.ts)
  - Hooks: useObraRecursos, useAlocarRecursoObra, useUpdateObraRecurso, useDeleteObraRecurso
- Componente: RecursosTabela.tsx (CRIADO em apps/web/src/components/modules/obras/RecursosTabela.tsx)
  - Tabela de recursos com cards de totais por tipo
  - Totalizador geral com custo total
  - Filtro por tipo e status colorido
  - Props: recursos, onAdd, onEdit, onDelete
- UI: Não integrado na página de obras (aguarda Sessão 6)

**Observações:**
- Tabela obras_recursos aplicada apenas em tenant_62a495e1 (único schema com tabela obras)
- RPCs aplicadas em todos os 4 schemas tenant
- Trigger aplicado em tenant_62a495e1
- Componente pronto para uso, aguarda integração na página de obras

### Sessão 5: Documentação e Anexos (IMPLEMENTADA EM 18/04/2026)

**Status:** ✅ Completo  
**Dependências:** Supabase Storage (configuração externa)  
**Arquivos envolvidos:**
- SQL: Tabela `obras_documentos` + índices (CRIADA em apps/api/supabase_rpc.sql linha 641-659)
  - Tabela com colunas: id, obra_id, nome, tipo, tamanho, url, caminho_storage, descricao, criado_por, criado_em
  - Índices: idx_obras_documentos_obra, idx_obras_documentos_tipo
  - Sem atualizado_em (documentos são imutáveis após upload)
- Bucket e políticas RLS: O bucket 'obras-documentos' precisa ser criado manualmente no Supabase Dashboard com políticas RLS para isolamento por tenant
- RPCs (tenant): 3 RPCs criadas em apps/api/supabase_rpc.sql linha 2124-2228
  - tenant_upload_documento_obra: insere registro do documento após upload, registra audit_log
  - tenant_listar_documentos_obra: retorna array JSONB
  - tenant_excluir_documento_obra: exclui registro e retorna caminho_storage para exclusão no storage pelo frontend
- RPCs (public): Não necessárias (sistema usa schema routing via middleware)
- API: Interfaces TypeScript + funções (CRIADO em apps/web/src/lib/api.ts linha 869-994)
  - Interfaces: ObraDocumento
  - Funções: fetchObraDocumentos, uploadObraDocumento, deleteObraDocumento
  - uploadObraDocumento: obtém schema do tenant, valida tipo/tamanho, gera caminho único, upload via Supabase Storage, registra via RPC
- Hooks: use-obras-documentos.ts (CRIADO em apps/web/src/lib/hooks/use-obras-documentos.ts)
  - Hooks: useObraDocumentos, useUploadObraDocumento, useDeleteObraDocumento
- Componente: DocumentosGaleria.tsx (CRIADO em apps/web/src/components/modules/obras/DocumentosGaleria.tsx)
  - Área de drop/upload com validação visual de tipo e tamanho
  - Grid de cards: preview para imagens, ícone por tipo para PDFs/docs
  - Cada card: nome, descrição, tamanho (formatBytes), data, botões download e excluir
- Utilitário: format.ts (CRIADO em apps/web/src/lib/utils/format.ts)
  - Função formatBytes para formatação de tamanho de arquivo
- UI: Não integrado na página de obras (aguarda Sessão 6)

**Observações:**
- Tabela obras_documentos aplicada apenas em tenant_62a495e1 (único schema com tabela obras)
- RPCs aplicadas em todos os 4 schemas tenant
- Bucket 'obras-documentos' precisa ser criado manualmente no Supabase Dashboard
- Políticas RLS do bucket devem usar: split_part(name, '/', 1) = schema_name do tenant do usuário
- Componente pronto para uso, aguarda integração na página de obras

### Sessão 6: Integração na Página de Obras (IMPLEMENTADA EM 18/04/2026)

**Status:** ✅ Completo  
**Dependências:** Sessões 2, 3, 4, 5  
**Arquivos modificados:**
- apps/web/src/app/tenant/obras/page.tsx
  - Adicionado sistema de tabs (Detalhes, Etapas, Financeiro, Recursos, Documentos)
  - Integrado componente Tabs (criado em apps/web/src/components/ui/tabs.tsx)
  - Integrado EtapasTimeline com hooks useObraEtapas, useObraProgresso
  - Integrado FinanceiroDashboard com hooks useObraCustos, useObraResumoFinanceiro
  - Integrado RecursosTabela com hooks useObraRecursos
  - Integrado DocumentosGaleria com hooks useObraDocumentos
  - Mantido funcionalidades existentes (tabela, calendário, modais)
  - Adicionado estado selectedObra para mostrar painel lateral com detalhes
  - Adicionado estado activeTab com reset ao trocar de obra
  - Adicionado campo status nos modais de criação e edição
- apps/web/src/components/ui/tabs.tsx (CRIADO)
  - Componente Tabs simples para sistema de abas
- apps/web/src/lib/api.ts (MODIFICADO)
  - Adicionado campo id em ObraEtapaUpdate para suportar atualização

**Observações:**
- Handlers para criar/atualizar custos e recursos estão como wrappers com TODO (funcionalidade de modais pendente)
- Painel lateral mostra detalhes da obra selecionada com 5 abas
- Tabela de obras é clicável para selecionar obra e abrir painel lateral
- Botões de editar/excluir na tabela usam stopPropagation para não selecionar a obra

---

## 4. DECISÕES ARQUITETURAIS RELEVANTES

### 4.1. Idempotência

**Implementação obrigatória em todas as RPCs de escrita:**
- Parâmetro `p_idempotency_key TEXT DEFAULT NULL`
- Verificação na tabela `idempotency_control`
- Cache de resultado em JSONB
- Evita duplicações em reenvios de formulário

### 4.2. Audit Log

**Registro obrigatório em todas as operações:**
- Tabela `audit_log` no schema tenant
- Colunas: operation_type, resource, resource_id, user_id, details, status, criado_em
- Inserir após cada INSERT/UPDATE/DELETE
- Rastreabilidade completa de operações

### 4.3. Timestamps Automáticos

**Padrão obrigatório:**
- Colunas `criado_em TIMESTAMPTZ DEFAULT NOW()`
- Colunas `atualizado_em TIMESTAMPTZ DEFAULT NOW()`
- Trigger para atualizar `atualizado_em` automaticamente em UPDATE

### 4.4. Índices

**Padrão obrigatório:**
- Índice em FKs (cliente_id, fornecedor_id, etc.)
- Índice em status (para filtros)
- Índice em criado_em DESC (para ordenação)
- Índices compostos quando necessário (obra_id + campo)

### 4.5. Schema Routing

**Implementação obrigatória:**
- Todas as RPCs no schema public roteiam para schema tenant
- Verificação de `user_profiles.empresa_id` e `empresas.schema_name`
- EXECUTE format() para SQL dinâmico
- Security DEFINER para privilégios elevados

### 4.6. RLS (Row Level Security)

**Estratégia atual:**
- RLS habilitado em todas as tabelas
- Políticas permissivas (USING (true)) pois isolamento é por schema routing
- Schema routing garante isolamento por tenant

### 4.7. Validações

**Validações no banco:**
- CHECK constraints para status, tipo, etc.
- NOT NULL em campos obrigatórios
- FK constraints para relacionamentos
- Valores padrão apropriados

**Validações no frontend:**
- TypeScript interfaces para type safety
- Validação de formulários
- Tratamento de erro padrão

### 4.8. Supabase Storage

**Configuração para documentos:**
- Bucket `obras-documentos` (não público)
- Políticas RLS por schema
- Caminho: `{schema}/{obra_id}/{nome_arquivo}`
- Validação de tipo e tamanho no frontend

### 4.9. Colunas Geradas

**Uso de colunas geradas:**
- `custo_total GENERATED ALWAYS AS (quantidade * custo_unitario) STORED`
- Evita inconsistência de dados
- Calculado automaticamente pelo banco

### 4.10. Transações

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
- `produtos` - Produtos/Estoque
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

1. **Sessão 2:** Implementar gestão de etapas/milestones
2. **Sessão 3:** Implementar controle financeiro detalhado
3. **Sessão 4:** Implementar gestão de recursos/alocação
4. **Sessão 5:** Implementar documentação e anexos
5. **Sessão 6:** Integrar tudo na página de obras com sistema de tabs

---

**Fim do Session State**
