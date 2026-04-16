# DOCUMENTO FINAL - ESTUDO COMPLETO DO SISTEMA

**Data:** 15/04/2026
**Documentos analisados:** DOCUMENTACAO_TECNICA.md, VISTORIAS.md
**Leituras realizadas:** 4 leituras completas (Compreensão Geral, Análise Técnica Profunda, Identificação de Riscos, Consolidação e Validação)
**Objetivo:** Garantir compreensão total do sistema, suas dependências e seus riscos, antes de qualquer modificação estrutural ou funcional

---

## 1. VISÃO GERAL COMPLETA DO SISTEMA

### Sistema
**Nome:** FLUXO ERP
**Tipo:** Sistema multi-tenant SaaS ERP
**Status:** PRODUCTION-READY (com violação crítica que deve ser corrigida antes de deploy)
**Versão:** 2.0
**Última atualização:** 15/04/2026

### Arquitetura Implementada (OPÇÃO A)
- **Backend:** Supabase (PostgreSQL + RPC) - FONTE DA VERDADE
- **Frontend:** Next.js 16.2.2 (apps/web) - UI E ORQUESTRADOR
- **Database:** Supabase PostgreSQL com multi-tenancy por schema
- **Backend Python:** NÃO EXISTE - deve ser ignorado
- **Provisionamento:** RPC Functions via Supabase
- **Tecnologias Frontend:** React 19.2.4, TypeScript 5, TailwindCSS 4, @tanstack/react-query 5.96.2

### Estratégia Multi-Tenant
- **Isolamento:** Um schema PostgreSQL por tenant (ex: `tenant_empresa_xyz`)
- **Schema Routing:** RPC `set_tenant_schema()` configura `search_path` baseado em `user_profiles`
- **Middleware:** Injeta schema via RPC em cada request, valida role e feature flags
- **RLS:** Policies permissivas (`USING (true)`) pois isolamento é por schema routing
- **RBAC:** Tabela `role_permissions` com roles `tenant_admin` e `tenant_user` padrão

### Características Implementadas
✅ Escalabilidade: LIMIT padrão (1000), índices adequados, SELECT explícito
✅ Robustez: Idempotência em RPCs de escrita, exceções contextuais
✅ Segurança: Isolamento por schema routing documentado, RBAC intra-tenant
✅ Governança: Versionamento de schema, função de upgrade, auditoria

---

## 2. ARQUITETURA FUNCIONAL CONSOLIDADA

### Camada de Apresentação (Frontend)
**Tecnologias:** Next.js 16.2.2, React 19.2.4, TypeScript 5, TailwindCSS 4
**Responsabilidade:** UI e orquestrador
**Estrutura:**
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

### Camada de Lógica (RPCs)
**Tecnologias:** PostgreSQL Functions (RPCs)
**Responsabilidade:** Lógica de negócio e controle de acesso multi-tenant
**Estrutura:**
- **Schema public:** RPCs de roteamento (tenant_listar_*, tenant_criar_*, etc.)
- **Schema tenant_*:** RPCs específicas do tenant
- **Padrão:** SECURITY DEFINER, retorno JSONB, tratamento de exceções

### Camada de Dados (Banco)
**Tecnologias:** PostgreSQL (Supabase)
**Responsabilidade:** Armazenamento e persistência de dados
**Estrutura:**
- **Schema public:** 6 tabelas (governança global)
- **Schema tenant_*:** 15 tabelas por empresa (negócio)
- **Isolamento:** Um schema por tenant

---

## 3. DEPENDÊNCIAS CRÍTICAS IDENTIFICADAS

### Dependências de Tabelas
1. **user_profiles** - CRÍTICO para schema routing (role, empresa_id)
   - Se corrompido ou ausente, schema routing falha
   - Impacto: Usuários não conseguem acessar seus dados, potencial acesso cross-tenant

2. **empresas** - CRÍTICO para isolamento (schema_name)
   - Se corrompido ou schema_name incorreto, isolamento falha
   - Impacto: Acesso cross-tenant, violação de isolamento, vazamento de dados

3. **v_empresa_modulos** - CRÍTICO para feature flags
   - Se inconsistente, navegação quebra
   - Impacto: Usuário pode ver link mas não ter acesso

