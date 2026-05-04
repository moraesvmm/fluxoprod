# VISTORIAS DO SISTEMA

## VISTORIA 61 - Onboarding Premium: Conclusão Total
**Data:** 04/05/2026
**Status:** ⚠️ PENDENTE (AGUARDANDO VISTORIA PÓS-DEPLOY)
**Responsável:** Antigravity

#### Alterações Realizadas:
1. **`data-tour` injetados em todos os 10 módulos:**
   - Dashboard, CRM, Vendas, Estoque, OS, Obras, Financeiro, RH, Comissões e Relatórios.
   - Cada módulo possui ao menos 2 âncoras de spotlight (botão de ação principal + elemento de dado chave).
2. **Componente `TutorialHelpButton` criado:**
   - Arquivo: `apps/web/src/components/onboarding/TutorialHelpButton.tsx`
   - Ícone `HelpCircle` minimalista, inserido no cabeçalho interno de todos os 10 módulos.
   - Permite replay do tutorial a qualquer momento pelo usuário.
3. **Dicionário `tutorials.ts` corrigido e alinhado:**
   - `targetSelector` de Comissões corrigidos de `com-regras`/`com-calcular` para `comissoes-regras`/`comissoes-apurar`.
   - `targetSelector` de Relatórios corrigidos de `rel-dre`/`rel-exportar` para `relatorios-personalizar`/`relatorios-gerar`.
4. **Importação inválida removida:**
   - `SyncFeedbackModal` (inexistente) removido do `financeiro/page.tsx` para evitar erro de build.

#### Arquivos Modificados:
- `apps/web/src/lib/onboarding/tutorials.ts`
- `apps/web/src/components/onboarding/TutorialHelpButton.tsx` *(novo)*
- `apps/web/src/app/tenant/dashboard/page.tsx`
- `apps/web/src/app/tenant/crm/page.tsx`
- `apps/web/src/app/tenant/vendas/page.tsx`
- `apps/web/src/app/tenant/estoque/page.tsx`
- `apps/web/src/app/tenant/os/page.tsx`
- `apps/web/src/app/tenant/obras/page.tsx`
- `apps/web/src/app/tenant/financeiro/page.tsx`
- `apps/web/src/app/tenant/rh/page.tsx`
- `apps/web/src/app/tenant/comissoes/page.tsx`
- `apps/web/src/app/tenant/relatorios/page.tsx`

#### Pendências para a Vistoria:
- [ ] Confirmar que o `TutorialHelpButton` renderiza corretamente dentro do `OnboardingProvider`
- [ ] Verificar spotlight dos tours nos módulos Comissões e Relatórios (seletores recém-corrigidos)
- [ ] Testar fluxo completo: acessar módulo → tutorial dispara → navegar passos → replay via botão Help
- [ ] Garantir que a importação de `SyncFeedbackModal` não ficou quebrada em produção

---



## VISTORIA 60 - Inteligência de Dashboard (Upsell Visual)
**Data:** 04/05/2026
**Status:** ⚠️ PENDENTE (AGUARDANDO VISTORIA)
**Responsável:** Antigravity

#### Alterações Realizadas:
1.  **Dashboard Adaptativo (KPIs):**
    - Refatoração dos cartões de KPI (Faturamento, Vendas, Estoque, CRM, OS e Obras) para utilizar a estratégia de "Upsell Visual".
    - Cartões de módulos não contratados agora aparecem em estado desabilitado (cinza) com ícone de cadeado e valor omitido.
    - Implementação de tooltip informativa: *"Para ter acesso a estes dados, adquira o módulo X"*.
2.  **Ações Rápidas Condicionais:**
    - Atalhos de "Nova Venda", "Conciliar Extrato" e "Cadastrar Cliente" agora respeitam a contratação do tenant.
    - Botões ficam inativos e exibem aviso de bloqueio quando o módulo correspondente está ausente.
3.  **Componentização Core:**
    - Atualização dos componentes `KPICard` e `ActionCard` no diretório base para suportar os estados `disabled` e `disabledMessage` de forma nativa e reutilizável.

#### Arquivos Modificados:
- `apps/web/src/components/modules/base/KPICard.tsx`
- `apps/web/src/components/modules/base/ActionCard.tsx`
- `apps/web/src/app/tenant/dashboard/page.tsx`

