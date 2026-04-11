# DOCUMENTAÇÃO TÉCNICA FLUXO - SaaS B2B Nível 2

**Versão:** 1.1  
**Data:** 08/04/2026  
**Status:** Produção Ready (Entrega)

---

## 1. VISÃO GERAL DO FLUXO

### O que é
FLUXO é um SaaS B2B nível 2 multiempresa modular para gestão de negócios. Permite que múltiplas empresas utilizem a mesma infraestrutura de banco de dados (Supabase/PostgreSQL) com isolamento completo via schemas e RLS (Row Level Security).

### Para quem
- Pequenas e médias empresas que necessitam de gestão integrada
- Revendedores, prestadores de serviços, empresas de construção civil
- Empresas que precisam de controle de vendas, estoque, CRM, financeiro, RH, obras e comissões

### Como está organizado
- **Monorepo:** `apps/` contém frontend (Next.js) e backend (FastAPI)
- **Frontend:** Next.js 16.2.2 + React 19.2.4 + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL) como banco de dados principal
- **Multi-tenancy:** Isolamento via schemas por empresa + RLS para governança central

---

## 2. ARQUITETURA DO SISTEMA

### Multi-tenancy (Como funciona)
1. **Schema por empresa:** Cada empresa tem seu próprio schema PostgreSQL (`tenant_empresa_x`)
2. **Governança central:** Tabelas `public.empresas`, `public.modulos_catalogo`, `public.empresa_modulos`, `public.user_profiles`
3. **Provisionamento dinâmico:** Função `provisionar_empresa(schema)` cria schema e tabelas automaticamente
4. **RLS:** Row Level Security garante que cada tenant só acesse seus próprios dados
5. **Feature flags:** Tabela `empresa_modulos` controla quais módulos cada empresa pode acessar

### Estratégia de módulos
- **Catálogo central:** `public.modulos_catalogo` define todos os módulos disponíveis
- **Ativação por empresa:** `public.empresa_modulos` (empresa_id, modulo_key, ativo)
- **Nenhum módulo ativo por padrão:** Governança via usuário-master
- **Frontend dinâmico:** Sidebar filtra módulos baseados em `empresa_modulos.ativo`

### Papel do Supabase
- **Banco de dados principal:** PostgreSQL com schemas por tenant
- **Autenticação:** Supabase Auth (`auth.users`)
- **Perfis de usuário:** `public.user_profiles` (role: master, tenant_admin, tenant_user)
- **RPC functions:** `provisionar_empresa()` para onboarding automático
- **RLS:** Políticas de segurança em todas as tabelas públicas

### Separação frontend × banco
- **Frontend:** Next.js App Router, componentes React, Supabase client SDK
- **Banco:** PostgreSQL com schemas, triggers, constraints, views
- **Integração:** Supabase client (browser) e server-side (Service Role)
- **Middleware:** `middleware.ts` valida autenticação, roles e feature flags
- **Server actions:** Para operações que exigem Service Role (ex: criar usuário)

---

## 3. BANCO DE DADOS (DETALHADO)

### 3.1 Tabelas Principais por Módulo

#### Schema Public (Governança Central)
**empresas**
- `id` (UUID, PK)
- `cnpj` (VARCHAR(20), UNIQUE)
- `razao_social` (VARCHAR(255))
- `schema_name` (VARCHAR(100), UNIQUE)
- `status` (VARCHAR(50), default 'ativo')
- **Relacionamentos:** Nenhum (tabela raiz)

**modulos_catalogo**
- `key` (TEXT, PK) - ex: 'dashboard', 'crm', 'vendas'
- `nome` (TEXT)
- `descricao` (TEXT)
- **Relacionamentos:** Nenhum (tabela catálogo)

**empresa_modulos** (Feature Flags)
- `empresa_id` (UUID, FK → empresas.id)
- `modulo_key` (TEXT, FK → modulos_catalogo.key)
- `ativo` (BOOLEAN, default FALSE)
- `atualizado_em` (TIMESTAMPTZ)
- **PK composta:** (empresa_id, modulo_key)
- **Relacionamentos:** empresas, modulos_catalogo

**user_profiles**
- `user_id` (UUID, PK, FK → auth.users.id)
- `empresa_id` (UUID, FK → empresas.id)
- `role` (TEXT, CHECK IN ('master', 'tenant_admin', 'tenant_user'))
- **Relacionamentos:** auth.users, empresas

#### Schema Tenant (por empresa)
**clientes** (CRM)
- `id` (UUID, PK)
- `nome` (VARCHAR(255))
- `email` (VARCHAR(255))
- `telefone` (VARCHAR(50))
- `funil_fase` (VARCHAR(50), default 'lead')
- `status` (VARCHAR(50), default 'ativo')

**produtos** (Catálogo)
- `id` (UUID, PK)
- `nome` (VARCHAR(255))
- `descricao` (TEXT)
- `tipo` (VARCHAR(50), default 'produto')
- `preco_base` (NUMERIC(10, 2))

**estoque** (Estoque)
- `id` (UUID, PK)
- `produto_id` (UUID, FK → produtos.id)
- `sku` (VARCHAR(100), UNIQUE)
- `quantidade` (INTEGER, default 0)
- `quantidade_minima` (INTEGER, default 10)
- **Relacionamentos:** produtos

**vendas** (Vendas/PDV)
- `id` (UUID, PK)
- `cliente_id` (UUID, FK → clientes.id)
- `valor_total` (NUMERIC(10, 2))
- `metodo_pagamento` (VARCHAR(50))
- `status` (VARCHAR(50), default 'concluido')
- **Relacionamentos:** clientes

**vendas_itens** (CRÍTICO - Integração Vendas ↔ Estoque)
- `id` (UUID, PK)
- `venda_id` (UUID, FK → vendas.id, ON DELETE CASCADE)
- `produto_id` (UUID, FK → estoque.id, ON DELETE RESTRICT) ⚠️ FK OBRIGATÓRIA
- `quantidade` (INTEGER, CHECK > 0)
- `preco_unitario` (NUMERIC(10, 2))
- `subtotal` (NUMERIC(10, 2), GENERATED ALWAYS AS quantidade * preco_unitario)
- **Relacionamentos:** vendas, estoque

**financeiro** (Financeiro)
- `id` (UUID, PK)
- `tipo` (VARCHAR(20), CHECK IN ('pagar', 'receber'))
- `descricao` (TEXT)
- `valor` (NUMERIC(10, 2))
- `data_vencimento` (DATE)
- `status` (VARCHAR(50), default 'pendente')

**funcionarios** (RH)
- `id` (UUID, PK)
- `nome` (VARCHAR(255))
- `cargo` (VARCHAR(100))
- `salario` (NUMERIC(10, 2))
- `role` (VARCHAR(50), default 'funcionario')

**ordens_servico** (OS)
- `id` (UUID, PK)
- `cliente_id` (UUID, FK → clientes.id, ON DELETE SET NULL)
- `colaborador_id` (UUID, FK → funcionarios.id, ON DELETE SET NULL)
- `veiculo_equipamento` (VARCHAR(255))
- `descricao_problema` (TEXT)
- `status` (VARCHAR(50), CHECK IN ('aberta', 'em_execucao', 'concluida', 'cancelada'))
- `valor_orcamento` (NUMERIC(10, 2))
- **Relacionamentos:** clientes, funcionarios

