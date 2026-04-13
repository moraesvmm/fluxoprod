# DOCUMENTAÇÃO TÉCNICA - FLUXO ERP
## ESTADO ATUAL: PRODUCTION-READY

---

## 📋 ESTRUTURA DO SISTEMA

### Arquitetura Geral (OPÇÃO A - IMPLEMENTADA)
- **Backend**: Supabase (PostgreSQL + RPC) - **FONTE DA VERDADE**
- **Frontend**: Next.js 14 (apps/web) - **UI E ORQUESTRADOR**
- **Database**: Supabase PostgreSQL com multi-tenancy por schema
- **Backend Python**: **NÃO EXISTE** - deve ser ignorado
- **Provisionamento**: RPC Functions via Supabase

### Status Atual
✅ **O sistema está PRODUCTION-READY** após correções implementadas nas Auditorias 5-8:
- Escalabilidade: LIMIT padrão (1000), índices adequados, SELECT explícito
- Robustez: Idempotência em RPCs de escrita, exceções contextuais
- Segurança: Isolamento por schema routing documentado, RBAC intra-tenant
- Governança: Versionamento de schema, função de upgrade, auditoria

### Estratégia Multi-Tenant (OPÇÃO A - IMPLEMENTADA)
- **Isolamento**: Um schema PostgreSQL por tenant (ex: `tenant_empresa_xyz`)
- **Schema Routing**: RPC `set_tenant_schema()` configura `search_path` baseado em `user_profiles`
- **Middleware**: Injeta schema via RPC em cada request, valida role e feature flags
- **RLS**: Policies permissivas (`USING (true)`) pois isolamento é por schema routing
- **RBAC**: Tabela `role_permissions` com roles `tenant_admin` e `tenant_user` padrão

---

## 🗂️ ESTRUTURA DE RPCs (SUPABASE)

### Arquivo Principal
**apps/api/supabase_rpc.sql** - Script completo de provisionamento e RPCs

### Tabelas do Schema Public (Governança)
1. **empresas** - Empresas/tenants
   - Colunas: id, cnpj, razao_social, porte, segmento, schema_name, criado_em, status
   - Índices: idx_empresas_cnpj, idx_empresas_schema_name

2. **modulos_catalogo** - Catálogo de módulos disponíveis
   - Colunas: key, nome, descricao, categoria
   - Dados: dashboard, vendas, estoque, crm, financeiro, catalogo, rh, os, obras, comissoes, relatorios, configuracoes

3. **empresa_modulos** - Módulos ativos por empresa
   - Colunas: id, empresa_id, modulo_key, ativo
   - Índices: idx_empresa_modulos_empresa_modulo

4. **user_profiles** - Perfis de usuários
   - Colunas: id, user_id, role, empresa_id, criado_em
   - Roles: master, tenant_admin, tenant_user
   - Índices: idx_user_profiles_user_id, idx_user_profiles_empresa_id

5. **logs_provisionamento** - Logs de provisionamento
   - Colunas: id, empresa_id, acao, detalhes, criado_em

6. **v_empresa_modulos** - View para módulos ativos por empresa
   - JOIN: empresa_modulos + modulos_catalogo

### Tabelas do Schema Tenant (Criadas por provisionar_empresa)
1. **clientes** - Clientes/CRM
   - Colunas: id, nome, telefone, email, endereco, funil_fase, status, criado_em, atualizado_em
   - Índices: idx_clientes_telefone, idx_clientes_status, idx_clientes_funil_fase

2. **produtos** - Produtos/Estoque
   - Colunas: id, nome, descricao, tipo, preco_base, sku, qtd_inicial, qtd_minima, criado_em, atualizado_em
   - Índices: idx_produtos_preco_base, idx_produtos_sku, idx_produtos_tipo

3. **estoque** - Movimentação de estoque
   - Colunas: id, produto_id, tipo, quantidade, motivo, criado_em
   - Índices: idx_estoque_produto, idx_estoque_criado_em

4. **vendas** - Vendas
   - Colunas: id, cliente_id, valor_total, metodo, status, vendedor_id, criado_em, atualizado_em
   - Índices: idx_vendas_valor_total, idx_vendas_cliente, idx_vendas_status, idx_vendas_criado_em

5. **vendas_itens** - Itens de venda
   - Colunas: id, venda_id, produto_id, quantidade, preco_unitario, subtotal

6. **financeiro** - Transações financeiras
   - Colunas: id, tipo, descricao, valor, data_vencimento, status, categoria, criado_em, atualizado_em
   - Índices: idx_financeiro_tipo, idx_financeiro_status, idx_financeiro_criado_em