#### Próximos Passos:
- Verificar se novos cartões de ação (ex: "Nova OS") devem ser adicionados dinamicamente para usuários que possuem o módulo de OS mas não o de Vendas.

---

## VISTORIA 59 - Inteligência de Relatórios (Upsell & Expansão OS/Obras)
**Data:** 04/05/2026
**Status:** ⚠️ PENDENTE (AGUARDANDO VISTORIA)
**Responsável:** Antigravity

#### Alterações Realizadas:
1.  **Estratégia de Upsell Visual:**
    - Implementação de botões de relatório dinâmicos que ficam desabilitados (cinzas) e exibem alerta de aquisição quando o módulo correspondente não está ativo no tenant.
    - Adição de ícones de cadeado (`Lock`) e tooltips informativos para incentivar a contratação de novos módulos.
2.  **Expansão de Relatórios:**
    - Inclusão dos módulos de **Ordem de Serviço (OS)** e **Obras** na aba de Relatórios.
    - Implementação de KPIs específicos (Total de OS, Orçamentos, Obras em Andamento) e listagem analítica com dados reais via RPC.
3.  **Integração de Módulos:**
    - Sincronização da interface de relatórios com o estado real de contratação do tenant via hook `useSidebarData`.
4.  **Checkout & Marketing:**
    - Atualização dos cards informativos na página de Checkout (`/checkout`) para incluir as novas funcionalidades de relatórios analíticos em todos os módulos.

#### Arquivos Modificados:
- `apps/web/src/app/tenant/relatorios/page.tsx`
- `apps/web/src/app/(auth)/checkout/page.tsx`

#### Próximos Passos:
- Validar a Tooltip nativa em diferentes navegadores.
- Testar a geração de relatórios de OS e Obras com dados reais de produção.

---

## VISTORIA 57 - Logística WhatsApp e CRM Kanban
**Data:** 01/05/2026
**Status:** ⚠️ PENDENTE (AGUARDANDO VISTORIA)
**Responsável:** Antigravity

#### Alterações Realizadas:
1.  **Logística WhatsApp:** 
    - Refatoração completa dos estados de conexão (`connected`, `connecting`, `qr_pending`, `disconnected`).
    - Implementação de "Sincronização" (Soft Lock) que permite visualizar mensagens em cache enquanto o aparelho reconecta.
    - Fim do loop infinito de QR Code no painel de configurações.
2.  **CRM Kanban (Pipeline):**
    - Correção do mau funcionamento do Drag and Drop (race condition de estado React).
    - Sincronização automática de cache entre as visualizações de Lista e Pipeline.
    - Aumento do limite de visualização de leads de 20 para 1000 no Kanban.

#### Arquivos Modificados:
- `apps/web/src/components/whatsapp/WhatsAppFloatingButton.tsx`
- `apps/web/src/components/whatsapp/ChatDrawer.tsx`
- `apps/web/src/components/configuracoes/WhatsAppConnection.tsx`
- `apps/web/src/lib/hooks/use-pipeline.ts`
- `apps/web/src/components/crm/kanban-pipeline.tsx`

#### Próximos Passos:
- Realizar teste de movimentação de leads em grande escala no Kanban.
- Validar reconexão automática do WhatsApp em ambiente de produção (Vercel).

---

## VISTORIA 58 - Refatoração WhatsApp Service Multi-Tenant
- **Data:** 04/05/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - **Arquitetura Multi-Tenant**: Refatoração do microsserviço `whatsapp-service` para suportar múltiplas sessões (uma por empresa) isoladas na memória e em diretórios `auth_state/{tenantId}`.
  - **Correção de Envio (9º Dígito)**: Adição da verificação `onWhatsApp(jid)` no disparo de mensagens para normalizar a estrutura do número e corrigir falhas silenciosas.
  - **Autenticação de API Routes**: Injeção segura do `empresa_id` como header `x-tenant-id` em todos os endpoints Next.js que se comunicam com o Railway (`apps/web/src/app/api/whatsapp/**`).

---

## VISTORIA 56 - Padronização UI Dark Mode (Premium)
**Data:** 01/05/2026
**Status:** ✅ CONCLUÍDO
**Responsável:** Antigravity

