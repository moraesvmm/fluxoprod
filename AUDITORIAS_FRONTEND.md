# AUDITORIAS FRONTEND — FLUXO ERP

## AUDITORIA 9 — ALINHAMENTO FRONTEND ⇄ ÍNDICES SQL

### Objetivo
Verificar se o frontend realiza queries e RPC calls que estejam alinhadas com os índices existentes no banco.

### Análise

#### Índices existentes no banco (verificado em supabase_rpc.sql):
- `idx_clientes_telefone` em clientes.telefone
- `idx_produtos_preco_base` em produtos.preco_base
- `idx_vendas_valor_total` em vendas.valor_total
- `idx_configuracoes_chave` em configuracoes.chave
- `idx_idempotency_created_at` em idempotency_control.created_at
- `idx_schema_migrations_version` em schema_migrations.version
- `idx_role_permissions_unique` em role_permissions(role, resource, action)
- Índices adicionais em audit_log

#### Chamadas RPC do frontend (verificado em api.ts e hooks):

1. **tenant_listar_clientes** (CRM)
   - Chamada: `supabase.rpc('tenant_listar_clientes')`
   - Parâmetros: nenhum (usa LIMIT padrão 1000)
   - ORDER BY na RPC: `ORDER BY criado_em DESC` (tem índice PK em id, mas não em criado_em)
   - **DESLINHAMENTO**: ORDER BY criado_em não tem índice dedicado
   - **Risco**: BAIXO - volume de clientes tende a ser moderado, PK é UUID

2. **tenant_listar_produtos** (Estoque)
   - Chamada: `supabase.rpc('tenant_listar_produtos')`
   - Parâmetros: nenhum (usa LIMIT padrão 1000)
   - ORDER BY na RPC: `ORDER BY nome ASC` (sem índice em nome)
   - **DESLINHAMENTO**: ORDER BY nome não tem índice
   - **Risco**: MÉDIO - busca de produtos pode ser frequente

3. **tenant_listar_estoque** (PDV)
   - Chamada: `supabase.rpc('tenant_listar_estoque')`
   - Parâmetros: nenhum (usa LIMIT padrão 1000)
   - ORDER BY na RPC: `ORDER BY nome ASC` (sem índice em nome)
   - **DESLINHAMENTO**: ORDER BY nome não tem índice
   - **Risco**: MÉDIO - PDV é operação crítica

4. **tenant_listar_vendas** (Vendas/Dashboard)
   - Chamada: `supabase.rpc('tenant_listar_vendas', { p_limit: 100 })`
   - Parâmetros: p_limit=100
   - ORDER BY na RPC: `ORDER BY criado_em DESC` (tem índice idx_vendas_valor_total, mas não em criado_em)
   - **DESLINHAMENTO**: ORDER BY criado_em não tem índice dedicado
   - **Risco**: MÉDIO - dashboard acessa frequentemente

5. **tenant_listar_financeiro** (Financeiro)
   - Chamada: `supabase.rpc('tenant_listar_financeiro')`
   - Parâmetros: nenhum (usa LIMIT padrão 1000)
   - ORDER BY na RPC: `ORDER BY criado_em DESC` (sem índice em criado_em)
   - **DESLINHAMENTO**: ORDER BY criado_em não tem índice
   - **Risco**: BAIXO - volume de transações financeiras tende a ser moderado

6. **tenant_listar_ordens_servico** (OS)
   - Chamada: `supabase.rpc('tenant_listar_ordens_servico')`
   - Parâmetros: nenhum (usa LIMIT padrão 1000)
   - ORDER BY na RPC: `ORDER BY criado_em DESC` (sem índice em criado_em)
   - **DESLINHAMENTO**: ORDER BY criado_em não tem índice
   - **Risco**: BAIXO - volume de OS tende a ser moderado

