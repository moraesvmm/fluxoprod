# LEITURA 2 — ANÁLISE TÉCNICA PROFUNDA

**Data:** 15/04/2026
**Documentos analisados:** DOCUMENTACAO_TECNICA.md, VISTORIAS.md
**Objetivo:** Mapear tabelas e relacionamentos, funções SQL, triggers, policies RLS, endpoints, integrações

---

## MAPA TÉCNICO DETALHADO

### TABELAS DO SCHEMA PUBLIC (GOVERNANÇA GLOBAL)

#### 1. empresas
**Propósito:** Empresas/tenants
**Colunas:**
- id (UUID, PRIMARY KEY)
- cnpj (TEXT, UNIQUE, INDEX idx_empresas_cnpj)
- razao_social (TEXT)
- porte (TEXT)
- segmento (TEXT)
- schema_name (TEXT, UNIQUE, INDEX idx_empresas_schema_name)
- criado_em (TIMESTAMP)
- status (TEXT)

**Relacionamentos:**
- user_profiles.empresa_id → empresas.id
- empresa_modulos.empresa_id → empresas.id

**Índices:**
- idx_empresas_cnpj (cnpj)
- idx_empresas_schema_name (schema_name)

**Dependências:** CRÍTICA - Schema routing depende desta tabela

#### 2. modulos_catalogo
**Propósito:** Catálogo de módulos disponíveis
**Colunas:**
- key (TEXT, PRIMARY KEY)
- nome (TEXT)
- descricao (TEXT)
- categoria (TEXT)

**Dados:** dashboard, vendas, estoque, crm, financeiro, catalogo, rh, os, obras, comissoes, relatorios, configuracoes

**Relacionamentos:**
- empresa_modulos.modulo_key → modulos_catalogo.key

**Dependências:** Feature flags dependem desta tabela

#### 3. empresa_modulos
**Propósito:** Módulos ativos por empresa
**Colunas:**
- id (UUID, PRIMARY KEY)
- empresa_id (UUID, FK empresas.id)
- modulo_key (TEXT, FK modulos_catalogo.key)
- ativo (BOOLEAN)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_empresa_modulos_empresa_modulo (empresa_id, modulo_key)

**Relacionamentos:**
- empresas.id ← empresa_modulos.empresa_id
- modulos_catalogo.key ← empresa_modulos.modulo_key

**Dependências:** Feature flags dependem desta tabela

#### 4. user_profiles
**Propósito:** Perfis de usuários
**Colunas:**
- id (UUID, PRIMARY KEY)
- user_id (UUID, FK auth.users.id, INDEX idx_user_profiles_user_id)
- role (TEXT) - master, tenant_admin, tenant_user
- empresa_id (UUID, FK empresas.id, INDEX idx_user_profiles_empresa_id)
- criado_em (TIMESTAMP)

**Índices:**
- idx_user_profiles_user_id (user_id)
- idx_user_profiles_empresa_id (empresa_id)

**Relacionamentos:**
- auth.users.id ← user_profiles.user_id
- empresas.id ← user_profiles.empresa_id

**Dependências:** CRÍTICA - Schema routing depende desta tabela

#### 5. logs_provisionamento
**Propósito:** Logs de provisionamento
**Colunas:**
- id (UUID, PRIMARY KEY)
- empresa_id (UUID, FK empresas.id)
- acao (TEXT)
- detalhes (JSONB)
- criado_em (TIMESTAMP)

**Relacionamentos:**
- empresas.id ← logs_provisionamento.empresa_id

#### 6. v_empresa_modulos
**Propósito:** View para módulos ativos por empresa
**Definição:** JOIN empresa_modulos + modulos_catalogo
**Uso:** Feature flags no middleware

---

### TABELAS DO SCHEMA TENANT (POR EMPRESA)

#### 1. clientes
**Propósito:** Clientes/CRM
**Colunas:**
- id (UUID, PRIMARY KEY)
- nome (TEXT, NOT NULL)
- telefone (TEXT, INDEX idx_clientes_telefone)
- email (TEXT)
- endereco (TEXT)
- funil_fase (TEXT, INDEX idx_clientes_funil_fase)
- status (TEXT, INDEX idx_clientes_status)
- criado_em (TIMESTAMP)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_clientes_telefone (telefone)
- idx_clientes_status (status)
- idx_clientes_funil_fase (funil_fase)

**Relacionamentos:**
- vendas.cliente_id → clientes.id
- ordens_servico.cliente_id → clientes.id
- obras.cliente_id → clientes.id