#### Alterações Realizadas:
1.  **Módulo Catálogo:** Migração total de `bg-white` e `text-slate-900` para `bg-card` e `text-foreground`. Padronização de modais e tabelas.
2.  **Módulo RH e Equipe:** Substituição de cores estáticas por tokens semânticos. Atualização de badges (cargos) e alertas de pagamento para alto contraste.
3.  **Módulo Relatórios:** Redesenho da interface de listagem e botões de exportação. Implementação de estados de loading temáticos e contraste de tabela aprimorado.
4.  **Módulo Configurações:** Auditoria completa de inputs, selects e containers. Conversão de seções de faturamento e dados fiscais para o sistema de cores dinâmico.
5.  **Global:** Refinamento de sombras (`shadow-sm`) e bordas (`border-border`) para garantir profundidade visual em temas escuros.

#### Arquivos Modificados:
- `apps/web/src/app/tenant/catalogo/page.tsx`
- `apps/web/src/app/tenant/rh/page.tsx`
- `apps/web/src/app/tenant/relatorios/page.tsx`
- `apps/web/src/app/tenant/configuracoes/page.tsx`

---

## VISTORIA 55: Estabilização de Infraestrutura WhatsApp e Padronização Dark Mode Premium
- **Data: 01/05/2026**
- **Status: PENDENTE (Realizar vistoria o mais rápido possível)**
- **Alterações:**
  - **WhatsApp (Infraestrutura)**:
    - Resolução definitiva do erro 403 Forbidden no build da Vercel via `vercel.json` e isolamento de estado no `WhatsAppFloatingButton`.
    - Conectividade direta: URLs e API Keys de produção do Railway foram fixadas nas rotas de API do Next.js para evitar problemas de cache de variáveis de ambiente.
    - UI: Implementação de Glassmorphism no botão flutuante e painel de conexão.
  - **Design System (Dark Mode)**:
    - Padronização visual dos módulos de **CRM** e **Financeiro**.
    - Substituição de cores estáticas (`bg-white`, `text-slate-900`) por tokens semânticos (`bg-card`, `text-foreground`, `border-border`).
    - Refinamento de contraste em inputs, labels, tabelas e modais para garantir legibilidade e estética premium no tema escuro.
  - **Estabilidade**: Sincronização de todos os commits e deploys entre GitHub, Vercel e Railway.

---

## VISTORIA 54: Estabilização Anti-Spam WhatsApp e Fix de Deploy
- **Data:** 30/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - **Prevenção de Loop de QR Code:** Removido o auto-connect no boot quando não há sessão salva. Agora a conexão é iniciada apenas via ação explícita no frontend, evitando bloqueios do WhatsApp ("Não é possível conectar novos dispositivos").
  - **Gerenciamento de QR Code:** Implementado limite de 3 tentativas de geração de QR e delay entre retentativas para respeitar limites do WhatsApp.
  - **Browser Fingerprint:** Atualizado fingerprint para `Fluxo ERP (Chrome)` para reduzir chances de detecção de bot.
  - **Fix de Build (Docker):** Alterado `npm ci` para `npm install` no Dockerfile para suportar ambientes sem `package-lock.json` no subdiretório do monorepo.
  - ** Railway Config:** Adicionado `railway.json` local ao serviço de WhatsApp para forçar o uso do Dockerfile builder e isolar o contexto de deploy.

---

## VISTORIA 53: Correção do Build (Vercel e Railway) e Revisão de Configurações WhatsApp
- **Data:** 30/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - **Vercel Build (Next.js)**: Adicionado `serverExternalPackages` no `next.config.ts` para isolar `xml-crypto` e dependências `@xmldom/is-dom-node`, resolvendo erro de bundle server-side.
  - **Vercel Build (Tailwind)**: Adicionada a dependência opcional `lightningcss-linux-x64-gnu` no `apps/web/package.json` para evitar falha no Turbopack.
  - **Railway Build (WhatsApp Service)**: Movidas `devDependencies` do `whatsapp-service/package.json` para `dependencies` e ajustado script de build para `tsc` direto, garantindo que o compilador TypeScript não seja removido em ambientes de produção (`NODE_ENV=production`).
  - **Vistoria Módulo Configurações**: Confirmado que o componente de status do WhatsApp consome `/api/whatsapp/status` e que este depende da ENV `WHATSAPP_SERVICE_URL`. Sem modificações adicionais necessárias no frontend.

---

