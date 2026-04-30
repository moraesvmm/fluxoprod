# DOCUMENTAÇÃO TÉCNICA - FLUXO ERP
-- Status: Vistoria 39 Implementada - Motor Fiscal Nativo (Custo Zero) --
## ESTADO ATUAL: PRODUCTION-READY (QUALIFICADO)
## ÚLTIMA ATUALIZAÇÃO: 29/04/2026 (NFe Nativa, mTLS, XMLDSIG)
## VERSÃO: 2.5

---

> [!CAUTION]
> **🛑 BLINDAGEM DO MÓDULO CRM (REGRA DE OURO)**
> O módulo de CRM (`apps/web/src/app/tenant/crm/page.tsx` e componentes em `@/components/crm/*`) é o núcleo de inteligência e reengajamento do Fluxo ERP. 
> **PROIBIDO ALTERAR** a estrutura de RPCs (`tenant_obter_sugestoes_nurturing`, `tenant_criar_cliente`), hooks ou o sistema de Modais sem validação em ambiente multi-tenant diversificado. 
> **RESTRIÇÃO CRÍTICA**: Qualquer modificação em RPCs de CRM deve manter compatibilidade polimórfica (suporte a retornos `JSONB` e `RECORD`) para evitar quebra de produção em tenants legados.

---

## 🛡️ POLÍTICA DE EVOLUÇÃO E BLINDAGEM GLOBAL

Para garantir a integridade do sistema em caso de rollbacks e evitar quebra de produção por agentes ou manutenções:

1. **Mudanças Aditivas (Não Destrutivas)**: 
   - Ao adicionar funcionalidades, priorize a **adição** de novas colunas ou tabelas. 
   - **PROIBIDO** renomear ou excluir colunas existentes sem um plano de migração de dados de duas etapas (dual-run).
   - O código antigo deve sempre ser capaz de ignorar novas colunas adicionadas ao banco.

2. **Versionamento de RPCs (Modo Seguro)**:
   - Se uma alteração em uma RPC existente puder quebrar o contrato atual (ex: mudar parâmetros ou tipo de retorno), **NÃO ALTERE** a função original.
   - Crie uma nova versão da função (ex: `tenant_listar_vendas_v2`).
   - Mantenha a `v1` funcional até que todos os clientes/componentes tenham migrado para a nova versão.

3. **Independência de Rollback**:
   - O sistema deve ser projetado para que o rollback de um commit do Frontend (Git) não resulte em falha catastrófica devido ao estado "mais novo" do Banco de Dados.

---

## 📋 ESTRUTURA DO SISTEMA

### Arquitetura Geral (OPÇÃO A - IMPLEMENTADA)
- **Backend**: Supabase (PostgreSQL + RPC) - **FONTE DA VERDADE**
- **Frontend**: Next.js 16.2.2 (apps/web) - **UI E ORQUESTRADOR**
- **Database**: Supabase PostgreSQL com multi-tenancy por schema
- **Backend Python**: **NÃO EXISTE** - deve ser ignorado
- **Provisionamento**: RPC Functions via Supabase
- **Tecnologias Frontend**: React 19.2.4, TypeScript 5, TailwindCSS 4, @tanstack/react-query 5.96.2

### Atualizacao Corretiva 22/04/2026
- Leitura oficial desta data: o sistema esta operavel em producao no fluxo critico, mas ainda com pendencia SQL pontual para fechamento integral sem ressalvas.
- Checkout nao envia mais senha ao gateway; a senha fica apenas em estado cifrado server-side.
- O webhook de pagamento agora provisiona tenant pelo backend usando `provisionar_empresa_master`, `user_profiles`, `checkout_vendas` e `webhook_audit_log`, sem depender da RPC legada `webhook_provisionar_assinatura`.
- `relatorios` e `comissoes` foram trazidos para a camada `@/lib/api`, removendo acesso direto a tabelas tenant no browser.
- Validacao executada em 22/04/2026: `tsc --noEmit` e `next build` concluidos com sucesso.
- Pendencia remanescente: publicar no banco live `apps/api/migrations/rpc_comissoes_regras.sql`.
- Re-vistoria obrigatoria pendente apos essa publicacao SQL.

### Status Atual
Estado real consolidado pela Vistoria 17 (22/04/2026):
- Arquitetura central consistente: multi-tenancy por schema, `set_tenant_schema`, feature flags e RPCs como padrao principal.
- Banco publico live validado com `service_role`: `modulos_catalogo`, `v_empresa_modulos`, `empresas` e `user_profiles` acessiveis e coerentes.
- Pendencia critica no fluxo de checkout/provisionamento: senha trafega em metadata do gateway e o SQL ainda insere diretamente em `auth.users`.
- Pendencia alta de aderencia arquitetural: modulos `relatorios` e `comissoes` ainda usam acesso direto a tabelas tenant no browser.
- Pendencia alta de governanca: parte das RPCs consumidas pelo frontend nao esta consolidada no `apps/api/supabase_rpc.sql`.

✅ **O sistema está PRODUCTION-READY** após as correções críticas de 22/04/2026:
- **Segurança de Checkout**: Senhas não trafegam mais no gateway e são processadas apenas no backend.
- **Provisionamento Robusto**: Novo fluxo orquestrado via `/api/webhook/payment` utilizando RPCs atômicas.
- **Saneamento de Código**: Remoção de acessos diretos a tabelas tenant em `relatorios` e `comissoes`.
- **Build Estável**: Remoção de dependências de fontes remotas e pacotes ausentes, garantindo `next build` com sucesso.
- **Soft Delete Global**: Implementado em todas as entidades tenant (coluna `deleted_at` + índices parciais).
- **Escalabilidade**: Mantido o padrão de LIMIT (1000) e roteamento de schema seguro.

> [!WARNING]
> **Ressalva Pendente:** A funcionalidade de gestão de regras de comissão depende da aplicação de `apps/api/migrations/rpc_comissoes_regras.sql` no banco live. Até lá, o módulo opera em modo degradado.

### Estratégia Multi-Tenant (OPÇÃO A - IMPLEMENTADA)
- **Isolamento**: Um schema PostgreSQL por tenant (ex: `tenant_empresa_xyz`)
- **Schema Routing**: RPC `set_tenant_schema()` configura `search_path` baseado em `user_profiles`
- **Middleware**: Injeta schema via RPC em cada request, valida role e feature flags
- **RLS**: Policies permissivas (`USING (true)`) pois isolamento é por schema routing
- **RBAC**: Tabela `role_permissions` com roles `tenant_admin` e `tenant_user` padrão

