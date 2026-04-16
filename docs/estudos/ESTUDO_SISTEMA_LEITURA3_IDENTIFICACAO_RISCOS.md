# LEITURA 3 — IDENTIFICAÇÃO DE RISCOS

**Data:** 15/04/2026
**Documentos analisados:** DOCUMENTACAO_TECNICA.md, VISTORIAS.md
**Objetivo:** Detectar pontos sensíveis do sistema, dependências críticas, áreas que podem quebrar facilmente, operações perigosas, fluxos que não podem ser alterados

---

## LISTA DE RISCOS ESTRUTURAIS

### RISCOS CRÍTICOS (IMPACTO: ALTO - CRITICIDADE: CRÍTICA)

#### 1. VIOLAÇÃO CRÍTICA EM PDV - Acesso Direto à Tabela Produtos
**Impacto:** ALTO
**Criticidade:** CRÍTICA
**Dependência:** Módulo Vendas (PDV)
**Localização:** apps/web/src/app/tenant/vendas/pdv/page.tsx
**Descrição:** PDV acessa tabela produtos diretamente via supabase.from('produtos') em vez de usar RPC tenant_listar_estoque()
**Problema:** Viola a arquitetura Opção A (Supabase como backend real via RPCs)
**Consequência:** Bypass do schema routing, potencial acesso cross-tenant, inconsistência de dados
**Fluxo afetado:** Fluxo 3 - Criação de Venda (PDV)
**Não pode ser alterado:** Este fluxo deve ser corrigido IMEDIATAMENTE antes de deploy em produção
**Recomendação:** Substituir acesso direto por RPC tenant_listar_estoque()

#### 2. FALTA DE VALIDAÇÃO DE ENTRADA NAS RPCs
**Impacto:** ALTO
**Criticidade:** CRÍTICA
**Dependência:** Todas as RPCs de escrita
**Localização:** apps/api/supabase_rpc.sql (todas as funções tenant_criar_*)
**Descrição:** RPCs não validam tipos e formatos de dados de entrada
**Problema:** Confiam no frontend para validação, vulnerável a dados corrompidos
**Consequência:** Inserção de dados inconsistentes, erros SQL, potencial injection
**Fluxos afetados:** Todos os fluxos de criação de dados
**Não pode ser alterado:** Validação deve ser adicionada nas RPCs antes de deploy em produção
**Recomendação:** Adicionar validação de tipos, formatos e constraints em todas as RPCs de escrita

#### 3. SQL INJECTION POTENCIAL VIA EXECUTE FORMAT()
**Impacto:** ALTO
**Criticidade:** CRÍTICA
**Dependência:** RPCs de roteamento no schema public
**Localização:** apps/api/supabase_rpc.sql (RPCs public que roteiam para schemas tenant)
**Descrição:** Uso de EXECUTE format() sem sanitização completa de parâmetros
**Problema:** Se parâmetros não forem sanitizados corretamente, pode permitir SQL injection
**Consequência:** Acesso não autorizado a dados, modificação de dados, exclusão de dados
**Fluxos afetados:** Todos os fluxos que usam schema routing
**Não pode ser alterado:** Sanitização deve ser implementada antes de qualquer modificação
**Recomendação:** Implementar sanitização completa de parâmetros em todos os EXECUTE format()

#### 4. FALTA DE TRANSAÇÕES EM OPERAÇÕES COMPLEXAS
**Impacto:** ALTO
**Criticidade:** CRÍTICA
**Dependência:** RPCs de escrita (exceto tenant_processar_venda)
**Localização:** apps/api/supabase_rpc.sql (RPCs tenant_criar_*, tenant_excluir_*)
**Descrição:** Operações complexas não estão em transações
**Problema:** Se uma operação falhar no meio, pode deixar dados inconsistentes
**Consequência:** Inconsistência de dados, referências órfãs, estado do banco corrompido
**Fluxos afetados:** Todos os fluxos de criação/exclusão de dados
**Não pode ser alterado:** Transações devem ser adicionadas antes de deploy em produção
**Recomendação:** Envolver todas as RPCs de escrita em transações com rollback em caso de erro

#### 5. DEPENDÊNCIA CRÍTICA: user_profiles
**Impacto:** ALTO
**Criticidade:** CRÍTICA
**Dependência:** Schema routing, autenticação, autorização
**Localização:** Tabela public.user_profiles
**Descrição:** Schema routing depende de user_profiles.role e user_profiles.empresa_id
**Problema:** Se user_profiles estiver corrompido ou ausente, schema routing falha
**Consequência:** Usuários não conseguem acessar seus dados, potencial acesso cross-tenant
**Fluxos afetados:** Fluxo 1 - Login e Schema Routing, Fluxo 4 - Feature Flags e Navegação
**Não pode ser alterado:** Esta tabela é CRÍTICA para o funcionamento do sistema
**Recomendação:** Implementar validação robusta de user_profiles, adicionar backup automático