7. **funcionarios** - Funcionários/RH
   - Colunas: id, nome, cargo, salario, status, criado_em, atualizado_em
   - Índices: idx_funcionarios_cargo, idx_funcionarios_status

8. **ordens_servico** - Ordens de Serviço (OS)
   - Colunas: id, numero, cliente_id, veiculo_equipamento, descricao_problema, colaborador_id, status, valor_orcamento, criado_em, atualizado_em
   - Índices: idx_os_numero, idx_os_cliente, idx_os_status, idx_os_criado_em

9. **ordens_servico_historico** - Histórico de OS
   - Colunas: id, os_id, acao, detalhes, criado_por, criado_em

10. **obras** - Obras/Projetos
    - Colunas: id, nome, cliente_id, endereco, data_inicio, data_fim_prevista, orcamento_total, descricao, status, criado_em, atualizado_em
    - Índices: idx_obras_cliente, idx_obras_status, idx_obras_criado_em

11. **configuracoes** - Configurações do tenant
    - Colunas: id, chave, valor, descricao, criado_em, atualizado_em
    - Índices: idx_configuracoes_chave

12. **role_permissions** - Permissões por role (RBAC intra-tenant)
    - Colunas: id, role, resource, action, criado_em
    - Índices: idx_role_permissions_unique (role, resource, action)
    - Dados seed: tenant_admin (all), tenant_user (read-only)

13. **schema_migrations** - Versionamento de schema
    - Colunas: id, version, descricao, aplicado_em
    - Índices: idx_schema_migrations_version

14. **idempotency_control** - Controle de idempotência
    - Colunas: id, idempotency_key, operation_type, cached_result, criado_em
    - Índices: idx_idempotency_key (idempotency_key, operation_type), idx_idempotency_created_at

15. **audit_log** - Log de auditoria de operações de negócio
    - Colunas: id, operation_type, resource, resource_id, user_id, details, status, criado_em
    - Índices: idx_audit_log_operation, idx_audit_log_resource, idx_audit_log_user, idx_audit_log_timestamp, idx_audit_log_status

### RPCs do Schema Public

#### Provisionamento
- **provisionar_empresa(p_cnpj, p_razao_social, p_porte, p_segmento, p_modulos)** - Cria tenant completo
- **set_tenant_schema(p_user_id)** - Configura search_path para o schema do usuário
- **upgrade_all_tenants(p_target_version)** - Aplica migrations em todos os schemas tenant

#### Dashboard
- **tenant_dashboard_kpis()** - Retorna KPIs agregados (faturamento, vendas, clientes, produtos, OS, estoque baixo, saldo)

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
- **tenant_processar_venda(p_cliente_id, p_cliente_nome, p_cliente_telefone, p_cliente_email, p_itens, p_vendedor_id, p_forma_pagamento, p_idempotency_key)** - RPC transacional completa

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
  2. Autentica usuário via supabase.auth.getUser()
  3. Protege rotas /tenant, /admin, /mestre
  4. Busca user_profiles.role e empresa_id
  5. Chama RPC set_tenant_schema() para configurar search_path
  6. Valida feature flags via v_empresa_modulos
  7. Enforce separação master/tenant

### apps/web/src/app/
- **(auth)/login/page.tsx** - Login page (auth + redirect por role)
- **admin/** - Páginas admin (empresas, modulos, usuarios)
- **tenant/** - Páginas tenant (dashboard, vendas/pdv, crm, estoque, financeiro, catalogo, rh, os, obras, comissoes, relatorios, configuracoes, sem-modulos)
- **setup/page.tsx** - Setup page para configuração de env vars
- **mestre/page.tsx** - Wizard de provisionamento master

### apps/web/src/components/
- **layout/Header.tsx** - Header com logout
- **layout/Sidebar.tsx** - Sidebar com navegação dinâmica por módulos ativos
- **layout/TenantLayout.tsx** - Layout wrapper para tenant
- **modules/base/** - KPICard, StatusBadge, ActionCard
- **ui/** - Componentes UI reutilizáveis (button, table, modal, toast, confirm-modal)

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

---

## 🎯 RESUMO EXECUTIVO

### Estado Atual
O sistema FLUXO ERP está **PRODUCTION-READY** após correções implementadas nas Auditorias 5-8. A arquitetura Opção A (Supabase como backend real e fonte da verdade) está completamente implementada com schema routing, idempotência, RLS documentado, RBAC intra-tenant, versionamento de schema e audit log.

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