### Módulo Fiscal (NFe Nativa - OPÇÃO CUSTO ZERO)
- **Motor**: Node.js Nativo (`node-forge` + `xml-crypto` + `axios`)
- **Certificado (Multi-tenant)**: Armazenamento isolado em Supabase Storage (`fiscal/{empresa_id}/certificado.pfx`).
- **Gestão**: Cada empresa realiza o upload de seu próprio certificado e senha via painel de Configurações.
- **Assinatura**: Padrão XMLDSIG (Sha256) executado server-side via API Route (`/api/fiscal/nfe/emitir`).
- **Transmissão**: mTLS (Mutual TLS) direto para os Web Services da SEFAZ utilizando o certificado do tenant.
- **Componentes Core**:
  - `NfeXmlBuilder`: Geração de XML 4.00.
  - `NfeSigner`: Assinatura digital do XML.
  - `SefazClient`: Comunicação SOAP/HTTPS com Agente mTLS dinâmico.
  - `NfeService`: Orquestrador de alto nível que consome credenciais do tenant.

---

## 🗂️ ESTRUTURA DE RPCs (SUPABASE)

### Arquivo Principal
**apps/api/supabase_rpc.sql** - Script completo de provisionamento e RPCs

### Observacoes Da Vistoria 17
- O contrato canônico do sistema continua sendo `apps/api/supabase_rpc.sql`, mas a vistoria confirmou drift entre esse arquivo e chamadas efetivamente consumidas pelo frontend.
- `modulos_catalogo` no banco live retornou a shape `key`, `nome`, `descricao`, `criado_em`.
- `empresas` no banco live inclui `atualizado_em` e `deleted_at`.
- `user_profiles` no banco live inclui `nome` e `deleted_at`.
- `v_empresa_modulos` esta populada com feature flags reais por tenant.

### Desvios Resolvidos (Vistoria 17)
- [x] **Checkout**: Senha removida do metadata do gateway.
- [x] **Provisionamento**: Migrado para orquestração backend (evita inserção direta insegura em `auth.users` via SQL).
- [x] **Acesso Direto**: Módulos `relatorios` e `comissoes` migrados para `@/lib/api`.
- [x] **Build**: Erros de fontes Google e `html5-qrcode` corrigidos.

### Tabelas do Schema Public (Governança)
1. **empresas** - Empresas/tenants
   - Colunas: id, cnpj, razao_social, porte, segmento, schema_name, criado_em, atualizado_em, status, **deleted_at**
   - Índices: idx_empresas_cnpj, idx_empresas_schema_name, idx_public_empresas_not_deleted

2. **modulos_catalogo** - Catálogo de módulos disponíveis
   - Colunas: key, nome, descricao, criado_em
   - Dados: dashboard, vendas, estoque, crm, financeiro, catalogo, rh, os, obras, comissoes, relatorios (Configurações é nativo)

3. **empresa_modulos** - Módulos ativos por empresa
   - Colunas: id, empresa_id, modulo_key, ativo
   - Índices: idx_empresa_modulos_empresa_modulo

4. **user_profiles** - Perfis de usuários
   - Colunas: id, user_id, role, empresa_id, nome, criado_em, **deleted_at**
   - Roles: master, tenant_admin, tenant_user
   - Índices: idx_user_profiles_user_id, idx_user_profiles_empresa_id, idx_public_user_profiles_not_deleted

5. **checkout_vendas** - Rastreabilidade global de vendas SaaS
   - Colunas: id, empresa_id, plano, valor, status, payload_gateway, criado_em

6. **webhook_audit_log** - Auditoria de eventos de webhook
   - Colunas: id, gateway, evento, payload, status_processamento, erro, criado_em

7. **v_empresa_modulos** - View para módulos ativos por empresa
   - JOIN: empresa_modulos + modulos_catalogo

### Tabelas do Schema Tenant (Soft Delete Implementado)
Todas as tabelas abaixo possuem a coluna `deleted_at TIMESTAMPTZ` e índices parciais `WHERE deleted_at IS NULL`.

1. **clientes** - Clientes/CRM
   - Colunas: id, nome, telefone, email, endereco, funil_fase, status, criado_em, atualizado_em, **deleted_at**
   - Índices: idx_clientes_telefone, idx_clientes_status, idx_clientes_funil_fase, idx_tenant_clientes_not_deleted

2. **produtos** - Produtos/Estoque
   - Colunas: id, nome, descricao, tipo, preco_base, sku, qtd_inicial, qtd_minima, criado_em, atualizado_em, **deleted_at**
   - Índices: idx_produtos_preco_base, idx_produtos_sku, idx_produtos_tipo, idx_tenant_produtos_not_deleted

3. **estoque** - Movimentação de estoque
   - Colunas: id, produto_id, tipo, quantidade, motivo, criado_em, **deleted_at**
   - Índices: idx_estoque_produto, idx_estoque_criado_em, idx_tenant_estoque_not_deleted

4. **vendas** - Vendas
   - Colunas: id, cliente_id, valor_total, metodo, status, vendedor_id, valor_custo_total (CMV), criado_em, atualizado_em, **deleted_at**
   - Índices: idx_vendas_valor_total, idx_vendas_cliente, idx_vendas_status, idx_vendas_criado_em, idx_tenant_vendas_not_deleted

5. **vendas_itens** - Itens de venda
   - Colunas: id, venda_id, produto_id, quantidade, preco_unitario, subtotal, **deleted_at**

6. **financeiro** - Transações financeiras
   - Colunas: id, tipo, descricao, valor, data_vencimento, status, categoria, conciliado (boolean), banco_transacao_id, banco_nome, data_conciliacao, criado_em, atualizado_em, **deleted_at**
   - Índices: idx_financeiro_tipo, idx_financeiro_status, idx_financeiro_criado_em, idx_financeiro_conciliado, idx_tenant_financeiro_not_deleted

7. **funcionarios** - Funcionários/RH
   - Colunas: id, nome, cargo, salario, status, criado_em, atualizado_em, **deleted_at**
   - Índices: idx_funcionarios_cargo, idx_funcionarios_status, idx_tenant_funcionarios_not_deleted

8. **ordens_servico** - Ordens de Serviço (OS)
   - Colunas: id, numero (BIGSERIAL), cliente_id, veiculo_equipamento, descricao_problema, colaborador_id, status, valor_orcamento, **tempo_total_minutos** (INTEGER), **timer_iniciado_em** (TIMESTAMPTZ), **valor_servico** (NUMERIC), criado_em, atualizado_em, **deleted_at**
   - Índices: idx_os_numero, idx_os_cliente, idx_os_status, idx_os_criado_em, idx_tenant_os_not_deleted

9. **ordens_servico_historico** - Histórico de OS
   - Colunas: id, os_id, acao, detalhes, criado_por, criado_em

10. **ordens_servico_itens** - Peças e Serviços da OS
    - Colunas: id, ordem_servico_id, produto_id, descricao, quantidade, preco_unitario, **valor_custo**, subtotal (generated), criado_em
    - Índices: idx_os_itens_os, idx_os_itens_produto

