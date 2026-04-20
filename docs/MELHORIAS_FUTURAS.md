# BACKLOG E MELHORIAS FUTURAS UNIFICADO

Este documento é a fusão de melhorias arquiteturais (Ops/Backend) e implementações de funcionalidades (Features/Frontend).

---

## PARTE 1: MELHORIAS ARQUITETURAIS E OBRIGATÓRIAS (OPS)

# MELHORIAS FUTURAS OBRIGATÓRIAS — FLUXO ERP

## 1. INTRODUÇÃO

O sistema Fluxo ERP encontra-se oficialmente no estado **PRODUCTION-READY**, seguindo a arquitetura definida como **OPÇÃO A**:
- Supabase (PostgreSQL + RPC) é o backend real e fonte da verdade
- Frontend (Next.js / Netlify) é apenas UI e orquestrador
- Multi-tenancy implementado via schemas PostgreSQL por tenant
- Backend Python não existe e não deve existir

Todas as correções críticas identificadas nas Auditorias 5-8 foram implementadas:
- Escalabilidade: LIMIT padrão, índices adequados, SELECT explícito
- Robustez: Idempotência em RPCs de escrita, exceções contextuais
- Segurança: Isolamento por schema routing documentado, RBAC intra-tenant
- Governança: Versionamento de schema, função de upgrade, auditoria

As melhorias listadas neste documento **NÃO bloqueiam a entrada em produção**, mas são **OBRIGATÓRIAS** para maturidade de longo prazo. Ignorá-las indefinidamente aumenta significativamente o risco técnico, compromete a manutenibilidade e pode resultar em regressões silenciosas.

## 2. MELHORIAS FUTURAS OBRIGATÓRIAS

---

### 2.1 Modularização da função `provisionar_empresa`

**O que é:**
A função `provisionar_empresa` atualmente possui 800+ linhas e é responsável por criar todo o schema de um tenant (tabelas, índices, RPCs, RLS, policies, seeds). A modularização consiste em dividir essa função em funções auxiliares menores por módulo (CRM, Estoque, Vendas, Financeiro, etc.).

**Por que deve ser feita:**
- Complexidade ciclomática extrema dificulta manutenção e debugging
- Qualquer alteração em um módulo requer re-entender toda a função
- SQL dinâmico com EXECUTE format() em 800 linhas aumenta risco de erro de sintaxe
- Testes unitários são impossíveis sem modularização
- Revisões de código se tornam ineficientes

**Riscos reais se não for feita:**
- Introdução de bugs silenciosos em alterações futuras
- Tempo de desenvolvimento exponencialmente crescente
- Dificuldade extrema para onboarding de novos desenvolvedores
- Risco de corrupção de schema em provisionamentos futuros
- Impossibilidade de testar isoladamente cada módulo

**Quando executar:**
- **Curto prazo (1-2 semanas após entrada em produção)**

**Impacto de executar em produção:**
- **BAIXO** - A função é usada apenas durante criação de novos tenants
- Tenants existentes não são afetados
- Testes podem ser feitos em ambiente de staging com criação de tenants de teste

**Por que NÃO é bloqueante hoje:**
- A função atual funciona corretamente para provisionamento
- Não há bugs conhecidos
- O risco é de manutenibilidade futura, não de operação atual

---

### 2.2 Automação de VACUUM / ANALYZE para schemas tenant

**O que é:**
Implementar job automatizado (via pg_cron ou similar) para executar VACUUM ANALYZE periodicamente em todos os schemas tenant, garantindo que estatísticas do query planner estejam atualizadas e bloat seja controlado.

**Por que deve ser feita:**
- PostgreSQL autovacuum pode não ser suficiente com muitos schemas
- Schema por tenant aumenta volume de tabelas e índices
- Queries subótimas podem ocorrer com estatísticas desatualizadas
- Bloat de tabelas pode causar degradação de performance
- Múltiplos schemas tenant podem competir por recursos de autovacuum

**Riscos reais se não for feita:**
- Degradação progressiva de performance em queries
- Seq scans inesperados devido a estatísticas desatualizadas
- Aumento de I/O e tempo de resposta
- Dificuldade de diagnosticar problemas de performance
- Risco de hitting limites de disco devido a bloat

**Quando executar:**
- **Médio prazo (1-2 meses após entrada em produção)**

**Impacto de executar em produção:**
- **MÉDIO** - VACUUM pode consumir I/O e CPU durante execução
- Deve ser agendado em horários de baixo tráfego
- Testes em staging são essenciais para calibrar frequência

**Por que NÃO é bloqueante hoje:**
- Autovacuum do PostgreSQL funciona razoavelmente bem
- Impacto só se torna significativo com volume de dados maior
- Pode ser monitorado e implementado quando necessário

---

### 2.3 Versionamento explícito de contratos de RPC

**O que é:**
Implementar versionamento explícito nas assinaturas de RPCs (ex: `v1_tenant_listar_clientes`, `v2_tenant_listar_clientes`) para permitir backward/forward compatibility e mudanças controladas de contrato.

**Por que deve ser feita:**
- Frontend e backend podem evoluir em velocidades diferentes
- Deploy assíncrono pode causar quebra de contrato
- Atualmente, qualquer alteração em RPC requer deploy síncrono frontend/backend
- Não há mecanismo para deprecar RPCs antigos gradualmente
- Rollbacks são difíceis sem versionamento

**Riscos reais se não for feita:**
- Quebra de funcionalidade em deploy assíncrono
- Impossibilidade de fazer rollback rápido de backend
- Dificuldade de A/B testar novas versões de RPCs
- Frontend fica bloqueado por mudanças de backend
- Incerteza sobre qual versão do contrato está em uso

**Quando executar:**
- **Médio prazo (2-3 meses após entrada em produção)**

