# LEITURA 1 — COMPREENSÃO GERAL

**Data:** 15/04/2026
**Documentos analisados:** DOCUMENTACAO_TECNICA.md, VISTORIAS.md
**Objetivo:** Entender arquitetura geral, módulos existentes, fluxo principal de dados, principais dependências

---

## RESUMO ESTRUTURAL COMPLETO DO SISTEMA

### Arquitetura Geral (OPÇÃO A - IMPLEMENTADA)

**Backend:** Supabase (PostgreSQL + RPC) - FONTE DA VERDADE
**Frontend:** Next.js 16.2.2 (apps/web) - UI E ORQUESTRADOR
**Database:** Supabase PostgreSQL com multi-tenancy por schema
**Backend Python:** NÃO EXISTE - deve ser ignorado
**Provisionamento:** RPC Functions via Supabase
**Tecnologias Frontend:** React 19.2.4, TypeScript 5, TailwindCSS 4, @tanstack/react-query 5.96.2

### Status Atual
✅ **O sistema está PRODUCTION-READY** após correções implementadas nas Auditorias 5-8:
- Escalabilidade: LIMIT padrão (1000), índices adequados, SELECT explícito
- Robustez: Idempotência em RPCs de escrita, exceções contextuais
- Segurança: Isolamento por schema routing documentado, RBAC intra-tenant
- Governança: Versionamento de schema, função de upgrade, auditoria

### Estratégia Multi-Tenant (OPÇÃO A - IMPLEMENTADA)
- **Isolamento:** Um schema PostgreSQL por tenant (ex: `tenant_empresa_xyz`)
- **Schema Routing:** RPC `set_tenant_schema()` configura `search_path` baseado em `user_profiles`
- **Middleware:** Injeta schema via RPC em cada request, valida role e feature flags
- **RLS:** Policies permissivas (`USING (true)`) pois isolamento é por schema routing
- **RBAC:** Tabela `role_permissions` com roles `tenant_admin` e `tenant_user` padrão

---

## MÓDULOS EXISTENTES

### Schema Public (Governança Global)
1. **empresas** - Empresas/tenants
2. **modulos_catalogo** - Catálogo de módulos disponíveis
3. **empresa_modulos** - Módulos ativos por empresa
4. **user_profiles** - Perfis de usuários
5. **logs_provisionamento** - Logs de provisionamento
6. **v_empresa_modulos** - View para módulos ativos por empresa

### Schema Tenant (Por Empresa - 15 Tabelas)
1. **clientes** - Clientes/CRM
2. **produtos** - Produtos/Estoque
3. **estoque** - Movimentação de estoque
4. **vendas** - Vendas
5. **vendas_itens** - Itens de venda
6. **financeiro** - Transações financeiras
7. **funcionarios** - Funcionários/RH
8. **ordens_servico** - Ordens de Serviço (OS)
9. **ordens_servico_historico** - Histórico de OS
10. **obras** - Obras/Projetos
11. **configuracoes** - Configurações do tenant
12. **role_permissions** - Permissões por role (RBAC intra-tenant)
13. **schema_migrations** - Versionamento de schema
14. **idempotency_control** - Controle de idempotência
15. **audit_log** - Log de auditoria de operações de negócio

### Módulos Funcionais do Frontend
- **Dashboard:** Visão geral do negócio (KPIs, gráficos)
- **CRM (Clientes):** Gestão de clientes e funil de vendas
- **Vendas:** Gestão de vendas e PDV
- **Catálogo (Produtos):** Gestão de catálogo de produtos
- **Estoque:** Controle de estoque
- **OS (Ordens de Serviço):** Gestão de ordens de serviço
- **Obras:** Gestão de projetos/obras
- **Financeiro:** Gestão financeira
- **RH:** Gestão de funcionários
- **Comissões:** Cálculo de comissões
- **Relatórios:** Relatórios customizados
- **Configurações:** Configurações do tenant

---

## FLUXO PRINCIPAL DE DADOS

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

## PRINCIPAIS DEPENDÊNCIAS

### Dependências Externas
- **Supabase:** PostgreSQL, Auth, Storage, Edge Functions
- **Resend:** Envio de e-mails (API key configurada)
- **Netlify:** Hosting do frontend
- **Next.js 16.2.2:** Framework frontend
- **React 19.2.4:** Biblioteca UI
- **TypeScript 5:** Tipagem
- **TailwindCSS 4:** Estilização
- **@tanstack/react-query 5.96.2:** Cache e gestão de requisições
- **shadcn/ui:** Componentes UI

### Dependências Internas
- **Schema routing:** Middleware → RPC set_tenant_schema → search_path
- **RLS:** Policies permissivas + isolamento por schema
- **RBAC:** Tabela role_permissions + validação por role
- **Idempotência:** Tabela idempotency_control + RPCs de escrita
- **Versionamento:** Tabela schema_migrations + RPC upgrade_all_tenants
- **Audit log:** Tabela audit_log + registro de operações