## VISTORIA 52: Estabilização de Configurações e Infraestrutura (Build Fix)
- **Data**: 30/04/2026
- **Status**: ✅ CONCLUÍDO
- **Alterações**:
  - **Loop Fiscal-Config**:
    - Rota `/api/tenant/fiscal-config` atualizada para tratar usuários `master` sem erro 400.
    - RPCs de banco (`tenant_buscar_configuracao` e `tenant_salvar_configuracao`) tornadas resilientes a contextos sem tenant (retornam NULL graciosamente).
    - Hook `useRHConfig` ajustado para evitar fallbacks de tabela inexistente no schema public, eliminando erro 400.
  - **Infraestrutura Railway**:
    - Adicionado `railway.json` na raiz para definir contextos de build (`Root Directory`) e suporte a monorepo.
    - Criado `package.json` na raiz com configuração de `workspaces` para suporte nativo a monorepo pelo ambiente Node.js do Railway/Vercel.

---

## VISTORIA 51: Marketplace e Loja de Módulos
- **Data:** 30/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - **SaaS (Marketplace)**: Implementação da "Loja de Módulos" como recurso nativo para todos os usuários.
  - **Identidade Visual**: Design premium com Glassmorphism, Framer Motion e Dark Mode otimizado.
  - **Roteamento**: Atualização do `proxy.ts` (white-list) e `Sidebar.tsx` para garantir acesso perpétuo ao marketplace.
  - **Checkout Incremental**: Integração do gateway Asaas para aquisição de módulos individuais por empresas já ativas.
  - **Automação**: Atualização do Webhook de pagamento para ativação automática de módulos na tabela `empresa_modulos` via metadados.
  - **Documentação**: Cards informativos da loja baseados integralmente na @DOCUMENTACAO_TECNICA.md.

---

## VISTORIA 50
- **Data:** 30/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - **Módulo OS**: Implementação de visão Kanban com Drag & Drop para gestão de status.
  - **Produtividade**: Sistema de Cronômetro (Timer) persistido no banco para rastreio de tempo de execução.
  - **Financeiro OS**: Integração de custos de peças e cálculo automático de lucro por OS.
  - **Documentação**: Novo Modal de Detalhes com visualização de lucro, histórico e botão de impressão de PDF.
  - **Banco de Dados**: Script `rpc_os_expansion.sql` para suporte a itens, cronômetro e numeração de OS.

---

## VISTORIA 49
- **Data:** 30/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - **Core**: Unificação das interfaces de `Funcionario` em `@/lib/api` para corrigir falhas de build na Vercel.
  - **SaaS (Checkout)**: Implementação do sistema de cupons de desconto no fluxo de checkout.
  - **Admin Master**: Criação de painel de gestão de cupons (`/admin/cupons`).
  - **Banco de Dados**: Criação da tabela `public.cupons` e RPCs de validação e uso atômico.
  - **API Route**: Integração do registro de uso de cupom na rota `/api/auth/register-trial`.

---

## VISTORIA 48 - Estabilização Conexão WhatsApp e QR Code
- **Data:** 30/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - Resolução do "loop infinito" na geração de QR Code: melhoria no gerenciamento de estados (`connecting`, `qr_pending`) no componente frontend.
  - Correção de erro 405 (Connection Closed) no microserviço: atualização do Baileys para versão mais estável e ajuste de `appVersion` dinâmico via `fetchLatestBaileysVersion`.
  - Sincronização de credenciais: alinhamento da `WHATSAPP_API_KEY` entre Vercel e Railway.
  - Auto-connect no Boot: Microserviço agora tenta conectar sessões existentes automaticamente ao iniciar.
  - UI Feedback: Adição de mensagens de status claras ("Gerando QR Code...", "Iniciando conexão...") e aumento do polling para 4s para evitar race conditions.

---

## VISTORIA 47 - Integração WhatsApp Headless (Baileys)
- **Data:** 30/04/2026
- **Status:** CONCLUÍDO
- **Alterações:**
  - Criação do microserviço `whatsapp-service/` com Baileys (Node.js/Express) para comunicação WhatsApp sem APIs pagas.
  - 7 arquivos no microserviço: index.ts, whatsapp.ts (sessão Baileys), store.ts (memória), routes.ts, package.json, tsconfig.json, Dockerfile.
  - 6 API Routes proxy em `/api/whatsapp/`: status, qr, send (individual + massa), conversations, messages, disconnect.
  - 4 componentes frontend: WhatsAppFloatingButton (botão flutuante arrastável com badge), ChatDrawer (painel lateral de conversas), ChatWindow (chat individual estilo WhatsApp), WhatsAppConnection (painel QR nas Configurações).
  - Integração do botão flutuante no TenantLayout (aparece em todas as páginas).
  - Integração do painel de conexão na página de Configurações.
  - Upgrade do `handleEnviarCampanha` no CRM: envio direto via microserviço quando tipo=whatsapp e conectado, fallback para RPC.
  - Upgrade do `handleWhatsApp` no NurturingPanel: envio direto quando conectado, fallback para wa.me.
  - Rate limiting (50 msg/campanha), delay anti-spam (15s), reconexão automática (5 tentativas).
  - **Nenhuma RPC existente do CRM foi alterada** (conformidade com Regra de Ouro).