#### 2. produtos
**Propósito:** Produtos/Estoque
**Colunas:**
- id (UUID, PRIMARY KEY)
- nome (TEXT, NOT NULL)
- descricao (TEXT)
- tipo (TEXT, INDEX idx_produtos_tipo)
- preco_base (DECIMAL, INDEX idx_produtos_preco_base)
- sku (TEXT, INDEX idx_produtos_sku)
- qtd_inicial (INTEGER)
- qtd_minima (INTEGER)
- criado_em (TIMESTAMP)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_produtos_preco_base (preco_base)
- idx_produtos_sku (sku)
- idx_produtos_tipo (tipo)

**Relacionamentos:**
- vendas_itens.produto_id → produtos.id
- estoque.produto_id → produtos.id

**Dependências:** CRÍTICA - PDV depende desta tabela

#### 3. estoque
**Propósito:** Movimentação de estoque
**Colunas:**
- id (UUID, PRIMARY KEY)
- produto_id (UUID, FK produtos.id, INDEX idx_estoque_produto)
- tipo (TEXT) - entrada, saida, ajuste
- quantidade (INTEGER)
- motivo (TEXT)
- criado_em (TIMESTAMP, INDEX idx_estoque_criado_em)

**Índices:**
- idx_estoque_produto (produto_id)
- idx_estoque_criado_em (criado_em)

**Relacionamentos:**
- produtos.id ← estoque.produto_id

#### 4. vendas
**Propósito:** Vendas
**Colunas:**
- id (UUID, PRIMARY KEY)
- cliente_id (UUID, FK clientes.id, INDEX idx_vendas_cliente)
- valor_total (DECIMAL, INDEX idx_vendas_valor_total)
- metodo (TEXT)
- status (TEXT, INDEX idx_vendas_status)
- vendedor_id (UUID)
- criado_em (TIMESTAMP, INDEX idx_vendas_criado_em)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_vendas_valor_total (valor_total)
- idx_vendas_cliente (cliente_id)
- idx_vendas_status (status)
- idx_vendas_criado_em (criado_em)

**Relacionamentos:**
- clientes.id ← vendas.cliente_id
- vendas_itens.venda_id → vendas.id
- financeiro.venda_id → vendas.id (opcional)

#### 5. vendas_itens
**Propósito:** Itens de venda
**Colunas:**
- id (UUID, PRIMARY KEY)
- venda_id (UUID, FK vendas.id)
- produto_id (UUID, FK produtos.id)
- quantidade (INTEGER)
- preco_unitario (DECIMAL)
- subtotal (DECIMAL)

**Relacionamentos:**
- vendas.id ← vendas_itens.venda_id
- produtos.id ← vendas_itens.produto_id

#### 6. financeiro
**Propósito:** Transações financeiras
**Colunas:**
- id (UUID, PRIMARY KEY)
- tipo (TEXT, INDEX idx_financeiro_tipo) - receita, despesa
- descricao (TEXT)
- valor (DECIMAL)
- data_vencimento (DATE)
- status (TEXT, INDEX idx_financeiro_status)
- categoria (TEXT)
- venda_id (UUID, FK vendas.id, opcional)
- criado_em (TIMESTAMP, INDEX idx_financeiro_criado_em)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_financeiro_tipo (tipo)
- idx_financeiro_status (status)
- idx_financeiro_criado_em (criado_em)

**Relacionamentos:**
- vendas.id ← financeiro.venda_id (opcional)

#### 7. funcionarios
**Propósito:** Funcionários/RH
**Colunas:**
- id (UUID, PRIMARY KEY)
- nome (TEXT, NOT NULL)
- cargo (TEXT, INDEX idx_funcionarios_cargo)
- salario (DECIMAL)
- status (TEXT, INDEX idx_funcionarios_status)
- criado_em (TIMESTAMP)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_funcionarios_cargo (cargo)
- idx_funcionarios_status (status)

**Relacionamentos:**
- ordens_servico.colaborador_id → funcionarios.id

#### 8. ordens_servico
**Propósito:** Ordens de Serviço (OS)
**Colunas:**
- id (UUID, PRIMARY KEY)
- numero (TEXT, INDEX idx_os_numero)
- cliente_id (UUID, FK clientes.id, INDEX idx_os_cliente)
- veiculo_equipamento (TEXT)
- descricao_problema (TEXT)
- colaborador_id (UUID, FK funcionarios.id)
- status (TEXT, INDEX idx_os_status)
- valor_orcamento (DECIMAL)
- criado_em (TIMESTAMP, INDEX idx_os_criado_em)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_os_numero (numero)
- idx_os_cliente (cliente_id)
- idx_os_status (status)
- idx_os_criado_em (criado_em)