**ordens_servico_itens** (Itens de OS)
- `id` (UUID, PK)
- `ordem_servico_id` (UUID, FK → ordens_servico.id, ON DELETE CASCADE)
- `produto_id` (UUID, FK → produtos.id, ON DELETE SET NULL)
- `descricao` (TEXT)
- `quantidade` (INTEGER, default 1)
- `preco_unitario` (NUMERIC(10, 2))
- **Relacionamentos:** ordens_servico, produtos

**ordens_servico_historico** (Histórico de status)
- `id` (UUID, PK)
- `ordem_servico_id` (UUID, FK → ordens_servico.id, ON DELETE CASCADE)
- `status_anterior` (VARCHAR(50))
- `status_novo` (VARCHAR(50))
- `alterado_por` (TEXT)
- `alterado_em` (TIMESTAMPTZ)
- **Relacionamentos:** ordens_servico

**obras** (NOVO - Gestão de Obras)
- `id` (UUID, PK)
- `cliente_id` (UUID, FK → clientes.id, ON DELETE SET NULL)
- `nome` (VARCHAR(255))
- `descricao` (TEXT)
- `endereco` (TEXT)
- `data_inicio` (DATE)
- `data_fim_prevista` (DATE)
- `data_fim_real` (DATE)
- `status` (VARCHAR(50), CHECK IN ('planejada', 'em_andamento', 'concluida', 'cancelada', 'paralisada'))
- `orcamento_total` (NUMERIC(10, 2))
- **Relacionamentos:** clientes

**obras_ordens_servico** (Relacionamento N:N)
- `obra_id` (UUID, FK → obras.id, ON DELETE CASCADE)
- `ordem_servico_id` (UUID, FK → ordens_servico.id, ON DELETE CASCADE)
- **PK composta:** (obra_id, ordem_servico_id)

**regras_comissao** (NOVO - Regras de Comissão)
- `id` (UUID, PK)
- `colaborador_id` (UUID, FK → funcionarios.id, ON DELETE CASCADE)
- `tipo_calculo` (VARCHAR(20), CHECK IN ('percentual', 'valor_fixo'))
- `valor` (NUMERIC(10, 2), CHECK > 0)
- `ativo` (BOOLEAN, default TRUE)
- **Relacionamentos:** funcionarios

**comissoes** (NOVO - Comissões Calculadas)
- `id` (UUID, PK)
- `colaborador_id` (UUID, FK → funcionarios.id, ON DELETE CASCADE)
- `venda_id` (UUID, FK → vendas.id, ON DELETE SET NULL)
- `regra_comissao_id` (UUID, FK → regras_comissao.id, ON DELETE SET NULL)
- `valor_comissao` (NUMERIC(10, 2))
- `valor_venda` (NUMERIC(10, 2))
- `periodo_referencia` (DATE)
- `status_pagamento` (VARCHAR(50), CHECK IN ('pendente', 'pago', 'cancelado'))
- `data_pagamento` (DATE)
- **Relacionamentos:** funcionarios, vendas, regras_comissao

**configuracoes** (Configurações do Tenant)
- `id` (UUID, PK)
- `chave` (VARCHAR(100), UNIQUE)
- `valor` (JSONB)

### 3.2 Relacionamentos e FKs

#### FKs Críticas (Proteção de Integridade)
1. **vendas_itens.produto_id → estoque.id** (ON DELETE RESTRICT)
   - **Propósito:** Impedir venda de produtos que não existem no estoque
   - **Impacto:** Garante integridade do fluxo Vendas ↔ Estoque
   - **Frontend:** PDV valida quantidade antes de adicionar ao carrinho

2. **ordens_servico.cliente_id → clientes.id** (ON DELETE SET NULL)
   - **Propósito:** Preservar histórico de OS mesmo se cliente for excluído
   - **Impacto:** Auditoria de histórico de serviços

3. **ordens_servico.colaborador_id → funcionarios.id** (ON DELETE SET NULL)
   - **Propósito:** Preservar histórico de atribuição de OS

4. **vendas_itens.venda_id → vendas.id** (ON DELETE CASCADE)
   - **Propósito:** Excluir itens automaticamente se venda for excluída

### 3.3 Triggers e Quando Disparam

#### Trigger 1: atualizar_estoque_apos_venda
- **Local:** Schema tenant
- **Evento:** AFTER INSERT ON vendas_itens
- **Função:** `atualizar_estoque_apos_venda()`
- **Lógica:**
  1. Subtrai quantidade vendida do estoque
  2. Valida se produto existe no estoque
  3. Valida se quantidade não fica negativa
  4. Se falhar, lança exceção e reverte transação
- **Propósito:** Garantir consistência automática do estoque após vendas
- **SQL:** `apps/api/migrations_expansion.sql` (linhas 155-184)

#### Trigger 2: registrar_historico_os
- **Local:** Schema tenant
- **Evento:** BEFORE UPDATE ON ordens_servico
- **Função:** `registrar_historico_os()`
- **Lógica:**
  1. Detecta mudança de status
  2. Registra status_anterior e status_novo em ordens_servico_historico
  3. Atualiza campo atualizado_em
- **Propósito:** Auditoria completa de mudanças de status em OS
- **SQL:** `apps/api/migrations_expansion.sql` (linhas 254-275)

#### Trigger 3: trigger_calcular_comissao
- **Local:** Schema tenant
- **Evento:** AFTER INSERT OR UPDATE ON vendas
- **Função:** `trigger_calcular_comissao()`
- **Lógica:**
  1. Detecta quando venda muda para status 'concluido'
  2. Chama função calcular_comissao_venda()
- **Propósito:** Cálculo automático de comissões após venda concluída
- **SQL:** `apps/api/migrations_expansion.sql` (linhas 393-412)

#### Trigger 4: trg_empresas_seed_modules
- **Local:** Schema public
- **Evento:** AFTER INSERT ON empresas
- **Função:** `_after_empresa_insert_seed_modules()`
- **Lógica:**
  1. Cria registros em empresa_modulos para todos os módulos do catálogo
  2. Todos com ativo = FALSE (governança central)
- **Propósito:** Garantir feature flags criadas automaticamente para novas empresas
- **SQL:** `apps/api/supabase_rpc.sql` (linhas 71-95)

### 3.4 Views e Relatórios

#### Views para Relatórios (por schema tenant)
**vw_relatorio_vendas**
- Agrega vendas com clientes e produtos
- Campos: id, data_venda, cliente_nome, valor_total, metodo_pagamento, status, itens_quantidade, produtos
- **SQL:** `apps/api/migrations_expansion.sql` (linhas 445-461)

**vw_relatorio_financeiro**
- Lista lançamentos financeiros
- Campos: id, data_lancamento, tipo, descricao, valor, data_vencimento, status
- **SQL:** `apps/api/migrations_expansion.sql` (linhas 463-473)

**vw_relatorio_estoque**
- Lista produtos com status de estoque
- Campos: id, sku, produto_nome, quantidade, quantidade_minima, status_estoque
- **status_estoque:** 'critico', 'baixo', 'normal' (baseado em quantidade)
- **SQL:** `apps/api/migrations_expansion.sql` (linhas 475-490)

**vw_relatorio_crm**
- Lista clientes com status de engajamento
- Campos: id, nome, email, telefone, funil_fase, status, data_cadastro, status_engajamento
- **status_engajamento:** 'ativo' (< 30 dias), 'inativo' (30-60 dias), 'risco' (> 60 dias)
- **SQL:** `apps/api/migrations_expansion.sql` (linhas 492-507)

### 3.5 Função provisionar_empresa

