# VISTORIAS - Vistoria Profunda do Sistema

**Última atualização:** 18/04/2026  
**Versão:** 1.3  
**Status:** Revisado

---

## VISTORIA 4: Módulo Obras - Gestão Avançada (18/04/2026)

### Escopo Analisado
- Expansão integral do módulo de Obras
- Implementação de sub-módulos: Etapas, Financeiro, Recursos e Documentos
- Criação de RPCs especializadas para cada sub-módulo
- Interface de usuário com abas dinâmicas e painel lateral de detalhes

### Alterações Realizadas
**Banco de dados (schemas tenant):**
- Criadas tabelas: `obras_etapas`, `obras_custos`, `obras_recursos`.
- Implementada lógica de cálculo de progresso físico e financeiro (previsto vs real).
- Criadas RPCs: `tenant_obras_etapas`, `tenant_obras_financeiro`, `tenant_obras_recursos`.
- Adicionado sistema de upload/gestão de documentos vinculados a obras.

**Frontend:**
- Atualizada `apps/web/src/app/tenant/obras/page.tsx` com novo Layout de Detalhes.
- Criados hooks customizados: `use-obras-etapas.ts`, `use-obras-custos.ts`, `use-obras-recursos.ts`, `use-obras-documentos.ts`.
- Desenvolvidos componentes: `EtapasTimeline`, `FinanceiroDashboard`, `RecursosTabela`, `DocumentosGaleria`.

**Documentação:**
- Atualizado `SESSION_STATE.md` com o status final da implementação de Obras.
- Criados scripts SQL de suporte: `APLICAR_ETAPAS_OBRAS.sql`, `APLICAR_CUSTOS_OBRAS.sql`, etc.

### Pontos Fortes
- **Visibilidade proativa:** Painel lateral permite navegação rápida sem perder o contexto da lista.
- **Controle financeiro granular:** Diferenciação clara entre custos previstos e realizados.
- **Cronograma visual:** Timeline de etapas com indicadores de status e datas.
- **Modularização:** Lógica de cada sub-aba isolada em hooks e componentes específicos.

### Riscos Técnicos
- **Volume de dados:** Documentos (anexos) podem ocupar espaço excessivo se não houver compressão ou limite de upload (atualmente depende do Supabase Storage).

### Observações
- Módulo Obras transformado em uma ferramenta de gestão completa, deixando de ser apenas um registro de status.
- Integração nativa com o estoque para futura baixa automática de recursos (preparado).

---

## REGRAS OBRIGATÓRIAS

Toda vez que este documento for lido, editado ou consultado, ele deve ser automaticamente atualizado, versionado ou registrado como revisado.

---

## VISTORIA 3: Módulo Produtos/Estoque - Gestão de Kits/Bundles (18/04/2026)

### Escopo Analisado
- Implementação do sistema de kits/bundles
- Criação de tabelas kits e kit_itens
- Criação de 4 RPCs para gestão de kits
- Integração frontend com hooks e componentes

### Alterações Realizadas
**Banco de dados (schemas tenant):**
- Criada tabela `kits` com colunas: id, produto_id, nome, descricao, ativo, criado_em, atualizado_em
- Criados 2 índices: idx_kits_produto, idx_kits_ativo
- Criada tabela `kit_itens` com colunas: id, kit_id, produto_id, quantidade, criado_em
- Criados 2 índices: idx_kit_itens_kit, idx_kit_itens_produto
- Criado trigger trg_atualizar_kits para atualizar atualizado_em
- Criadas 4 RPCs: tenant_criar_kit, tenant_listar_kits, tenant_excluir_kit, tenant_vender_kit

**Frontend:**
- Adicionadas interfaces Kit, KitItem, KitCreate em `apps/web/src/lib/api.ts`
- Adicionadas 4 funções API: criarKit(), fetchKits(), excluirKit(), venderKit()
- Criado hook `apps/web/src/lib/hooks/use-kits.ts`
- Criado componente `apps/web/src/components/modules/estoque/KitsManager.tsx`
- Integrado componente na página `apps/web/src/app/tenant/estoque/page.tsx`

**Documentação:**
- Atualizado `SESSION_STATE_PRODUTOS_ESTOQUE.md` com estado atual da Sessão 2
- Criados scripts SQL: APLICAR_KITS.sql, RPCS_KITS_TENANT_*.sql