**Impacto de executar em produção:**
- **ALTO** - Requer mudanças em todas as RPCs e chamadas frontend
- Deploy coordenado é obrigatório
- Testes extensivos de compatibilidade são necessários

**Por que NÃO é bloqueante hoje:**
- Deploy síncrono frontend/backend é viável atualmente
- Equipe pequena permite coordenação
- Número de RPCs é ainda gerenciável

---

### 2.4 Métricas e observabilidade avançada de negócio

**O que é:**
Implementar sistema de métricas estruturadas para operações de negócio (vendas, conversão de funil, estoque, financeiro) com dashboards em tempo real e alertas automáticos para anomalias.

**Por que deve ser feita:**
- Tabela `audit_log` existe mas não é usada ativamente
- Métricas de negócio são essenciais para tomada de decisão
- Detecção de anomalias (ex: queda de vendas) é manual hoje
- Não há visibilidade de SLA de performance por tenant
- Debugging de incidentes é dificultado sem contexto

**Riscos reais se não for feita:**
- Problemas de negócio detectados tardiamente
- Incapacidade de medir impacto de mudanças
- Dificuldade de identificar tenants problemáticos
- SLAs não podem ser medidos ou garantidos
- Resposta a incidentes é reativa, não proativa

**Quando executar:**
- **Curto prazo (imediatamente após entrada em produção)**

**Impacto de executar em produção:**
- **BAIXO** - É uma camada adicional, não muda comportamento existente
- Pode ser implementado incrementalmente
- Não afeta operações core

**Por que NÃO é bloqueante hoje:**
- Sistema funciona sem métricas avançadas
- Operação manual ainda é possível
- Volume de operações ainda permite monitoramento manual

---

### 2.5 Padronização de paginação avançada (cursor-based)

**O que é:**
Substituir paginação baseada em LIMIT/OFFSET por paginação cursor-based (keyset pagination) para performance consistente em grandes volumes de dados e evitar problemas de offset.

**Por que deve ser feita:**
- LIMIT/OFFSET degrada linearmente com offset crescente
- Dados podem mudar entre páginas (duplicados ou saltos)
- OFFSET não escala para milhões de registros
- Cursor-based pagination é padrão de indústria para grandes volumes
- Permite paginação em tempo real sem inconsistências

**Riscos reais se não for feita:**
- Timeout em páginas profundas (ex: página 1000)
- Experiência de usuário degradada com grandes datasets
- Inconsistência de dados ao navegar páginas
- Impossível implementar "infinite scroll" performático
- Escalabilidade limitada para tenants com grandes volumes

**Quando executar:**
- **Longo prazo (6-12 meses após entrada em produção)**

**Impacto de executar em produção:**
- **ALTO** - Requer mudanças em todas as RPCs de listagem e frontend
- Frontend precisa adaptar UI para cursor-based
- Testes extensivos de consistência são necessários

**Por que NÃO é bloqueante hoje:**
- LIMIT padrão (1000) mitiga problema de offset
- Volume atual de dados não justifica cursor-based ainda
- Implementação atual é adequada para estágio atual

---

### 2.6 Estratégia de rollout seguro de mudanças estruturais

**O que é:**
Definir e documentar processo padronizado para rollout de mudanças estruturais (migrations de schema, alterações de RPCs, mudanças de contrato) com canary deployment, rollback automático e validação pós-deploy.

**Por que deve ser feita:**
- Função `upgrade_all_tenants` existe mas não há processo de uso
- Mudanças estruturais são de alto risco
- Não há estratégia para testar em subset de tenants
- Rollback manual é lento e propenso a erro
- Não há validação automática pós-migration

**Riscos reais se não for feita:**
- Migration falha afeta todos os tenants simultaneamente
- Rollback manual pode levar horas
- Corrupção de dados pode ocorrer sem detecção
- Downtime prolongado em caso de falha
- Incerteza sobre estado do sistema pós-migration

**Quando executar:**
- **Curto prazo (imediatamente após entrada em produção)**

**Impacto de executar em produção:**
- **MÉDIO** - É um processo, não uma mudança de código
- Requer treinamento e documentação
- Primeiras migrations seguirão novo processo

**Por que NÃO é bloqueante hoje:**
- Sistema em estágio inicial com poucos tenants
- Migrations são ainda raras
- Equipe pequena permite coordenação manual

---

## 3. WALKTHROUGH TÉCNICO DE EXECUÇÃO SEGURA

### 3.1 Análise Prévia Obrigatória

Antes de qualquer alteração, executar:

1. **Backup completo do banco de dados**
   ```sql
   pg_dump -Fc fluxo_erp > backup_pre_change.dump
   ```

2. **Snapshot de todos os schemas tenant**
   ```sql
   SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';
   ```
   Documentar versão atual de cada schema via `schema_migrations`.

3. **Análise de dependências**
   - Identificar todas as tabelas, índices, RPCs que serão alterados
   - Mapear dependências (FKs, views, triggers)
   - Verificar se há dependências externas (frontend, scripts externos)

4. **Revisão de contrato de RPCs**
   - Listar todas as RPCs que serão alteradas
   - Documentar assinatura atual vs assinatura futura
   - Verificar chamadas no frontend que serão afetadas

### 3.2 Vistorias Profundas Antes de Alteração

Para cada alteração estrutural:

1. **Vistoria de dados existentes**
   - Verificar volume de dados em tabelas afetadas
   - Identificar dados que podem ser corrompidos
   - Validar integridade referencial

2. **Vistoria de performance**
   - Executar EXPLAIN ANALYZE em queries críticas
   - Documentar planos de execução atuais
   - Comparar performance antes/depois em staging

3. **Vistoria de segurança**
   - Verificar se RLS policies permanecem válidas
   - Validar permissões de roles
   - Testar isolamento multi-tenant