**Local:** `apps/api/supabase_rpc.sql` (linhas 181-337)  
**Atualizado em:** `apps/api/migrations_expansion.sql` (linhas 45-438)

**Responsabilidade:** Criar schema e todas as tabelas para uma nova empresa automaticamente

**Fluxo de execução:**
1. Verifica se schema já existe
2. Cria schema novo
3. Remove permissões de anon/authenticated (endurecimento)
4. Concede permissões apenas para service_role
5. Cria tabelas para todos os módulos:
   - clientes
   - produtos
   - estoque
   - vendas
   - vendas_itens (CRÍTICO)
   - financeiro
   - funcionarios
   - ordens_servico
   - ordens_servico_itens
   - ordens_servico_historico
   - obras
   - obras_ordens_servico
   - regras_comissao
   - comissoes
   - configuracoes
6. Cria triggers específicos do schema
7. Remove permissões de anon/authenticated das tabelas
8. Retorna JSON com status

**Uso:**
```sql
SELECT * FROM provisionar_empresa('tenant_empresa_x');
```

### 3.6 RLS e Segurança

#### Políticas RLS (Schema Public)
**master_all_empresas**
- Master pode tudo em empresas
- `FOR ALL USING (public.is_master())`

**master_all_modulos_catalogo**
- Master pode tudo em modulos_catalogo

**master_all_empresa_modulos**
- Master pode tudo em empresa_modulos

**master_all_user_profiles**
- Master pode tudo em user_profiles

**tenant_read_own_empresa**
- Tenant pode ler própria empresa
- Verifica se user_id tem empresa_id correspondente

**tenant_read_own_empresa_modulos**
- Tenant pode ler próprios módulos ativos

**tenant_read_modulos_catalogo**
- Qualquer usuário autenticado pode ler catálogo

**user_read_own_profile**
- Usuário pode ler próprio perfil

#### Segurança de Schemas Tenant
- Por padrão, schemas tenant NÃO são acessíveis por anon/authenticated
- Apenas service_role tem acesso
- Previne exposição acidental via API
- Configurado via `ALTER DEFAULT PRIVILEGES`

---

## 4. FRONTEND (ARQUIVO POR ARQUIVO)

### 4.1 Layout Components

#### `apps/web/src/components/layout/Header.tsx`
**Responsabilidade:** Barra superior com busca, data, notificações e avatar do usuário
**Dados que consome:** Nenhum (data atual local)
**Dados que grava:** Nenhum
**Regras importantes:** Exibe data formatada em português
**Dependências:** lucide-react (Bell, Search)

#### `apps/web/src/components/layout/Sidebar.tsx`
**Responsabilidade:** Navegação lateral com módulos filtrados por feature flags
**Dados que consome:** 
- `user_profiles` (role, empresa_id)
- `empresa_modulos` (modulo_key, ativo)
**Dados que grava:** Nenhum
**Regras importantes:**
- Filtra navegação baseado em módulos ativos da empresa
- Exibe mensagem se nenhum módulo ativo
- Highlight do item ativo baseado em pathname
**Dependências:** 
- lucide-react (ícones de navegação)
- createClient (Supabase)
- usePathname (Next.js)

#### `apps/web/src/components/layout/TenantLayout.tsx`
**Responsabilidade:** Layout wrapper para páginas de tenant (Sidebar + Header + Main)
**Dados que consome:** Nenhum
**Dados que grava:** Nenhum
**Regras importantes:** Estrutura fixa de layout
**Dependências:** Sidebar, Header

### 4.2 Module Components (Base)

#### `apps/web/src/components/modules/base/KPICard.tsx`
**Responsabilidade:** Card de indicador chave de performance (KPI)
**Dados que consome:** Props (title, value, icon, trend)
**Dados que grava:** Nenhum
**Regras importantes:**
- Exibe valor principal e opcionalmente trend (percentual)
- Cores condicionais para trend positivo/negativo
- Hover effects com sombra e translate
**Dependências:** lucide-react, clsx, tailwind-merge

#### `apps/web/src/components/modules/base/StatusBadge.tsx`
**Responsabilidade:** Badge de status com cores padronizadas
**Dados que consome:** Props (status, label)
**Dados que grava:** Nenhum
**Regras importantes:**
- Status types: success, warning, error, info, default, pendente, concluido, baixo, critico, normal
- Cores pré-definidas para cada tipo
- Dot colorido + label
**Dependências:** clsx, tailwind-merge

### 4.3 Utils

#### `apps/web/src/utils/auth/requireMaster.ts`
**Responsabilidade:** Server-side helper para exigir role master
**Dados que consome:** 
- auth.users (via getUser)
- user_profiles (role)
**Dados que grava:** Nenhum
**Regras importantes:**
- Se não autenticado → redirect /login
- Se não master → redirect /tenant/dashboard
- Server-only (não pode ser usado no client)
**Dependências:** createClient (Supabase server), redirect (Next.js)

#### `apps/web/src/utils/supabase/client.ts`
**Responsabilidade:** Factory para Supabase client (browser)
**Dados que consome:** Environment variables
**Dados que grava:** Nenhum
**Regras importantes:** Usa anon key (não service role)
**Dependências:** @supabase/ssr

#### `apps/web/src/utils/supabase/server.ts`
**Responsabilidade:** Factory para Supabase client (server-side)
**Dados que consome:** Environment variables
**Dados que grava:** Nenhum
**Regras importantes:** Usa service role (permissões elevadas)
**Dependências:** @supabase/ssr

#### `apps/web/src/utils/supabase/admin.ts`
**Responsabilidade:** Factory para Supabase admin (service role)
**Dados que consome:** Environment variables
**Dados que grava:** Nenhum
**Regras importantes:** Permissões máximas para operações administrativas
**Dependências:** @supabase/ssr

### 4.4 Middleware

#### `apps/web/src/middleware.ts`
**Responsabilidade:** Middleware global de autenticação e autorização
**Dados que consome:** 
- auth.users (via getUser)
- user_profiles (role, empresa_id)
- empresa_modulos (ativo)
**Dados que grava:** Nenhum
**Regras importantes:**
1. Se sem env configurado → redirect /setup
2. Se não autenticado em rotas protegidas → redirect /login
3. Se autenticado tentando /login → redirect /tenant/dashboard
4. Se master tentando /tenant → redirect /admin
5. Se tenant tentando /admin → redirect /tenant/dashboard
6. Feature flags: verifica se módulo ativo antes de acessar /tenant/{modulo}
**Dependências:** @supabase/ssr, Next.js middleware

### 4.5 Páginas Tenant

#### `apps/web/src/app/tenant/dashboard/page.tsx`
**Responsabilidade:** Dashboard com KPIs e gráficos
**Dados que consome:** Mock data (TODO: substituir por Supabase)
**Dados que grava:** Nenhum
**Regras importantes:** Exibe visão geral do negócio
**Dependências:** KPICard, ActionCard, Recharts

#### `apps/web/src/app/tenant/vendas/page.tsx`
**Responsabilidade:** Listagem de vendas com filtros
**Dados que consome:** Mock data (TODO: substituir por Supabase)
**Dados que grava:** Nenhum
**Regras importantes:** Listagem de histórico de vendas
**Dependências:** KPICard, StatusBadge, Table