4. **produtos** - CRÍTICO para PDV (violação identificada: acesso direto)
   - PDV acessa tabela diretamente em vez de usar RPC
   - Impacto: Bypass do schema routing, potencial acesso cross-tenant

### Dependências de RPCs
1. **set_tenant_schema** - CRÍTICO para multi-tenancy (configura search_path)
   - Se falhar ou retornar schema incorreto, isolamento falha
   - Impacto: Acesso cross-tenant, violação de isolamento

2. **provisionar_empresa** - CRÍTICO para criação de tenants
   - Se falhar, criação de novos tenants falha
   - Impacto: Impossível adicionar novos clientes

3. **tenant_processar_venda** - CRÍTICO para PDV (transação atômica)
   - Se falhar, PDV quebra e inconsistência de dados
   - Impacto: Vendas não processadas, estoque desatualizado

### Dependências de Middleware
1. **Middleware Next.js** - CRÍTICO para segurança (autenticação + schema routing)
   - Se falhar ou for bypassado, segurança é comprometida
   - Impacto: Acesso não autorizado, acesso cross-tenant

2. **Schema routing** - CRÍTICO para isolamento multi-tenant
   - Se falhar, isolamento de dados falha
   - Impacto: Acesso cross-tenant, vazamento de dados

3. **Feature flags** - CRÍTICO para navegação
   - Se inconsistente, navegação quebra
   - Impacto: Usuário pode ter acesso não autorizado

---

## 4. FLUXOS PRINCIPAIS DOCUMENTADOS

### Fluxo 1: Login e Schema Routing
**Entrada:** Usuário entra email/senha em login/page.tsx
**Processo:**
1. Supabase Auth autentica via signInWithPassword()
2. Frontend busca user_profiles.role
3. Redirect: master → /admin, tenant → /tenant/dashboard
4. Middleware intercepta request
5. Middleware busca user_profiles.role, empresa_id
6. Middleware chama set_tenant_schema(p_user_id)
7. search_path configurado para o schema do tenant
8. Feature flags validadas via v_empresa_modulos
9. Request prossegue com schema correto
**Saída:** Usuário autenticado com schema correto configurado
**Dependências:** user_profiles, empresas, set_tenant_schema RPC, Middleware Next.js
**Risco:** CRÍTICO - Se falhar, autenticação e isolamento falham

### Fluxo 2: Provisionamento de Tenant
**Entrada:** Wizard mestre/page.tsx coleta dados da empresa
**Processo:**
1. Gera schema_name baseado no CNPJ
2. Chama RPC provisionar_empresa_master()
3. RPC cria schema, tabelas, índices, RLS, policies
4. RPC insere dados seed (role_permissions, schema_migrations)
5. RPC ativa módulos em empresa_modulos
6. Log em logs_provisionamento
**Saída:** Tenant provisionado e pronto para uso
**Dependências:** provisionar_empresa RPC, empresas, user_profiles
**Risco:** CRÍTICO - Se falhar, criação de tenants falha

### Fluxo 3: Criação de Venda (PDV) - TRANSACIONAL
**Entrada:** Usuário finaliza pagamento no PDV
**Processo:**
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
**Saída:** Venda processada com sucesso
**Dependências:** tenant_processar_venda RPC, produtos, clientes, estoque
**Risco:** CRÍTICO - Se falhar, PDV quebra e inconsistência de dados

### Fluxo 4: Feature Flags e Navegação
**Entrada:** Sidebar carrega ao montar
**Processo:**
1. Obtém usuário autenticado
2. Busca profile com role e empresa_id
3. Busca nome da empresa
4. Busca módulos ativos em v_empresa_modulos
5. Filtra navegação baseado em módulos ativos
6. Renderiza apenas links de módulos ativos
**Saída:** Navegação renderizada apenas com módulos ativos
**Dependências:** v_empresa_modulos, modulos_catalogo, empresa_modulos
**Risco:** CRÍTICO - Se falhar, navegação quebra ou acesso não autorizado

### Fluxo 5: Dashboard
**Entrada:** Dashboard carrega
**Processo:**
1. Dashboard chama useDashboardData()
2. Hook chama RPC tenant_dashboard_kpis()
3. RPC calcula KPIs agregados no SQL
4. Hook chama RPC tenant_listar_vendas({ p_limit: 5 })
5. Frontend recebe dados e renderiza
**Saída:** Dashboard renderizado com KPIs e últimas vendas
**Dependências:** tenant_dashboard_kpis RPC, tenant_listar_vendas RPC
**Risco:** BAIXO - Se falhar, dashboard não carrega dados