### Pontos Fortes
- **Idempotência implementada:** RPCs de escrita usam idempotency_key
- **Audit log:** Registro de todas as operações de kits
- **Verificação de estoque:** tenant_vender_kit verifica estoque antes de baixar
- **Soft delete:** tenant_excluir_kit usa soft delete (ativo = false) para preservar histórico
- **Componente UI intuitivo:** Permite criar kits com múltiplos itens dinamicamente
- **Consistência de padrões:** Segue padrões RPC do sistema (JSONB, Security DEFINER, search_path)

### Riscos Técnicos
- **Nenhum identificado:** Implementação segue padrões estabelecidos do sistema

### Observações
- Aplicado em 4 schemas tenant: tenant_3ad04037, tenant_62a495e1, tenant_71148b59, tenant_84e7a845
- Sistema pronto para uso: kits podem ser criados, listados, excluídos e vendidos
- Venda de kit baixa automaticamente o estoque de todos os componentes

---

## VISTORIA 2: Módulo Produtos/Estoque - Alertas de Estoque Mínimo (18/04/2026)

### Escopo Analisado
- Implementação do sistema de alertas de estoque mínimo
- Resolução de inconsistências de preço e categoria
- Criação de tabela `alertas_estoque` e RPCs associadas
- Integração frontend com hooks e componentes

### Alterações Realizadas
**Banco de dados (schemas tenant):**
- Adicionadas colunas `categoria VARCHAR(100)` e `custo_unitario NUMERIC(10,2)` à tabela `produtos`
- Criado índice `idx_produtos_categoria`
- Criada tabela `alertas_estoque` com colunas: id, produto_id, tipo_alerta, estoque_atual, estoque_minimo, mensagem, status, criado_em, resolvido_em
- Criados 3 índices: idx_alertas_estoque_produto, idx_alertas_estoque_status, idx_alertas_estoque_criado_em
- Criadas 3 RPCs: tenant_verificar_alertas_estoque, tenant_listar_alertas_estoque, tenant_resolver_alerta_estoque

**Frontend:**
- Adicionada interface `AlertaEstoque` em `apps/web/src/lib/api.ts`
- Adicionadas 3 funções API: verificarAlertasEstoque(), fetchAlertasEstoque(), resolverAlertaEstoque()
- Criado hook `apps/web/src/lib/hooks/use-alertas-estoque.ts`
- Criado componente `apps/web/src/components/modules/estoque/AlertasEstoquePanel.tsx`
- Integrado componente na página `apps/web/src/app/tenant/estoque/page.tsx`

**Documentação:**
- Atualizado `SESSION_STATE_PRODUTOS_ESTOQUE.md` com estado atual da Sessão 1
- Criados scripts SQL: APLICAR_ALERTAS_ESTOQUE.sql, RPCS_TENANT_*.sql

### Pontos Fortes
- **Idempotência implementada:** RPC tenant_resolver_alerta_estoque usa idempotency_key
- **Audit log:** Registro de todas as operações de resolução de alertas
- **Idempotência nativa:** tenant_verificar_alertas_estoque evita alertas duplicados nas últimas 24 horas
- **Componente UI intuitivo:** Alertas pendentes exibidos com ações de visualizar e resolver
- **Consistência de padrões:** Segue padrões RPC do sistema (JSONB, Security DEFINER, search_path)

### Riscos Técnicos
- **Nenhum identificado:** Implementação segue padrões estabelecidos do sistema

### Observações
- Aplicado em 4 schemas tenant: tenant_3ad04037, tenant_62a495e1, tenant_71148b59, tenant_84e7a845
- Inconsistências de preço e categoria resolvidas (categoria e custo_unitario adicionados)
- Sistema pronto para uso: alertas são criados automaticamente quando estoque <= mínimo

---

## VISTORIA 1: Estrutura do Frontend e Organização

### Escopo Analisado
- Estrutura de pastas e organização do projeto
- Tecnologias utilizadas (frameworks, libs, padrões)
- Sintaxe predominante
- Componentização e reutilização
- Fluxo de telas e estados
- Comunicação com a camada RPC
- O que cada módulo entrega para o cliente final
- Regras de negócio aplicadas na interface