#### `apps/web/src/app/tenant/vendas/pdv/page.tsx`
**Responsabilidade:** Ponto de Venda (PDV) com carrinho e validação de estoque ⚠️ CRÍTICO
**Dados que consome:** 
- estoque (via Supabase) - produtos disponíveis
- Mock data temporário (TODO: substituir por query real)
**Dados que grava:** 
- vendas (via Supabase) - ao finalizar venda
- vendas_itens (via Supabase) - itens da venda
**Regras importantes:**
1. **CRÍTICO:** Produtos listados exclusivamente do estoque
2. **CRÍTICO:** Valida quantidade disponível antes de adicionar ao carrinho
3. **CRÍTICO:** Bloqueia venda se quantidade insuficiente
4. Exibe estoque em tempo real
5. Alertas visuais para produtos esgotados/estoque baixo
**Dependências:** createClient, lucide-react, KPICard

#### `apps/web/src/app/tenant/estoque/page.tsx`
**Responsabilidade:** Gestão de estoque com alertas
**Dados que consome:** Mock data (TODO: substituir por Supabase)
**Dados que grava:** Nenhum
**Regras importantes:** Alertas para reposição
**Dependências:** KPICard, StatusBadge, Table

#### `apps/web/src/app/tenant/crm/page.tsx`
**Responsabilidade:** Gestão de clientes e funil
**Dados que consome:** Mock data (TODO: substituir por Supabase)
**Dados que grava:** Nenhum
**Regras importantes:** Fases do funil de vendas
**Dependências:** KPICard, StatusBadge, Table

#### `apps/web/src/app/tenant/financeiro/page.tsx`
**Responsabilidade:** Gestão financeira (contas a pagar/receber)
**Dados que consome:** Mock data (TODO: substituir por Supabase)
**Dados que grava:** Nenhum
**Regras importantes:** Conciliação bancária
**Dependências:** KPICard, StatusBadge, Table

#### `apps/web/src/app/tenant/rh/page.tsx`
**Responsabilidade:** Gestão de colaboradores (placeholder)
**Dados que consome:** Nenhum
**Dados que grava:** Nenhum
**Regras importantes:** Placeholder funcional
**Dependências:** Nenhuma

#### `apps/web/src/app/tenant/catalogo/page.tsx`
**Responsabilidade:** Catálogo de produtos (placeholder)
**Dados que consome:** Nenhum
**Dados que grava:** Nenhum
**Regras importantes:** Placeholder funcional
**Dependências:** Nenhuma

#### `apps/web/src/app/tenant/os/page.tsx`
**Responsabilidade:** Gestão de Ordens de Serviço
**Dados que consome:** Mock data (TODO: substituir por Supabase)
**Dados que grava:** ordens_servico, ordens_servico_itens (via Supabase)
**Regras importantes:**
- Status: aberta, em_execucao, concluida, cancelada
- Vinculação com cliente, colaborador, produtos
- Histórico de status (automático via trigger)
**Dependências:** KPICard, StatusBadge, Table

#### `apps/web/src/app/tenant/obras/page.tsx`
**Responsabilidade:** Gestão de obras e projetos (NOVO)
**Dados que consome:** Mock data (TODO: substituir por Supabase)
**Dados que grava:** obras, obras_ordens_servico (via Supabase)
**Regras importantes:**
- Status: planejada, em_andamento, concluida, cancelada, paralisada
- Vinculação com cliente, OS, vendas
- Datas de início/fim
**Dependências:** KPICard, StatusBadge, Table

#### `apps/web/src/app/tenant/comissoes/page.tsx`
**Responsabilidade:** Gestão de comissões (NOVO)
**Dados que consome:** Mock data (TODO: substituir por Supabase)
**Dados que grava:** regras_comissao (via Supabase)
**Regras importantes:**
- Tipos de cálculo: percentual, valor_fixo
- Cálculo automático baseado em vendas (via trigger)
- Status de pagamento: pendente, pago, cancelado
**Dependências:** KPICard, StatusBadge, Table

#### `apps/web/src/app/tenant/relatorios/page.tsx`
**Responsabilidade:** Relatórios consolidados (NOVO)
**Dados que consome:** Mock data (TODO: substituir por views SQL)
**Dados que grava:** Nenhum
**Regras importantes:**
- Tipos: Vendas, Financeiro, Estoque, CRM
- Filtros: período, cliente, produto, colaborador
- Exportação: CSV/PDF (estrutura pronta)
**Dependências:** KPICard, StatusBadge, Table

#### `apps/web/src/app/tenant/configuracoes/page.tsx`
**Responsabilidade:** Configurações do tenant
**Dados que consome:** configuracoes (via Supabase)
**Dados que grava:** configuracoes (via Supabase)
**Regras importantes:** Preferências e parâmetros
**Dependências:** Form components

### 4.6 Páginas Admin

#### `apps/web/src/app/admin/page.tsx`
**Responsabilidade:** Dashboard de governança central
**Dados que consome:** empresas, user_profiles (contagem)
**Dados que grava:** Nenhum
**Regras importantes:** Visão geral de empresas e usuários
**Dependências:** requireMaster

#### `apps/web/src/app/admin/empresas/page.tsx`
**Responsabilidade:** Listagem de empresas
**Dados que consome:** empresas
**Dados que grava:** Nenhum
**Regras importantes:** Listagem com schema e status
**Dependências:** requireMaster

#### `apps/web/src/app/admin/usuarios/page.tsx`
**Responsabilidade:** Criação e listagem de usuários
**Dados que consome:** user_profiles, auth.users
**Dados que grava:** user_profiles (via server action)
**Regras importantes:** CREATE de usuários tenant
**Dependências:** requireMaster

#### `apps/web/src/app/admin/modulos/page.tsx`
**Responsabilidade:** Ativação/desativação de módulos por empresa
**Dados que consome:** empresas, empresa_modulos
**Dados que grava:** empresa_modulos (via setModuleActive)
**Regras importantes:** Feature flags por empresa
**Dependências:** requireMaster

---

## 5. REGRAS DE NEGÓCIO CRÍTICAS

### 5.1 Venda só com Estoque
**Regra:** O sistema só pode vender produtos que estejam cadastrados no estoque e com quantidade disponível

**Implementação:**
- **Banco:** FK obrigatória `vendas_itens.produto_id → estoque.id` (ON DELETE RESTRICT)
- **Banco:** Trigger `atualizar_estoque_apos_venda` que valida quantidade e lança exceção se insuficiente
- **Frontend:** PDV lê produtos exclusivamente do estoque
- **Frontend:** PDV valida quantidade disponível antes de adicionar ao carrinho
- **Frontend:** PDV bloqueia botão de produtos esgotados

**Arquivos:**
- SQL: `apps/api/migrations_expansion.sql` (linhas 136-184)
- Frontend: `apps/web/src/app/tenant/vendas/pdv/page.tsx`

### 5.2 Comissão Automática
**Regra:** Comissões são calculadas automaticamente quando uma venda é concluída

**Implementação:**
- **Banco:** Trigger `trigger_calcular_comissao` detecta venda com status 'concluido'
- **Banco:** Função `calcular_comissao_venda()` busca regra ativa do colaborador e calcula valor
- **Banco:** Inserir registro em `comissoes` com valor calculado
- **Frontend:** Página de comissões exibe histórico e permite marcar como pago

**Arquivos:**
- SQL: `apps/api/migrations_expansion.sql` (linhas 339-412)
- Frontend: `apps/web/src/app/tenant/comissoes/page.tsx`

### 5.3 Histórico de OS
**Regra:** Todas as mudanças de status em Ordens de Serviço são registradas em histórico

**Implementação:**
- **Banco:** Trigger `registrar_historico_os` detecta mudança de status
- **Banco:** Registra status_anterior, status_novo, alterado_por, alterado_em em `ordens_servico_historico`
- **Frontend:** Página de OS exibe histórico (TODO: implementar visualização)