### Dependências Críticas
- **user_profiles:** Perfil do usuário (role, empresa_id) - CRÍTICO para schema routing
- **empresas:** Schema name do tenant - CRÍTICO para isolamento
- **v_empresa_modulos:** Feature flags - CRÍTICO para navegação
- **set_tenant_schema RPC:** Configura search_path - CRÍTICO para multi-tenancy
- **Middleware Next.js:** Valida autenticação e schema - CRÍTICO para segurança

---

## INTEGRAÇÕES

### Integrações Externas
- **Supabase Auth:** Autenticação de usuários
- **Supabase PostgreSQL:** Banco de dados
- **Supabase Edge Functions:** Envio de e-mails (Resend)
- **Resend API:** Envio de e-mails transacionais
- **Netlify:** Hosting e deployment

### Integrações Internas
- **Frontend → Supabase RPC:** Chamadas via supabase.rpc()
- **Middleware → set_tenant_schema:** Configuração de schema
- **RPCs tenant → RPCs public:** Roteamento de operações
- **Feature flags → Sidebar:** Filtragem de navegação
- **Audit log → Todas operações:** Rastreamento de ações

---

## PONTOS DE ENTRADA

### Frontend
- **Login:** /login
- **Admin:** /admin (usuários master)
- **Mestre:** /mestre (provisionamento de tenants)
- **Tenant:** /tenant/* (usuários regulares)
- **Setup:** /setup (configuração de env vars)

### Backend (RPCs)
- **Provisionamento:** provisionar_empresa(p_cnpj, p_razao_social, p_porte, p_segmento, p_modulos)
- **Schema routing:** set_tenant_schema(p_user_id)
- **Dashboard:** tenant_dashboard_kpis()
- **CRUD tenant:** tenant_criar_*, tenant_listar_*, tenant_excluir_*
- **Upgrade:** upgrade_all_tenants(p_target_version)

---

## ARQUITETURA DE COMPONENTES

### Frontend Structure
```
apps/web/src/
├── app/                    # Rotas Next.js (App Router)
│   ├── auth/              # Rotas de autenticação
│   ├── admin/             # Dashboard administrativo
│   ├── mestre/            # Onboarding de tenants
│   └── tenant/            # Dashboard do tenant (15 módulos)
├── components/            # Componentes React
│   ├── layout/           # Layouts globais
│   ├── modules/base/     # Componentes reutilizáveis
│   └── ui/               # Componentes shadcn/ui
├── lib/                  # Lógica compartilhada
│   ├── api.ts            # Interfaces TypeScript
│   ├── hooks/            # Hooks React Query
│   └── utils/            # Utilitários
└── utils/                # Utilitários do Supabase
    ├── client.ts         # Client browser
    └── server.ts         # Client SSR
```

### Backend Structure
```
PostgreSQL (Supabase)
├── Schema public (Global)
│   ├── empresas
│   ├── user_profiles
│   ├── modulos_catalogo
│   ├── empresa_modulos
│   ├── logs_provisionamento
│   └── RPCs de roteamento
└── Schema tenant_* (Por empresa)
    ├── clientes
    ├── produtos
    ├── vendas
    ├── financeiro
    ├── funcionarios
    ├── ordens_servico
    ├── obras
    ├── estoque
    ├── role_permissions
    ├── schema_migrations
    ├── idempotency_control
    ├── audit_log
    └── RPCs específicas do tenant
```

---

## RESUMO DA LEITURA 1

### Visão Geral
Sistema multi-tenant SaaS ERP com 15 módulos funcionais, construído com Next.js 16, React 19, TypeScript, Supabase e PostgreSQL. Arquitetura Opção A (Supabase como backend real e fonte da verdade) está completamente implementada com schema routing, idempotência, RLS documentado, RBAC intra-tenant, versionamento de schema e audit log.

### Fluxo Principal
Usuário → Login → Middleware (autenticação + schema routing) → Frontend (componentes + hooks) → RPCs Supabase (roteamento para schema tenant) → PostgreSQL (operações no schema correto) → Retorno JSONB → Frontend (renderização).

### Dependências Críticas
- user_profiles (role, empresa_id) - CRÍTICO para schema routing
- empresas (schema_name) - CRÍTICO para isolamento
- set_tenant_schema RPC - CRÍTICO para multi-tenancy
- Middleware Next.js - CRÍTICO para segurança

### Status
Sistema PRODUCTION-READY após correções implementadas nas Auditorias 5-8. Risco principal identificado: PDV acessa tabela produtos diretamente em vez de usar RPC (violação Opção A).