7. **tenant_listar_obras** (Obras)
   - Chamada: `supabase.rpc('tenant_listar_obras')`
   - Parâmetros: nenhum (usa LIMIT padrão 1000)
   - ORDER BY na RPC: `ORDER BY criado_em DESC` (sem índice em criado_em)
   - **DESLINHAMENTO**: ORDER BY criado_em não tem índice
   - **Risco**: BAIXO - volume de obras tende a ser baixo

8. **tenant_listar_funcionarios** (RH)
   - Chamada: `supabase.rpc('tenant_listar_funcionarios')`
   - Parâmetros: nenhum (usa LIMIT padrão 1000)
   - ORDER BY na RPC: `ORDER BY nome ASC` (sem índice em nome)
   - **DESLINHAMENTO**: ORDER BY nome não tem índice
   - **Risco**: BAIXO - volume de funcionários tende a ser baixo

9. **tenant_listar_comissoes** (Comissões)
   - Chamada: `supabase.rpc('tenant_listar_comissoes')`
   - Parâmetros: nenhum (usa LIMIT padrão 1000)
   - ORDER BY na RPC: `ORDER BY periodo_referencia DESC` (sem índice em periodo_referencia)
   - **DESLINHAMENTO**: ORDER BY periodo_referencia não tem índice
   - **Risco**: BAIXO - volume de comissões tende a ser baixo

10. **tenant_dashboard_kpis** (Dashboard)
    - Chamada: `supabase.rpc('tenant_dashboard_kpis')`
    - Parâmetros: nenhum
    - **DESLINHAMENTO**: Nenhum - é query agregada
    - **Risco**: BAIXO

### Problema CRÍTICO encontrado em PDV

**Arquivo**: `apps/web/src/app/tenant/vendas/pdv/page.tsx` (linhas 55-59)

```typescript
const { data, error: dbError } = await supabase
  .from("produtos")
  .select("id, nome, preco_venda, estoque_atual, estoque_minimo, sku")
  .gte("estoque_atual", 0)
  .order("nome", { ascending: true });
```

**VIOLAÇÃO DA OPÇÃO A**: Acesso direto à tabela `produtos` em vez de usar RPC `tenant_listar_estoque`

**Risco**: 
- **CRÍTICO** - Bypass da arquitetura Opção A
- Pode acessar dados de schema incorreto se search_path não estiver configurado
- Não usa idempotência
- Não segue padrão de RPCs

**Recomendação**: Substituir por `supabase.rpc('tenant_listar_estoque')`

### Desalinhamentos de Índices

**SEVERIDADE: MÉDIA**

1. ORDER BY por `criado_em DESC` em múltiplas tabelas (clientes, vendas, financeiro, OS, obras)
   - **Impacto**: Seq scan em tabelas com muitos registros
   - **Recomendação**: Adicionar índices `idx_<tabela>_criado_em (criado_em DESC)`
   - **Prioridade**: MÉDIA

2. ORDER BY por `nome ASC` em produtos, funcionarios
   - **Impacto**: Seq scan em tabelas com muitos registros
   - **Recomendação**: Adicionar índices `idx_produtos_nome (nome)`, `idx_funcionarios_nome (nome)`
   - **Prioridade**: BAIXA

### Riscos sob carga

- **Vendas**: ORDER BY criado_em sem índice pode degradar com >10k vendas
- **Produtos**: ORDER BY nome sem índice pode degradar com >1k produtos
- **PDV**: Acesso direto à tabela pode causar inconsistência de schema

### Recomendações Práticas

1. **IMEDIATO**: Corrigir PDV para usar RPC `tenant_listar_estoque`
2. **CURTO PRAZO**: Adicionar índices em criado_em para tabelas de alta volumetria (vendas, financeiro)
3. **MÉDIO PRAZO**: Adicionar índices em nome para produtos e funcionarios
4. **LONGO PRAZO**: Implementar cursor-based pagination para eliminar offset

---

## AUDITORIA 10 — FLUXO DE LOGIN, ROLE E TENANT

### Objetivo
Validar que login funciona corretamente em todos os cenários, role resolution é consistente, schema routing é sempre acionado, e não existem estados inválidos.

### Análise

#### 1. Fluxo de Login (login/page.tsx)