4. **Vistoria de contrato**
   - Validar que mudanças são backward-compatible
   - Testar chamadas de RPC com versão antiga do frontend
   - Documentar breaking changes (se inevitáveis)

### 3.3 Ordem Correta de Execução

**Ordem recomendada por prioridade de risco:**

1. **Fase 1: Observabilidade (BAIXO RISCO)**
   - Implementar métricas e observabilidade
   - Ativar audit logging
   - Criar dashboards

2. **Fase 2: Processos (MÉDIO RISCO)**
   - Definir estratégia de rollout seguro
   - Documentar processo de migrations
   - Criar scripts de automação

3. **Fase 3: Automação (MÉDIO RISCO)**
   - Implementar VACUUM/ANALYZE automatizado
   - Criar jobs de manutenção
   - Testar em staging

4. **Fase 4: Modularização (ALTO RISCO)**
   - Refatorar `provisionar_empresa`
   - Testar exaustivamente cada módulo
   - Deploy em staging com criação de tenants de teste

5. **Fase 5: Versionamento (ALTO RISCO)**
   - Implementar versionamento de RPCs
   - Atualizar frontend
   - Deploy coordenado

6. **Fase 6: Paginação (ALTO RISCO)**
   - Implementar cursor-based pagination
   - Atualizar frontend
   - Testes de consistência

### 3.4 Testes Necessários Antes e Depois

**Antes do deploy:**

1. **Testes unitários**
   - Testar cada função auxiliar isoladamente
   - Validar SQL dinâmico com casos extremos
   - Testar edge cases (null, empty, valores extremos)

2. **Testes de integração**
   - Testar fluxo completo de provisionamento
   - Validar RPCs com dados reais de staging
   - Testar rollback de migrations

3. **Testes de performance**
   - Comparar performance antes/depois
   - Testar com volume de dados similar a produção
   - Validar que não há regressão significativa

4. **Testes de segurança**
   - Validar isolamento multi-tenant
   - Testar RLS policies
   - Verificar permissões de roles

**Depois do deploy:**

1. **Validação de schema**
   ```sql
   SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;
   ```
   Verificar versão atual em todos os schemas tenant.

2. **Validação de RPCs**
   - Chamar cada RPC alterada com dados de teste
   - Validar que respostas estão corretas
   - Verificar que não há erros de sintaxe

3. **Validação de frontend**
   - Testar cada página que chama RPCs alteradas
   - Validar que UI funciona corretamente
   - Verificar que não há erros de console

4. **Validação de dados**
   - Verificar integridade referencial
   - Validar que não há dados corrompidos
   - Comparar contagem de registros antes/depois

### 3.5 Como Evitar Quebra de Contratos

1. **Sempre manter backward compatibility**
   - Adicionar parâmetros com DEFAULT
   - Nunca remover parâmetros sem depreciação
   - Adicionar campos em vez de remover

2. **Versionamento explícito para breaking changes**
   - Criar v2 da RPC em vez de alterar v1
   - Manter v1 funcional durante período de transição
   - Deprecar v1 gradualmente com warnings

3. **Testes de contrato automatizados**
   - Criar testes que validam assinatura de RPCs
   - Comparar contrato esperado vs atual
   - Falhar build se contrato mudar inesperadamente

### 3.6 Como Evitar Downtime

1. **Deploy canary**
   - Deploy em subset de tenants primeiro
   - Monitorar métricas e erros
   - Expandir gradualmente se estável

2. **Rollback automático**
   - Definir critérios de rollback (ex: taxa de erro > 5%)
   - Automatizar rollback se critérios forem atingidos
   - Manter backup rápido de restore

3. **Deploy fora de horário de pico**
   - Identificar horários de menor tráfego
   - Agendar migrations para esses horários
   - Comunicar clientes sobre janela de manutenção

### 3.7 Como Evitar Corrupção de Dados

1. **Transações atômicas**
   - Sempre envolver múltiplas operações em transação
   - Validar antes de COMMIT
   - ROLLBACK em caso de erro

2. **Validação prévia**
   - Validar dados antes de INSERT/UPDATE
   - Verificar constraints antes de operação
   - Testar com dados de staging

3. **Backup antes de migrations**
   - Backup imediatamente antes de migration
   - Testar restore de backup
   - Manter backup por período de retenção

### 3.8 Como Evitar Regressão Silenciosa

1. **Métricas de baseline**
   - Documentar métricas de performance antes da mudança
   - Comparar com métricas pós-deploy
   - Alertar se houver regressão significativa

2. **Testes de smoke**
   - Testar fluxos críticos pós-deploy
   - Validar que funcionalidades principais funcionam
   - Testar com dados reais de produção (se possível)

3. **Monitoramento ativo**
   - Monitorar logs de erro pós-deploy
   - Verificar métricas de negócio
   - Alertar em tempo real se anomalias forem detectadas

## 4. CONCLUSÃO DO DOCUMENTO

O sistema Fluxo ERP está oficialmente **PRODUCTION-READY** e pode entrar em operação com segurança. Todas as correções críticas foram implementadas e validadas.

As melhorias listadas neste documento são **OBRIGATÓRIAS** para maturidade de longo prazo, mas **NÃO bloqueiam** a entrada em produção. Elas devem ser executadas no ritmo correto, com disciplina e seguindo o walkthrough técnico descrito.

A mentalidade de engenharia de longo prazo deve prevalecer: qualidade, segurança e manutenibilidade são mais importantes que velocidade. Cada melhoria deve ser tratada como um projeto de engenharia com análise, testes, validação e monitoramento.

Ignorar estas melhorias indefinidamente aumentará o risco técnico e comprometerá a escalabilidade do sistema. A disciplina de implementá-las corretamente garantirá que o Fluxo ERP evolua de forma segura, previsível e sustentável.


---