#### 6. DEPENDÊNCIA CRÍTICA: empresas
**Impacto:** ALTO
**Criticidade:** CRÍTICA
**Dependência:** Schema routing, isolamento multi-tenant
**Localização:** Tabela public.empresas
**Descrição:** Schema routing depende de empresas.schema_name
**Problema:** Se empresas estiver corrompido ou schema_name estiver incorreto, isolamento falha
**Consequência:** Acesso cross-tenant, violação de isolamento, vazamento de dados
**Fluxos afetados:** Fluxo 1 - Login e Schema Routing, Fluxo 2 - Provisionamento de Tenant
**Não pode ser alterado:** Esta tabela é CRÍTICA para o funcionamento do sistema
**Recomendação:** Implementar validação de schema_name, adicionar constraints UNIQUE

#### 7. DEPENDÊNCIA CRÍTICA: set_tenant_schema RPC
**Impacto:** ALTO
**Criticidade:** CRÍTICA
**Dependência:** Multi-tenancy, isolamento de dados
**Localização:** RPC public.set_tenant_schema
**Descrição:** Configura search_path para o schema do tenant
**Problema:** Se esta RPC falhar ou retornar schema incorreto, isolamento falha
**Consequência:** Acesso cross-tenant, violação de isolamento, vazamento de dados
**Fluxos afetados:** Fluxo 1 - Login e Schema Routing
**Não pode ser alterado:** Esta RPC é CRÍTICA para o funcionamento do sistema
**Recomendação:** Implementar validação de schema, adicionar logging de erros

#### 8. DEPENDÊNCIA CRÍTICA: Middleware Next.js
**Impacto:** ALTO
**Criticidade:** CRÍTICA
**Dependência:** Autenticação, autorização, schema routing
**Localização:** apps/web/src/middleware.ts
**Descrição:** Valida autenticação e configura schema do tenant
**Problema:** Se middleware falhar ou for bypassado, segurança é comprometida
**Consequência:** Acesso não autorizado, acesso cross-tenant, violação de segurança
**Fluxos afetados:** Todos os fluxos do sistema
**Não pode ser alterado:** O middleware é CRÍTICO para a segurança do sistema
**Recomendação:** Implementar validação robusta, adicionar logging de erros, testar exaustivamente

---

### RISCOS ALTOS (IMPACTO: ALTO - CRITICIDADE: ALTA)

#### 9. FALTA DE 2FA (AUTENTICAÇÃO MULTIFATOR)
**Impacto:** ALTO
**Criticidade:** ALTA
**Dependência:** Autenticação Supabase
**Localização:** Configuração Supabase Auth
**Descrição:** Não há autenticação de dois fatores
**Problema:** Vulnerável a ataques de força bruta, phishing, comprometimento de credenciais
**Consequência:** Acesso não autorizado à conta do usuário, vazamento de dados
**Fluxos afetados:** Fluxo 1 - Login e Schema Routing
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar 2FA via Supabase Auth ou solução customizada

#### 10. FALTA DE RATE LIMITING
**Impacto:** ALTO
**Criticidade:** ALTA
**Dependência:** RPCs Supabase
**Localização:** Todas as RPCs
**Descrição:** RPCs não têm limitação de taxa
**Problema:** Vulnerável a ataques de DoS, abuso de API
**Consequência:** Sobrecarga do banco, degradação de performance, custo elevado
**Fluxos afetados:** Todos os fluxos do sistema
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar rate limiting via Supabase Edge Functions ou middleware

#### 11. FALTA DE AUDIT LOGGING
**Impacto:** ALTO
**Criticidade:** ALTA
**Dependência:** Compliances, debugging, investigação
**Localização:** Tabela tenant.audit_log (existe mas não é usada em todas as operações)
**Descrição:** Não há logs de auditoria em todas as operações
**Problema:** Impossível rastrear operações, investigar incidentes, garantir compliance
**Consequência:** Dificuldade de debugging, impossibilidade de investigação, não compliance
**Fluxos afetados:** Todos os fluxos do sistema
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar audit logging em todas as RPCs de escrita