- **Pendência:** Deploy do microserviço no Railway e configuração de env vars na Vercel.

---

## VISTORIA 42 - NFe Nativa Node (Hardening de Seguranca e Contratos)
- **Data:** 29/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rapido possivel)
- **Alteracoes:**
- [x] Fix Database RPCs (`tenant_buscar_configuracao`)
- [x] Fix API Route (`fiscal-config/route.ts`)
- [x] Fix Frontend Hook (`use-rh-config.ts`)
- [x] Configure Railway Infrastructure (`railway.json`)
- [x] Configure Root Workspace (`package.json`)
- [x] Update Documentation (`VISTORIAS.md`)
  - Remocao da exposicao de segredos fiscais no frontend de Configuracoes.
  - Criacao de rotas server-side para configuracao fiscal, upload de certificado e leitura autenticada do XML da NFe.
  - Refatoracao da rota /api/fiscal/nfe/emitir e do NfeService para contexto explicito de tenant, sem dependencia de search_path implicito.
  - Persistencia estavel do XML fiscal e ajuste do historico/DANFE para consumo autenticado via API.
  - Complemento server-side dos campos fiscais de produto (NCM, CFOP, origem) e inclusao do codigo_municipio_ibge para o emitente.

---

## VISTORIA 41 - Logística NFe (Build + Instrumentaç?o)
- **Data:** 29/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alteraç?es:**
  - Correç?es de build TypeScript/JSX (Catálogo, Configuraç?es, Vendas).
  - Ajuste de compatibilidade `xml-crypto` (assinatura XML) para a vers?o instalada.
  - Instrumentaç?o server-side na rota `/api/fiscal/nfe/emitir` com fallback de log NDJSON local para auditoria runtime.

---

## VISTORIA 40 - Inteligência Financeira & CMV
- **Data:** 29/04/2026
- **Status:** CONCLUÍDO
- **Alterações:**
  - Implementação de integração automática Venda -> Financeiro.
  - Motor de DRE Real (Demonstrativo de Resultados) com cálculo de CMV.
  - Sistema de Conciliação Bancária real via parser de arquivos OFX.
  - KPI de Patrimônio em Estoque (Capital Imobilizado) no Dashboard.
  - Atualização dos cards de checkout com as novas features.

---

## VISTORIA 39 - GestÃ£o de Vendas (Cancelamento e DevoluÃ§Ã£o)
- **Data:** 28/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rÃ¡pido possÃ­vel)
- **AlteraÃ§Ãµes:**
  - ImplementaÃ§Ã£o de RPCs `tenant_cancelar_venda` e `tenant_devolver_item`.
  - Estorno automÃ¡tico de estoque em cancelamentos e devoluÃ§Ãµes parciais.
  - Feedback visual de status 'cancelado' no histÃ³rico de vendas.
  - AtualizaÃ§Ã£o dos cards de checkout com novas funcionalidades.

---

# MÃ“DULO CHECKOUT & ASSINATURAS

| DATA | VISTORIA | STATUS | RESUMO |
| :--- | :--- | :--- | :--- |
| 2026-04-27 | Provisionamento AutomÃƒÂ¡tico & E-mail Trial | **PENDENTE** | AutomaÃƒÂ§ÃƒÂ£o de DDL e link de ativaÃƒÂ§ÃƒÂ£o real. |
| 2026-04-27 | Teste GrÃƒÂ¡tis de 7 Dias (Free Trial) | **PENDENTE** | Fluxo de registro trial e upgrade Asaas. |
| 2026-04-26 | Dashboard KPI & CRM Nurturing | CONCLUÃƒï¿½DO | Ajuste de RPCs globais e schemas dinÃƒÂ¢micos. |