---

## 5. PONTOS SENSÍVEIS MAPEADOS

### Pontos Sensíveis Críticos (8) - NÃO PODEM SER ALTERADOS SEM TESTES EXAUSTIVOS
1. **PDV acessa tabela produtos diretamente** (violação Opção A)
   - **Impacto:** ALTO - Bypass do schema routing, potencial acesso cross-tenant
   - **Ação:** CORRIGIR IMEDIATAMENTE antes de deploy em produção

2. **Falta de validação de entrada nas RPCs**
   - **Impacto:** ALTO - Inserção de dados inconsistentes, potencial injection
   - **Ação:** Adicionar validação em todas as RPCs de escrita

3. **SQL injection potencial via EXECUTE format()**
   - **Impacto:** ALTO - Acesso não autorizado, modificação/exclusão de dados
   - **Ação:** Implementar sanitização completa de parâmetros

4. **Falta de transações em operações complexas**
   - **Impacto:** ALTO - Inconsistência de dados, estado corrompido
   - **Ação:** Envolver todas as RPCs de escrita em transações

5. **Dependência crítica: user_profiles**
   - **Impacto:** ALTO - Schema routing falha
   - **Ação:** Implementar validação robusta, adicionar backup automático

6. **Dependência crítica: empresas**
   - **Impacto:** ALTO - Isolamento falha
   - **Ação:** Implementar validação de schema_name, adicionar constraints UNIQUE

7. **Dependência crítica: set_tenant_schema RPC**
   - **Impacto:** ALTO - Isolamento falha
   - **Ação:** Implementar validação de schema, adicionar logging de erros

8. **Dependência crítica: Middleware Next.js**
   - **Impacto:** ALTO - Segurança comprometida
   - **Ação:** Implementar validação robusta, adicionar logging, testar exaustivamente

### Pontos Sensíveis Altos (7) - DEVEM SER TESTADOS EM STAGING
9. **Falta de 2FA**
   - **Impacto:** ALTO - Vulnerável a ataques de força bruta
   - **Ação:** Implementar 2FA via Supabase Auth

10. **Falta de rate limiting**
    - **Impacto:** ALTO - Vulnerável a ataques de DoS
    - **Ação:** Implementar rate limiting via Edge Functions

11. **Falta de audit logging**
    - **Impacto:** ALTO - Impossível investigar incidentes
    - **Ação:** Implementar audit logging em todas as RPCs de escrita

12. **Falta de backup automático**
    - **Impacto:** ALTO - Perda de dados sem recuperação
    - **Ação:** Configurar backup automático via Supabase

13. **Falta de monitoramento**
    - **Impacto:** ALTO - Impossível detectar problemas proativamente
    - **Ação:** Implementar monitoramento via Supabase Logs

14. **Service role potencialmente exposto**
    - **Impacto:** ALTO - Acesso total ao banco se vazado
    - **Ação:** Remover service role do frontend

15. **Falta de session timeout**
    - **Impacto:** ALTO - Sessão permanece ativa indefinidamente
    - **Ação:** Configurar session timeout via Supabase Auth

### Pontos Sensíveis Médios (7) - PODEM SER IMPLEMENTADOS POST-DEPLOY
16. **ORDER BY criado_em sem índice**
    - **Impacto:** MÉDIO - Queries lentas com muitos registros
    - **Ação:** Adicionar índices em criado_em

17. **ORDER BY nome sem índice**
    - **Impacto:** MÉDIO - Queries lentas com muitos registros
    - **Ação:** Adicionar índices em nome

18. **Módulo "relatorios" inconsistente**
    - **Impacto:** MÉDIO - Inconsistência entre feature flags e navegação
    - **Ação:** Adicionar "relatorios" em modulos_catalogo ou remover da sidebar

19. **Falta de testes automatizados**
    - **Impacto:** MÉDIO - Regressões, bugs em produção
    - **Ação:** Implementar testes unitários, integração, E2E