**Relacionamentos:**
- clientes.id ← ordens_servico.cliente_id
- funcionarios.id ← ordens_servico.colaborador_id
- ordens_servico_historico.os_id → ordens_servico.id

#### 9. ordens_servico_historico
**Propósito:** Histórico de OS
**Colunas:**
- id (UUID, PRIMARY KEY)
- os_id (UUID, FK ordens_servico.id)
- acao (TEXT)
- detalhes (TEXT)
- criado_por (TEXT)
- criado_em (TIMESTAMP)

**Relacionamentos:**
- ordens_servico.id ← ordens_servico_historico.os_id

#### 10. obras
**Propósito:** Obras/Projetos
**Colunas:**
- id (UUID, PRIMARY KEY)
- nome (TEXT, NOT NULL)
- cliente_id (UUID, FK clientes.id, INDEX idx_obras_cliente)
- endereco (TEXT)
- data_inicio (DATE)
- data_fim_prevista (DATE)
- orcamento_total (DECIMAL)
- descricao (TEXT)
- status (TEXT, INDEX idx_obras_status)
- criado_em (TIMESTAMP, INDEX idx_obras_criado_em)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_obras_cliente (cliente_id)
- idx_obras_status (status)
- idx_obras_criado_em (criado_em)

**Relacionamentos:**
- clientes.id ← obras.cliente_id

#### 11. configuracoes
**Propósito:** Configurações do tenant
**Colunas:**
- id (UUID, PRIMARY KEY)
- chave (TEXT, INDEX idx_configuracoes_chave)
- valor (TEXT)
- descricao (TEXT)
- criado_em (TIMESTAMP)
- atualizado_em (TIMESTAMP)

**Índices:**
- idx_configuracoes_chave (chave)

#### 12. role_permissions
**Propósito:** Permissões por role (RBAC intra-tenant)
**Colunas:**
- id (UUID, PRIMARY KEY)
- role (TEXT)
- resource (TEXT)
- action (TEXT)
- criado_em (TIMESTAMP)

**Índices:**
- idx_role_permissions_unique (role, resource, action)

**Dados seed:**
- tenant_admin: todas as permissões (all)
- tenant_user: apenas leitura (read)

#### 13. schema_migrations
**Propósito:** Versionamento de schema
**Colunas:**
- id (UUID, PRIMARY KEY)
- version (TEXT, INDEX idx_schema_migrations_version)
- descricao (TEXT)
- aplicado_em (TIMESTAMP)

**Índices:**
- idx_schema_migrations_version (version)

#### 14. idempotency_control
**Propósito:** Controle de idempotência
**Colunas:**
- id (UUID, PRIMARY KEY)
- idempotency_key (TEXT, INDEX idx_idempotency_key)
- operation_type (TEXT, parte do índice composto)
- cached_result (JSONB)
- criado_em (TIMESTAMP, INDEX idx_idempotency_created_at)

**Índices:**
- idx_idempotency_key (idempotency_key, operation_type)
- idx_idempotency_created_at (criado_em)

#### 15. audit_log
**Propósito:** Log de auditoria de operações de negócio
**Colunas:**
- id (UUID, PRIMARY KEY)
- operation_type (TEXT, INDEX idx_audit_log_operation)
- resource (TEXT, INDEX idx_audit_log_resource)
- resource_id (UUID, INDEX idx_audit_log_user)
- user_id (UUID, INDEX idx_audit_log_user)
- details (JSONB)
- status (TEXT, INDEX idx_audit_log_status)
- criado_em (TIMESTAMP, INDEX idx_audit_log_timestamp)

**Índices:**
- idx_audit_log_operation (operation_type)
- idx_audit_log_resource (resource)
- idx_audit_log_user (user_id)
- idx_audit_log_timestamp (criado_em)
- idx_audit_log_status (status)

---

## FUNÇÕES SQL (RPCs)

### RPCs do Schema Public

#### Provisionamento
- **provisionar_empresa(p_cnpj, p_razao_social, p_porte, p_segmento, p_modulos)**
  - Retorna: JSONB
  - Propósito: Cria tenant completo
  - Processo: Cria empresa → Cria schema → Cria tabelas → Cria RPCs → Popula seed → Ativa módulos

- **set_tenant_schema(p_user_id)**
  - Retorna: TEXT (schema_name)
  - Propósito: Configura search_path para o schema do usuário
  - Processo: Busca user_profiles → Busca empresas → Configura search_path

- **upgrade_all_tenants(p_target_version)**
  - Retorna: JSONB
  - Propósito: Aplica migrations em todos os schemas tenant
  - Processo: Lista schemas → Aplica migrations sequencialmente → Atualiza schema_migrations