**Passos:**
1. User entra email/senha
2. `supabase.auth.signInWithPassword()` autentica
3. Busca `user_profiles.role` via `.select("role").eq("user_id", user.id)`
4. Se role não existe: erro "Usuário sem perfil"
5. Redirect baseado em role:
   - `master` → `/admin`
   - outros → `/tenant/dashboard`

**Problemas encontrados:**
- **NÃO verifica empresa_id** no login
- Um usuário master pode não ter empresa_id (ok)
- Um usuário tenant SEM empresa_id seria redirecionado para /tenant/dashboard (estado inválido)

**Risco**: BAIXO - middleware.ts valida empresa_id

#### 2. Middleware (middleware.ts)

**Validações:**
1. Verifica env vars Supabase
2. `supabase.auth.getUser()` obtém usuário
3. Rotas `/tenant`, `/admin`, `/mestre` requerem auth
4. Se user já logado e tenta `/login`, redireciona para `/tenant/dashboard`
5. **CRÍTICO**: Busca `user_profiles.role, empresa_id`
6. Se profile não existe: redirect para `/login`
7. **CRÍTICO**: Chama `set_tenant_schema(p_user_id)` para configurar search_path
8. Se schema routing falha: redirect para `/erro-schema`
9. **CRÍTICO**: Enforce feature flags para rotas `/tenant`
10. Master não pode acessar `/tenant`
11. Tenant não pode acessar `/admin` ou `/mestre`

**Problemas encontrados:**
- **NENHUM** - fluxo está robusto

**Validação de feature flags:**
```typescript
const { data: modRow } = await supabase
  .from('v_empresa_modulos')
  .select('ativo')
  .eq('empresa_id', profile.empresa_id)
  .eq('modulo_key', moduleKey)
  .maybeSingle()

if (!modRow?.ativo) {
  return NextResponse.redirect(new URL('/tenant/sem-modulos', request.url))
}
```

**Problemas encontrados:**
- **NENHUM** - feature flags são validadas corretamente

#### 3. Schema Routing

**Função RPC**: `set_tenant_schema(p_user_id)`

**Middleware injeta header**: `x-tenant-schema`

**Problemas encontrados:**
- **NENHUM** - schema routing é acionado em toda request

#### 4. Estados Inválidos Possíveis

**Cenário 1**: Usuário com role='tenant' mas empresa_id=NULL
- **Resultado**: Middleware redireciona para `/login` (linha 73-75)
- **Comportamento**: CORRETO

**Cenário 2**: Usuário com role='master' mas empresa_id=NULL
- **Resultado**: Middleware permite acesso a `/admin`
- **Comportamento**: CORRETO

**Cenário 3**: Usuário com role='tenant' mas módulo desativado
- **Resultado**: Middleware redireciona para `/tenant/sem-modulos`
- **Comportamento**: CORRETO

**Cenário 4**: Schema routing falha
- **Resultado**: Middleware redireciona para `/erro-schema`
- **Comportamento**: CORRETO

**Cenário 5**: Supabase env vars não configuradas
- **Resultado**: Middleware redireciona para `/setup`
- **Comportamento**: CORRETO

### Mapeamento Completo do Fluxo

```
1. User acessa /login
   ↓
2. Submete email/senha
   ↓
3. Supabase Auth valida
   ↓
4. Frontend busca user_profiles.role
   ↓
5. Se role não existe: erro "Usuário sem perfil"
   ↓
6. Redirect: master → /admin, tenant → /tenant/dashboard
   ↓
7. Middleware intercepta request
   ↓
8. Middleware busca user_profiles.role, empresa_id
   ↓
9. Se profile não existe: redirect /login
   ↓
10. Middleware chama set_tenant_schema()
    ↓
11. Se schema routing falha: redirect /erro-schema
    ↓
12. Middleware valida feature flags
    ↓
13. Se módulo desativado: redirect /tenant/sem-modulos
    ↓
14. Request prossegue com schema correto configurado
```

### Detecção de Loops, Falhas ou Bypasses