20. **Falta de validação de e-mail**
    - **Impacto:** MÉDIO - E-mails inválidos cadastrados
    - **Ação:** Implementar validação de e-mail

21. **Edge Function de e-mail não deployada via CLI**
    - **Impacto:** MÉDIO - Deploy manual necessário
    - **Ação:** Implementar deploy automatizado

22. **Falta de soft delete**
    - **Impacto:** MÉDIO - Exclusões permanentes
    - **Ação:** Implementar soft delete

---

## 6. ÁREAS SEGURAS PARA INTERVENÇÃO FUTURA

### Áreas Seguras (Podem ser alteradas com baixo risco) - SEM NECESSIDADE DE TESTES EXAUSTIVOS
1. **UI/UX Frontend** - Componentes visuais, layouts, estilos
2. **Documentação** - Adicionar documentação inline, atualizar README
3. **Testes** - Adicionar testes unitários, integração, E2E
4. **Monitoramento** - Adicionar logging, métricas, alertas
5. **Backup** - Configurar backup automático
6. **Performance** - Adicionar índices, otimizar queries
7. **Validação** - Adicionar validação de e-mail, formatos
8. **Soft Delete** - Implementar soft delete
9. **Analytics** - Implementar rastreamento de uso
10. **I18n** - Implementar internacionalização

### Áreas de Risco Moderado (Devem ser testadas em staging) - TESTES RECOMENDADOS
1. **RPCs de Leitura** - tenant_listar_* (podem ser otimizadas)
2. **Hooks React Query** - Podem ser refatorados
3. **Componentes Base** - Podem ser melhorados
4. **Validação de Entrada** - Adicionar validação em RPCs de escrita
5. **Audit Logging** - Adicionar logging em RPCs de escrita
6. **Transações** - Envolver RPCs de escrita em transações

### Áreas de Alto Risco (Devem ser testadas exaustivamente em staging) - TESTES OBRIGATÓRIOS
1. **RPCs de Escrita** - tenant_criar_*, tenant_excluir_*
2. **RPCs de Roteamento** - RPCs no schema public
3. **Middleware Next.js** - Autenticação, schema routing
4. **Tabelas Críticas** - user_profiles, empresas
5. **Schema Routing** - set_tenant_schema RPC
6. **PDV** - tenant_processar_venda RPC

---

## 7. FLUXOS QUE NÃO PODEM SER ALTERADOS

### Fluxo 1: Login e Schema Routing
**Motivo:** CRÍTICO para funcionamento do sistema
**Dependências:** user_profiles, empresas, set_tenant_schema RPC, Middleware Next.js
**Risco:** Se alterado incorretamente, pode quebrar autenticação e isolamento multi-tenant
**Regra:** Qualquer alteração deve ser testada exaustivamente em ambiente de staging

### Fluxo 2: Provisionamento de Tenant
**Motivo:** CRÍTICO para criação de novos tenants
**Dependências:** provisionar_empresa RPC, empresas, user_profiles
**Risco:** Se alterado incorretamente, pode impedir criação de novos tenants
**Regra:** Qualquer alteração deve ser testada exaustivamente em ambiente de staging

### Fluxo 3: Criação de Venda (PDV)
**Motivo:** CRÍTICO para funcionamento do PDV
**Dependências:** tenant_processar_venda RPC, produtos, clientes, estoque
**Risco:** Se alterado incorretamente, pode quebrar PDV e causar inconsistência de dados
**Regra:** Qualquer alteração deve ser testada exaustivamente em ambiente de staging

### Fluxo 4: Feature Flags e Navegação
**Motivo:** CRÍTICO para navegação e controle de acesso
**Dependências:** v_empresa_modulos, modulos_catalogo, empresa_modulos
**Risco:** Se alterado incorretamente, pode quebrar navegação e permitir acesso não autorizado
**Regra:** Qualquer alteração deve ser testada exaustivamente em ambiente de staging

---

## 8. INCONSISTÊNCIAS E DEPENDÊNCIAS OCULTAS

### Inconsistências Identificadas
1. **Nome da tabela de funcionários vs coluna colaborador_id** (MINOR)
   - Tabela é "funcionarios" mas coluna em ordens_servico é "colaborador_id"
   - Impacto: BAIXO - Funcionalidade não é afetada
   - Recomendação: Padronizar nomenclatura