#### 12. FALTA DE BACKUP AUTOMÁTICO
**Impacto:** ALTO
**Criticidade:** ALTA
**Dependência:** Recuperação de desastres
**Localização:** Configuração Supabase
**Descrição:** Não há backup automatizado configurado
**Problema:** Se houver perda de dados, não há recuperação automática
**Consequência:** Perda de dados, downtime, impacto no negócio
**Fluxos afetados:** Todos os fluxos do sistema
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Configurar backup automático via Supabase ou solução customizada

#### 13. FALTA DE MONITORAMENTO
**Impacto:** ALTO
**Criticidade:** ALTA
**Dependência:** Observabilidade, performance, disponibilidade
**Localização:** Infraestrutura
**Descrição:** Não há monitoramento de performance do banco e das RPCs
**Problema:** Impossível detectar problemas proativamente, degradação de performance
**Consequência:** Degradação de performance, downtime, experiência do usuário afetada
**Fluxos afetados:** Todos os fluxos do sistema
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar monitoramento via Supabase Logs, métricas customizadas

#### 14. SERVICE ROLE POTENCIALMENTE EXPOSTO
**Impacto:** ALTO
**Criticidade:** ALTA
**Dependência:** Operações administrativas
**Localização:** Variáveis de ambiente, logs, console
**Descrição:** Service role usado em algumas operações e pode estar exposto em logs
**Problema:** Se vazado, permite acesso total ao banco de dados
**Consequência:** Acesso não autorizado total, violação de segurança, vazamento de dados
**Fluxos afetados:** Operações administrativas
**Não pode ser alterado:** Deve ser revisto imediatamente antes de deploy
**Recomendação:** Remover service role do frontend, usar apenas em backend seguro

#### 15. FALTA DE SESSION TIMEOUT
**Impacto:** ALTO
**Criticidade:** ALTA
**Dependência:** Autenticação Supabase
**Localização:** Configuração Supabase Auth
**Descrição:** Sessões não expiram automaticamente
**Problema:** Se dispositivo for comprometido, sessão permanece ativa indefinidamente
**Consequência:** Acesso não autorizado prolongado, risco de comprometimento
**Fluxos afetados:** Fluxo 1 - Login e Schema Routing
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Configurar session timeout via Supabase Auth

---

### RISCOS MÉDIOS (IMPACTO: MÉDIO - CRITICIDADE: MÉDIA)

#### 16. ORDER BY criado_em SEM ÍNDICE
**Impacto:** MÉDIO
**Criticidade:** MÉDIA
**Dependência:** Performance de queries
**Localização:** Múltiplas tabelas (vendas, financeiro, OS, obras)
**Descrição:** ORDER BY criado_em sem índice em tabelas de alta volumetria
**Problema:** Queries podem ficar lentas com muitos registros
**Consequência:** Degradação de performance, timeout
**Fluxos afetados:** Listagem de dados
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Adicionar índices em criado_em para tabelas de alta volumetria

#### 17. ORDER BY nome SEM ÍNDICE
**Impacto:** MÉDIO
**Criticidade:** MÉDIA
**Dependência:** Performance de queries
**Localização:** Tabelas produtos e funcionarios
**Descrição:** ORDER BY nome sem índice
**Problema:** Queries podem ficar lentas com muitos registros
**Consequência:** Degradação de performance, timeout
**Fluxos afetados:** Listagem de produtos e funcionarios
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Adicionar índices em nome para produtos e funcionarios

#### 18. MÓDULO "relatorios" INCONSISTENTE
**Impacto:** MÉDIO
**Criticidade:** MÉDIA
**Dependência:** Navegação, feature flags
**Localização:** modulos_catalogo vs sidebar
**Descrição:** Módulo "relatorios" não existe em modulos_catalogo mas existe na sidebar
**Problema:** Inconsistência entre feature flags e navegação
**Consequência:** Usuário pode ver link de relatorios mas não ter acesso
**Fluxos afetados:** Fluxo 4 - Feature Flags e Navegação
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Adicionar "relatorios" em modulos_catalogo ou remover da sidebar

#### 19. FALTA DE TESTES AUTOMATIZADOS
**Impacto:** MÉDIO
**Criticidade:** MÉDIA
**Dependência:** Qualidade de código, regressões
**Localização:** Todo o código-fonte
**Descrição:** Não há testes unitários, integração ou E2E
**Problema:** Impossível garantir que mudanças não quebram funcionalidades existentes
**Consequência:** Regressões, bugs em produção, baixa confiança em mudanças
**Fluxos afetados:** Todos os fluxos do sistema
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar testes unitários, integração e E2E