**Arquivos:**
- SQL: `apps/api/migrations_expansion.sql` (lines 242-275)
- Frontend: `apps/web/src/app/tenant/os/page.tsx`

### 5.4 Ativação de Módulos
**Regra:** Nenhum módulo está ativo por padrão. Apenas usuário-master pode ativar

**Implementação:**
- **Banco:** Trigger `trg_empresas_seed_modules` cria feature flags todas FALSE
- **Banco:** Tabela `empresa_modulos` é fonte de verdade
- **Frontend:** Sidebar filtra módulos baseados em `empresa_modulos.ativo`
- **Frontend:** Middleware bloqueia acesso a módulos inativos (redirect /tenant/sem-modulos)
- **Frontend:** Admin/modulos permite ativar/desativar

**Arquivos:**
- SQL: `apps/api/supabase_rpc.sql` (lines 71-95)
- Frontend: `apps/web/src/components/layout/Sidebar.tsx`
- Frontend: `apps/web/src/middleware.ts`
- Frontend: `apps/web/src/app/admin/modulos/page.tsx`

### 5.5 Isolamento por Empresa
**Regra:** Cada empresa só pode acessar seus próprios dados

**Implementação:**
- **Banco:** Schemas separados por empresa (`tenant_empresa_x`)
- **Banco:** RLS em tabelas públicas com políticas por role
- **Banco:** Schemas tenant não acessíveis por anon/authenticated
- **Frontend:** Middleware valida empresa_id do usuário
- **Frontend:** Queries Supabase usam RLS automaticamente

**Arquivos:**
- SQL: `apps/api/supabase_rpc.sql` (lines 112-167)
- Frontend: `apps/web/src/middleware.ts`

---

## 6. FLUXOS IMPORTANTES (PASSO A PASSO)

### 6.1 Criação de Venda (PDV)
1. **Frontend:** Usuário acessa `/tenant/vendas/pdv`
2. **Frontend:** PDV carrega produtos do estoque (via Supabase)
3. **Frontend:** Usuário adiciona produtos ao carrinho
4. **Frontend:** Valida quantidade disponível em tempo real
5. **Frontend:** Usuário seleciona método de pagamento
6. **Frontend:** Usuário clica "Finalizar Pagamento"
7. **Frontend:** Cria registro em `vendas` (via Supabase)
8. **Frontend:** Cria registros em `vendas_itens` (via Supabase)
9. **Banco:** Trigger `atualizar_estoque_apos_venda` dispara
10. **Banco:** Subtrai quantidade do estoque
11. **Banco:** Valida se quantidade não ficou negativa
12. **Banco:** Trigger `trigger_calcular_comissao` dispara (se status = 'concluido')
13. **Banco:** Calcula comissão automaticamente
14. **Frontend:** Exibe confirmação e comprovante

**Arquivos:**
- Frontend: `apps/web/src/app/tenant/vendas/pdv/page.tsx`
- SQL: `apps/api/migrations_expansion.sql` (triggers)

### 6.2 Atualização de Estoque
1. **Manual:** Usuário acessa `/tenant/estoque`
2. **Manual:** Usuário edita quantidade de produto
3. **Banco:** UPDATE direto na tabela `estoque`
4. **Automático:** Trigger `atualizar_estoque_apos_venda` atualiza após vendas
5. **Automático:** Campo `atualizado_em` é atualizado automaticamente

**Arquivos:**
- Frontend: `apps/web/src/app/tenant/estoque/page.tsx`
- SQL: `apps/api/migrations_expansion.sql` (trigger)

### 6.3 Geração de Comissão
1. **Venda:** Usuário finaliza venda no PDV
2. **Trigger:** `trigger_calcular_comissao` detecta status 'concluido'
3. **Função:** `calcular_comissao_venda(venda_uuid)` é chamada
4. **Busca:** Valor total da venda
5. **Busca:** Colaborador responsável (primeiro funcionário ativo)
6. **Busca:** Regra de comissão ativa para o colaborador
7. **Cálculo:** Se percentual → valor * (percentual / 100)
8. **Cálculo:** Se valor_fixo → usa valor direto
9. **Insert:** Cria registro em `comissoes`
10. **Frontend:** Usuário acessa `/tenant/comissoes`
11. **Frontend:** Exibe comissões pendentes
12. **Frontend:** Usuário marca como pago
13. **Banco:** UPDATE `comissoes.status_pagamento = 'pago'`

**Arquivos:**
- SQL: `apps/api/migrations_expansion.sql` (lines 339-412)
- Frontend: `apps/web/src/app/tenant/comissoes/page.tsx`

### 6.4 Abertura de OS
1. **Frontend:** Usuário acessa `/tenant/os`
2. **Frontend:** Clica "Nova OS"
3. **Frontend:** Preenche cliente, veículo/equipamento, problema
4. **Frontend:** Seleciona colaborador responsável
5. **Frontend:** Clica "Criar OS"
6. **Frontend:** INSERT em `ordens_servico` (via Supabase)
7. **Frontend:** Opcional: adiciona itens em `ordens_servico_itens`
8. **Banco:** Status inicial = 'aberta'
9. **Frontend:** Usuário altera status para 'em_execucao'
10. **Banco:** Trigger `registrar_historico_os` dispara
11. **Banco:** Registra mudança em `ordens_servico_historico`
12. **Frontend:** Usuário altera status para 'concluida'
13. **Banco:** Trigger registra nova mudança

**Arquivos:**
- Frontend: `apps/web/src/app/tenant/os/page.tsx`
- SQL: `apps/api/migrations_expansion.sql` (lines 211-275)

### 6.5 Vinculação com Obras
1. **Frontend:** Usuário acessa `/tenant/obras`
2. **Frontend:** Cria nova obra (cliente, nome, datas, orçamento)
3. **Frontend:** INSERT em `obras` (via Supabase)
4. **Frontend:** Usuário vincula OS existentes à obra
5. **Frontend:** INSERT em `obras_ordens_servico` (via Supabase)
6. **Banco:** FKs garantem integridade
7. **Frontend:** Dashboard da obra exibe OS vinculadas

**Arquivos:**
- Frontend: `apps/web/src/app/tenant/obras/page.tsx`
- SQL: `apps/api/migrations_expansion.sql` (lines 277-305)

---

## 7. MELHORIAS PROPOSTAS (ENTREGA 1)

### 7.1 Auditoria de Eventos
**Problema:** Não existe tabela central de auditoria para rastrear ações críticas

**Solução Proposta:**
```sql
-- Adicionar ao schema public
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_empresa ON public.audit_log(empresa_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);
```

**Impacto:** Backend/Banco  
**Exige SQL:** Sim  
**Prioridade:** Alta (compliance e segurança)

### 7.2 Locks Transacionais (Estoque/Vendas)
**Problema:** Race condition possível se múltiplos PDV venderem o mesmo produto simultaneamente