11. **obras** - Obras/Projetos
    - Colunas: id, nome, cliente_id, endereco, data_inicio, data_fim_prevista, orcamento_total, descricao, status, criado_em, atualizado_em, **deleted_at**
    - Índices: idx_obras_cliente, idx_obras_status, idx_obras_criado_em, idx_tenant_obras_not_deleted

12. **configuracoes** - Configurações do tenant
    - Colunas: id, chave, valor, descricao, criado_em, atualizado_em, **deleted_at**
    - Índices: idx_configuracoes_chave

13. **role_permissions** - Permissões por role (RBAC intra-tenant)
    - Colunas: id, role, resource, action, criado_em
    - Índices: idx_role_permissions_unique (role, resource, action)
    - Dados seed: tenant_admin (all), tenant_user (read-only)

14. **schema_migrations** - Versionamento de schema
    - Colunas: id, version, descricao, aplicado_em
    - Índices: idx_schema_migrations_version

15. **idempotency_control** - Controle de idempotência
    - Colunas: id, idempotency_key, operation_type, cached_result, criado_em
    - Índices: idx_idempotency_key (idempotency_key, operation_type), idx_idempotency_created_at

16. **audit_log** - Log de auditoria de operações de negócio
    - Colunas: id, operation_type, resource, resource_id, user_id, details, status, criado_em
    - Índices: idx_audit_log_operation, idx_audit_log_resource, idx_audit_log_user, idx_audit_log_timestamp, idx_audit_log_status

17. **fechamentos_mensais** - Resumos de fechamento mensal do dashboard
    - Colunas: id, mes (VARCHAR(7), UNIQUE), faturamento, total_vendas, ticket_medio, visto, visto_em, criado_em
    - Índices: idx_fechamentos_mes (mes)

### RPCs do Schema Public

#### Provisionamento
- **provisionar_empresa(p_cnpj, p_razao_social, p_porte, p_segmento, p_modulos)** - Cria tenant completo
- **set_tenant_schema(p_user_id)** - Configura search_path para o schema do usuário
- **upgrade_all_tenants(p_target_version)** - Aplica migrations em todos os schemas tenant

#### Dashboard
- **tenant_dashboard_kpis()** - Retorna KPIs agregados (faturamento, vendas, clientes, produtos, OS, obras em andamento, estoque baixo, saldo)
- **tenant_dashboard_kpis_por_mes(p_meses)** - Retorna série temporal JSONB de faturamento dos últimos N meses (faturamento, total_vendas, ticket_medio por mês)
- **tenant_obter_fechamento_pendente()** - Detecta fechamento mensal pendente e retorna resumo do mês anterior (faturamento, vendas, ticket médio)
- **tenant_marcar_fechamento_visto(p_mes)** - Marca o fechamento de um mês como visualizado pelo usuário
- **tenant_obter_sugestoes_nurturing()** - **Modelo Híbrido**: Detecta inatividade via tabela `vendas` OU via interações de tipo `venda` (CRM-only).
- **tenant_obter_dre(p_data_inicio, p_data_fim)** - Motor de DRE que consolida Faturamento, CMV e Despesas Operacionais em tempo real.

### RPCs do Schema Tenant (Dinâmicas)

#### Listagem (todas com LIMIT padrão 1000 e SELECT explícito)
- **tenant_listar_clientes(p_limit, p_offset)** - Lista clientes
- **tenant_listar_produtos(p_limit, p_offset)** - Lista produtos
- **tenant_listar_estoque(p_limit, p_offset)** - Lista estoque
- **tenant_listar_vendas(p_limit, p_offset)** - Lista vendas
- **tenant_listar_financeiro(p_limit, p_offset)** - Lista transações financeiras
- **tenant_listar_funcionarios(p_limit, p_offset)** - Lista funcionários
- **tenant_listar_ordens_servico(p_limit, p_offset)** - Lista OS
- **tenant_listar_obras(p_limit, p_offset)** - Lista obras
- **tenant_listar_comissoes(p_limit, p_offset)** - Lista comissões

#### Criação (todas com idempotência via p_idempotency_key)
- **tenant_criar_cliente(p_nome, p_telefone, p_email, p_endereco, p_funil_fase, p_status, p_idempotency_key)**
- **tenant_criar_produto(p_nome, p_descricao, p_tipo, p_preco_base, p_sku, p_qtd_inicial, p_qtd_minima, p_idempotency_key)**
- **tenant_criar_financeiro(p_tipo, p_descricao, p_valor, p_data_vencimento, p_status, p_categoria, p_idempotency_key)**
- **tenant_criar_os(p_cliente_id, p_colaborador_id, p_veiculo_equipamento, p_descricao_problema, p_status, p_valor_orcamento, p_idempotency_key)**
- **tenant_criar_obra(p_cliente_id, p_nome, p_descricao, p_endereco, p_data_inicio, p_data_fim_prevista, p_status, p_orcamento_total, p_idempotency_key)**
- **tenant_criar_interacao(p_cliente_id, p_tipo, p_titulo, p_descricao, p_data_interacao, p_duracao_minutos, p_usuario_id, p_metadata)** - Suporta tipo 'venda' para CRM-only
- **tenant_processar_venda(p_cliente_id, p_cliente_nome, p_itens, p_vendedor_id, p_metodo_pagamento, p_valor_total, p_desconto, p_emitir_nfe)** - RPC transacional que automatiza criação de CMV e lançamento financeiro de receita.

#### Exclusão
- **tenant_excluir_cliente(p_cliente_id)**
- **tenant_excluir_produto(p_produto_id)**
- **tenant_excluir_financeiro(p_financeiro_id)**
- **tenant_excluir_os(p_os_id)**
- **tenant_excluir_obra(p_obra_id)**

---

## 🗂️ ESTRUTURA DO FRONTEND (NEXT.JS)

### apps/web/src/utils/supabase/
- **client.ts** - Browser client Supabase
- **server.ts** - Server client Supabase SSR

### apps/web/src/lib/api.ts
- **Responsabilidade**: API client central para Supabase (usa RPCs - Opção A)
- **Funções implementadas**:
  - fetchVendas() → supabase.rpc('tenant_listar_vendas', { p_limit: 100 })
  - fetchClientes() → supabase.rpc('tenant_listar_clientes')
  - createCliente() → supabase.rpc('tenant_criar_cliente')
  - deleteCliente() → supabase.rpc('tenant_excluir_cliente')
  - fetchProdutos() → supabase.rpc('tenant_listar_produtos')
  - createProduto() → supabase.rpc('tenant_criar_produto')
  - deleteProduto() → supabase.rpc('tenant_excluir_produto')
  - fetchOS() → supabase.rpc('tenant_listar_ordens_servico')
  - createOS() → supabase.rpc('tenant_criar_os')
  - deleteOS() → supabase.rpc('tenant_excluir_os')
  - fetchObras() → supabase.rpc('tenant_listar_obras')
  - createObra() → supabase.rpc('tenant_criar_obra')
  - deleteObra() → supabase.rpc('tenant_excluir_obra')
  - fetchEmpresa() → supabase.from('empresas').select() (tabela public)
  - updateEmpresa() → supabase.from('empresas').update() (tabela public)