**Loops:**
- **NENHUM** - não há loops detectados

**Falhas:**
- **NENHUM** - todas as falhas têm tratamento adequado

**Bypasses:**
- **NENHUM** - middleware valida todas as rotas protegidas

### Risco: BAIXO

O fluxo de login e schema routing está bem implementado e robusto.

---

## AUDITORIA 11 — MÓDULOS, FEATURE FLAGS E NAVEGAÇÃO

### Objetivo
Garantir que sidebar reflete corretamente os módulos ativos, feature flags são respeitadas, não existem botões ou páginas acessíveis sem permissão, e navegação não acessa rotas inválidas.

### Análise

#### 1. Sidebar (components/layout/Sidebar.tsx)

**Carregamento de módulos:**
```typescript
const { data: mods } = await supabase
  .from("v_empresa_modulos")
  .select("modulo_key, ativo")
  .eq("empresa_id", profile.empresa_id);

setActiveKeys((mods || []).filter((m: any) => m.ativo).map((m: any) => m.modulo_key));
```

**Problemas encontrados:**
- **NENHUM** - sidebar carrega módulos ativos corretamente

**Navegação hardcodeada:**
```typescript
const navigation = [
  { key: "dashboard", name: "Dashboard", href: "/tenant/dashboard", icon: LayoutDashboard },
  { key: "vendas", name: "Vendas", href: "/tenant/vendas", icon: ShoppingCart },
  { key: "estoque", name: "Estoque", href: "/tenant/estoque", icon: Package },
  { key: "crm", name: "Clientes & CRM", href: "/tenant/crm", icon: Users },
  { key: "financeiro", name: "Financeiro", href: "/tenant/financeiro", icon: Wallet },
  { key: "catalogo", name: "Catálogo", href: "/tenant/catalogo", icon: Tags },
  { key: "rh", name: "RH & Equipe", href: "/tenant/rh", icon: Briefcase },
  { key: "os", name: "Ordem de Serviço", href: "/tenant/os", icon: Wrench },
  { key: "obras", name: "Obras", href: "/tenant/obras", icon: Building2 },
  { key: "comissoes", name: "Comissões", href: "/tenant/comissoes", icon: DollarSign },
  { key: "relatorios", name: "Relatórios", href: "/tenant/relatorios", icon: FileText },
  { key: "configuracoes", name: "Configurações", href: "/tenant/configuracoes", icon: Settings },
];
```

**Filtro por módulos ativos:**
```typescript
const visibleNavigation = useMemo(() => {
  if (activeKeys === null) return [];
  return navigation.filter((n) => activeKeys.includes(n.key));
}, [activeKeys]);
```

**Problemas encontrados:**
- **NENHUM** - sidebar filtra corretamente por módulos ativos

#### 2. Middleware Feature Flags (middleware.ts)

**Validação:**
```typescript
if (pathname.startsWith('/tenant')) {
  const parts = pathname.split('/').filter(Boolean)
  const moduleKey = parts.length >= 2 ? parts[1] : 'dashboard'

  if (moduleKey !== 'sem-modulos') {
    const { data: modRow } = await supabase
      .from('v_empresa_modulos')
      .select('ativo')
      .eq('empresa_id', profile.empresa_id)
      .eq('modulo_key', moduleKey)
      .maybeSingle()

    if (!modRow?.ativo) {
      return NextResponse.redirect(new URL('/tenant/sem-modulos', request.url))
    }
  }
}
```

**Problemas encontrados:**
- **NENHUM** - middleware valida feature flags corretamente

#### 3. Incoerências Encontradas

**INCOERÊNCIA 1: Módulo "catalogo"**
- Sidebar tem key "catalogo" → href "/tenant/catalogo"
- Tabela `modulos_catalogo` tem key "catalogo"
- **Status**: CONSISTENTE