### Pontos Forttes
- **Arquitetura modular clara:** Separação bem definida entre `app/`, `components/`, `lib/`, `utils/`
- **Next.js 16.2.2 com App Router:** Uso moderno do framework com rotas baseadas em sistema de arquivos
- **TypeScript estrito:** Tipagem forte em todo o código-fonte
- **React 19.2.4:** Versão mais recente do React
- **Componentização consistente:** Uso de componentes reutilizáveis em `components/modules/base/`
- **Hooks personalizados:** Camada de abstração para chamadas RPC via `@tanstack/react-query`
- **TailwindCSS 4:** Estilização moderna e consistente
- **shadcn/ui:** Componentes UI pré-construídos e estilizados
- **Multi-tenant ready:** Estrutura preparada para múltiplos tenants
- **Modularização por feature:** Cada módulo (CRM, Vendas, OS, Obras, etc.) isolado

### Riscos Técnicos
- **Dependência de Edge Functions:** Sistema de e-mail depende de Supabase Edge Functions que não estão deployadas via CLI
- **Limitações corporativas:** Máquina sem Node.js/npm instalados impede deploy local
- **Falta de validação de e-mail:** E-mail de boas-vindas enviado sem validação prévia
- **Calendário não testado:** Componente Calendar integrado mas não testado em produção
- **Calculadora flutuante:** Componente global pode interferir com UX em determinados cenários
- **Global Search:** Implementado mas pode ter impacto de performance em grandes bases

### Dívidas Técnicas Identificadas
- **Falta de testes:** Não há testes unitários, integração ou E2E
- **Falta de documentação de componentes:** Componentes base não têm documentação inline
- **Hardcoding de strings:** Algumas strings de UI não estão centralizadas
- **Falta de i18n:** Sistema não preparado para internacionalização
- **Falta de error boundaries:** Não há tratamento de erros em nível de componente
- **Falta de loading states consistentes:** Alguns módulos não têm loading states adequados
- **Falta de otimização de imagens:** Ícones e imagens não otimizados
- **Falta de analytics:** Não há rastreamento de uso do sistema

### Compreensão Funcional
**Frontend é uma SPA multi-tenant construída com Next.js 16, React 19 e TypeScript.**

**Estrutura:**
- `app/`: Rotas Next.js com App Router
  - `auth/`: Rotas de autenticação
  - `admin/`: Dashboard administrativo (usuários master)
  - `mestre/`: Onboarding de tenants
  - `tenant/`: Dashboard do tenant (usuários regulares)
    - Módulos: catalogo, crm, vendas, os, obras, financeiro, rh, estoque, comissoes, relatorios, configuracoes
- `components/`: Componentes React
  - `layout/`: Layouts globais (TenantLayout, Header, Sidebar)
  - `modules/base/`: Componentes reutilizáveis (KPICard, StatusBadge, Calculator, Calendar, GlobalSearch, ActionCard)
  - `ui/`: Componentes shadcn/ui (Modal, Table, Toast, ConfirmModal)
- `lib/`: Lógica compartilhada
  - `api.ts`: Interfaces TypeScript (Venda, Cliente, Produto, OrdemServico, Obra, etc.)
  - `hooks/`: Hooks React Query para chamadas RPC
  - `utils/`: Utilitários (export, formatação)
- `utils/`: Utilitários do Supabase (client, server)

**Fluxo de dados:**
1. Usuário acessa rota
2. Middleware valida autenticação e configura schema tenant
3. Componente carrega dados via hooks personalizados (ex: useClientes)
4. Hook usa React Query para chamar função RPC do Supabase
5. RPC roteia para schema correto do tenant
6. Dados retornam ao componente para renderização

**Módulos funcionais:**
- **Dashboard:** KPIs, gráficos, últimas vendas
- **CRM:** Gestão de clientes, funil de vendas
- **Vendas:** PDV, gestão de vendas, relatórios
- **OS:** Ordens de serviço, status, calendário
- **Obras:** Projetos, status, calendário
- **Financeiro:** Transações, fluxo de caixa
- **RH:** Funcionários, gestão de equipe
- **Estoque:** Produtos, controle de estoque
- **Comissões:** Cálculo de comissões
- **Relatórios:** Relatórios customizados

### Observações Críticas
- Sistema não tem validação de e-mail no cadastro de clientes
- E-mail de boas-vindas é enviado mesmo se e-mail for inválido
- Edge Function de e-mail precisa ser deployada via dashboard (CLI não disponível)
- API key do Resend configurada mas e-mail remetente padrão é `onboarding@resend.dev`
- Calendário integrado em OS e Obras mas não testado em produção
- Sistema usa service_role para operações administrativas (risco se vazado)
- Middleware faz schema routing dinâmico baseado em perfil do usuário