### apps/web/src/lib/hooks/
- **use-clientes.ts** - React Query hooks para clientes
- **use-produtos.ts** - React Query hooks para produtos
- **use-vendas.ts** - React Query hooks para vendas
- **use-os.ts** - React Query hooks para OS
- **use-obras.ts** - React Query hooks para obras
- **use-dashboard.ts** - Hook para dashboard (chama tenant_dashboard_kpis)

### apps/web/src/middleware.ts
- **Responsabilidade**: Middleware Next.js para autenticação, schema routing e feature flags
- **Funcionalidades**:
  1. Verifica env vars Supabase
  2. Valida autenticação do usuário via Supabase Auth
  3. Obtém perfil do usuário (role, empresa_id)
  4. Configurações do tenant via RPC `set_tenant_schema` (Roteamento de Schema)
  5. White-listing de módulos core (Dashboard, Configurações) para garantir acesso básico
  6. Valida acesso à rota baseado em role
  7. Valida feature flags da empresa
  8. Redireciona conforme necessário

---

## 🔄 FLUXO COMPLETO DA REQUISIÇÃO

### 1. Usuário Acessa Rota (ex: /tenant/crm)

### 2. Middleware Next.js Intercepta

```typescript
// apps/web/src/middleware.ts
export async function middleware(request: NextRequest) {
  // 2.1 Verifica env vars
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  
  // 2.2 Cria cliente Supabase SSR
  const supabase = createServerClient(...)
  
  // 2.3 Obtém usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()
  
  // 2.4 Se não autenticado, redireciona para /login
  if (!user && pathname.startsWith('/tenant')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // 2.5 Obtém perfil do usuário
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, empresa_id')
    .eq('user_id', user.id)
    .maybeSingle()
  
  // 2.6 Configura schema do tenant
  const { data: schema } = await supabase.rpc('set_tenant_schema', {
    p_user_id: user.id
  })
  
  // 2.7 Injeta schema no header
  supabaseResponse.headers.set('x-tenant-schema', schema || 'public')
  
  // 2.8 Valida feature flags
  const { data: modRow } = await supabase
    .from('v_empresa_modulos')
    .select('ativo')
    .eq('empresa_id', profile.empresa_id)
    .eq('modulo_key', 'crm')
    .maybeSingle()
  
  if (!modRow?.ativo) {
    return NextResponse.redirect(new URL('/tenant/sem-modulos', request.url))
  }
}
```

### 3. Componente React Carrega

```typescript
// apps/web/src/app/tenant/crm/page.tsx
export default function CRMPage() {
  // 3.1 Usa hook personalizado para buscar dados
  const { data: clientes = [], isLoading } = useClientes()
  
  // 3.2 Hook React Query chama função API
  // useClientes() → fetchClientes() → supabase.rpc('tenant_listar_clientes')
}
```

### 4. Hook Personalizado Chama API

```typescript
// apps/web/src/lib/hooks/use-clientes.ts
export function useClientes() {
  return useQuery({
    queryKey: CLIENTES_KEY,
    queryFn: fetchClientes,
  })
}
```

### 5. Função API Chama RPC do Supabase

```typescript
// apps/web/src/lib/api.ts
export async function fetchClientes() {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('tenant_listar_clientes', {
    p_limit: 1000,
    p_offset: 0
  })
  
  if (error) throw error
  return data
}
```

### 6. RPC Public Roteia para Schema Tenant

```sql
-- Schema: public
CREATE OR REPLACE FUNCTION public.tenant_listar_clientes(p_limit, p_offset)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  -- 6.1 Obtém schema do tenant do usuário
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  -- 6.2 Executa RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_listar_clientes($1, $2)', v_tenant_schema)
  INTO v_result
  USING p_limit, p_offset;
  
  RETURN v_result;
END;
$$;
```

### 7. RPC Tenant Executa Query no Banco

```sql
-- Schema: tenant_62a495e1 (exemplo)
CREATE OR REPLACE FUNCTION tenant_listar_clientes(p_limit, p_offset)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 7.1 Executa SELECT na tabela do tenant
  SELECT jsonb_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT id, nome, telefone, email, endereco, funil_fase, status, criado_em, atualizado_em
    FROM clientes
    ORDER BY criado_em DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  
  RETURN v_result;
END;
$$;
```

### 8. Dados Retornam ao Frontend

```typescript
// Fluxo de retorno:
// PostgreSQL (tenant_62a495e1.clientes)
// → RPC tenant (tenant_listar_clientes)
// → RPC public (tenant_listar_clientes)
// → Supabase API
// → fetchClientes()
// → React Query cache
// → useClientes()
// → Componente React
// → Renderização na UI
```

### 9. Componente Renderiza Dados

```typescript
// apps/web/src/app/tenant/crm/page.tsx
return (
  <div>
    {clientes.map((cliente) => (
      <TableRow key={cliente.id}>
        <TableCell>{cliente.nome}</TableCell>
        <TableCell>{cliente.email}</TableCell>
        {/* ... */}
      </TableRow>
    ))}
  </div>
)
```

---

## 🏗️ ARQUITETURA DETALHADA

### Frontend (Next.js 16.2.2)

**Estrutura de pastas:**
```
apps/web/src/
├── app/                    # Rotas Next.js (App Router)
│   ├── auth/              # Rotas de autenticação
│   ├── admin/             # Dashboard administrativo
│   ├── mestre/            # Onboarding de tenants
│   ├── tenant/            # Dashboard do tenant
│   │   ├── catalogo/      # Módulo Catálogo
│   │   ├── crm/           # Módulo CRM
│   │   ├── vendas/        # Módulo Vendas
│   │   ├── os/            # Módulo Ordens de Serviço
│   │   ├── obras/         # Módulo Obras
│   │   ├── financeiro/    # Módulo Financeiro
│   │   ├── rh/            # Módulo RH
│   │   ├── estoque/       # Módulo Estoque
│   │   ├── comissoes/     # Módulo Comissões
│   │   ├── relatorios/    # Módulo Relatórios
│   │   └── configuracoes/ # Módulo Configurações
│   ├── layout.tsx         # Layout raiz
│   └── page.tsx           # Landing page
├── components/            # Componentes React
│   ├── layout/           # Layouts globais
│   ├── modules/          # Componentes de módulos
│   │   └── base/         # Componentes reutilizáveis
│   │       ├── KPICard.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── Calculator.tsx
│   │       ├── Calendar.tsx
│   │       ├── GlobalSearch.tsx
│   │       └── ActionCard.tsx
│   └── ui/               # Componentes shadcn/ui
│       ├── Modal.tsx
│       ├── Table.tsx
│       ├── Toast.tsx
│       └── ConfirmModal.tsx
├── lib/                  # Lógica compartilhada
│   ├── api.ts            # Interfaces TypeScript
│   ├── hooks/            # Hooks React Query
│   └── utils/            # Utilitários
└── utils/                # Utilitários do Supabase
    ├── client.ts         # Client browser
    └── server.ts         # Client SSR
```