**INCOERÊNCIA 2: Módulo "relatorios"**
- Sidebar tem key "relatorios" → href "/tenant/relatorios"
- Tabela `modulos_catalogo` NÃO tem key "relatorios"
- **Status**: INCONSISTENTE - módulo "relatorios" não existe em modulos_catalogo
- **Risco**: BAIXO - se usuário tentar acessar, middleware redireciona para sem-modulos

**INCOERÊNCIA 3: Página "sem-modulos"**
- Existe página `/tenant/sem-modulos`
- Não é um módulo real, é página de fallback
- Sidebar não mostra link para sem-modulos
- **Status**: CORRETO - comportamento esperado

#### 4. Navegação Direta por URL

**Teste mental**: Usuário acessa `/tenant/vendas` diretamente (sem clicar na sidebar)
- **Resultado**: Middleware valida feature flag "vendas"
- **Se ativo**: permite acesso
- **Se inativo**: redirect para `/tenant/sem-modulos`
- **Status**: CORRETO

#### 5. Links Internos

**Dashboard → Ações Rápidas:**
```typescript
<ActionCard title="Nova Venda" href="/tenant/vendas/pdv" />
<ActionCard title="Conciliar Extrato" href="/tenant/financeiro" />
<ActionCard title="Cadastrar Cliente" href="/tenant/crm" />
```

**Problemas encontrados:**
- **NENHUM** - links apontam para módulos válidos

**Estoque → Link para Catálogo:**
```typescript
<Link href="/tenant/catalogo">Ir para Catálogo</Link>
```

**Problemas encontrados:**
- **NENHUM** - link aponta para módulo válido

### Riscos de UX e Segurança

**Risco 1**: Usuário pode acessar URL de módulo desativado digitando diretamente
- **Mitigação**: Middleware redireciona para `/tenant/sem-modulos`
- **Status**: MITIGADO

**Risco 2**: Sidebar pode mostrar módulo que não existe em modulos_catalogo
- **Mitigação**: Middleware redireciona para `/tenant/sem-modulos`
- **Status**: MITIGADO

**Risco 3**: Módulo "relatorios" não existe em modulos_catalogo
- **Impacto**: Usuário nunca pode ativar módulo relatorios
- **Recomendação**: Adicionar "relatorios" em modulos_catalogo ou remover da sidebar
- **Prioridade**: BAIXA

### Recomendações

1. **BAIXA PRIORIDADE**: Adicionar módulo "relatorios" em modulos_catalogo ou remover da sidebar
2. **BOA PRÁTICA**: Documentar que módulos da sidebar devem existir em modulos_catalogo

### Severidade: BAIXA

Sidebar e feature flags estão bem implementados. Uma pequena inconsistência com módulo "relatorios".

---

## AUDITORIA 12 — BOTÕES, AÇÕES E CHAMADAS RPC

### Objetivo
Verificar se o frontend chama SEMPRE a RPC correta, não usa acesso direto indevido, trata erros corretamente, e não possui botões sem efeito real ou comportamento inconsistente.

### Análise

#### 1. Adesão à Opção A

**Regra**: Frontend deve usar SEMPRE RPCs, nunca acesso direto às tabelas do schema tenant.

**Verificação por módulo:**

**CRM (crm/page.tsx):**
- Listar: `useClientes()` → `fetchClientes()` → `supabase.rpc('tenant_listar_clientes')` ✅
- Criar: `createCliente()` → `supabase.rpc('tenant_criar_cliente')` ✅
- Excluir: `deleteCliente()` → `supabase.rpc('tenant_excluir_cliente')` ✅
- **Status**: ADESO TOTAL

**Estoque (estoque/page.tsx):**
- Listar: `useProdutos()` → `fetchProdutos()` → `supabase.rpc('tenant_listar_produtos')` ✅
- Criar: `createProduto()` → `supabase.rpc('tenant_criar_produto')` ✅
- Excluir: `deleteProduto()` → `supabase.rpc('tenant_excluir_produto')` ✅
- **Status**: ADESO TOTAL

**Financeiro (financeiro/page.tsx):**
- Listar: `supabase.rpc('tenant_listar_financeiro')` ✅
- Criar: `supabase.rpc('tenant_criar_financeiro')` ✅
- Excluir: `supabase.rpc('tenant_excluir_financeiro')` ✅
- **Status**: ADESO TOTAL