## PARTE 2: IMPLEMENTAÇÕES E ROADMAP DE FUNCIONALIDADES (FEATURES)

# IMPLEMENTAÇÕES FUTURAS E MELHORIAS

**Última atualização:** 15/04/2026  
**Versão:** 1.0  
**Status:** Revisado

---

## REGRAS OBRIGATÓRIAS

Toda vez que este documento for lido, editado ou consultado, ele deve ser automaticamente atualizado, versionado ou registrado como revisado.

---

## ORDEM DE PRIORIDADE

**Ordenação:** Menor risco → maior prioridade  
**Risco BAIXO:** Implementações seguras, baixo impacto  
**Risco MÉDIO:** Implementações com impacto moderado  
**Risco ALTO:** Implementações complexas, alto impacto

---

## RISCO BAIXO (Maior Prioridade)

### 1. Validação de E-mail no Cadastro de Clientes

**Descrição:** Adicionar validação de formato de e-mail antes de enviar e-mail de boas-vindas

**Valor para o negócio:**
- Evita envio de e-mails para endereços inválidos
- Melhora experiência do usuário
- Reduz custos com envio de e-mails inválidos

**Impacto técnico:**
- Baixo - Adicionar validação regex no frontend
- Não requer alterações no backend
- Implementação rápida

**Risco envolvido:**
- BAIXO - Validação simples, não afeta fluxo principal

**Implementação sugerida:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(formData.email)) {
  toastError("E-mail inválido");
  return;
}
```

**Status:** ✅ IMPLEMENTADO (16/04/2026)
**Arquivo modificado:** `apps/web/src/app/tenant/crm/page.tsx`
**Commit:** 696cd8e - "feat: Adicionar validação de e-mail no cadastro de clientes"

---

### 2. Soft Delete em Tabelas Principais

**Descrição:** Implementar soft delete (exclusão lógica) em vez de exclusão física

**Valor para o negócio:**
- Permite recuperação de dados excluídos
- Mantém histórico de operações
- Melhora conformidade com regulamentações

**Impacto técnico:**
- Médio - Adicionar coluna `deleted_at` em tabelas
- Atualizar RPCs para usar soft delete
- Atualizar frontend para mostrar/excluir itens deletados

**Risco envolvido:**
- BAIXO - Não afeta dados existentes
- Pode ser implementado de forma incremental

**Implementação sugerida:**
- Adicionar coluna `deleted_at TIMESTAMP` em tabelas principais
- Atualizar RPCs de exclusão para usar `UPDATE ... SET deleted_at = NOW()`
- Adicionar filtro `WHERE deleted_at IS NULL` em listagens
- Adicionar opção de "restaurar" itens deletados

---

### 3. Centralização de Strings de UI

**Descrição:** Centralizar strings de UI (labels, mensagens, textos) em arquivo de tradução

**Valor para o negócio:**
- Facilita internacionalização (i18n)
- Consistência de linguagem
- Manutenção simplificada

**Impacto técnico:**
- Médio - Criar arquivo de tradução
- Substituir strings hardcoded
- Implementar sistema de tradução

**Risco envolvido:**
- BAIXO - Não afeta funcionalidade
- Pode ser implementado de forma incremental

**Implementação sugerida:**
- Criar arquivo `src/lib/i18n/pt-BR.json`
- Criar hook `useTranslation()` para acessar strings
- Substituir strings hardcoded gradualmente
- Preparar estrutura para outros idiomas

---

### 4. Documentação de Componentes

**Descrição:** Adicionar documentação inline em componentes base

**Valor para o negócio:**
- Facilita onboarding de desenvolvedores
- Melhora manutenibilidade
- Reduz tempo de desenvolvimento

**Impacto técnico:**
- Baixo - Adicionar comentários JSDoc
- Não afeta funcionalidade
- Implementação rápida

**Risco envolvido:**
- BAIXO - Apenas documentação
- Sem risco de quebra

**Implementação sugerida:**
```typescript
/**
 * KPICard - Componente para exibir KPIs
 * @param {string} title - Título do KPI
 * @param {string|number} value - Valor do KPI
 * @param {React.ComponentType} icon - Ícone do Lucide React
 * @param {string} className - Classes CSS adicionais
 */