---

## VISTORIA 2: Camada RPC e Backend

### Escopo Analisado
- Estrutura das rotas/procedures
- Contratos de entrada e saída (schemas, validações)
- Lógica de negócio
- Autenticação, autorização e segurança
- Integrações internas e externas
- Como cada operação impacta o sistema

### Pontos Fortes
- **Padrão consistente de RPCs:** Funções nomeadas com prefixo `tenant_*`
- **Schema routing dinâmico:** RPCs no schema `public` roteiam para schema correto do tenant
- **Security DEFINER:** RPCs executam com privilégios elevados de forma segura
- **Retorno JSONB padronizado:** Todas as RPCs retornam JSONB para consistência
- **Tratamento de exceções:** Blocos EXCEPTION WHEN OTHERS em todas as RPCs
- **Separação de responsabilidades:** RPCs de criação, atualização, exclusão e listagem separadas
- **Idempotency keys:** Suporte a chaves de idempotência para evitar duplicações
- **Validação de tenant:** Verificação de schema antes de executar operações

### Riscos Técnicos
- **SQL Injection potencial:** Uso de `EXECUTE format()` sem sanitização completa
- **Falta de validação de entrada:** RPCs não validam tipos e formatos de dados
- **Falta de logs:** Não há logs de auditoria em RPCs
- **Falta de transações:** Operações complexas não estão em transações
- **Falta de rate limiting:** RPCs não têm limitação de taxa
- **Falta de versionamento:** RPCs não têm controle de versão
- **Dependência de service_role:** Algumas operações exigem service_role

### Dívidas Técnicas Identificadas
- **Falta de documentação de RPCs:** Não há documentação inline nas funções
- **Falta de testes de RPCs:** Não há testes automatizados para RPCs
- **Falta de validação de schema:** Não há validação de schema antes de execução
- **Falta de rollback:** Operações falhas não têm rollback automático
- **Falta de cache:** RPCs não têm cache de resultados
- **Falta de paginação:** Listagens não têm paginação implementada
- **Falta de ordenação:** Listagens não têm ordenação flexível
- **Falta de filtros avançados:** Listagens não têm filtros complexos

### Compreensão Funcional
**Camada RPC é a ponte entre frontend e banco de dados, implementando lógica de negócio e controle de acesso multi-tenant.**

**Arquitetura:**
- **Schema `public`:** Contém RPCs de roteamento que chamam RPCs nos schemas de tenants
- **Schema `tenant_*`:** Cada tenant tem seu próprio schema com tabelas e RPCs específicas
- **Pattern de roteamento:** RPCs no `public` obtêm schema do usuário e executam RPC correspondente no schema correto

**Fluxo de RPC:**
1. Frontend chama RPC no schema `public` (ex: `public.tenant_criar_cliente`)
2. RPC obtém schema do tenant via `user_profiles` e `empresas`
3. RPC executa RPC correspondente no schema do tenant (ex: `tenant_62a495e1.tenant_criar_cliente`)
4. RPC do tenant executa operação no banco
5. Resultado retorna como JSONB

**Tipos de RPCs:**
- **Criação:** `tenant_criar_*` (cliente, produto, venda, etc.)
- **Leitura:** `tenant_listar_*` (clientes, produtos, vendas, etc.)
- **Atualização:** `tenant_atualizar_*` (cliente, produto, etc.)
- **Exclusão:** `tenant_excluir_*` (cliente, produto, etc.)

**Contratos de entrada/saída:**
- **Entrada:** Parâmetros tipados (ex: `p_nome VARCHAR(255)`)
- **Saída:** JSONB com dados ou erro
- **Padrão de erro:** `jsonb_build_object('error', 'mensagem')`

### Observações Críticas
- RPCs usam `EXECUTE format()` que pode ser vulnerável se não sanitizado corretamente
- Não há validação de entrada nas RPCs - confiam no frontend
- Schema routing depende de `user_profiles` e `empresas` estarem corretos
- RPCs não têm logs de auditoria - impossível rastrear operações
- Operações complexas não estão em transações - risco de inconsistência
- Falta de rate limiting pode permitir abuso
- Service_role usado em algumas operações - risco se vazado

---

## VISTORIA 3: Banco de Dados e Modelagem