**Vendas (vendas/page.tsx):**
- Listar: `useVendas()` → `fetchVendas()` → `supabase.rpc('tenant_listar_vendas')` ✅
- Excluir: `deleteVenda()` → `throw new Error('Exclusão de vendas não implementada via RPC')` ⚠️
- **Status**: ADESO PARCIAL - exclusão não implementada

**PDV (vendas/pdv/page.tsx):**
- **CRÍTICO**: `supabase.from("produtos").select()` ❌
- Criar venda: `supabase.rpc('tenant_processar_venda')` ✅
- Recarregar estoque: `supabase.rpc('tenant_listar_estoque')` ✅
- **Status**: VIOLAÇÃO CRÍTICA - acesso direto à tabela produtos

**OS (os/page.tsx):**
- Listar: `useOS()` → `fetchOS()` → `supabase.rpc('tenant_listar_ordens_servico')` ✅
- Criar: `createOS()` → `supabase.rpc('tenant_criar_os')` ✅
- Excluir: `deleteOS()` → `supabase.rpc('tenant_excluir_os')` ✅
- Funcionários: `supabase.from("funcionarios").select()` ❌
- **Status**: VIOLAÇÃO - acesso direto à tabela funcionarios

**Obras (obras/page.tsx):**
- Listar: `useObras()` → `fetchObras()` → `supabase.rpc('tenant_listar_obras')` ✅
- Criar: `createObra()` → `supabase.rpc('tenant_criar_obra')` ✅
- Excluir: `deleteObra()` → `supabase.rpc('tenant_excluir_obra')` ✅
- **Status**: ADESO TOTAL

**Dashboard (dashboard/page.tsx):**
- KPIs: `supabase.rpc('tenant_dashboard_kpis')` ✅
- Últimas vendas: `supabase.rpc('tenant_listar_vendas')` ✅
- **Status**: ADESO TOTAL

#### 2. Chamadas Incorretas Detectadas

**VIOLAÇÃO 1 - CRÍTICA: PDV acessa tabela produtos diretamente**
- **Arquivo**: `apps/web/src/app/tenant/vendas/pdv/page.tsx` (linhas 55-59)
- **Código**:
  ```typescript
  const { data, error: dbError } = await supabase
    .from("produtos")
    .select("id, nome, preco_venda, estoque_atual, estoque_minimo, sku")
    .gte("estoque_atual", 0)
    .order("nome", { ascending: true });
  ```
- **Risco**: CRÍTICO - bypass da arquitetura Opção A
- **Correção**: Substituir por `supabase.rpc('tenant_listar_estoque')`

**VIOLAÇÃO 2 - MÉDIA: OS acessa tabela funcionários diretamente**
- **Arquivo**: `apps/web/src/app/tenant/os/page.tsx` (linha 52)
- **Código**:
  ```typescript
  const { data } = await supabase.from("funcionarios").select("id, nome").order("nome");
  ```
- **Risco**: MÉDIO - bypass da arquitetura Opção A
- **Correção**: Criar RPC `tenant_listar_funcionarios` ou usar `tenant_listar_funcionarios` se existir

**VIOLAÇÃO 3 - MÉDIA: PDV acessa tabela funcionários diretamente**
- **Arquivo**: `apps/web/src/app/tenant/vendas/pdv/page.tsx` (linha 86)
- **Código**:
  ```typescript
  const { data } = await supabase.from("funcionarios").select("id, nome, cargo").order("nome");
  ```
- **Risco**: MÉDIO - bypass da arquitetura Opção A
- **Correção**: Criar RPC `tenant_listar_funcionarios` ou usar `tenant_listar_funcionarios` se existir

#### 3. Tratamento de Erros

**Padrão geral:**
```typescript
try {
  await mutation.mutateAsync(data);
  success("Operação realizada com sucesso!");
} catch {
  toastError("Erro ao realizar operação. Tente novamente.");
}
```