#### Dashboard
- **tenant_dashboard_kpis()**
  - Retorna: JSONB
  - Propósito: Retorna KPIs agregados (faturamento, vendas, clientes, produtos, OS, estoque baixo, saldo)
  - Processo: Calcula KPIs no SQL → Retorna como JSONB

### RPCs do Schema Tenant (Dinâmicas)

#### Listagem (todas com LIMIT padrão 1000 e SELECT explícito)
- **tenant_listar_clientes(p_limit, p_offset)** → Lista clientes
- **tenant_listar_produtos(p_limit, p_offset)** → Lista produtos
- **tenant_listar_estoque(p_limit, p_offset)** → Lista estoque
- **tenant_listar_vendas(p_limit, p_offset)** → Lista vendas
- **tenant_listar_financeiro(p_limit, p_offset)** → Lista transações financeiras
- **tenant_listar_funcionarios(p_limit, p_offset)** → Lista funcionários
- **tenant_listar_ordens_servico(p_limit, p_offset)** → Lista OS
- **tenant_listar_obras(p_limit, p_offset)** → Lista obras
- **tenant_listar_comissoes(p_limit, p_offset)** → Lista comissões

#### Criação (todas com idempotência via p_idempotency_key)
- **tenant_criar_cliente(p_nome, p_telefone, p_email, p_endereco, p_funil_fase, p_status, p_idempotency_key)**
- **tenant_criar_produto(p_nome, p_descricao, p_tipo, p_preco_base, p_sku, p_qtd_inicial, p_qtd_minima, p_idempotency_key)**
- **tenant_criar_financeiro(p_tipo, p_descricao, p_valor, p_data_vencimento, p_status, p_categoria, p_idempotency_key)**
- **tenant_criar_os(p_cliente_id, p_colaborador_id, p_veiculo_equipamento, p_descricao_problema, p_status, p_valor_orcamento, p_idempotency_key)**
- **tenant_criar_obra(p_cliente_id, p_nome, p_descricao, p_endereco, p_data_inicio, p_data_fim_prevista, p_status, p_orcamento_total, p_idempotency_key)**
- **tenant_processar_venda(p_cliente_id, p_cliente_nome, p_cliente_telefone, p_cliente_email, p_itens, p_vendedor_id, p_forma_pagamento, p_idempotency_key)** → RPC transacional completa

#### Exclusão
- **tenant_excluir_cliente(p_cliente_id)**
- **tenant_excluir_produto(p_produto_id)**
- **tenant_excluir_financeiro(p_financeiro_id)**
- **tenant_excluir_os(p_os_id)**
- **tenant_excluir_obra(p_obra_id)**

---

## TRIGGERS

### Trigger Identificado
- **trigger_usuarios_atualizacao**
  - Tabela: usuarios
  - Evento: UPDATE
  - Timing: BEFORE
  - Propósito: Atualização de timestamps ou dados derivados

---

## POLICIES RLS

### Estratégia RLS
- **OPÇÃO A IMPLEMENTADA:** Isolamento por schema routing
- **Policies:** Permissivas (USING (true)) pois isolamento é por schema routing
- **Justificativa:** RLS real seria redundante com schema routing

### Policies por Schema
- RLS habilitado em todas as tabelas de tenant
- Policies permissivas (USING (true))
- Schema routing garante que cada requisição acessa apenas o schema correto

---

## ENDPOINTS (FRONTEND)

### Rotas Next.js
- **/login** - Login page (auth + redirect por role)
- **/admin/** - Páginas admin (empresas, modulos, usuarios)
- **/mestre/** - Wizard de provisionamento master
- **/tenant/** - Páginas tenant (dashboard, vendas/pdv, crm, estoque, financeiro, catalogo, rh, os, obras, comissoes, relatorios, configuracoes, sem-modulos)
- **/setup** - Setup page para configuração de env vars

### Funções API (apps/web/src/lib/api.ts)
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

---

## INTEGRAÇÕES

### Integrações Externas
- **Supabase Auth:** Autenticação de usuários (JWT tokens)
- **Supabase PostgreSQL:** Banco de dados (multi-tenant por schema)
- **Supabase Edge Functions:** Envio de e-mails (Resend API)
- **Resend API:** Envio de e-mails transacionais (API key configurada)
- **Netlify:** Hosting e deployment do frontend

### Integrações Internas
- **Frontend → Supabase RPC:** Chamadas via supabase.rpc()
- **Middleware → set_tenant_schema:** Configuração de search_path
- **RPCs tenant → RPCs public:** Roteamento de operações
- **Feature flags → Sidebar:** Filtragem de navegação
- **Audit log → Todas operações:** Rastreamento de ações