### Escopo Analisado
- Modelagem (tabelas, colunas, tipos)
- Relacionamentos
- Regras implícitas e explícitas
- Fluxo de leitura e escrita
- Convenções utilizadas
- Papel de cada tabela para o negócio

### Pontos Fortes
- **Multi-tenant por schema:** Cada tenant tem seu próprio schema isolado
- **Consistência de nomes:** Tabelas nomeadas de forma consistente
- **Timestamps automáticos:** Colunas `criado_em` e `atualizado_em` em todas as tabelas
- **Foreign keys:** Relacionamentos bem definidos com FKs
- **Índices apropriados:** Índices em colunas frequentemente consultadas
- **RLS implementado:** Row Level Security para isolamento de dados
- **Views materializadas:** Uso de views para performance
- **Triggers:** Triggers para atualização automática de timestamps

### Riscos Técnicos
- **Falta de constraints:** Não há CHECK constraints para validação de dados
- **Falta de unique constraints:** Alguns campos únicos não têm constraint
- **Falta de índices compostos:** Consultas multi-coluna podem ser lentas
- **Falta de particionamento:** Tabelas grandes não estão particionadas
- **Falta de backup automático:** Não há backup automatizado configurado
- **Falta de monitoramento:** Não há monitoramento de performance do banco
- **Falta de otimização de queries:** Queries não analisadas para performance

### Dívidas Técnicas Identificadas
- **Falta de documentação de schema:** Não há documentação das tabelas
- **Falta de diagrama ER:** Não há diagrama entidade-relacionamento
- **Falta de migrações versionadas:** Alterações não estão versionadas
- **Falta de seed data:** Não há dados de teste consistentes
- **Falta de data retention:** Não há política de retenção de dados
- **Falta de archiving:** Dados antigos não são arquivados
- **Falta de soft delete:** Exclusões são permanentes
- **Falta de audit trail:** Não há histórico de alterações

### Compreensão Funcional
**Banco de dados é PostgreSQL com arquitetura multi-tenant baseada em schemas.**

**Estrutura:**
- **Schema `public`:** Tabelas globais (empresas, user_profiles, auth)
- **Schemas `tenant_*`:** Cada tenant tem seu schema isolado
- **Tabelas por tenant:** clientes, produtos, vendas, ordens_servico, obras, funcionarios, transacoes_financeiras, estoque, comissoes