**Solução Proposta:**
```sql
-- Adicionar constraint de estoque não negativo no trigger atual
-- Já implementado, mas pode ser reforçado com:

ALTER TABLE tenant_x.estoque 
ADD CONSTRAINT chk_estoque_nao_negativo 
CHECK (quantidade >= 0);

-- E usar FOR UPDATE no trigger para lock pessimista:
CREATE OR REPLACE FUNCTION tenant_x.atualizar_estoque_apos_venda()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    qtd_disponivel INTEGER;
BEGIN
    -- Lock pessimista na linha do estoque
    SELECT quantidade INTO qtd_disponivel
    FROM tenant_x.estoque
    WHERE id = NEW.produto_id
    FOR UPDATE;
    
    IF qtd_disponivel < NEW.quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', 
            qtd_disponivel, NEW.quantidade;
    END IF;
    
    UPDATE tenant_x.estoque
    SET quantidade = quantidade - NEW.quantidade,
        atualizado_em = NOW()
    WHERE id = NEW.produto_id;
    
    RETURN NEW;
END;
$$;
```

**Impacto:** Banco (trigger)  
**Exige SQL:** Sim  
**Prioridade:** Alta (integridade de dados)

### 7.3 RLS e Isolamento Multi-Tenant
**Problema:** Schemas tenant não têm RLS explícito (confiam em isolamento físico)

**Solução Proposta:**
```sql
-- Adicionar RLS também para tabelas tenant (defesa em profundidade)
-- Para cada schema tenant:

ALTER TABLE tenant_x.vendas ENABLE ROW LEVEL SECURITY;

-- Política: apenas usuários da empresa podem acessar
CREATE POLICY tenant_isolation_vendas ON tenant_x.vendas
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = auth.uid()
        AND p.empresa_id = (
            SELECT schema_name FROM public.empresas 
            WHERE schema_name = current_schema()
        )
    )
);
```

**Impacto:** Banco  
**Exige SQL:** Sim  
**Prioridade:** Média (defesa em profundidade)

### 7.4 Scripts Automáticos para Atualização de Schemas Existentes
**Problema:** Schemas existentes não têm as novas tabelas (vendas_itens, obras, comissões, etc.)

**Solução Proposta:**
```sql
-- Criar função de migração para schemas existentes
CREATE OR REPLACE FUNCTION migrar_schema_existente(schema_name TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verifica se schema existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
        RETURN json_build_object('status', 'error', 'message', 'Schema não encontrado');
    END IF;
    
    -- Adiciona vendas_itens se não existir
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.vendas_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            venda_id UUID NOT NULL REFERENCES %I.vendas(id) ON DELETE CASCADE,
            produto_id UUID NOT NULL REFERENCES %I.estoque(id) ON DELETE RESTRICT,
            quantidade INTEGER NOT NULL CHECK (quantidade > 0),
            preco_unitario NUMERIC(10, 2) NOT NULL,
            subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', schema_name, schema_name, schema_name);
    
    -- Repetir para outras tabelas novas...
    
    RETURN json_build_object('status', 'success', 'message', 'Schema migrado com sucesso');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- Uso:
SELECT * FROM migrar_schema_existente('tenant_empresa_x');
```

**Impacto:** Banco  
**Exige SQL:** Sim  
**Prioridade:** Alta (para schemas existentes)

### 7.5 Indexação Final e Performance
**Problema:** Índices podem estar faltando para queries comuns

**Solução Proposta:**
```sql
-- Índices já criados em migrations_expansion.sql
-- Adicionar índices adicionais para performance:

-- Para relatórios por período
CREATE INDEX idx_vendas_criado_em ON tenant_x.vendas(criado_em DESC);
CREATE INDEX idx_financeiro_vencimento ON tenant_x.financeiro(data_vencimento);

-- Para busca de clientes
CREATE INDEX idx_clientes_nome ON tenant_x.clientes(nome);
CREATE INDEX idx_clientes_status ON tenant_x.clientes(status);

-- Para estoque com alertas
CREATE INDEX idx_estoque_quantidade ON tenant_x.estoque(quantidade);
```

**Impacto:** Banco  
**Exige SQL:** Sim  
**Prioridade:** Média (performance)

### 7.6 Preparação para Monetização (Planos/Módulos)
**Problema:** Não existe tabela de planos e preços

**Solução Proposta:**
```sql
-- Tabela de planos
CREATE TABLE public.planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco_mensal NUMERIC(10, 2),
    max_empresas INTEGER,
    max_usuarios INTEGER,
    modulos_incluidos TEXT[], -- array de modulo_keys
    ativo BOOLEAN DEFAULT TRUE
);

-- Relacionar empresa com plano
ALTER TABLE public.empresas ADD COLUMN plano_id UUID REFERENCES public.planos(id);

-- Tabela de assinaturas
CREATE TABLE public.assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    plano_id UUID REFERENCES public.planos(id),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status VARCHAR(50) DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'suspensa'))
);
```

**Impacto:** Banco  
**Exige SQL:** Sim  
**Prioridade:** Média (monetização)

### 7.7 Segurança de Papéis (RBAC)
**Problema:** Apenas 3 roles básicos, sem granularidade por módulo

**Solução Proposta:**
```sql
-- Tabela de permissões por módulo
CREATE TABLE public.permissoes_modulo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('master', 'tenant_admin', 'tenant_user')),
    modulo_key TEXT NOT NULL REFERENCES public.modulos_catalogo(key),
    pode_ver BOOLEAN DEFAULT TRUE,
    pode_criar BOOLEAN DEFAULT FALSE,
    pode_editar BOOLEAN DEFAULT FALSE,
    pode_excluir BOOLEAN DEFAULT FALSE,
    UNIQUE(role, modulo_key)
);

-- Exemplo: tenant_user pode ver mas não editar financeiro
INSERT INTO public.permissoes_modulo (role, modulo_key, pode_ver, pode_editar)
VALUES ('tenant_user', 'financeiro', TRUE, FALSE);
```

**Impacto:** Banco + Frontend  
**Exige SQL:** Sim  
**Prioridade:** Média (segurança)

### 7.8 Observabilidade e Logs
**Problema:** Logs existentes apenas em logs_provisionamento

**Solução Proposta:**
```sql
-- Tabela central de logs de aplicação
CREATE TABLE public.app_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id),
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
    message TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_logs_empresa ON public.app_logs(empresa_id);
CREATE INDEX idx_app_logs_level ON public.app_logs(level);
CREATE INDEX idx_app_logs_created ON public.app_logs(created_at DESC);

-- Função para log
CREATE OR REPLACE FUNCTION log_app(empresa_id UUID, level TEXT, message TEXT, context JSONB)
RETURNS void
LANGUAGE sql
AS $$
    INSERT INTO public.app_logs(empresa_id, level, message, context)
    VALUES (empresa_id, level, message, context);
$$;
```

**Impacto:** Banco  
**Exige SQL:** Sim  
**Prioridade:** Média (debugging)

### 7.9 Testes SQL de Triggers e Constraints
**Problema:** Não existe suite de testes para validar lógica de negócio no banco