export function KPICard({ title, value, icon, className }: KPICardProps) {
  // ...
}
```

**Status:** ✅ IMPLEMENTADO (16/04/2026)
**Arquivos modificados:** 
- `apps/web/src/components/modules/base/KPICard.tsx`
- `apps/web/src/components/modules/base/ActionCard.tsx`
**Commit:** 6fde582 - "docs: Adicionar documentação JSDoc aos componentes KPICard e ActionCard"

---

### 5. Loading States Consistentes

**Descrição:** Adicionar loading states consistentes em todos os módulos

**Valor para o negócio:**
- Melhora experiência do usuário
- Reduz confusão durante carregamento
- Aparência profissional

**Impacto técnico:**
- Baixo - Adicionar skeletons ou spinners
- Não afeta funcionalidade
- Implementação rápida

**Risco envolvido:**
- BAIXO - Apenas UI
- Sem risco de quebra

**Implementação sugerida:**
- Criar componente `LoadingSkeleton`
- Adicionar loading states em hooks personalizados
- Usar `isLoading` de React Query para mostrar loading

**Status:** ✅ IMPLEMENTADO (16/04/2026)
**Arquivos criados:**
- `apps/web/src/components/modules/base/KPISkeleton.tsx`
- `apps/web/src/components/modules/base/TableSkeleton.tsx`
- `apps/web/src/components/modules/base/CardSkeleton.tsx`
**Arquivos modificados:**
- `apps/web/src/app/tenant/dashboard/page.tsx`
- `apps/web/src/app/tenant/crm/page.tsx`
**Commit:** 782f191 - "feat: Adicionar loading states consistentes com componentes skeleton reutilizáveis"

---

### 6. Error Boundaries

**Descrição:** Adicionar error boundaries para capturar erros em nível de componente

**Valor para o negócio:**
- Melhora estabilidade da aplicação
- Evita quebra completa da UI
- Facilita debugging

**Impacto técnico:**
- Médio - Criar componente ErrorBoundary
- Envolver componentes principais
- Adicionar logging de erros

**Risco envolvido:**
- BAIXO - Não afeta fluxo normal
- Melhora resiliência

**Implementação sugerida:**
- Criar componente `ErrorBoundary`
- Envolver cada módulo com ErrorBoundary
- Adicionar logging de erros no Supabase
- Mostrar UI amigável em caso de erro

---

### 7. Otimização de Imagens

**Descrição:** Otimizar imagens e ícones para melhorar performance

**Valor para o negócio:**
- Melhora performance de carregamento
- Reduz uso de banda
- Melhora experiência do usuário

**Impacto técnico:**
- Baixo - Otimizar imagens existentes
- Usar Next.js Image component
- Implementação rápida

**Risco envolvido:**
- BAIXO - Apenas otimização
- Sem risco de quebra

**Implementação sugerida:**
- Usar `next/image` para imagens
- Otimizar ícones do Lucide React (já otimizados)
- Comprimir imagens estáticas
- Usar formatos modernos (WebP)

---

### 8. Verificação de E-mail no Resend

**Descrição:** Verificar e-mail pessoal no Resend para usar como remetente

**Valor para o negócio:**
- Melhor deliverability de e-mails
- Aparência mais profissional
- Reduz chances de spam

**Impacto técnico:**
- Baixo - Configurar no Resend
- Adicionar environment variable
- Implementação rápida

**Risco envolvido:**
- BAIXO - Apenas configuração
- Sem risco de quebra

**Implementação sugerida:**
- Acessar dashboard do Resend
- Adicionar e-mail pessoal em Domains
- Verificar e-mail
- Configurar `RESEND_FROM_EMAIL` no Supabase

---

## RISCO MÉDIO

### 9. Implementar Testes Automatizados

**Descrição:** Implementar testes unitários, integração e E2E

**Valor para o negócio:**
- Reduz bugs em produção
- Facilita refatoração
- Melhora confiança em deploy

**Impacto técnico:**
- Alto - Configurar framework de testes
- Escrever testes para componentes
- Escrever testes para RPCs
- Configurar CI/CD

**Risco envolvido:**
- MÉDIO - Requer tempo significativo
- Pode atrasar features

**Implementação sugerida:**
- Configurar Jest + React Testing Library
- Escrever testes unitários para hooks
- Escrever testes de integração para RPCs
- Configurar Playwright para E2E
- Adicionar testes no CI/CD

---

### 10. Adicionar Audit Logging

**Descrição:** Implementar logs de auditoria para rastrear operações

**Valor para o negócio:**
- Rastreabilidade completa
- Conformidade com regulamentações
- Investigação de incidentes

**Impacto técnico:**
- Alto - Criar tabela de audit_log
- Adicionar triggers para logging
- Criar interface para visualização
- Implementar retenção de logs

**Risco envolvido:**
- MÉDIO - Pode afetar performance
- Requer armazenamento adicional

**Implementação sugerida:**
- Tabela `audit_log` já existe
- Adicionar triggers em tabelas principais
- Logar INSERT, UPDATE, DELETE
- Criar interface para visualização
- Implementar retenção (ex: 90 dias)

---

### 11. Implementar Backup Automático

**Descrição:** Configurar backup automático do banco de dados

**Valor para o negócio:**
- Proteção contra perda de dados
- Recuperação rápida em caso de incidente
- Conformidade com regulamentações

**Impacto técnico:**
- Médio - Configurar no Supabase
- Definir retenção
- Testar restauração

**Risco envolvido:**
- MÉDIO - Configuração externa
- Dependência do Supabase

**Implementação sugerida:**
- Configurar backup automático no Supabase
- Definir retenção (ex: 30 dias)
- Testar restauração periodicamente
- Documentar processo de recuperação

---

### 12. Adicionar Monitoramento

**Descrição:** Implementar monitoramento de performance e erros

**Valor para o negócio:**
- Detecção precoce de problemas
- Melhora uptime
- Facilita debugging

**Impacto técnico:**
- Médio - Integrar serviço de monitoramento
- Adicionar logging de erros
- Configurar alertas

**Risco envolvido:**
- MÉDIO - Serviço externo
- Custo adicional

**Implementação sugerida:**
- Integrar Sentry ou Vercel Analytics
- Adicionar logging de erros no frontend
- Monitorar performance de RPCs
- Configurar alertas para erros críticos

---

### 13. Adicionar Validação de Entrada nas RPCs

**Descrição:** Implementar validação de entrada nas RPCs do Supabase

**Valor para o negócio:**
- Melhora segurança
- Previne injeção de SQL
- Dados mais consistentes

**Impacto técnico:**
- Alto - Adicionar validação em todas as RPCs
- Usar CHECK constraints
- Sanitizar inputs

**Risco envolvido:**
- MÉDIO - Pode quebrar fluxos existentes
- Requer testes extensivos

**Implementação sugerida:**
- Adicionar CHECK constraints nas tabelas
- Validar tipos e formatos nas RPCs
- Sanitizar inputs antes de usar em queries
- Adicionar testes de validação

---

### 14. Implementar Paginação em Listagens

**Descrição:** Adicionar paginação em todas as listagens do sistema

**Valor para o negócio:**
- Melhora performance
- Reduz uso de memória
- Melhora experiência do usuário

**Impacto técnico:**
- Médio - Atualizar RPCs
- Adicionar UI de paginação
- Atualizar hooks

**Risco envolvido:**
- MÉDIO - Altera UX existente
- Requer testes

**Implementação sugerida:**
- RPCs já têm LIMIT e OFFSET
- Adicionar UI de paginação nos componentes
- Atualizar hooks para passar paginação
- Manter estado de página

---

### 15. Adicionar Ordenação Flexível

**Descrição:** Implementar ordenação por múltiplas colunas em listagens

**Valor para o negócio:**
- Melhora usabilidade
- Flexibilidade para usuário
- Melhora análise de dados

**Impacto técnico:**
- Médio - Atualizar RPCs
- Adicionar UI de ordenação
- Atualizar hooks

**Risco envolvido:**
- MÉDIO - Altera UX existente
- Requer testes

**Implementação sugerida:**
- Adicionar parâmetros de ordenação nas RPCs
- Adicionar UI de ordenação nos cabeçalhos de tabela
- Atualizar hooks para passar ordenação
- Manter estado de ordenação

---

### 16. Implementar Filtros Avançados

**Descrição:** Adicionar filtros avançados em listagens

**Valor para o negócio:**
- Melhora usabilidade
- Facilita busca de dados
- Melhora análise de dados

**Impacto técnico:**
- Alto - Atualizar RPCs
- Adicionar UI de filtros
- Atualizar hooks

**Risco envolvido:**
- MÉDIO - Altera UX existente
- Requer testes

**Implementação sugerida:**
- Adicionar parâmetros de filtro nas RPCs
- Criar componente de filtros avançados
- Atualizar hooks para passar filtros
- Manter estado de filtros

---

### 17. Adicionar Cache de Resultados

**Descrição:** Implementar cache de resultados de RPCs

**Valor para o negócio:**
- Melhora performance
- Reduz carga no banco
- Melhora experiência do usuário

**Impacto técnico:**
- Médio - Configurar cache no Supabase
- Adicionar cache no frontend (React Query já tem)
- Implementar invalidação de cache

**Risco envolvido:**
- MÉDIO - Pode mostrar dados desatualizados
- Requer invalidação correta

**Implementação sugerida:**
- React Query já implementa cache no frontend
- Configurar cache no Supabase para RPCs
- Invalidar cache após mutations
- Configurar tempo de expiração

---

### 18. Implementar Transações em Operações Complexas

**Descrição:** Envolver operações complexas em transações

**Valor para o negócio:**
- Garante consistência de dados
- Previne dados corrompidos
- Melhora confiabilidade

**Impacto técnico:**
- Alto - Revisar operações complexas
- Adicionar blocos BEGIN/COMMIT
- Adicionar rollback em caso de erro

**Risco envolvido:**
- MÉDIO - Pode afetar performance
- Requer testes extensivos

**Implementação sugerida:**
- Identificar operações complexas (ex: processar venda)
- Envolver em bloco BEGIN/COMMIT
- Adicionar ROLLBACK em caso de erro
- Testar cenários de falha

---

## RISCO ALTO (Menor Prioridade)

### 19. Implementar 2FA (Autenticação de Dois Fatores)

**Descrição:** Adicionar autenticação de dois fatores

**Valor para o negócio:**
- Melhora segurança significativamente
- Protege contra acesso não autorizado
- Conformidade com regulamentações

**Impacto técnico:**
- Alto - Integrar provedor de 2FA
- Atualizar fluxo de autenticação
- Adicionar UI de configuração
- Suporte a usuários sem 2FA

**Risco envolvido:**
- ALTO - Pode afetar UX significativamente
- Requer mudanças profundas
- Pode confundir usuários

**Implementação sugerida:**
- Usar Supabase Auth 2FA ou serviço externo
- Adicionar opção de configurar 2FA
- Tornar 2FA opcional inicialmente
- Documentar processo de recuperação

---

### 20. Implementar Rate Limiting

**Descrição:** Adicionar limitação de taxa para RPCs e rotas

**Valor para o negócio:**
- Protege contra abuso
- Previne DoS
- Melhora estabilidade

**Impacto técnico:**
- Alto - Configurar rate limiting no Supabase
- Adicionar rate limiting no middleware
- Implementar backoff exponencial

**Risco envolvido:**
- ALTO - Pode bloquear usuários legítimos
- Requer ajuste fino
- Complexo de implementar corretamente

**Implementação sugerida:**
- Configurar rate limiting no Supabase
- Adicionar rate limiting por usuário
- Implementar backoff exponencial
- Monitorar e ajustar limites

---

### 21. Implementar Password Policies

**Descrição:** Adicionar políticas de senha (complexidade, expiração)

**Valor para o negócio:**
- Melhora segurança
- Protege contra ataques de força bruta
- Conformidade com regulamentações

**Impacto técnico:**
- Alto - Implementar validação de senha
- Adicionar expiração de senha
- Adicionar UI de troca de senha
- Forçar troca periódica

**Risco envolvido:**
- ALTO - Pode afetar UX significativamente
- Usuários podem resistir
- Requer comunicação clara

**Implementação sugerida:**
- Implementar validação de complexidade
- Adicionar expiração (ex: 90 dias)
- Forçar troca em primeiro login
- Enviar e-mail de aviso antes de expirar

---

### 22. Implementar Session Timeout

**Descrição:** Adicionar expiração automática de sessões

**Valor para o negócio:**
- Melhora segurança
- Protege contra sessões abandonadas
- Conformidade com regulamentações

**Impacto técnico:**
- Alto - Implementar timeout no Supabase
- Adicionar UI de reautenticação
- Gerenciar refresh tokens

**Risco envolvido:**
- ALTO - Pode afetar UX significativamente
- Usuários podem perder trabalho não salvo
- Requer comunicação clara

**Implementação sugerida:**
- Configurar timeout no Supabase Auth
- Adicionar aviso antes de expirar
- Implementar refresh automático
- Salvar estado antes de expirar

---

### 23. Implementar Account Lockout

**Descrição:** Bloquear conta após múltiplas tentativas de login falhas

**Valor para o negócio:**
- Protege contra força bruta
- Melhora segurança
- Conformidade com regulamentações

**Impacto técnico:**
- Alto - Implementar contador de falhas
- Adicionar UI de desbloqueio
- Implementar desbloqueio via e-mail
- Monitorar tentativas

**Risco envolvido:**
- ALTO - Pode bloquear usuários legítimos
- Requer processo de recuperação
- Complexo de implementar

**Implementação sugerida:**
- Implementar contador de falhas
- Bloquear após X tentativas em Y minutos
- Enviar e-mail de desbloqueio
- Adicionar UI de desbloqueio

---

### 24. Implementar Data Encryption

**Descrição:** Criptografar dados sensíveis em repouso

**Valor para o negócio:**
- Melhora segurança
- Protege dados sensíveis
- Conformidade com regulamentações

**Impacto técnico:**
- Alto - Identificar dados sensíveis
- Implementar criptografia
- Atualizar RPCs para criptografar/descriptografar
- Gerenciar chaves de criptografia

**Risco envolvido:**
- ALTO - Pode afetar performance
- Complexo de implementar
- Perda de chaves = perda de dados

**Implementação sugerida:**
- Usar pgcrypto do PostgreSQL
- Criptografar dados sensíveis (CPF, e-mail, telefone)
- Atualizar RPCs para criptografar/descriptografar
- Armazenar chaves em environment variables

---

### 25. Implementar Key Rotation

**Descrição:** Rotacionar chaves periodicamente (API keys, chaves de criptografia)

**Valor para o negócio:**
- Melhora segurança
- Reduz impacto de vazamento
- Conformidade com regulamentações

**Impacto técnico:**
- Alto - Implementar sistema de rotação
- Atualizar dependências
- Documentar processo
- Automatizar rotação

**Risco envolvido:**
- ALTO - Pode causar downtime
- Complexo de implementar
- Requer planejamento cuidadoso

**Implementação sugerida:**
- Definir política de rotação (ex: 90 dias)
- Automatizar rotação de API keys
- Rotacionar chaves de criptografia
- Documentar processo manual

---

### 26. Implementar Security Headers

**Descrição:** Adicionar headers de segurança HTTP

**Valor para o negócio:**
- Melhora segurança
- Protege contra ataques comuns
- Conformidade com regulamentações

**Impacto técnico:**
- Médio - Configurar headers no Next.js
- Configurar CSP
- Testar compatibilidade

**Risco envolvido:**
- MÉDIO - Pode quebrar funcionalidades
- Requer testes extensivos

**Implementação sugerida:**
- Adicionar headers no next.config.ts
- Implementar Content Security Policy
- Adicionar HSTS, X-Frame-Options, etc.
- Testar todas as funcionalidades

---

### 27. Implementar Consent Management

**Descrição:** Adicionar gestão de consentimento (LGPD, GDPR)

**Valor para o negócio:**
- Conformidade com regulamentações
- Transparência para usuários
- Proteção legal

**Impacto técnico:**
- Alto - Implementar banner de consentimento
- Gerenciar preferências
- Armazenar consentimentos
- Implementar revogação

**Risco envolvido:**
- ALTO - Requer conhecimento legal
- Pode afetar UX
- Complexo de implementar

**Implementação sugerida:**
- Implementar banner de consentimento
- Armazenar consentimentos no banco
- Permitir revogação
- Documentar política de privacidade

---

### 28. Refatorar RPCs com Sanitização Completa

**Descrição:** Refatorar RPCs para sanitizar completamente inputs

**Valor para o negócio:**
- Melhora segurança
- Previne injeção de SQL
- Protege contra ataques

**Impacto técnico:**
- Alto - Revisar todas as RPCs
- Implementar sanitização
- Adicionar testes de segurança
- Documentar padrões

**Risco envolvido:**
- ALTO - Pode quebrar fluxos existentes
- Requer testes extensivos
- Complexo de implementar

**Implementação sugerida:**
- Revisar uso de EXECUTE format()
- Sanitizar todos os inputs
- Usar parameterized queries quando possível
- Adicionar testes de injeção SQL

---

### 29. Implementar Particionamento de Tabelas

**Descrição:** Particionar tabelas grandes por data

**Valor para o negócio:**
- Melhora performance
- Reduz custo de armazenamento
- Facilita arquivamento

**Impacto técnico:**
- Alto - Revisar schema do banco
- Implementar particionamento
- Atualizar RPCs
- Migrar dados existentes

**Risco envolvido:**
- ALTO - Migração complexa
- Pode causar downtime
- Requer planejamento cuidadoso

**Implementação sugerida:**
- Identificar tabelas grandes (vendas, audit_log)
- Particionar por mês/ano
- Atualizar RPCs para considerar particionamento
- Implementar arquivamento de partições antigas

---

### 30. Implementar Data Retention Policy

**Descrição:** Implementar política de retenção de dados

**Valor para o negócio:**
- Reduz custo de armazenamento
- Conformidade com regulamentações
- Melhora performance

**Impacto técnico:**
- Alto - Definir política por tipo de dado
- Implementar arquivamento automático
- Implementar exclusão automática
- Documentar política

**Risco envolvido:**
- ALTO - Perda de dados irreversível
- Requer aprovação legal
- Complexo de implementar

**Implementação sugerida:**
- Definir política (ex: 2 anos para vendas, 7 anos para financeiro)
- Implementar arquivamento de dados antigos
- Implementar exclusão automática após período
- Documentar política e obter aprovação

---

## RESUMO

### Total de Melhorias: 30
- **Risco BAIXO:** 8 melhorias (27%)
- **Risco MÉDIO:** 10 melhorias (33%)
- **Risco ALTO:** 12 melhorias (40%)

### Prioridades Recomendadas

**Fase 1 (Curto Prazo - 1-2 meses):**
1. Validação de e-mail
2. Soft delete
3. Centralização de strings
4. Documentação de componentes
5. Loading states
6. Error boundaries
7. Otimização de imagens
8. Verificação de e-mail no Resend

**Fase 2 (Médio Prazo - 3-6 meses):**
9. Testes automatizados
10. Audit logging
11. Backup automático
12. Monitoramento
13. Validação de entrada nas RPCs
14. Paginação
15. Ordenação flexível
16. Filtros avançados
17. Cache de resultados
18. Transações em operações complexas

**Fase 3 (Longo Prazo - 6-12 meses):**
19. 2FA
20. Rate limiting
21. Password policies
22. Session timeout
23. Account lockout
24. Data encryption
25. Key rotation
26. Security headers
27. Consent management
28. Refatoração de RPCs
29. Particionamento de tabelas
30. Data retention policy

---

## FUNCIONALIDADES POR MÓDULO (SUGERIDAS EM 18/04/2026)

### Módulo Clientes (CRM)

**Funcionalidades sugeridas:**
1. **Histórico de interações** - Registrar contatos, reuniões, chamadas com clientes
2. **Segmentação de clientes** - Tags, categorias, classificações (VIP, inativo, etc.)
3. **Gestão de oportunidades** - Pipeline de vendas associado a clientes
4. **Documentos de clientes** - Upload de contratos, propostas, documentos legais
5. **Dashboard de clientes** - KPIs de aquisição, retenção, LTV

**Prioridade sugerida:** Alta - Impacto direto em vendas e relacionamento

---

### Módulo Produtos/Estoque

**Funcionalidades sugeridas:**
1. **Alertas de estoque mínimo** - Notificações quando estoque abaixo do mínimo
2. **Gestão de kits/bundles** - Produtos compostos por múltiplos itens
3. **Movimentação entre locais** - Transferência de estoque entre filiais/depositos
4. **Valoração de estoque** - Custo médio, FIFO, LIFO
5. **Previsão de demanda** - Análise histórica para prever necessidade de reposição
6. **Códigos de barras/QR** - Geração e leitura para gestão física

**Prioridade sugerida:** Alta - Impacto direto em operação e custos

---

### Módulo Vendas

**Funcionalidades sugeridas:**
1. **Orçamentos/Propostas** - Converter orçamentos em vendas
2. **Multiplas formas de pagamento** - Parcelamento, boleto, cartão, PIX
3. **Gestão de comissões** - Cálculo automático para vendedores
4. **Nota fiscal eletrônica** - Integração com SEFAZ
5. **Dashboard de vendas** - Métricas por período, produto, vendedor
6. **Recorrência/Assinaturas** - Vendas recorrentes mensais

**Prioridade sugerida:** Alta - Impacto direto em receita

---

### Módulo Financeiro

**Funcionalidades sugeridas:**
1. **Conciliação bancária** - Importação OFX, reconciliação automática
2. **Fluxo de caixa projetado** - Previsão baseada em contas a pagar/receber
3. **Gestão de contas a pagar/receber** - Vencimentos, parcelas, juros
4. **Centro de custos** - Classificação por departamento/projeto
5. **Integração bancária** - Sincronização automática de transações
6. **Relatórios DRE/fluxo** - Demonstrações financeiras completas

**Prioridade sugerida:** Alta - Impacto direto em controle financeiro

---

### Módulo Funcionários (RH)

**Funcionalidades sugeridas:**
1. **Gestão de ponto** - Registro de entrada/saída, horas trabalhadas
2. **Folha de pagamento** - Cálculo de salários, benefícios, descontos
3. **Gestão de férias/ferias** - Solicitações, aprovação, saldo
4. **Avaliação de desempenho** - Reviews periódicos, metas, KPIs
5. **Treinamentos** - Registro de capacitações, certificações
6. **Benefícios** - Gestão de plano de saúde, vale transporte, etc.

**Prioridade sugerida:** Média - Compliance e gestão

---

### Módulo Ordens de Serviço (OS)

**Funcionalidades sugeridas:**
1. **Agendamento de técnicos** - Calendário de atendimentos
2. **Gestão de peças/materiais** - Baixa de estoque na execução
3. **Checklists de serviço** - Procedimentos padrão por tipo de OS
4. **Assinatura digital** - Cliente assina conclusão no app
5. **Geolocalização** - Rota otimizada para técnicos
6. **Fotos/Anexos** - Registro visual do serviço executado

**Prioridade sugerida:** Alta - Melhoria operacional

---

### Módulo Configurações

**Funcionalidades sugeridas:**
1. **Gestão de permissões granular** - Controle por módulo/ação
2. **Logs de auditoria avançado** - Filtros, exportação, alertas
3. **Webhooks** - Integração com sistemas externos
4. **Customização de campos** - Campos personalizados por tenant
5. **Templates de documentos** - Configuração de layouts de impressão
6. **Backup/Restore** - Gestão de backups do tenant

**Prioridade sugerida:** Média - Melhoria administrativa

---

### Funcionalidades Transversais

**Funcionalidades sugeridas:**
1. **Notificações** - Push, email, SMS por evento
2. **Relatórios customizados** - Builder de relatórios drag-and-drop
3. **API pública** - Endpoints para integrações externas
4. **Gestão de arquivos geral** - Storage organizado por módulo
5. **Chat interno** - Comunicação entre usuários do tenant
6. **Dashboard executivo** - Visão consolidada de todos os módulos

**Prioridade sugerida:** Média - Melhoria geral do sistema

---

**Fim do Documento**