2. **Módulo "relatorios" inconsistente** (CONFIRMADA)
   - Módulo existe na sidebar mas não em modulos_catalogo
   - Impacto: MÉDIO - Usuário pode ver link mas não ter acesso
   - Recomendação: Adicionar "relatorios" em modulos_catalogo ou remover da sidebar

3. **Status do sistema** (PARCIALMENTE INCONSISTENTE)
   - Sistema descrito como PRODUCTION-READY mas com violação crítica
   - Impacto: ALTO - Violação crítica deve ser corrigida antes de deploy
   - Recomendação: Corrigir PDV para usar RPC antes de deploy

### Dependências Ocultas
1. **Trigger trigger_usuarios_atualização** (DESCONHECIDO)
   - Trigger identificado mas não documentado
   - Impacto: DESCONHECIDO
   - Recomendação: Documentar o trigger, entender seu funcionamento

2. **Resend API para E-mails** (remetente padrão incorreto)
   - API key configurada mas remetente padrão é "onboarding@resend.dev"
   - Impacto: MÉDIO - E-mails podem ser enviados com remetente incorreto
   - Recomendação: Configurar remetente correto em RESEND_FROM_EMAIL

3. **Supabase Edge Functions** (não deployadas via CLI)
   - Sistema depende de Edge Functions mas não estão deployadas via CLI
   - Impacto: MÉDIO - Deploy manual necessário
   - Recomendação: Implementar deploy automatizado

4. **Service Role em Frontend** (potencialmente exposto)
   - Service role usado em algumas operações
   - Impacto: ALTO - Se vazado, permite acesso total ao banco
   - Recomendação: Remover service role do frontend

---

## 9. RECOMENDAÇÕES FINAIS

### Imediato (Antes de Deploy em Produção)
1. **CORRIGIR PDV** - Substituir acesso direto à tabela produtos por RPC tenant_listar_estoque()
2. **VALIDAR SERVICE ROLE** - Remover service role do frontend se estiver exposto

### Curto Prazo (1-2 semanas)
1. Adicionar validação de entrada nas RPCs de escrita
2. Implementar sanitização completa em EXECUTE format()
3. Envolver todas as RPCs de escrita em transações
4. Adicionar validação de e-mail
5. Implementar testes unitários básicos

### Médio Prazo (1-2 meses)
1. Implementar 2FA via Supabase Auth
2. Implementar rate limiting via Edge Functions
3. Implementar audit logging em todas as RPCs de escrita
4. Configurar backup automático via Supabase
5. Implementar monitoramento via Supabase Logs
6. Adicionar índices em criado_em para tabelas de alta volumetria

### Longo Prazo (3-6 meses)
1. Implementar soft delete
2. Implementar testes de integração e E2E
3. Implementar i18n
4. Implementar analytics
5. Otimizar imagens e assets
6. Padronizar nomenclatura (funcionarios vs colaborador_id)

---

## 10. CONCLUSÃO

### Estado Atual
O sistema FLUXO ERP está bem documentado e compreendido. Arquitetura Opção A está completamente implementada com schema routing, idempotência, RLS documentado, RBAC intra-tenant, versionamento de schema e audit log. Sistema está PRODUCTION-READY mas com violação crítica (PDV acessa tabela produtos diretamente) que deve ser corrigida antes de deploy em produção.

### Compreensão Total
✅ Arquitetura geral compreendida
✅ Módulos existentes mapeados
✅ Fluxo principal de dados documentado
✅ Dependências principais identificadas
✅ Tabelas e relacionamentos mapeados
✅ Funções SQL e RPCs documentadas
✅ Triggers e policies identificadas
✅ Endpoints e integrações mapeados
✅ Pontos sensíveis identificados
✅ Dependências críticas classificadas
✅ Áreas seguras para intervenção definidas

### Próximos Passos
1. Corrigir PDV para usar RPC (IMEDIATO)
2. Validar service role (IMEDIATO)
3. Adicionar validação de entrada nas RPCs (CURTO PRAZO)
4. Implementar testes automatizados (CURTO PRAZO)
5. Configurar backup automático (MÉDIO PRAZO)
6. Implementar monitoramento (MÉDIO PRAZO)

---

**DOCUMENTOS TOTALMENTE ANALISADOS E COMPREENDIDOS.**