#### 20. FALTA DE VALIDAÇÃO DE E-MAIL
**Impacto:** MÉDIO
**Criticidade:** MÉDIA
**Dependência:** Cadastro de clientes, envio de e-mails
**Localização:** apps/web/src/app/tenant/crm/page.tsx
**Descrição:** Sistema não valida e-mail no cadastro de clientes
**Problema:** E-mail inválido pode ser cadastrado, e-mail de boas-vindas enviado para e-mail inválido
**Consequência:** Erros no envio de e-mails, desperdício de recursos
**Fluxos afetados:** Cadastro de clientes, envio de e-mails
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar validação de e-mail no frontend e backend

#### 21. EDGE FUNCTION DE E-MAIL NÃO DEPLOYADA VIA CLI
**Impacto:** MÉDIO
**Criticidade:** MÉDIA
**Dependência:** Envio de e-mails
**Localização:** Supabase Edge Functions
**Descrição:** Sistema de e-mail depende de Edge Functions que não estão deployadas via CLI
**Problema:** Deploy manual necessário, risco de esquecer, dificuldade de automação
**Consequência:** E-mails não são enviados, funcionalidade quebrada
**Fluxos afetados:** Envio de e-mails (boas-vindas, notificações)
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar deploy automatizado de Edge Functions

#### 22. FALTA DE SOFT DELETE
**Impacto:** MÉDIO
**Criticidade:** MÉDIA
**Dependência:** Recuperação de dados
**Localização:** Todas as tabelas de tenant
**Descrição:** Exclusões são permanentes, não há soft delete
**Problema:** Dados excluídos não podem ser recuperados
**Consequência:** Perda de dados, impossibilidade de recuperação
**Fluxos afetados:** Todas as operações de exclusão
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar soft delete (coluna deleted_at, atualização em vez de exclusão)

---

### RISCOS BAIXOS (IMPACTO: BAIXO - CRITICIDADE: BAIXA)

#### 23. FALTA DE DOCUMENTAÇÃO DE COMPONENTES
**Impacto:** BAIXO
**Criticidade:** BAIXA
**Dependência:** Manutenção, onboarding
**Localização:** apps/web/src/components/modules/base/
**Descrição:** Componentes base não têm documentação inline
**Problema:** Dificuldade de manutenção e onboarding
**Consequência:** Tempo de desenvolvimento aumentado, erros por falta de entendimento
**Fluxos afetados:** Desenvolvimento e manutenção
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Adicionar documentação inline em componentes base

#### 24. FALTA DE I18N
**Impacto:** BAIXO
**Criticidade:** BAIXA
**Dependência:** Internacionalização
**Localização:** Todo o frontend
**Descrição:** Sistema não preparado para internacionalização
**Problema:** Strings de UI não estão centralizadas
**Consequência:** Dificuldade de tradução para outros idiomas
**Fluxos afetados:** Expansão para outros mercados
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar i18n via next-intl ou solução similar

#### 25. FALTA DE ERROR BOUNDARIES
**Impacto:** BAIXO
**Criticidade:** BAIXA
**Dependência:** Tratamento de erros
**Localização:** Componentes React
**Descrição:** Não há tratamento de erros em nível de componente
**Problema:** Erros não tratados podem quebrar a aplicação inteira
**Consequência:** Experiência do usuário afetada, dificuldade de debugging
**Fluxos afetados:** Todos os fluxos do frontend
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar error boundaries em componentes principais

#### 26. FALTA DE LOADING STATES CONSISTENTES
**Impacto:** BAIXO
**Criticidade:** BAIXA
**Dependência:** UX
**Localização:** Módulos do frontend
**Descrição:** Alguns módulos não têm loading states adequados
**Problema:** Usuário não sabe quando dados estão carregando
**Consequência:** Experiência do usuário afetada
**Fluxos afetados:** Carregamento de dados
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar loading states consistentes em todos os módulos

#### 27. FALTA DE OTIMIZAÇÃO DE IMAGENS
**Impacto:** BAIXO
**Criticidade:** BAIXA
**Dependência:** Performance
**Localização:** Ícones e imagens
**Descrição:** Ícones e imagens não otimizados
**Problema:** Carregamento lento de imagens
**Consequência:** Degradação de performance, experiência do usuário afetada
**Fluxos afetados:** Carregamento de assets
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Otimizar imagens via next/image ou ferramenta similar

#### 28. FALTA DE ANALYTICS
**Impacto:** BAIXO
**Criticidade:** BAIXA
**Dependência:** Rastreamento de uso
**Localização:** Todo o sistema
**Descrição:** Não há rastreamento de uso do sistema
**Problema:** Impossível entender comportamento dos usuários
**Consequência:** Dificuldade de tomada de decisões baseada em dados
**Fluxos afetados:** Melhoria contínua
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Implementar analytics via Google Analytics, Plausible ou solução similar