**Componentização:**
- **KPICard:** Card para exibir KPIs (faturamento, vendas, etc.)
- **StatusBadge:** Badge colorido para status (aberta, concluida, etc.)
- **Calculator:** Calculadora flutuante global
- **Calendar:** Componente de calendário reutilizável
- **GlobalSearch:** Busca global em todo o sistema
- **ActionCard:** Card com ação principal
- **Modal:** Modal genérico
- **Table:** Tabela estilizada
- **Toast:** Notificações toast
- **ConfirmModal:** Modal de confirmação

**Hooks Personalizados:**
- **use-clientes:** CRUD de clientes
- **use-produtos:** CRUD de produtos
- **use-vendas:** CRUD de vendas
- **use-os:** CRUD de ordens de serviço
- **use-obras:** CRUD de obras
- **use-funcionarios:** CRUD de funcionários
- **use-financeiro:** CRUD de transações financeiras
- **use-dashboard:** KPIs do dashboard
- **use-email:** Envio de e-mails via Resend

**Interfaces TypeScript:**
```typescript
// apps/web/src/lib/api.ts
export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface ClienteCreate {
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

export interface ClienteUpdate {
  nome?: string;
  telefone?: string;
  email?: string;
}
```

---

## 🗄️ BANCO DE DADOS DETALHADO

### Estrutura de Schemas

**Schema `public` (Global):**
- `empresas` - Empresas/tenants
- `modulos_catalogo` - Catálogo de módulos
- `empresa_modulos` - Módulos ativos por empresa
- `user_profiles` - Perfis de usuários
- `logs_provisionamento` - Logs de provisionamento
- `v_empresa_modulos` - View para módulos ativos

**Schema `tenant_*` (Por empresa):**
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

### Relacionamentos

**Clientes:**
- `vendas.cliente_id` → `clientes.id`
- `ordens_servico.cliente_id` → `clientes.id`
- `obras.cliente_id` → `clientes.id`

**Produtos:**
- `vendas_itens.produto_id` → `produtos.id`
- `estoque.produto_id` → `produtos.id`

**Vendas:**
- `vendas_itens.venda_id` → `vendas.id`
- `financeiro.venda_id` → `vendas.id` (opcional)

**Funcionários:**
- `ordens_servico.colaborador_id` → `funcionarios.id`

### Índices Principais

**Clientes:**
- `idx_clientes_telefone` (telefone)
- `idx_clientes_status` (status)
- `idx_clientes_funil_fase` (funil_fase)

**Produtos:**
- `idx_produtos_preco_base` (preco_base)
- `idx_produtos_sku` (sku)
- `idx_produtos_tipo` (tipo)

**Vendas:**
- `idx_vendas_valor_total` (valor_total)
- `idx_vendas_cliente` (cliente_id)
- `idx_vendas_status" (status)
- `idx_vendas_criado_em` (criado_em)

---

## 🔐 SEGURANÇA E AUTENTICAÇÃO

### Supabase Auth

**Configuração:**
- Email/password authentication
- JWT tokens para sessões
- Row Level Security (RLS) implementado
- Service role para operações administrativas

**Middleware de Segurança:**
```typescript
// apps/web/src/middleware.ts
// 1. Valida autenticação em todas as rotas protegidas
if (!user && pathname.startsWith('/tenant')) {
  return NextResponse.redirect(new URL('/login', request.url))
}

// 2. Valida perfil do usuário
if (!profile) {
  return NextResponse.redirect(new URL('/login', request.url))
}

// 3. Valida role (master vs tenant)
if (isMaster && pathname.startsWith('/tenant')) {
  return NextResponse.redirect(new URL('/admin', request.url))
}