**Principais tabelas (por tenant):**
- `clientes`: Informações de clientes
- `produtos`: Catálogo de produtos
- `vendas`: Registro de vendas
- `ordens_servico`: Ordens de serviço
- `obras`: Projetos/obras
- `funcionarios**: Colaboradores
- `transacoes_financeiras`: Movimentação financeira
- `estoque`: Controle de estoque
- `comissoes`: Regras e cálculos de comissões

**Relacionamentos:**
- `vendas.cliente_id` → `clientes.id`
- `ordens_servico.cliente_id` → `clientes.id`
- `ordens_servico.colaborador_id` → `funcionarios.id`
- `obras.cliente_id` → `clientes.id`
- `transacoes_financeiras.venda_id` → `vendas.id`

**Fluxo de leitura/escrita:**
1. Frontend chama RPC
2. RPC roteia para schema correto
3. Operação SQL executa no schema do tenant
4. RLS garante isolamento de dados
5. Resultado retorna como JSONB

### Observações Críticas
- Cada tenant tem schema isolado - bom para segurança mas complexo para migrações
- Não há CHECK constraints - dados podem ficar inconsistentes
- Exclusões são permanentes - não há soft delete
- Não há audit trail - impossível rastrear quem alterou o quê
- Não há data retention - dados antigos acumulam indefinidamente
- Views materializadas podem ficar desatualizadas se não refresh programado

---

## VISTORIA 4: Segurança e Autenticação

### Escopo Analisado
- Autenticação e autorização
- Controle de acesso (RBAC)
- Isolamento multi-tenant
- Proteção de rotas
- Gerenciamento de sessões
- Segurança de dados

### Pontos Fortes
- **Supabase Auth:** Autenticação gerenciada pelo Supabase
- **Middleware Next.js:** Validação de autenticação em todas as rotas
- **Schema routing dinâmico:** Isolamento de dados por schema de tenant
- **RLS implementado:** Row Level Security para isolamento de dados
- **Role-based access:** Roles (master, admin, user) para controle de acesso
- **Feature flags:** Controle de acesso a módulos por empresa
- **Security DEFINER:** RPCs executam com privilégios elevados de forma segura
- **Service role isolado:** Service role usado apenas em operações administrativas

### Riscos Técnicos
- **Falta de 2FA:** Não há autenticação de dois fatores
- **Falta de session timeout:** Sessões não expiram automaticamente
- **Falta de IP whitelist:** Não há restrição por IP
- **Falta de rate limiting:** Não há limitação de tentativas de login
- **Falta de password policies:** Não há políticas de senha
- **Falta de audit logging:** Não há logs de auditoria
- **Service role em frontend:** Service role pode estar exposto em logs
- **Falta de CSRF protection:** Não há proteção CSRF explícita

### Dívidas Técnicas Identificadas
- **Falta de MFA:** Não há autenticação multifator
- **Falta de password rotation:** Senhas não expiram
- **Falta de account lockout:** Contas não são bloqueadas após falhas
- **Falta de consent management:** Não há gestão de consentimento
- **Falta de data encryption:** Dados sensíveis não criptografados em repouso
- **Falta de key rotation:** Chaves não são rotacionadas periodicamente
- **Falta de security headers:** Headers de segurança não configurados
- **Falta de CSP:** Content Security Policy não implementado

### Compreensão Funcional
**Segurança é baseada em Supabase Auth + RLS + Middleware Next.js para controle de acesso multi-tenant.**

**Arquitetura de autenticação:**
- **Supabase Auth:** Gerencia autenticação (login, logout, sessões)
- **Middleware Next.js:** Valida autenticação em cada requisição
- **User profiles:** Perfil do usuário com role e empresa_id
- **Schema routing:** Configura search_path baseado no tenant do usuário
- **RLS:** Row Level Security isola dados por tenant

**Fluxo de autenticação:**
1. Usuário faz login via Supabase Auth
2. Middleware valida token JWT
3. Middleware obtém perfil do usuário
4. Middleware configura schema do tenant
5. Middleware valida acesso à rota
6. Requisição prossegue com contexto correto

**Roles e permissões:**
- **master:** Acesso total a /admin, pode criar tenants
- **admin:** Acesso administrativo do tenant
- **user:** Acesso restrito aos módulos habilitados da empresa

**Feature flags:**
- Cada empresa tem módulos habilitados/desabilitados
- Middleware verifica se módulo está ativo antes de permitir acesso
- Usuários redirecionados para `/sem-modulos` se módulo não habilitado

### Observações Críticas
- Não há 2FA - vulnerável a ataques de força bruta
- Não há rate limiting - vulnerável a ataques de DoS
- Não há audit logging - impossível investigar incidentes
- Service role pode estar exposto em logs ou console
- Sessões não expiram - risco se dispositivo for comprometido
- Não há password policies - usuários podem criar senhas fracas
- RLS depende de schema routing correto - falha pode expor dados cross-tenant

---

## RESUMO GERAL

### Estado Atual do Sistema
**Sistema multi-tenant SaaS ERP com 15 módulos funcionais, construído com Next.js 16, React 19, TypeScript, Supabase e PostgreSQL.**

### Pontos Fortes Gerais
- Arquitetura moderna e bem estruturada
- Multi-tenant isolado por schema
- Componentização consistente
- Hooks personalizados para chamadas RPC
- RLS implementado para isolamento de dados
- Schema routing dinâmico
- Feature flags por empresa
- RPCs padronizadas com retorno JSONB

### Riscos Críticos
- Falta de testes (unitários, integração, E2E)
- Falta de validação de entrada nas RPCs
- Falta de 2FA e rate limiting
- Falta de audit logging
- Service role potencialmente exposto
- Falta de backup automático
- Falta de monitoramento
- Falta de documentação técnica

### Dívidas Técnicas Prioritárias
1. Implementar testes automatizados
2. Adicionar validação de entrada nas RPCs
3. Implementar 2FA e rate limiting
4. Adicionar audit logging
5. Implementar backup automático
6. Adicionar monitoramento
7. Criar documentação técnica completa
8. Implementar soft delete

### Próximos Passos Recomendados
1. **Curto prazo (baixo risco):** Adicionar validação de e-mail, implementar soft delete, criar documentação
2. **Médio prazo (médio risco):** Implementar testes, adicionar audit logging, configurar backup
3. **Longo prazo (alto risco):** Implementar 2FA, refatorar RPCs com validação, adicionar monitoramento

---

**Fim da Vistoria Profunda**