---

## DEPENDÊNCIAS CRÍTICAS

### Dependências Críticas de Tabelas
1. **user_profiles** - CRÍTICO para schema routing (role, empresa_id)
2. **empresas** - CRÍTICO para isolamento (schema_name)
3. **v_empresa_modulos** - CRÍTICO para feature flags
4. **produtos** - CRÍTICO para PDV (violação identificada: acesso direto)

### Dependências Críticas de RPCs
1. **set_tenant_schema** - CRÍTICO para multi-tenancy (configura search_path)
2. **provisionar_empresa** - CRÍTICO para criação de tenants
3. **tenant_processar_venda** - CRÍTICO para PDV (transação atômica)

### Dependências Críticas de Middleware
1. **Middleware Next.js** - CRÍTICO para segurança (autenticação + schema routing)
2. **Schema routing** - CRÍTICO para isolamento multi-tenant
3. **Feature flags** - CRÍTICO para navegação

---

## INTERAÇÕES ENTRE MÓDULOS

### Integrações por Módulo

#### Dashboard
- **Integrações:** KPIs agregados de todos os módulos

#### CRM (Clientes)
- **Integrações:** Vendas (cliente_id), OS (cliente_id), Obras (cliente_id)

#### Vendas
- **Integrações:** Clientes (cliente_id), Produtos (vendas_itens.produto_id), Financeiro (venda_id opcional), Estoque (atualização automática)

#### Catálogo (Produtos)
- **Integrações:** Vendas (vendas_itens.produto_id), Estoque (produto_id)

#### Estoque
- **Integrações:** Produtos (produto_id), Vendas (atualização automática)

#### OS (Ordens de Serviço)
- **Integrações:** Clientes (cliente_id), Funcionários (colaborador_id), Financeiro (opcional)

#### Obras
- **Integrações:** Clientes (cliente_id), Financeiro (opcional)

#### Financeiro
- **Integrações:** Vendas (venda_id opcional), OS (opcional), Obras (opcional)

#### RH
- **Integrações:** OS (colaborador_id), Comissões (cálculo)

#### Comissões
- **Integrações:** Vendas (vendedor_id), RH (funcionarios)

---

## FLUXOS DE INSERÇÃO DE DADOS

### Fluxo de Inserção de Cliente
1. Frontend → createCliente() → supabase.rpc('tenant_criar_cliente')
2. RPC public → Obtém schema do tenant → Executa RPC tenant
3. RPC tenant → Verifica idempotency_key → Insere cliente → Registra audit_log
4. Resultado JSONB → Frontend

### Fluxo de Inserção de Produto
1. Frontend → createProduto() → supabase.rpc('tenant_criar_produto')
2. RPC public → Obtém schema do tenant → Executa RPC tenant
3. RPC tenant → Verifica idempotency_key → Insere produto → Registra audit_log
4. Resultado JSONB → Frontend

### Fluxo de Processamento de Venda (TRANSACIONAL)
1. Frontend → tenant_processar_venda() → supabase.rpc('tenant_processar_venda')
2. RPC public → Obtém schema do tenant → Executa RPC tenant
3. RPC tenant → Verifica idempotency_key
4. RPC tenant → Busca ou cria cliente (dentro da transação)
5. RPC tenant → Insere venda
6. RPC tenant → Insere itens de venda
7. RPC tenant → Atualiza estoque (decremento atômico)
8. RPC tenant → Calcula comissão se vendedor selecionado
9. RPC tenant → Registra em audit_log
10. COMMIT da transação
11. Resultado JSONB → Frontend

---

## RESUMO DA LEITURA 2

### Mapa Técnico
Sistema multi-tenant com 6 tabelas no schema public (governança) e 15 tabelas por schema tenant (negócio). Isolamento por schema routing com RLS permissivo. RPCs padronizadas com idempotência, versionamento de schema e audit log.

### Dependências Críticas
- user_profiles (role, empresa_id) - CRÍTICO para schema routing
- empresas (schema_name) - CRÍTICO para isolamento
- set_tenant_schema RPC - CRÍTICO para multi-tenancy
- Middleware Next.js - CRÍTICO para segurança

### Interações entre Módulos
- Clientes → Vendas, OS, Obras
- Produtos → Vendas, Estoque
- Vendas → Financeiro, Estoque, Comissões
- Funcionarios → OS, Comissões
- Financeiro → Vendas, OS, Obras

### Violação Identificada
- PDV acessa tabela produtos diretamente em vez de usar RPC (violação Opção A)