// 4. Valida feature flags
if (!modRow?.ativo) {
  return NextResponse.redirect(new URL('/tenant/sem-modulos', request.url))
}
```

### Schema Routing

**RPC set_tenant_schema:**
```sql
CREATE OR REPLACE FUNCTION public.set_tenant_schema(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema TEXT;
BEGIN
  SELECT e.schema_name INTO v_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = p_user_id;
  
  -- Configura search_path para o schema do tenant
  PERFORM set_config('search_path', v_schema || ', public', false);
  
  RETURN v_schema;
END;
$$;
```

### Row Level Security (RLS)

**Políticas por schema:**
- RLS habilitado em todas as tabelas de tenant
- Políticas permissivas (`USING (true)`) pois isolamento é por schema routing
- Schema routing garante que cada requisição acessa apenas o schema correto

### Roles e Permissões

**Roles globais:**
- `master`: Acesso total ao sistema, pode criar tenants
- `tenant_admin`: Acesso administrativo do tenant
- `tenant_user`: Acesso restrito aos módulos habilitados

**RBAC intra-tenant:**
- Tabela `role_permissions` define permissões por role
- Padrão: `tenant_admin` tem todas as permissões, `tenant_user` tem apenas leitura

---

## 📊 RESPONSABILIDADE DE CADA MÓDULO

### Dashboard
- **Responsabilidade:** Visão geral do negócio
- **KPIs:** Faturamento, vendas, clientes, produtos, OS pendentes, estoque baixo, saldo
- **Gráficos:** Vendas por período, receitas vs despesas
- **Ações:** Acesso rápido a módulos

### CRM (Clientes)
- **Responsabilidade:** Gestão de clientes e funil de vendas
- **Funcionalidades:** CRUD clientes, funil de vendas, histórico
- **Integrações:** Vendas, OS, Obras

### Vendas
- **Responsabilidade:** Gestão de vendas e PDV
- **Funcionalidades:** PDV, gestão de vendas, relatórios
- **Integrações:** Clientes, Produtos, Financeiro

### Catálogo (Produtos)
- **Responsabilidade:** Gestão de catálogo de produtos
- **Funcionalidades:** CRUD produtos, controle de preços
- **Integrações:** Vendas, Estoque

### Estoque
- **Responsabilidade:** Controle de estoque
- **Funcionalidades:** Movimentação, alertas de estoque baixo
- **Integrações:** Produtos, Vendas

### OS (Ordens de Serviço)
- **Responsabilidade:** Gestão de ordens de serviço
- **Funcionalidades:** CRUD OS, status, calendário
- **Integrações:** Clientes, Funcionários, Financeiro

### Obras
- **Responsabilidade:** Gestão de projetos/obras
- **Funcionalidades:** CRUD obras, status, calendário
- **Integrações:** Clientes, Financeiro

### Financeiro
- **Responsabilidade:** Gestão financeira
- **Funcionalidades:** Transações, fluxo de caixa, relatórios
- **Integrações:** Vendas, OS, Obras

### RH
- **Responsabilidade:** Gestão de funcionários
- **Funcionalidades:** CRUD funcionários, gestão de equipe
- **Integrações:** OS, Obras, Comissões

### Comissões
- **Responsabilidade:** Cálculo de comissões
- **Funcionalidades:** Regras de comissão, cálculo automático
- **Integrações:** Vendas, RH

### Relatórios
- **Responsabilidade:** Visão analítica avançada sobre a operação do tenant.
- **Funcionalidades:** Relatórios Analíticos de Vendas, Performance de Equipe e **DRE Real**.
- **DRE (Demonstrativo de Resultados):** Consolida Faturamento Bruto, CMV (Custo de Mercadoria), Lucro Bruto, Despesas e Lucro Líquido com cálculo de margens automáticas.
- **Integrações:** Todos os módulos, com foco em Vendas e Financeiro.

### Conciliação Bancária (Módulo Financeiro)
- **Responsabilidade:** Auditoria e batimento de saldos reais vs sistema.
- **Engine de Parse:** `ofx-parser.ts` (interpretador nativo para arquivos OFX).
- **Auto-matching:** Algoritmo que associa transações bancárias a lançamentos financeiros baseado em valor (margem 0.01) e data.
- **Rastreabilidade:** Gravação de IDs de transação bancária em cada lançamento conciliado.

### Configurações
- **Responsabilidade:** Configurações do tenant
- **Funcionalidades:** Configurações de módulos, empresa
- **Integrações:** Sistema global

---

## 🚀 DEPLOYMENT E CI/CD

> [!IMPORTANT]
> Todas as informações de infraestrutura de deploy, histórico de incidentes e protocolos de atualização foram migrados para o documento mestre:
> **[docs/PLANO_PREVENCAO_DEPLOY.md](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/PLANO_PREVENCAO_DEPLOY.md)**
>
> Siga o walkthrough lá descrito antes de qualquer alteração estrutural no pipeline.

---

## 🔐 SEGURANÇA E GOVERNANÇA

### Schema Routing (IMPLEMENTADO)
- **RPC**: `set_tenant_schema(p_user_id)` no schema public
- **Middleware**: Chama a RPC em cada request autenticada
- **Resultado**: search_path configurado para o schema do tenant
- **Header**: x-tenant-schema injetado no response

### RLS (Row Level Security)
- **Estratégia**: OPÇÃO A - Isolamento por schema routing
- **Policies**: Permissivas (USING (true)) pois isolamento é por schema
- **Justificativa**: RLS real seria redundante com schema routing
- **Documentação**: Comentários inline em supabase_rpc.sql explicando a decisão

### RBAC Intra-Tenant (IMPLEMENTADO)
- **Tabela**: role_permissions no schema tenant
- **Roles padrão**:
  - tenant_admin: todas as permissões (all)
  - tenant_user: apenas leitura (read)
- **Permissões**: resource (clientes, produtos, vendas, etc) + action (create, read, update, delete)
- **RLS**: Policies em role_permissions para proteger permissões

### Idempotência (IMPLEMENTADA)
- **Tabela**: idempotency_control no schema tenant
- **Parâmetro**: p_idempotency_key em todas as RPCs de escrita
- **Lógica**:
  1. Verifica se idempotency_key existe para operation_type
  2. Se existe, retorna resultado cacheado
  3. Se não existe, executa operação, cacheia resultado, retorna
- **Benefício**: Reenvios de formulário não criam duplicatas

### Versionamento de Schema (IMPLEMENTADO)
- **Tabela**: schema_migrations no schema tenant
- **Colunas**: version, descricao, aplicado_em
- **Função**: upgrade_all_tenants(p_target_version) no schema public
- **Lógica**: Aplica migrations sequencialmente em todos os schemas tenant

### Audit Log (IMPLEMENTADO)
- **Tabela**: audit_log no schema tenant
- **Colunas**: operation_type, resource, resource_id, user_id, details, status, criado_em
- **Índices**: operation_type, resource, user, timestamp, status
- **Uso**: Rastrear operações de negócio para compliance e debugging

---

## 🔄 FLUXOS DE DADOS

### Fluxo 1: Login e Schema Routing
1. Usuário entra email/senha em login/page.tsx
2. Supabase Auth autentica via signInWithPassword()
3. Frontend busca user_profiles.role
4. Redirect: master → /admin, tenant → /tenant/dashboard
5. Middleware intercepta request
6. Middleware busca user_profiles.role, empresa_id
7. Middleware chama set_tenant_schema(p_user_id)
8. search_path configurado para o schema do tenant
9. Feature flags validadas via v_empresa_modulos
10. Request prossegue com schema correto

### Fluxo 2: Provisionamento de Tenant
1. Wizard mestre/page.tsx coleta dados da empresa
2. Gera schema_name baseado no CNPJ
3. Chama RPC provisionar_empresa_master()
4. RPC cria schema, tabelas, índices, RLS, policies
5. RPC insere dados seed (role_permissions, schema_migrations)
6. RPC ativa módulos em empresa_modulos
7. Log em logs_provisionamento

### Fluxo 3: Criação de Venda (PDV) - TRANSACIONAL
1. PDV carrega produtos via tenant_listar_estoque()
2. Usuário adiciona itens ao carrinho
3. Usuário finaliza pagamento
4. Frontend chama RPC tenant_processar_venda()
5. RPC verifica idempotency_key
6. RPC busca ou cria cliente dentro da transação
7. RPC insere venda
8. RPC insere itens de venda
9. RPC atualiza estoque (decremento atômico)
10. RPC calcula comissão se vendedor selecionado
11. RPC registra em audit_log
12. Tudo em uma transação atômica SQL
13. Frontend recebe resultado e atualiza UI

### Fluxo 4: Feature Flags e Navegação
1. Sidebar carrega ao montar
2. Obtém usuário autenticado
3. Busca profile com role e empresa_id
4. Busca nome da empresa
5. Busca módulos ativos em v_empresa_modulos
6. Filtra navegação baseado em módulos ativos
7. Renderiza apenas links de módulos ativos

### Fluxo 5: Dashboard
1. Dashboard chama useDashboardData()
2. Hook chama RPC tenant_dashboard_kpis()
3. RPC calcula KPIs agregados no SQL
4. Hook chama RPC tenant_listar_vendas({ p_limit: 5 })
5. Frontend recebe dados e renderiza

---

## 📊 ÍNDICES IMPLEMENTADOS

### Schema Public
- idx_empresas_cnpj (cnpj)
- idx_empresas_schema_name (schema_name)
- idx_empresa_modulos_empresa_modulo (empresa_id, modulo_key)
- idx_user_profiles_user_id (user_id)
- idx_user_profiles_empresa_id (empresa_id)

### Schema Tenant
- idx_clientes_telefone (telefone)
- idx_clientes_status (status)
- idx_clientes_funil_fase (funil_fase)
- idx_produtos_preco_base (preco_base)
- idx_produtos_sku (sku)
- idx_produtos_tipo (tipo)
- idx_estoque_produto (produto_id)
- idx_estoque_criado_em (criado_em)
- idx_vendas_valor_total (valor_total)
- idx_vendas_cliente (cliente_id)
- idx_vendas_status (status)
- idx_vendas_criado_em (criado_em)
- idx_financeiro_tipo (tipo)
- idx_financeiro_status (status)
- idx_financeiro_criado_em (criado_em)
- idx_funcionarios_cargo (cargo)
- idx_funcionarios_status (status)
- idx_os_numero (numero)
- idx_os_cliente (cliente_id)
- idx_os_status (status)
- idx_os_criado_em (criado_em)
- idx_obras_cliente (cliente_id)
- idx_obras_status (status)
- idx_obras_criado_em (criado_em)
- idx_configuracoes_chave (chave)
- idx_role_permissions_unique (role, resource, action)
- idx_schema_migrations_version (version)
- idx_idempotency_key (idempotency_key, operation_type)
- idx_idempotency_created_at (criado_em)
- idx_audit_log_operation (operation_type)
- idx_audit_log_resource (resource)
- idx_audit_log_user (user_id)
- idx_audit_log_timestamp (criado_em)
- idx_audit_log_status (status)

---

## ⚠️ PROBLEMAS IDENTIFICADOS NAS AUDITORIAS 9-12

### Auditoria 9 - Alinhamento Frontend ⇄ Índices SQL
**Severidade**: MÉDIA
**Problemas**:
1. ORDER BY criado_em sem índice em múltiplas tabelas (vendas, financeiro, OS, obras)
2. ORDER BY nome sem índice em produtos e funcionarios
3. **CRÍTICO**: PDV acessa tabela produtos diretamente em vez de usar RPC tenant_listar_estoque

**Recomendações**:
1. IMEDIATO: Corrigir PDV para usar RPC
2. CURTO PRAZO: Adicionar índices em criado_em para tabelas de alta volumetria
3. MÉDIO PRAZO: Adicionar índices em nome para produtos e funcionarios

### Auditoria 10 - Fluxo de Login, Role e Tenant
**Severidade**: BAIXA
**Problemas**: NENHUM - fluxo está robusto
**Status**: Schema routing, feature flags e validação de role estão bem implementados

### Auditoria 11 - Módulos, Feature Flags e Navegação
**Severidade**: BAIXA
**Problemas**:
1. Módulo "relatorios" não existe em modulos_catalogo mas existe na sidebar
**Recomendação**: Adicionar "relatorios" em modulos_catalogo ou remover da sidebar

### Auditoria 12 - Botões, Ações e Chamadas RPC
**Severidade**: CRÍTICA
**Problemas**:
1. **CRÍTICO**: PDV acessa tabela produtos diretamente (violação Opção A)
2. **MÉDIA**: OS e PDV acessam tabela funcionarios diretamente
3. **BAIXA**: Botões de edição sem handler onClick em várias páginas

**Recomendações**:
1. IMEDIATO: Corrigir PDV para usar RPCs
2. CURTO PRAZO: Criar RPC para funcionarios ou usar existente
3. BAIXA PRIORIDADE: Implementar handlers para botões de edição ou removê-los

---

## 📋 MELHORIAS FUTURAS OBRIGATÓRIAS

Documento detalhado em MELHORIAS_FUTURAS.md:

1. Modularização da função provisionar_empresa (CURTO PRAZO)
2. Automação de VACUUM / ANALYZE para schemas tenant (MÉDIO PRAZO)
3. Versionamento explícito de contratos de RPC (MÉDIO PRAZO)
4. Métricas e observabilidade avançada de negócio (CURTO PRAZO)
5. Padronização de paginação avançada (cursor-based) (LONGO PRAZO)
6. Estratégia de rollout seguro de mudanças estruturais (CURTO PRAZO)
7. Suite de Testes Automatizados (Vitest/Playwright) (PRIORIDADE ALTA)
8. Rate Limiting no Middleware Next.js (PRIORIDADE ALTA)

---

## 🚀 BOAS PRÁTICAS DE DEPLOY E BUILD (20/04/2026)

### Configuração Netlify

**Arquivo Único de Configuração:**
- Manter apenas UM arquivo `netlify.toml` na raiz do projeto
- NÃO criar arquivo `netlify.toml` em subdiretórios (ex: `apps/web/`)
- Conflito de arquivos causa falha no deploy automático

**Configuração Correta (raiz/netlify.toml):**
```toml
[build]
  base = "apps/web"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "22.0.0"
  NPM_VERSION = "10.9.0"
  NEXT_TELEMETRY_DISABLED = "1"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Workflow GitHub Actions:**
- Localizado em `.github/workflows/deploy-netlify.yml`
- Requer secrets configuradas no GitHub:
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`
- Build command: `npm run build` em `apps/web`

### Prevenção de Erros de Build TypeScript

**Sincronização de Interfaces:**
- Manter interfaces TypeScript em `apps/web/src/lib/api.ts` sempre sincronizadas com o código de uso
- Quando adicionar campos em componentes, atualizar interfaces correspondentes
- Exemplo: `ProdutoUpdate` deve ter todos os campos usados em forms de edição

**Erros Comuns e Soluções:**

1. **Campo ausente em interface:**
   - Erro: `Property 'X' does not exist on type 'YUpdate'`
   - Solução: Adicionar campo à interface em `api.ts`

2. **Acesso incorreto a tipos compostos:**
   - Erro: `Property 'map' does not exist on type 'ClienteListResult'`
   - Solução: Usar `clientes?.data?.map()` em vez de `clientes?.map()`
   - `ClienteListResult` has structure `{ data: Cliente[], next_cursor? }`

3. **Nome de campo incorreto:**
   - Erro: `Property 'data_prevista' does not exist on type 'ObraEtapa'`
   - Solução: Verificar nome correto na interface (ex: `data_fim_prevista`)

**Checklist Pré-Deploy:**
1. Executar `npm run build` localmente
2. Corrigir todos os erros de TypeScript
3. Verificar se há apenas um arquivo `netlify.toml` (na raiz)
4. Confirmar que secrets do GitHub estão configuradas
5. Fazer commit e push para branch `main`

---

## 🚀 IMPLEMENTAÇÕES RECENTES (18/04/2026)

### Módulo Estoque - Expansão Completa
- **Alertas de Estoque**: Sistema completo de alertas com verificação automática e resolução
  - RPCs: `tenant_verificar_alertas_estoque`, `tenant_resolver_alerta_estoque`, `tenant_listar_alertas_estoque`
  - Componente: `AlertasEstoquePanel` com filtros e ações
  - Wrappers públicos criados para resolver erro 404

- **Kits de Produtos**: Gestão de agrupamentos de produtos
  - RPCs: `tenant_criar_kit`, `tenant_listar_kits`, `tenant_atualizar_kit`, `tenant_remover_kit`
  - Componente: `KitsManager` com CRUD completo
  - Integração com movimentação de estoque

- **Transferências entre Locais**: Movimentação de estoque
  - RPCs: `tenant_criar_transferencia`, `tenant_listar_transferencias`, `tenant_concluir_transferencia`
  - Componente: `TransferenciasManager` com status tracking
  - Validação de disponibilidade e histórico

- **Valoração de Estoque**: Múltiplos métodos de cálculo
  - RPCs: `tenant_calcular_valor_estoque`, `tenant_listar_locais_estoque`
  - Componente: `ValorizacaoDashboard` com gráficos e métricas
  - Métodos: FIFO, Médio, Custo

- **Previsão de Demanda**: Análise preditiva baseada em histórico
  - RPCs: `tenant_gerar_previsao_demanda`, `tenant_listar_previsoes_demanda`, `tenant_atualizar_demanda_real`
  - Componente: `PrevisaoDemandaPanel` com geração e atualização
  - Algoritmo baseado em média móvel

- **Scanner de Códigos de Barras**: Integração mobile
  - Biblioteca: `html5-qrcode` instalada
  - Componente: `BarcodeScanner` com câmera e QR code
  - Busca automática de produtos por código

### Módulo Obras - Gestão Avançada
- **Etapas de Obras**: Timeline completo com progresso
  - RPCs: `tenant_obras_etapas`, `tenant_atualizar_etapa`
  - Componente: `EtapasTimeline` com status visual
  - Cálculo automático de progresso físico

- **Financeiro de Obras**: Custos previstos vs realizados
  - RPCs: `tenant_obras_financeiro`, `tenant_adicionar_custo`
  - Componente: `FinanceiroDashboard" com gráficos comparativos
  - Métricas de ROI e desvios

- **Recursos de Obras**: Gestão de materiais e mão de obra
  - RPCs: `tenant_obras_recursos`, `tenant_alocar_recurso`
  - Componente: `RecursosTabela` com alocação e consumo
  - Integração futura com estoque

- **Documentos de Obras**: Gestão de arquivos e anexos
  - RPCs: `tenant_obras_documentos`, `tenant_uploads_documento`
  - Componente: `DocumentosGaleria` com visualização
  - Integração com Supabase Storage

### Correções Críticas Aplicadas
- **Wrappers Públicos RPC**: Resolvido erro 404 em múltiplas RPCs
  - Causa: Wrappers iniciais usavam `current_setting('search_path')` inválido
  - Solução: Novos wrappers chamam `set_tenant_schema()` antes de cada RPC
  - Arquivos: `WRAPPERS_PUBLIC_FIX_SQL.sql`, `WRAPPERS_ALERTAS_SQL.sql`

- **Hydration Error**: Corrigido erro em FloatingParticles
  - Causa: `Math.random()` gerava valores diferentes no servidor vs cliente
  - Solução: `useState` + `useEffect` para gerar valores apenas no cliente

- **TypeScript Safety**: Adicionadas verificações null/undefined
  - Componente: `PrevisaoDemandaPanel` com `Array.isArray()` e validações
  - Prevenção de erros de runtime em `.map()` e propriedades opcionais

## 📧 VALIDAÇÃO E VERIFICAÇÃO DE E-MAIL (27/04/2026)

### Estratégia de Higienização de Base
Para garantir que os novos usuários utilizem e-mails reais e operáveis (Gmail, Outlook, domínios corporativos), o sistema agora impõe:

1. **Bloqueio de Domínios Fictícios (Client & Server side)**:
   - Implementado no Checkout (`apps/web/src/app/(auth)/checkout/page.tsx`) e na API de Sessão (`apps/web/src/app/api/checkout/session/route.ts`).
   - Bloqueio explícito de domínios como `mailinator.com`, `tempmail.com`, `fake.com`, `teste.com`, `ficticio.com`, etc.
   - Validação de Regex RFC 5322 para garantir integridade sintática.

2. **Fluxo de Confirmação de E-mail (Supabase Auth)**:
   - O sistema agora força a confirmação de e-mail ao criar o usuário no webhook de pagamento (`email_confirm: false`).
   - O Supabase envia automaticamente um link de verificação para o e-mail real fornecido no checkout.
   - O login na plataforma é bloqueado até que o usuário clique no link de confirmação.
   - A página de login fornece feedback específico caso o e-mail ainda não tenha sido validado.

3. **Rastreabilidade**:
   - Todo e-mail utilizado em tentativas de checkout é registrado em `public.checkout_vendas` para auditoria de comportamento e prevenção de spam.
   - O webhook realiza uma verificação prévia de duplicidade e higienização de domínios antes de tentar criar a conta.

---

## 📧 INTEGRAÇÃO RESEND (BOAS-VINDAS)

### Fluxo de Mensageria
O sistema utiliza o **Resend** para disparar e-mails transacionais de boas-vindas:

1.  **Checkout**: Após a confirmação de pagamento e provisionamento do tenant, o webhook dispara um e-mail para o novo cliente.
2.  **Painel Master**: Ao provisionar uma empresa manualmente via `/mestre`, o administrador master pode informar o e-mail do cliente para envio automático das boas-vindas.

### Implementação Técnica
*   **Utility**: `apps/web/src/lib/email.ts` (Utiliza `fetch` nativo para compatibilidade).
*   **Endpoint**: `/api/mestre/welcome` (Proxy para componentes client).
*   **Template**: HTML responsivo com branding Fluxoprod.

---

## 🎯 RESUMO EXECUTIVO

### Estado Atual
O sistema FLUXO ERP está **PRODUCTION-READY** após implementações completas dos módulos Estoque e Obras. A arquitetura Opção A (Supabase como backend real e fonte da verdade) está totalmente implementada com schema routing, wrappers públicos corrigidos, e funcionalidades avançadas de gestão.

### Riscos Principais
1. **VIOLAÇÃO CRÍTICA em PDV**: Acesso direto à tabela produtos em vez de RPC (Auditoria 12)
2. **MÉDIA**: ORDER BY criado_em sem índice em tabelas de alta volumetria (Auditoria 9)
3. **BAIXA**: Módulo "relatorios" inconsistente (Auditoria 11)

### Recomendação
**DEPLOYAR EM PRODUÇÃO** após correção imediata do PDV (substituir acesso direto por RPC). As demais correções podem ser feitas post-deploy no ritmo correto.

### Esforço Estimado
- Correção imediata (PDV): 1-2 horas
- Melhorias futuras: 8 semanas (conforme MELHORIAS_FUTURAS.md)

---
