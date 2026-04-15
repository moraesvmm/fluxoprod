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

**Fim do Documento**