#### 29. FALTA DE CHECK CONSTRAINTS
**Impacto:** BAIXO
**Criticidade:** BAIXA
**Dependência:** Validação de dados
**Localização:** Todas as tabelas de tenant
**Descrição:** Não há CHECK constraints para validação de dados
**Problema:** Dados podem ficar inconsistentes
**Consequência:** Dados corrompidos, erros em queries
**Fluxos afetados:** Todas as operações de escrita
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Adicionar CHECK constraints para validação de dados

#### 30. FALTA DE UNIQUE CONSTRAINTS
**Impacto:** BAIXO
**Criticidade:** BAIXA
**Dependência:** Validação de dados
**Localização:** Algumas tabelas de tenant
**Descrição:** Alguns campos únicos não têm constraint
**Problema:** Duplicações podem ocorrer
**Consequência:** Dados duplicados, inconsistência
**Fluxos afetados:** Operações de escrita
**Não pode ser alterado:** Pode ser implementado post-deploy sem quebrar funcionalidades existentes
**Recomendação:** Adicionar UNIQUE constraints para campos que devem ser únicos

---

## FLUXOS QUE NÃO PODEM SER ALTERADOS

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

## ÁREAS SEGURAS PARA INTERVENÇÃO

### Áreas Seguras (Podem ser alteradas com baixo risco)

1. **UI/UX Frontend:** Componentes visuais, layouts, estilos
2. **Documentação:** Adicionar documentação inline, atualizar README
3. **Testes:** Adicionar testes unitários, integração, E2E
4. **Monitoramento:** Adicionar logging, métricas, alertas
5. **Backup:** Configurar backup automático
6. **Performance:** Adicionar índices, otimizar queries
7. **Validação:** Adicionar validação de e-mail, formatos
8. **Soft Delete:** Implementar soft delete
9. **Analytics:** Implementar rastreamento de uso
10. **I18n:** Implementar internacionalização

### Áreas de Risco Moderado (Devem ser testadas em staging)

1. **RPCs de Leitura:** tenant_listar_* (podem ser otimizadas)
2. **Hooks React Query:** Podem ser refatorados
3. **Componentes Base:** Podem ser melhorados
4. **Validação de Entrada:** Adicionar validação em RPCs de escrita
5. **Audit Logging:** Adicionar logging em RPCs de escrita
6. **Transações:** Envolver RPCs de escrita em transações

### Áreas de Alto Risco (Devem ser testadas exaustivamente)

1. **RPCs de Escrita:** tenant_criar_*, tenant_excluir_*
2. **RPCs de Roteamento:** RPCs no schema public
3. **Middleware Next.js:** Autenticação, schema routing
4. **Tabelas Críticas:** user_profiles, empresas
5. **Schema Routing:** set_tenant_schema RPC
6. **PDV:** tenant_processar_venda RPC

---

## RESUMO DA LEITURA 3

### Riscos Críticos (8)
1. Violação crítica em PDV - Acesso direto à tabela produtos
2. Falta de validação de entrada nas RPCs
3. SQL injection potencial via EXECUTE format()
4. Falta de transações em operações complexas
5. Dependência crítica: user_profiles
6. Dependência crítica: empresas
7. Dependência crítica: set_tenant_schema RPC
8. Dependência crítica: Middleware Next.js

### Riscos Altos (7)
9. Falta de 2FA
10. Falta de rate limiting
11. Falta de audit logging
12. Falta de backup automático
13. Falta de monitoramento
14. Service role potencialmente exposto
15. Falta de session timeout

### Riscos Médios (7)
16. ORDER BY criado_em sem índice
17. ORDER BY nome sem índice
18. Módulo "relatorios" inconsistente
19. Falta de testes automatizados
20. Falta de validação de e-mail
21. Edge Function de e-mail não deployada via CLI
22. Falta de soft delete

### Riscos Baixos (8)
23. Falta de documentação de componentes
24. Falta de i18n
25. Falta de error boundaries
26. Falta de loading states consistentes
27. Falta de otimização de imagens
28. Falta de analytics
29. Falta de check constraints
30. Falta de unique constraints

### Fluxos que Não Podem Ser Alterados
- Fluxo 1: Login e Schema Routing
- Fluxo 2: Provisionamento de Tenant
- Fluxo 3: Criação de Venda (PDV)
- Fluxo 4: Feature Flags e Navegação

### Áreas Seguras para Intervenção
- UI/UX Frontend
- Documentação
- Testes
- Monitoramento
- Backup
- Performance
- Validação
- Soft Delete
- Analytics
- I18n