**Solução Proposta:**
```sql
-- Script de teste para validar trigger de estoque
DO $$
DECLARE
    v_produto_id UUID;
    v_venda_id UUID;
BEGIN
    -- Criar produto de teste
    INSERT INTO tenant_x.produtos (nome, preco_base)
    VALUES ('Produto Teste', 100.00)
    RETURNING id INTO v_produto_id;
    
    -- Criar estoque com quantidade 5
    INSERT INTO tenant_x.estoque (produto_id, quantidade)
    VALUES (v_produto_id, 5);
    
    -- Criar venda
    INSERT INTO tenant_x.vendas (valor_total, status)
    VALUES (200.00, 'concluido')
    RETURNING id INTO v_venda_id;
    
    -- Teste 1: Venda com quantidade válida (deve passar)
    BEGIN
        INSERT INTO tenant_x.vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
        VALUES (v_venda_id, v_produto_id, 3, 100.00);
        RAISE NOTICE 'TESTE 1 PASSOU: Venda com quantidade válida';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TESTE 1 FALHOU: %', SQLERRM;
    END;
    
    -- Teste 2: Venda com quantidade inválida (deve falhar)
    BEGIN
        INSERT INTO tenant_x.vendas_itens (venda_id, produto_id, quantidade, preco_unitario)
        VALUES (v_venda_id, v_produto_id, 10, 100.00);
        RAISE NOTICE 'TESTE 2 FALHOU: Deveria ter bloqueado venda com quantidade inválida';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TESTE 2 PASSOU: Venda inválida bloqueada corretamente - %', SQLERRM;
    END;
    
    -- Cleanup
    DELETE FROM tenant_x.vendas_itens;
    DELETE FROM tenant_x.vendas;
    DELETE FROM tenant_x.estoque;
    DELETE FROM tenant_x.produtos;
    
    RAISE NOTICE 'TODOS OS TESTES CONCLUÍDOS';
END $$;
```

**Impacto:** Banco  
**Exige SQL:** Sim  
**Prioridade:** Alta (qualidade)

---

## 8. COMO UM AGENTE FUTURO DEVE TRABALHAR NO PROJETO 🤖

### 8.1 Onde mexer para criar módulos

**Passo 1: Adicionar módulo ao catálogo (SQL)**
```sql
INSERT INTO public.modulos_catalogo (key, nome, descricao) VALUES
  ('novo_modulo', 'Novo Módulo', 'Descrição do novo módulo.')
ON CONFLICT (key) DO NOTHING;
```

**Passo 2: Adicionar tabelas no schema tenant (SQL)**
- Atualizar função `provisionar_empresa()` em `apps/api/migrations_expansion.sql`
- Criar tabelas específicas do módulo
- Adicionar FKs, constraints e índices
- Criar triggers se necessário

**Passo 3: Criar página no frontend**
- Criar `apps/web/src/app/tenant/novo_modulo/page.tsx`
- Usar componentes base (KPICard, StatusBadge, Table)
- Integrar com Supabase via `createClient()`
- Implementar CRUD operations

**Passo 4: Atualizar Sidebar**
- Adicionar item ao array `navigation` em `apps/web/src/components/layout/Sidebar.tsx`
- Importar ícone apropriado do lucide-react

**Passo 5: Atualizar Middleware (se necessário)**
- Middleware já valida feature flags automaticamente
- Nenhuma alteração necessária se módulo seguir padrão

### 8.2 Onde ficam regras críticas

**No Banco de Dados:**
- **FKs:** Em arquivos SQL (`supabase_rpc.sql`, `migrations_expansion.sql`)
- **Constraints:** CHECK constraints nas definições de tabelas
- **Triggers:** Funções e triggers em cada schema tenant
- **RLS:** Políticas em schema public

**No Frontend:**
- **Middleware:** `apps/web/src/middleware.ts` (autenticação, autorização, feature flags)
- **PDV:** `apps/web/src/app/tenant/vendas/pdv/page.tsx` (validação de estoque)
- **Server actions:** Para operações que exigem Service Role

**Regra:** Sempre que possível, implementar regra crítica no banco. Frontend deve validar UX, mas banco é guardião final.

### 8.3 Onde NÃO mexer sem cuidado

⚠️ **NUNCA modificar sem entendimento completo:**

1. **Função provisionar_empresa()**
   - Impacta toda a estrutura de schemas
   - Modificar apenas se souber o que está fazendo
   - Testar em schema de desenvolvimento

2. **RLS Policies em schema public**
   - Governança central depende disso
   - Modificar apenas se souber impacto em segurança

3. **Middleware.ts**
   - Controle de acesso central
   - Modificar apenas se souber impacto em roteamento

4. **Triggers de estoque e comissão**
   - Regras críticas de negócio
   - Testar exaustivamente antes de modificar

⚠️ **Sempre testar em ambiente de desenvolvimento antes de produção**

### 8.4 Boas práticas do FLUXO

1. **Padrão de componentes:** Usar KPICard, StatusBadge, Table para consistência visual
2. **Padrão de dados:** Sempre usar Supabase client, nunca dados mockados em produção
3. **Padrão de SQL:** Usar format() para SQL dinâmico com nomes de schema
4. **Padrão de tipos:** Usar TypeScript com interfaces explícitas
5. **Padrão de validação:** Validar no frontend (UX) e no banco (integridade)
6. **Padrão de commits:** Mensagens descritivas em português
7. **Padrão de documentação:** Atualizar este arquivo ao fazer mudanças estruturais

### 8.5 Padrões a seguir

**Para novas tabelas:**
- Usar UUID como PK (DEFAULT gen_random_uuid())
- Adicionar criado_em TIMESTAMPTZ DEFAULT NOW()
- Adicionar FKs com ON DELETE apropriado
- Adicionar índices para campos usados em filtros
- Criar triggers para lógica automática se necessário

**Para novas páginas:**
- Seguir estrutura de módulos existentes
- Usar TenantLayout para páginas de tenant
- Adicionar KPICards para métricas principais
- Usar Table para listagem de dados
- Implementar filtros se houver muitos dados
- Adicionar modais para CREATE/EDIT

**Para novas features:**
- Primeiro implementar no banco (SQL)
- Depois implementar no frontend
- Testar integração completa
- Atualizar documentação

---

## 9. ESTRUTURA DE ARQUIVOS

```
fluxoprod/
├── apps/
│   ├── api/
│   │   ├── main.py                    # FastAPI backend
│   │   ├── supabase_rpc.sql           # Script de provisionamento principal
│   │   └── migrations_expansion.sql   # Migrações de expansão (novos módulos)
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── (auth)/            # Rotas de autenticação
│           │   ├── admin/             # Rotas de governança (master)
│           │   ├── tenant/            # Rotas de tenant (módulos)
│           │   │   ├── dashboard/
│           │   │   ├── vendas/
│           │   │   ├── estoque/
│           │   │   ├── crm/
│           │   │   ├── financeiro/
│           │   │   ├── rh/
│           │   │   ├── catalogo/
│           │   │   ├── os/
│           │   │   ├── obras/
│           │   │   ├── comissoes/
│           │   │   ├── relatorios/
│           │   │   └── configuracoes/
│           │   ├── globals.css        # Estilos globais
│           │   ├── layout.tsx         # Layout raiz
│           │   └── middleware.ts      # Middleware global
│           ├── components/
│           │   ├── layout/            # Header, Sidebar, TenantLayout
│           │   ├── modules/           # Componentes de módulos
│           │   │   └── base/          # KPICard, StatusBadge, ActionCard
│           │   └── ui/                # Componentes shadcn/ui
│           └── utils/
│               ├── auth/              # requireMaster
│               └── supabase/          # client, server, admin
├── .env.example                       # Template de variáveis de ambiente
├── README.md                          # Documentação básica
└── DOCUMENTACAO_TECNICA_FLUXO.md     # Este arquivo
```

---

## 10. ESTADO FINAL DO SISTEMA (ENTREGA)

### 10.1 Mudanças Realizadas — Entrega 1 (Inicial)

**Limpeza de Dados Fictícios**
- Arquivo SQL criado: `limpar-dados-ficticios.sql`
- Dados limpos do schema `tenant_vidanovaimobiliria_c19798`
- Empresas, usuários e configurações base mantidos intactos
- SQL de verificação criado: `verificar-modulos.sql`