**Problemas encontrados:**
- **NENHUM** - tratamento de erros é consistente

**Melhoria possível:**
- Alguns catches não logam o erro específico (`console.error`)
- **Prioridade**: BAIXA

#### 4. Botões sem Efeito Real

**Financeiro - Botão "Editar":**
```typescript
<button className="text-slate-400 hover:text-blue-600 p-1" title="Editar">
  <Edit className="h-4 w-4" />
</button>
```
- **Status**: Botão existe mas não tem handler onClick
- **Risco**: BAIXO - apenas UX, não quebra funcionalidade

**Financeiro - Botão "Ver Detalhes":**
```typescript
<button className="text-slate-400 hover:text-primary p-1" title="Ver Detalhes">
  <ExternalLink className="h-4 w-4" />
</button>
```
- **Status**: Botão existe mas não tem handler onClick
- **Risco**: BAIXO - apenas UX, não quebra funcionalidade

**Vendas - Botão "Editar transação":**
```typescript
<button className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Editar transação">
  <Edit className="h-4 w-4" />
</button>
```
- **Status**: Botão existe mas não tem handler onClick
- **Risco**: BAIXO - apenas UX, não quebra funcionalidade

**Vendas - Botão "Gerar Recibo PDF":**
```typescript
<button className="text-slate-400 hover:text-primary transition-colors p-1" title="Gerar Recibo PDF">
  <FileText className="h-4 w-4" />
</button>
```
- **Status**: Botão existe mas não tem handler onClick
- **Risco**: BAIXO - apenas UX, não quebra funcionalidade

**Estoque - Botão "Editar":**
```typescript
<button className="text-slate-400 hover:text-blue-600 p-1" title="Editar">
  <Edit className="h-4 w-4" />
</button>
```
- **Status**: Botão existe mas não tem handler onClick
- **Risco**: BAIXA - apenas UX, não quebra funcionalidade

**OS - Botão "Eye" (visualizar):**
- **Status**: Ícone Eye importado mas não usado
- **Risco**: NENHUM

#### 5. Estados de Loading/Erro

**Padrão geral:**
- Loading states implementados com `isLoading` e skeletons
- Error states implementados com mensagens de erro
- **Status**: CONSISTENTE

### Risco CRÍTICO

**VIOLAÇÃO DA OPÇÃO A em PDV**: Acesso direto à tabela `produtos` e `funcionarios`

### Correções Propostas

1. **IMEDIATO**: Substituir acesso direto à tabela produtos em PDV por RPC
2. **CURTO PRAZO**: Criar RPC `tenant_listar_funcionarios` ou usar existente
3. **CURTO PRAZO**: Implementar handlers para botões de edição ou removê-los
4. **BAIXA PRIORIDADE**: Adicionar logging detalhado de erros em catches

### Severidade: CRÍTICA

Violação da arquitetura Opção A em PDV é um risco crítico para consistência de dados e isolamento multi-tenant.

---

## RESUMO EXECUTIVO

### Riscos Críticos
1. **PDV acessa tabela produtos diretamente** - VIOLAÇÃO DA OPÇÃO A (CRÍTICA)
2. **OS e PDV acessam tabela funcionários diretamente** - VIOLAÇÃO DA OPÇÃO A (MÉDIA)

### Riscos Médios
1. ORDER BY criado_em sem índice em múltiplas tabelas
2. ORDER BY nome sem índice em produtos e funcionarios
3. Módulo "relatorios" não existe em modulos_catalogo

### Riscos Baixos
1. Botões de edição sem handler onClick
2. Tratamento de erros sem logging detalhado
3. Exclusão de vendas não implementada

### Prioridade de Correção
1. **IMEDIATO**: Corrigir PDV para usar RPCs
2. **CURTO PRAZO**: Adicionar índices em criado_em para tabelas de alta volumetria
3. **CURTO PRAZO**: Criar RPC para funcionarios
4. **MÉDIO PRAZO**: Resolver inconsistência do módulo "relatorios"