**Correções de Middleware**
- Middleware corrigido para usar VIEW `v_empresa_modulos` em vez da tabela direta `empresa_modulos`
- Resolve erro PostgREST 54001 ao acessar módulos

**Scripts de Inicialização**
- Script `start-local.ps1` criado para ambientes corporativos restritos

### 10.2 Mudanças Realizadas — Entrega 2 (Preparação para Produção) — 08/04/2026

**Eliminação de Dialogs Nativos (`window.confirm`)**
- Criado componente `ConfirmModal` (`apps/web/src/components/ui/confirm-modal.tsx`)
  - Suporte a variantes: danger, warning, default
  - Animação de entrada, backdrop blur, fecha com ESC
- Substituído `window.confirm` em 7 locais:
  - `vendas/page.tsx` → exclusão de venda
  - `estoque/page.tsx` → exclusão de produto, exportação de relatório
  - `financeiro/page.tsx` → exclusão de transação, sincronização bancária
  - `crm/page.tsx` → exclusão de cliente, campanha em massa

**Remoção de `console.log` (4 ocorrências)**
- `financeiro/page.tsx` → linhas 64, 80 (criação de transação)
- `relatorios/page.tsx` → linha 50 (export handler → substituído por toast)
- `vendas/page.tsx` → linha 44 (handleEdit)

**Correção de Bug: `event` Global**
- `financeiro/page.tsx` → `sincronizarBanco()` usava `event` global (Window.event)
- Corrigido para usar React ref (`useRef`) e estado (`syncing`) para controlar botão

**Refatoração Visual — Sidebar (PASSO 3)**
- Logo "FLUXO" reformulado para visual clean, minimalista e profissional
  - Nome em lowercase `fluxo` com fonte sans-serif
  - Subtítulo "gestão empresarial" em vez de "SaaS Platform"
  - Gradiente indigo→violet no ícone
- Indicador de empresa agora carrega dados reais do Supabase
  - Busca `empresas.razao_social` via `user_profiles.empresa_id`
  - Gera iniciais automaticamente a partir do nome da empresa
  - Removido hardcoded "Empresa Demo" / "TJ" / "Plano Premium"
- Seção de módulos com label "Módulos" para clareza visual
- Tipografia e espaçamento refinados

**Remoção de Dados Mock (Todos os Módulos)**
- `dashboard/page.tsx` → gráfico e transações zerados, empty states elegantes
- `os/page.tsx` → mock data removido, usando Modal component, KPIs zerados
- `obras/page.tsx` → mock data removido, usando Modal component, KPIs zerados
- `comissoes/page.tsx` → mock data de regras e histórico removido, KPIs zerados
- `relatorios/page.tsx` → mock data removido, empty state com ícone e mensagem

**KPIs Dinâmicos**
- `vendas/page.tsx` → calcula total, transações, ticket médio a partir dos dados reais
- `estoque/page.tsx` → calcula SKUs, estoque baixo, itens críticos dos dados reais
- `financeiro/page.tsx` → calcula entradas, saídas, pendentes dos dados reais
- `crm/page.tsx` → total de clientes calculado dinamicamente

**Limpeza Estrutural do Projeto (PASSO 7)**
- `.gitignore` atualizado com: `.DS_Store`, `*.tmp`, `*.log`, `*.old`, `*.bak`, `.venv/`, `dist/`, `build/`
- `.DS_Store` removidos do tracking Git (3 arquivos)
- `__pycache__` removido do tracking Git

**Segurança**
- Credenciais removidas desta documentação (Supabase keys, senhas)
- Referenciadas agora somente via arquivo `.env.local` (não commitado)

### 10.3 Estado Atual do Sistema

**Frontend**
- Next.js 16.2.2
- Zero `alert()`, `window.confirm()`, `prompt()` nativos
- Zero `console.log()` desnecessários
- Todos os dados mock removidos
- Modais elegantes para confirmação de ações
- Toast notifications para feedback ao usuário
- Sidebar com dados dinâmicos da empresa

**Banco de Dados**
- Schema `tenant_vidanovaimobiliria_c19798` limpo de dados fictícios
- Tabelas mantidas com estrutura intacta
- Empresas e usuários mantidos intactos
- Módulos configurados corretamente

### 10.4 Módulos Disponíveis

Todos os módulos do catálogo estão disponíveis e configurados corretamente:
- dashboard, crm, vendas, financeiro, estoque, catalogo, rh, relatorios, os, obras, comissoes

### 10.5 Credenciais de Acesso

> **⚠️ IMPORTANTE:** Credenciais não devem ser armazenadas em documentação versionada.  
> Consulte o arquivo `.env.local` (não commitado) para URLs e chaves do Supabase.  
> Credenciais de login devem ser armazenadas em vault seguro (1Password, Bitwarden, etc.)

### 10.6 Scripts SQL Disponíveis

**limpar-dados-ficticios.sql**
- Limpa dados fictícios de todos os módulos
- Mantém empresas, usuários e configurações base

**verificar-modulos.sql**
- Verifica módulos ativos da empresa
- Útil para diagnóstico

### 10.7 Componentes UI Criados

**ConfirmModal** (`apps/web/src/components/ui/confirm-modal.tsx`)
- Modal de confirmação com variantes danger/warning/default
- Substitui todos os `window.confirm()` nativos

**Toast** (`apps/web/src/components/ui/toast.tsx`)
- Sistema de notificações com tipos success/error/info/warning

**Modal** (`apps/web/src/components/ui/modal.tsx`)
- Modal genérico para formulários e conteúdo

---

## 11. CHECKLIST DE PRODUÇÃO

- [x] Executar `supabase_rpc.sql` no Supabase SQL Editor
- [x] Executar `migrations_expansion.sql` no Supabase SQL Editor
- [x] Configurar variáveis de ambiente (.env.local)
- [x] Testar ativação de módulos via admin
- [x] Eliminar `alert()` e `window.confirm()` nativos
- [x] Eliminar `console.log()` desnecessários
- [x] Remover dados mock/fictícios do frontend
- [x] Limpar arquivos temporários do projeto
- [x] Atualizar documentação
- [x] Remover credenciais da documentação
- [x] Testar build do frontend (`npm run build`)
- [ ] Validar trigger de estoque (testar em Supabase)
- [ ] Validar trigger de comissão (testar em Supabase)
- [ ] Validar RLS (testar com usuários de empresas diferentes)
- [ ] Backup do banco antes de ir para produção

---

## 12. CONTATO E SUPORTE

Para dúvidas ou problemas:
1. Consultar esta documentação
2. Revisar arquivos SQL comentados
3. Verificar logs do Supabase
4. Revisar console do browser para erros de frontend

---

**Última atualização:** 10/04/2026 (Fix Deploy 404)  
**Versão do documento:** 1.3  
**Status:** Produção Operacional (Landing Page Ativa)

---

## 13. REGISTRO DE VERIFICAÇÃO DE DEPLOY (NOVO)

### 13.1 Resolução do Erro 404 em Produção (10/04/2026)
- **Problema:** A rota raiz (/) estava retornando 404 no Netlify devido à estrutura de monorepo.
- **Causa:** O Netlify não estava ativando o Next.js Runtime corretamente para a subpasta `apps/web`.
- **Solução:**
  - Criação de `netlify.toml` na raiz apontando `base = "apps/web"`.
  - Configuração de build e diretório de publicação (`.next`) dentro de `apps/web/netlify.toml`.
- **Resultado:** Landing Page premium totalmente funcional na raiz do domínio principal.
- **Commits:** Sincronizados com `origin/main`.

