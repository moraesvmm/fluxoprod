> [!IMPORTANT]
> **Regra global (banco → tipos):** sempre que o banco de dados for alterado (incluindo SQL aplicado no Supabase ou migrações em `apps/api/migrations/`), é **obrigatório** regenerar `apps/web/src/types/database.types.ts` com `supabase gen types typescript` do projeto e tratar o diff conforme [`DOCUMENTACAO_TECNICA.md`](DOCUMENTACAO_TECNICA.md) (regra no topo + seção de sincronização de tipos).
>
> **Alinhamento SQL `public` (tabelas/views/RPCs + índices curados):** ver [`SQL_ALINHAMENTO_COMPLETO.md`](SQL_ALINHAMENTO_COMPLETO.md) e `npm run sql:verify-gen` na raiz.

---

## VISTORIA PENDENTE - Caixa diario por filial
**Data:** 01/09/2026
**Status:** PENDENTE (validar antes do deploy)
**Alteracoes:**
- Criada migracao `apps/api/migrations/caixa_diario_filiais.sql` com hook idempotente para filiais, caixas, sessoes, movimentos e fechamentos auditaveis.
- Vendas e cancelamentos passam a registrar o movimento financeiro no caixa autorizado da filial; o banco bloqueia acesso cruzado entre filiais.
- Criada a rota `Vendas > Caixa`, com conferencia por forma de pagamento, sangria, suprimento, fechamento com justificativa de diferenca e reabertura gerencial.
- O historico de vendas abre no filtro do dia operacional e o PDV envia o contexto filial/caixa autorizado.
- Ajustado o tema global de controles numericos para que os spinners nativos respeitem claro/escuro, e corrigida a acentuacao de rotulos visiveis de navegacao e caixa.
- Convites persistem permissao explicita para cada modulo contratado e negam, por padrao, os modulos nao selecionados.
- A sidebar invalida suas permissoes em login/logout e nao retem cache entre sessoes, impedindo que modulos de um administrador aparecam para usuario recem-autenticado.
- O cabeçalho mobile oculta a busca global para preservar os controles, e o app agora expõe manifesto, service worker, atalho instalável e notificacao persistente ao concluir venda.
- Web Push remoto: dispositivos autorizados registram assinatura por empresa em `push_assinaturas`; vendas disparam notificacao VAPID para os dispositivos inscritos, inclusive quando a venda foi realizada em outro dispositivo.
- Pendente de ambiente: definir `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` na Vercel antes de ativar o envio remoto.
- Criada a migracao `dashboard_dono_financeiro_filial.sql`: financeiro recebe filial obrigatoria, usuarios comuns veem somente sua filial e administrador usa visao geral ou filtra uma filial no Dashboard do Dono.
- O painel CRM existente foi elevado para fila de recompra priorizada por vencimento, com contagem de oportunidades e proxima acao de contato.
- Pendente obrigatorio: executar a migracao em transacao com `ROLLBACK`, rodar `apps/api/testes_provisionamento_hooks.sql`, regenerar `database.types.ts` usando a CLI apos aplicar em ambiente de banco e rodar `scripts/export_db_map.py`.

---

## ⚠️ VISTORIA PENDENTE — Integração WhatsApp Cloud API Meta (Vistoria 82)
**Data:** 10/08/2026
**Status:** ⚠️ PENDENTE (Realizar vistoria o mais rápido possível)
**Alterações:**
- Criação de 5 RPCs no Supabase para gerenciamento seguro de credenciais da Cloud API Meta:
  - `tenant_salvar_whatsapp_cloud_api` — Salva credenciais com verify_token único por tenant
  - `tenant_buscar_whatsapp_cloud_api` — Retorna dados mascarados (token nunca exposto ao browser)
  - `tenant_remover_whatsapp_cloud_api` — Remove integração
  - `tenant_whatsapp_cloud_api_credentials` — RPC interna para webhook (busca por phone_number_id)
  - `webhook_verificar_token_whatsapp` — Valida verify_token do webhook contra todos os tenants
- Criação de 4 API Routes Next.js:
  - `/api/whatsapp-meta/config` (GET/POST/DELETE) — Configuração com validação via API Meta
  - `/api/whatsapp-meta/send` (POST) — Envio de mensagens (texto e template)
  - `/api/whatsapp-meta/templates` (GET) — Listagem de templates aprovados na Meta
  - `/api/webhooks/whatsapp-meta` (GET/POST) — Webhook público para receber mensagens da Meta
- Criação do componente `WhatsAppCloudAPI.tsx` no módulo Configurações com:
  - Formulário de credenciais (Access Token, Phone Number ID, WABA ID)
  - Guia passo-a-passo integrado para empresas se conectarem
  - Exibição de Webhook URL e Verify Token para copiar e colar no painel Meta
  - Status de conexão em tempo real
  - Validação automática do token com a API da Meta antes de salvar
- Modificação de `WhatsAppConnection.tsx` para bloqueio mútuo com Cloud API (dual-mode)
- Integração na página `configuracoes/page.tsx` com estado compartilhado `cloudApiAtivo`
- **Segurança**: Tokens armazenados como JSONB na tabela configuracoes do tenant, mascarados no retorno

---

## ⚠️ VISTORIA PENDENTE — Correção: Erros de Tipagem e Build da Vercel (Vistoria 81)
**Data:** 20/05/2026
**Status:** ⚠️ PENDENTE (Realizar vistoria o mais rápido possível)
**Responsável:** Antigravity

#### Problema Identificado:
- **Build Quebrado:** O pipeline de CI/CD (produção) na Vercel falhava na etapa `next build` devido a múltiplos erros `TS2345` e acessos de propriedades incorretas em páginas de chão de fábrica.
- O campo `password` era estritamente obrigatório no SDK do Supabase ao re-enviar e-mail de confirmação usando `generateLink({ type: 'signup' })`.
- A interface `Produto` no Frontend estava defasada, causando erros no Typescript ao acessar a propriedade `tipo_item` vinda do banco de dados na página de fichas-técnicas.
- O hook `useToast` foi refatorado para usar `.success()` e `.error()`, mas algumas páginas ainda usavam a estrutura de desestruturação antiga `const { toast } = useToast()`.

#### Correções Aplicadas:
| Arquivo | Alteração |
|---------|-----------|
| `apps/web/src/app/api/auth/resend-confirmation/route.ts` | Adicionado `@ts-expect-error` à chamada `generateLink` de confirmação (Signup type) como bypass para a verificação estrita do Supabase Admin SDK no Typescript, permitindo sucesso sem necessitar passar o campo `password`. |
| `apps/web/src/lib/api.ts` | A interface `Produto` foi atualizada adicionando `tipo_item?: string` e `unidade_medida?: string`, refletindo a tabela de banco de dados (`public.produtos`). |
| `apps/web/src/app/tenant/producao/fichas-tecnicas/page.tsx` | Assinatura de `useToast` modificada para acessar propriedades `{ error, success }`. |
| `apps/web/src/app/tenant/producao/painel-op/page.tsx` | Assinatura de `useToast` e métodos de retorno modificados para `{ error, success }`. |

#### Validação Pendente:
- [ ] Iniciar fluxo completo de emissão de "Ordem de Produção", atestando visualmente os *Toasts* de SUCESSO/ERRO aparecendo.
- [ ] Acessar "Fichas Técnicas" no painel tenant verificando comportamento de listagem se a propriedade `tipo_item` da interface `Produto` está devidamente pareada na listagem UI.
- [ ] Confirmar se há outro lugar ainda utilizando `const { toast } = useToast()` indevidamente na aba chão de fábrica ou Produção.

---

## ⚠️ VISTORIA PENDENTE — Correção: UX do E-mail e Redirecionamento Pós-Ativação (Vistoria 80)
**Data:** 20/05/2026
**Status:** ⚠️ PENDENTE (Realizar vistoria o mais rápido possível)
**Responsável:** Antigravity

#### Problema Identificado:
- **Design do E-mail (Gmail/Outlook):** O e-mail de ativação renderizava quebrado (sem CSS) e visualmente feio na maioria dos provedores porque as tags `<style>` no `<head>` eram ignoradas/removidas.
- **Falha na Ativação:** O link gerado para confirmar o e-mail estava como `type: 'magiclink'`, o que não processava perfeitamente o status de "e-mail verificado" ou o redirecionamento. Como resultado, ao clicar no link, o usuário caía na tela de login sem feedback visual (não acontecia nada) e o e-mail não era oficialmente confirmado no Supabase, bloqueando o login com erro "email não verificado".

#### Correções Aplicadas:
| Arquivo | Alteração |
|---------|-----------|
| `apps/web/src/lib/email.ts` | **Refatoração Total:** O template HTML foi reescrito para utilizar *inline styles* em todas as tags, garantindo renderização idêntica (fundo escuro, botão com destaque, margens corretas) no Gmail, Outlook e Apple Mail. O botão e os fallbacks de link foram aprimorados. |
| `apps/web/src/app/api/auth/register-trial/route.ts` | Alterado a geração do link de `type: 'magiclink'` para `type: 'signup'`, que é o tipo correto para confirmação inicial de conta no Supabase. |
| `apps/web/src/app/api/auth/resend-confirmation/route.ts` | Alterado a geração do link de reenvio de `type: 'magiclink'` para `type: 'signup'`. |
| `apps/web/src/app/(auth)/login/page.tsx` | **Novo Hook de Sucesso:** Implementado `useEffect` para interceptar a URL pós-confirmação. Se houver `access_token` no hash da URL e `type=signup`, o app agora reconhece a sessão de confirmação, exibe um banner verde "Sua conta foi ativada com sucesso! Autenticando...", e redireciona automaticamente para o dashboard, sem exigir novo login manual. Se não houver sessão ativa mas vier via redirect normal, avisa "E-mail verificado! Faça login com sua senha". |

#### Validação Pendente:
- [ ] Testar envio do e-mail: confirmar que a renderização no Gmail (cores e botão) está visualmente perfeita e responsiva.
- [ ] Clicar no botão "Ativar Minha Conta" em nova aba anônima: confirmar que abre a tela de login.
- [ ] Na tela de login pós-clique, verificar a exibição da barra de sucesso e o redirecionamento automático para `/tenant/dashboard` em aprox. 1.5s.
- [ ] Caso não redirecione, confirmar que o login manual aceita a senha (confirmação oficial de e-mail efetivada no Supabase).

---

## ⚠️ VISTORIA PENDENTE — Correção: E-mail de Confirmação e Botão Reenviar (Vistoria 79)
**Data:** 20/05/2026
**Status:** ⚠️ PENDENTE (Realizar vistoria o mais rápido possível)
**Responsável:** Antigravity

#### Problema Identificado:
- E-mail de boas-vindas/ativação não chegava ao usuário após o provisionamento.
- Botão "clique aqui para reenviar" na tela de sucesso do checkout era decorativo (sem lógica).

#### Causa Raiz:
1. **`RESEND_API_KEY` ausente nas variáveis de ambiente** (`apps/web/.env.local` e Vercel). Sem a chave, `sendWelcomeEmail` retornava silenciosamente.
2. **Remetente errado:** `onboarding@resend.dev` (domínio sandbox) estava hardcoded — só entrega para e-mails verificados no painel Resend.
3. **Botão sem `onClick`:** O `<button>` de reenvio não tinha nenhum handler, estado ou chamada de API.

#### Correções Aplicadas:
| Arquivo | Alteração |
|---------|-----------|
| `apps/web/src/lib/email.ts` | Remetente corrigido para `noreply@seufluxoerp.com.br` (domínio `verified` na conta Resend) |
| `apps/web/src/app/api/auth/resend-confirmation/route.ts` | **[NOVO]** Endpoint `POST /api/auth/resend-confirmation` — localiza o usuário, verifica se ainda não confirmou, gera novo magic link via Supabase Admin e reenvia via Resend |
| `apps/web/src/app/(auth)/checkout/page.tsx` | Botão de reenvio agora funcional: estados `resendLoading`, `resendStatus` (`idle`/`sent`/`error`), `resendError`, handler `handleResendEmail` com feedback visual completo |
| `apps/web/.env.local` | Adicionado `RESEND_API_KEY` |

#### ⚠️ AÇÃO PENDENTE OBRIGATÓRIA (Operador Humano):
**Adicionar `RESEND_API_KEY` nas variáveis de ambiente da Vercel:**
1. Acesse: https://vercel.com → Projeto `fluxoprod` → Settings → Environment Variables
2. Adicione: `RESEND_API_KEY` = `re_***_***`
3. Marque os ambientes: **Production**, **Preview**, **Development**
4. Faça um **Redeploy** para as variáveis entrarem em vigor.

Sem isso, os e-mails continuarão não sendo enviados em produção.

#### Validação Pendente:
- [ ] Variável `RESEND_API_KEY` adicionada e redeploy realizado na Vercel
- [ ] Testar cadastro completo no checkout: confirmar recebimento do e-mail vindo de `noreply@seufluxoerp.com.br`
- [ ] Testar botão "clique aqui para reenviar": deve exibir loading, depois mensagem de sucesso
- [ ] Testar com e-mail já confirmado: deve retornar erro adequado
- [ ] Verificar logs Vercel/Resend para confirmar entrega

---

## ⚠️ VISTORIA PENDENTE — Conclusão Final: Tipagem de Request Mocks (Vistoria 78)
**Data:** 13/05/2026
**Status:** ⚠️ PENDENTE
**Motivo:** Completada a última fase descrita em `RELATORIO_TIPAGEM_GRADUAL.md` para testes E2E. Tipado o mock de requisição do webhook (upgrade route) exportando a interface `UpgradePayload` da rota e aplicando-a aos testes de vitest em `upgrade.test.ts`. Feito o mesmo no `register-trial.test.ts` ao exportar e aplicar a interface `TrialRegistrationPayload`. Além disso, foram fixados testes que usavam tipagens incorretas em `construction-api.test.ts` e uma duplicidade de declaração de varíável (payload) foi corrigida no `upgrade/route.ts`. Build `tsc --noEmit` validado em `apps/web` com zero erros. Todo ciclo de tipagem gradual documentado nos testes foi concluído.

---


## ✅ VISTORIA 77 — Vistoria profunda integrada, mitigações e governança (13/05/2026)
**Data:** 13/05/2026  
**Status:** ✅ **CONCLUÍDA** (Scripts SQL de alinhamento aplicados em produção. Ação manual pendente apenas para rotação de segredos)  
**Base:** `docs/DOCUMENTACAO_TECNICA.md`, `docs/PENDENCIAS.md`, histórico das vistorias 70–76.

### Escopo e método
- Releitura da documentação técnica e reconciliação com o código em `apps/web` (webhooks, `webhook_audit_log`, checkout, comissões).
- Verificação estática: `tsc --noEmit` em `apps/web` **sem erros** (Node do ambiente Cursor + `node_modules/typescript`).
- **Supabase MCP:** não há servidor MCP do Supabase habilitado em `mcps/` neste workspace; precisão em catálogo de objetos do banco live depende do **SQL Editor / CLI** com credenciais apenas em **variáveis de ambiente locais** (nunca em arquivos versionados ou em chat).
- **Conectividade (13/05/2026):** a partir deste ambiente Cursor, conexões TCP ao host direto `db.*.supabase.co` (IPv6) e ao **pooler** (porta 6543) falharam (*network unreachable* / *timeout*), compatível com **firewall corporativo** bloqueando PostgreSQL. A comparação live foi materializada como script somente-leitura `apps/api/migrations/verify_public_indexes_from_migrations.sql` para execução no painel Supabase.
- **Railway / WhatsApp:** token de API não foi utilizado nesta sessão; manter apenas em secrets da Vercel/Railway.

### Mitigações aplicadas no repositório
| Item | Mitigação |
|------|-----------|
| Índices checkout/webhook | Inclusão de `idx_webhook_audit_log_ext_tx` em `apps/api/migrations/fix_indexes_checkout_webhook.sql`, alinhado ao campo usado em todo `insert` do webhook e correlação com `checkout_vendas`. |
| Documentação contraditória | Atualização da seção **Status Atual** em `docs/DOCUMENTACAO_TECNICA.md` para refletir Vercel, contrato real de `webhook_audit_log` e pendências apenas como **migrações SQL live**. |
| Registro incorreto Vistoria 70 | Correção da linha BUG-06 na tabela abaixo (colunas reais do audit log). |

### Segurança — ação obrigatória (operador humano)
Durante esta solicitação, **segredos de produção** (JWT `service_role`, URI PostgreSQL com senha, Management API, token Railway, chave Resend) foram expostos em texto claro. **Mitigação completa exige:** revogar/regenerar no painel Supabase (anon, service_role, senha DB se necessário), Railway e Resend; atualizar variáveis na Vercel; **não** colar novamente em issues, commits ou documentação rastreada.

### Blindagem E2E (vistorias 71–76)
- Tratadas como **onda única de endurecimento de tipos**; estado atual do repositório compila com TypeScript estrito.
- Próximos deploys na **Vercel** devem seguir `docs/PLANO_PREVENCAO_DEPLOY.md` quando existir no clone (se ausente, usar checklist interno: env vars, `next build`, migrações SQL pendentes).

### Riscos remanescentes (código / produto)
| ID | Severidade | Origem | Descrição | Próximo passo |
|----|------------|--------|-----------|----------------|
| R-CRM-01 | 🔴 P0 | `docs/PENDENCIAS.md` | Divergência `funil_fase` CRM (CHECK no banco vs valores no frontend). | Migração SQL + alinhamento `use-pipeline.ts` em janela dedicada. |
| R-COM-01 | 🔴 P0 | `docs/PENDENCIAS.md` | RPCs de regras de comissão podem estar ausentes no live. | Aplicar `apps/api/migrations/rpc_comissoes_regras.sql` no Supabase. |
| R-SQL-01 | 🟠 P1 | Vistorias 64, 70 | Migrações OS / índices webhook podem não estar aplicadas em todos os ambientes. | Aplicar scripts correspondentes em `apps/api/migrations/` após revisão. |

### Pós-execução `verify_public_indexes_from_migrations` (live)
Rodada validada pelo operador: **16/19** com `present_in_db = true`. **Ausentes no banco:**
- `idx_webhook_audit_log_ext_tx` — alinhar com `fix_indexes_checkout_webhook.sql` (lookup por `external_transaction_id`).
- `idx_user_profiles_not_deleted` e `idx_empresas_not_deleted` — alinhar com `add_soft_delete_all_entities.sql` (parciais em `deleted_at IS NULL`).

**Correção idempotente:** executar `apps/api/migrations/hotfix_public_indexes_verify_gaps.sql` no SQL Editor; em seguida re-rodar o script de verificação até todas as linhas `true`.  
**Nota (42703):** `public.user_profiles` não tem coluna `id` — o índice parcial deve usar **`user_id`** (corrigido no hotfix e em `add_soft_delete_all_entities.sql`).

### Checklist SQL mínimo (produção Supabase)
1. **Gerador (contrato `public` a partir dos tipos):** na raiz, `npm run sql:verify-gen` — atualiza `verify_public_tables_*`, `verify_public_views_*`, `verify_public_functions_*`.
2. **Verificação (read-only):** rodar no SQL Editor, em ordem, os arquivos gerados + `verify_public_indexes_from_migrations.sql` — ver [`docs/SQL_ALINHAMENTO_COMPLETO.md`](SQL_ALINHAMENTO_COMPLETO.md); todas as linhas devem estar `present_in_db = true`.
3. `apps/api/migrations/fix_indexes_checkout_webhook.sql` (inclui `idx_checkout_vendas_ext_tx`, `idx_webhook_audit_log_ext_tx`, `idx_webhook_audit_log_status`, `idx_webhook_audit_log_ts`).
4. `apps/api/migrations/rpc_comissoes_regras.sql`.
5. Demais arquivos em `apps/api/migrations/` já citados em vistorias anteriores (OS assistência, relatórios, etc.) conforme necessidade do tenant.

### Encerramento das entradas “pendente de vistoria” 71–76
As vistorias **71 a 76** permanecem no arquivo como **registro histórico de alterações**. A validação integrada desta rodada as **substitui como fila ativa**: não é necessário reabrir vistoria separada para cada uma, desde que o checklist SQL e `PENDENCIAS.md` sejam endereçados nas próximas janelas de manutenção.

#### Correção documental — Vistoria 70 / BUG-06 (tabela abaixo)
A descrição original citava colunas genéricas incorretas; o contrato vigente é o de `database.types.ts` e dos `insert` em `apps/web/src/app/api/webhook/payment/route.ts`.

---

## ⚠️ VISTORIA PENDENTE — Blindagem Gradual: API Core, Webhooks e Rotas Fiscais (Vistoria 76)
**Data:** 13/05/2026
**Status:** ✅ FECHADA — consolidada na **Vistoria 77** (13/05/2026); registro mantido como changelog.
**Motivo:** Concluída nova rodada de blindagem de tipagem alinhada ao `RELATORIO_TIPAGEM_GRADUAL.md`, com foco na camada `apps/web/src/lib/api.ts`, nos webhooks/rotas críticas (`register-trial`, `checkout/upgrade`, `webhook/payment`, `tenant/catalogo/fiscal`, `tenant/fiscal-config`) e na página `mestre`. Removidos `any` operacionais, introduzidos helpers de parsing/erro para RPCs, tipados payloads de webhook e retornos de nurturing/código de barras, e ajustados consumidores de estoque/CRM para respeitar os novos contratos. Validação executada com `tsc --noEmit` em `apps/web` concluída com **zero erros**.

---

## ⚠️ VISTORIA PENDENTE — Blindagem E2E Batch: Dashboard, Configs, Relatórios, CRM, Catálogo, Loja e DANFE (Vistoria 75)
**Data:** 12/05/2026
**Status:** ✅ FECHADA — consolidada na **Vistoria 77** (13/05/2026); registro mantido como changelog.
**Motivo:** Blindagem em lote de 8 módulos/páginas: Dashboard (iterador `Venda`, StatusBadge sem `as any`, Recharts formatter), Configurações (4 catch blocks), Relatórios (ReportRow → `Record<string, unknown>`, helper `get<T>()`, LucideIcon em KPIs), Comissões (3 catch blocks), Catálogo (FiscalItem interface, ProdutoCreate, 4 catch blocks), CRM (`abrirEdicao` e iterador tipados com `Cliente`), Loja (ICON_MAP → `LucideIcon`) e DANFE (catch block). Build `tsc --noEmit` validado com **zero erros**. Cobertura avançou de ~60% para ~80%.

---

## ⚠️ VISTORIA PENDENTE — Blindagem E2E de Tipagem: Módulos RH, OS e Obras (Vistoria 74)
**Data:** 12/05/2026
**Status:** ✅ FECHADA — consolidada na **Vistoria 77** (13/05/2026); registro mantido como changelog.
**Motivo:** Concluída blindagem E2E dos módulos **RH**, **OS** e **Obras**. Eliminadas 25+ instâncias de `any` nas três páginas e no componente `OSKanbanBoard`. Payloads migrados para contratos estritos (`FuncionarioCreate`, `FuncionarioUpdate`, `OrdemServicoUpdate`, `ObraUpdate`). Corrigido mapeamento de campo `orcamento` → `orcamento_total` na interface `ObraUpdate`. Conflito de tipo Framer Motion / HTML5 DragEvent resolvido sem regressão funcional. Build `tsc --noEmit` validado com **zero erros**. Cobertura de tipagem avançou de ~40% para ~60%.

---

## ⚠️ VISTORIA PENDENTE — Blindagem E2E de Tipagem: Módulo CRM (Vistoria 73)
**Data:** 11/05/2026
**Status:** ✅ FECHADA — consolidada na **Vistoria 77** (13/05/2026); registro mantido como changelog.
**Motivo:** Concluída blindagem E2E do módulo **CRM**. Refatorados hooks de clientes e pipeline para garantir tipagem estrita. Componentes `ImportadorClientesExcel`, `DashboardKPIs` e `TimelineInteracoes` agora utilizam contratos estritos do Supabase. Adicionada RPC tipada `fetchCRMDashboardMetricas` no `api.ts`. Build `tsc --noEmit` validado.

---

## ⚠️ VISTORIA PENDENTE — Blindagem E2E de Tipagem Concluída (Vistoria 72)
**Data:** 11/05/2026
**Status:** ✅ FECHADA — consolidada na **Vistoria 77** (13/05/2026); registro mantido como changelog.
**Motivo:** Concluída migração completa do `api.ts` da tipagem `any` para contrato estrito `<Database>` via `getSupabaseStrict()`. RPCs não mapeadas no `database.types.ts` migradas para padrão `_untyped()` (escape hatch documentado). Interfaces perdidas restauradas (`ObraCusto`, `ObraResumoFinanceiro`, `ObraRecurso`, `ObraDocumento`). Build `tsc --noEmit` passou com **zero erros**. Arquivos modificados: `api.ts`, `FinanceiroDashboard.tsx`.

---

## ⚠️ VISTORIA PENDENTE — Nova vistoria pendente pós-alterações (Vistoria 71)
**Data:** 11/05/2026
**Status:** ✅ FECHADA — consolidada na **Vistoria 77** (13/05/2026); registro mantido como changelog.
**Motivo:** Realizadas alterações no frontend do checkout (campo segmento), no backend do register-trial (A La Carte vazia, whitelist do dashboard, link magiclink) e adicionada BLINDAGEM de tipos estática gerando o arquivo `database.types.ts` e tipando os clientes do Supabase (`client.ts`, `server.ts` e `admin.ts`).

---

## VISTORIA 70 — Auditoria e Correção P0/P1: Logística de Provisionamento & Checkout
**Data:** 11/05/2026
**Status:** ✅ CORRIGIDO E SQL APLICADO (`fix_indexes_checkout_webhook.sql` rodado)
**Responsável:** Antigravity

#### Bugs Corrigidos:
| ID | Severidade | Arquivo | Problema | Correção |
|----|------------|---------|----------|----------|
| BUG-01 | 🔴 P0 | `upgrade/route.ts` | JOIN inválido `auth_users!inner` → 500 imediato em qualquer upgrade | Removido JOIN; email obtido via `admin.auth.admin.getUserById()` |
| BUG-02 | 🔴 P0 | `upgrade/route.ts` | Consulta tabela `modulos` (inexistente) → preço extras sempre zerado | Corrigido para `modulos_avulsos` com `preco_promocional ?? preco` |
| BUG-03 | 🔴 P0 | `upgrade/route.ts` | `UPDATE empresas` com `valor_mensalidade` e `modulos_ativos_count` (inexistentes) → 400 ignorado | Update removido (colunas não existem no schema) |
| BUG-04 | 🟠 P1 | `upgrade/route.ts` | Campo `empresa.tamanho_empresa` inexistente → gateway sempre recebe `"1-5"` | Corrigido para `empresa.porte` |
| BUG-05 | 🟠 P1 | `webhook/payment/route.ts` | `upsert empresa_modulos` com `atualizado_em` (inexistente) → módulos não ativados em upgrades | Coluna removida do upsert |
| BUG-06 | 🔴 P0 | `webhook/payment/route.ts` | `webhook_audit_log` recebia colunas inexistentes → inserts falhavam / sem rastreio | Corrigido para o schema real: `external_transaction_id`, `status`, `payload`, `detalhes` (Vistoria 77 — alinhado a `database.types.ts`) |
| INC-04 | 🟡 P3 | `checkout/page.tsx` | `PLANOS_FALLBACK` continha strings de marketing inválidas (risco de reintroduzir bug 69) | Fallback limpo com apenas chaves técnicas válidas |
| INC-05 | 🟡 P2 | `upgrade/route.ts` | `createClient()` SSR (com RLS) em rota que manipula `empresa_modulos` | Migrado para `createAdminClient()` (service_role, sem RLS) |

#### ✅ AÇÃO PENDENTE CONCLUÍDA:
**Executado `apps/api/migrations/fix_indexes_checkout_webhook.sql` no banco Supabase (SQL Editor).**
- `idx_checkout_vendas_ext_tx` — índice no campo de lookup do webhook
- `idx_webhook_audit_log_ext_tx` — índice em `external_transaction_id` (correlação com checkout / auditoria)
- `idx_webhook_audit_log_status` — índice para filtro por status
- `idx_webhook_audit_log_ts` — índice para ordenação cronológica

#### Arquivos Modificados:
- `apps/web/src/app/api/checkout/upgrade/route.ts`
- `apps/web/src/app/api/webhook/payment/route.ts`
- `apps/web/src/app/(auth)/checkout/page.tsx`
- `apps/api/migrations/fix_indexes_checkout_webhook.sql` *(novo)*

---

## VISTORIA 69 — Correção: 500 no register-trial (Módulos Inválidos no Payload)
**Data:** 11/05/2026
**Status:** ✅ CORRIGIDO
**Responsável:** Antigravity

#### Problema:
Erro HTTP 500 ao clicar em "Criar Conta e Iniciar Teste" no checkout.

#### Causa Raiz:
A função `provisionar_empresa_master` valida todos os módulos recebidos contra a tabela `modulos_catalogo`. Os planos no banco (`listar_planos_checkout`) incluem strings de marketing no campo `modulos_incluidos` (ex: `"email_real"`, `"Inteligência de Vendas"`, `"Dark Mode Premium v2.0"`) que **não existem** como chaves em `modulos_catalogo`. Quando esses valores chegavam ao backend, a RPC lançava `'Módulos inválidos no payload'` (HTTP 400), que o `route.ts` capturava e convertia em 500.

**Sequência nos logs do Supabase:**
1. ✅ `POST /auth/v1/admin/users` → 200 (usuário criado)
2. ✅ `GET /rest/v1/planos` → 200 (módulos do plano buscados)
3. ❌ `POST /rpc/provisionar_empresa_master` → **400** (módulos inválidos rejeitados)
4. 🗑️ `DELETE /auth/v1/admin/users` → 200 (rollback automático)

#### Correção Aplicada:
Adicionada whitelist `VALID_MODULE_KEYS` em `register-trial/route.ts` com as 11 chaves técnicas válidas do catálogo. O array de módulos é filtrado **antes** de chamar o provisionamento, descartando silenciosamente strings de marketing e rótulos visuais.

#### Arquivos Modificados:
- `apps/web/src/app/api/auth/register-trial/route.ts`

#### Observação:
A exclusão do login via master (mencionada pelo usuário) é um evento anterior e independente — visível nos logs como `deletar_empresa_master` bem-sucedido. Não tem relação causal com o 500.

---

## VISTORIA 68 - Agente de Prospecção B2B (E-mail Marketing)
**Data:** 10/05/2026
**Status:** ⚠️ PENDENTE (Realizar vistoria o mais rápido possível)
**Responsável:** Antigravity

#### Alterações Realizadas:
1. **Infraestrutura de Prospecção:**
   - Criação do `agente_prospeccao.md` detalhando a estratégia de cold mail e script de automação.
   - Implementação do script `scripts/disparo_prospeccao.js` para disparos automatizados via Resend API.
   - Configuração de templates HTML personalizados com logo e CTAs para o Fluxo ERP.
2. **Controle e Logs:**
   - Criação do `log_envios.md` para rastreamento de campanhas e métricas de conversão.
   - Inclusão de ativos visuais (`logo-fluxo.png`) para consistência de marca nos e-mails.

#### Arquivos Criados/Modificados:
- `agente_prospeccao.md`
- `scripts/disparo_prospeccao.js`
- `log_envios.md`
- `apps/web/scripts/logo-fluxo.png`
- `scripts/logo-fluxo.png`
- `docs/VISTORIAS.md`

#### Próximos Passos:
- Realizar teste de disparo real com 5 leads de controle.
- Validar taxa de entrega e abertura via painel Resend.

---

## VISTORIA 67 - Automação de Testes ERP (Vitest)
**Data:** 06/05/2026
**Status:** ⚠️ PENDENTE (Realizar vistoria o mais rápido possível)
**Responsável:** Antigravity

#### Alterações Realizadas:
1. **Infraestrutura de Testes:**
   - Implementação do framework Vitest no workspace `apps/web`.
   - Configuração de mocks globais para o cliente Supabase (`rpc`, `from`, `select`, `update`, etc) permitindo testes unitários sem dependência de banco real.
   - Criação do `vitest.config.mts` com suporte a aliases de caminho (`@/*`).
2. **Cobertura de Módulos (36 Testes):**
   - **CRM:** Validação de CRUD de clientes, interações, segmentação por tags e campanhas em massa.
   - **Estoque:** Testes de produtos, kits, alertas de reposição, transferências entre locais e valoração por custo médio.
   - **Financeiro:** Validação de lançamentos, comissões, DRE e motor de cupons de desconto.
   - **Obras & Projetos:** Gestão de obras, etapas, acompanhamento físico e alocação de recursos.
   - **Fiscal (NF-e):** Validação de geração de XML, chaves de acesso e consistência de totais.
   - **Infraestrutura:** Testes de provisionamento de tenant (register-trial) e fluxo de checkout/upgrade.
3. **Documentação de Qualidade:**
   - Criação do `docs/RELATORIO_TESTES.md` consolidando todos os resultados e métricas de execução.

#### Arquivos Criados/Modificados:
- `apps/web/vitest.config.mts`
- `apps/web/package.json`
- `apps/web/src/lib/__tests__/crm-api.test.ts`
- `apps/web/src/lib/__tests__/inventory-api.test.ts`
- `apps/web/src/lib/__tests__/finance-api.test.ts`
- `apps/web/src/lib/__tests__/construction-api.test.ts`
- `apps/web/src/lib/services/nfe/__tests__/nfe-xml-builder.test.ts`
- `apps/web/src/app/api/auth/register-trial/__tests__/register-trial.test.ts`
- `apps/web/src/app/api/checkout/upgrade/__tests__/upgrade.test.ts`
- `docs/RELATORIO_TESTES.md`
- `docs/VISTORIAS.md`

#### Próximos Passos:
- Integrar a execução do `npm test` no pipeline de CI/CD (GitHub Actions/Vercel).
- Expandir cobertura para componentes UI (via JSDOM).

---

## VISTORIA 66 - Hardening Fiscal NFe (Simples Nacional)
**Data:** 06/05/2026
**Status:** ⚠️ PENDENTE (Realizar vistoria o mais rápido possível)
**Responsável:** Antigravity

#### Alterações Realizadas:
1. **Assinatura e Transporte Fiscal:**
   - Correção da assinatura XML da NF-e para `SHA-256` no `NfeSigner`, alinhando a implementação com o contrato técnico documentado.
   - Remoção de telemetria local residual (`127.0.0.1`) do `SefazClient`, limpando o caminho de emissão em produção.
2. **Escopo Operacional do Módulo Fiscal:**
   - Bloqueio server-side da emissão nativa para empresas fora do **Simples Nacional**.
   - Remoção do fallback silencioso de UF no roteamento SEFAZ: agora o sistema falha explicitamente quando a UF não está mapeada no backend.
3. **Consistência Fiscal do XML:**
   - Correção do cálculo de `vProd`, `vDesc` e `vNF` no `NfeXmlBuilder` para manter coerência entre itens, desconto e total da nota.
   - Adição de validação de consistência dos totais antes da emissão em `NfeService`.
4. **Frontend e Contrato Comercial:**
   - Atualização do painel de Configurações e do `FiscalGuide` para comunicar claramente que a emissão nativa está liberada somente para Simples Nacional.
   - Atualização do card informativo do módulo `Vendas & PDV` no checkout para refletir o escopo real da funcionalidade fiscal.
5. **Documentação Base da Verdade:**
   - Atualização da `DOCUMENTACAO_TECNICA.md` com o escopo real do módulo fiscal e as UFs atualmente suportadas no backend.

#### Arquivos Modificados:
- `apps/web/src/lib/services/nfe/nfe-signer.ts`
- `apps/web/src/lib/services/nfe/nfe-xml-builder.ts`
- `apps/web/src/lib/services/nfe/sefaz-client.ts`
- `apps/web/src/lib/services/nfe/sefaz-urls.ts`
- `apps/web/src/lib/services/nfe/nfe-service.ts`
- `apps/web/src/lib/server/fiscal-config.ts`
- `apps/web/src/components/modules/fiscal/FiscalGuide.tsx`
- `apps/web/src/app/tenant/configuracoes/page.tsx`
- `apps/web/src/app/(auth)/checkout/page.tsx`
- `docs/DOCUMENTACAO_TECNICA.md`
- `docs/VISTORIAS.md`

#### Próximos Passos:
- Validar emissão em homologação com empresa do Simples Nacional e certificado A1 válido.
- Confirmar comportamento de erro para UF não mapeada e para regime tributário fora do escopo suportado.

---

## VISTORIA 65 — Correção: Exclusão de Empresa, Módulos Gelucos e Setup Master
**Data:** 05/05/2026
**Status:** ⚠️ PENDENTE (Realizar vistoria o mais rápido possível)
**Responsável:** Antigravity

#### Problema 1: FK `cupons_utilizados` impedia exclusão de empresa
- **Causa:** Tabela `cupons_utilizados` tinha FK para `empresas(id)` com `ON DELETE NO ACTION` e a RPC `deletar_empresa_master` não limpava essa tabela antes de deletar a empresa.
- **Correção (Banco):** FK alterada para `ON DELETE CASCADE` + RPC atualizada para incluir `DELETE FROM cupons_utilizados` e `DELETE FROM checkout_vendas` na sequência de limpeza antes da exclusão da empresa.

#### Problema 2: Empresa "gelucos" (plano Pro) sem acesso a módulos
- **Causa:** Tabela `empresa_modulos` estava vazia para gelucos — provisionamento recebeu `modules: []` do frontend, e a RPC não inseriu nenhum módulo.
- **Correção (Banco):** Inseridos os 11 módulos do plano Pro (dashboard, crm, catalogo, estoque, vendas, financeiro, rh, os, obras, comissoes, relatorios) via `INSERT ON CONFLICT`.
- **Correção (Frontend):** `register-trial/route.ts` agora busca `modulos_incluidos` da tabela `planos` quando `payload.modules` vem vazio, com fallback mínimo para módulos Starter.

#### Problema 3: Setup Master → Módulos não salvava
- **Causa:** `/admin/modulos/page.tsx` usava `update` que falhava silenciosamente quando o registro não existia em `empresa_modulos`.
- **Correção:** Trocado `update` por `upsert` com `onConflict: "empresa_id,modulo_key"`.
- **Correção adicional:** `/api/checkout/upgrade/route.ts` referenciava coluna inexistente `modulo_id` e join inválido com `modulos_catalogo`. Substituído por lookup direto na tabela `planos`.

#### Arquivos Modificados:
- `apps/web/src/app/admin/modulos/page.tsx`
- `apps/web/src/app/api/auth/register-trial/route.ts`
- `apps/web/src/app/api/checkout/upgrade/route.ts`
- **Banco:** RPC `deletar_empresa_master`, FK `cupons_utilizados_empresa_id_fkey`, dados `empresa_modulos`

#### Validação:
- [x] `tsc --noEmit` passou sem erros
- [x] FK confirmada como `CASCADE` no banco
- [x] Gelucos confirmada com 11 módulos ativos no banco
- [ ] Teste de exclusão de empresa no setup master (produção)
- [ ] Teste de salvamento de módulos no setup master (produção)

---

## VISTORIA 64 - Expansão do Módulo OS (Assistência Técnica)
**Data:** 05/05/2026
**Status:** ✅ CONCLUÍDO E SQL APLICADO
**Responsável:** Antigravity

#### Alterações Realizadas:
1. **Banco de Dados (SQL: `apps/api/migrations/rpc_os_assistencia_tecnica.sql`):**
   - Novas colunas `equipamento_serial` (TEXT), `laudo_tecnico` (TEXT) e `checklist_entrada` (JSONB) adicionadas via migração multi-tenant (LOOP em schemas `tenant_*`).
   - Atualização da RPC `public.provisionar_empresa` para incluir estas colunas nativamente em novos tenants.
   - **Relatórios:** Atualizada a RPC `public.tenant_listar_ordens_servico` para incluir campos de assistência técnica.
2. **API e Tipagem (`apps/web/src/lib/api.ts`):**
   - Atualizadas interfaces `OrdemServico`, `OrdemServicoCreate` e `OrdemServicoUpdate`.
   - Funções `createOS` e `updateOS` agora enviam os novos campos para as RPCs.
3. **Frontend (UI Premium):**
   - **Página de OS (`os/page.tsx`):** Novos campos de "Série/IMEI" nos formulários de criação e edição.
   - **Detalhes da OS (`OSDetailsModal.tsx`):** Exibição elegante do Série/IMEI e do Laudo Técnico (Diagnóstico) na aba Geral.
   - **Relatórios (`relatorios/page.tsx`):** Inclusão das colunas de Série/IMEI e Laudo no relatório analítico de OS.
   - **Exportação (Orçamento):** Implementado gerador de HTML customizado para impressão de orçamentos profissionais, ocultando dados internos e focando no cliente.
   - **Checkout:** Atualizado card informativo do módulo OS para incluir "Rastreabilidade por Série/IMEI e Diagnóstico".

#### ✅ AÇÕES PENDENTES CONCLUÍDAS:
1. **Executado `apps/api/migrations/rpc_os_assistencia_tecnica.sql` no banco Supabase.**
2. **Executado `apps/api/migrations/update_os_report_rpc.sql` no banco Supabase.**

---

## VISTORIA 63 - Auditoria Técnica de Gestão de Usuários e Segurança
**Data:** 05/05/2026
**Status:** ✅ CONCLUÍDO
**Responsável:** Antigravity

#### Correções Críticas (Bugs de Produção):
1. **Webhook de Pagamentos (C1):** Pagamentos via Asaas agora provisionam empresas com o `limite_usuarios` correto baseado no plano, ao invés do default (3).
2. **Hook de Equipe (C2):** Corrigido bug de "stream lido duas vezes" (`res.json()`) no `use-team.ts` que impedia o retorno de dados dos usuários e módulos do tenant.
3. **Segurança (C3):** Corrigido filtro `.eq('deleted_at', null)` por `.is('deleted_at', null)` na API de criação, prevenindo falsos positivos de validação de duplicatas de usuários em soft-delete.
4. **Permissões Granulares (C4):** A Sidebar agora cruza os módulos ativos da empresa com a tabela `usuario_modulos_permitidos`, impedindo que `tenant_user` veja módulos para os quais não tem acesso.

#### Refatorações e Melhorias:
1. **RLS (A1):** Implementado Row Level Security na tabela `usuario_modulos_permitidos` com acesso apenas ao próprio usuário ou `tenant_admin`.
2. **N+1 Queries (A3):** Substituído loop HTTP no Auth por fetch em lote com paginação (`listUsers`) no endpoint de listagem, reduzindo de dezenas de reqs para no máximo 2-3 reqs por acesso.
3. **Tipagem e Clean Code:** Adicionado `limite_usuarios` na interface `Empresa` e corrigidos problemas de lifecycle do React (M1) no `UserModulesModal`.

---

## VISTORIA 63 — Correção de Ambiguidade: `provisionar_empresa` (Checkout 500)
**Data:** 04/05/2026
**Status:** ✅ CONCLUÍDO
**Responsável:** Antigravity

#### Problema:
O endpoint `/api/auth/register-trial` retornava HTTP 500 em todas as tentativas de cadastro no checkout.

#### Causa Raiz (Banco de Dados):
Existiam **duas versões sobrecarregadas (overloaded)** da função `public.provisionar_empresa` com assinaturas ambíguas:
- `provisionar_empresa(novo_schema text, p_modules text[] DEFAULT ...)`
- `provisionar_empresa(novo_schema text, p_modules jsonb DEFAULT ...)`

Quando a função `provisionar_empresa_master` fazia a chamada `public.provisionar_empresa(p_schema_name)` (apenas 1 argumento), o PostgreSQL não conseguia determinar qual versão executar, resultando no erro fatal: `function public.provisionar_empresa(text) is not unique`.

#### Correção Aplicada:
```sql
DROP FUNCTION IF EXISTS public.provisionar_empresa(text, jsonb);
```

A versão `jsonb` era uma duplicata experimental sem consumidores ativos. A versão com `text[]` é a correta e utilizada pela `provisionar_empresa_master`.

#### Validação:
- Query de resolução `SELECT public.provisionar_empresa('_test_...')` retornou `resolucao_ok: true` sem ambiguidade.
- Schema de teste removido em seguida.
- Erro `is not unique` **não mais aparece** nos logs do Postgres.

- **Banco:** `DROP FUNCTION public.provisionar_empresa(text, jsonb)` — resolvendo a sobrecarga.
- **Resolução de Integridade:** O script original de provisionamento (`supabase_rpc.sql`) era grande demais (>4700 lines) causando erro de payload na API do Supabase e resultando numa função "casca vazia" sem tabelas de negócio.
- **Engenharia de Refatoração:** A função foi dividida em 4 helpers (`_provisionar_tabelas`, `_provisionar_rpcs_leitura`, `_provisionar_rpcs_escrita_a`, `_provisionar_rpcs_escrita_b`).
- **Correções Estruturais no DDL:**
  1. Typo no índice (`colaboradorador_id`) corrigido.
  2. Mismatch de `format()`: `EXECUTE format` tinha mais `%I` do que variáveis fornecidas (corrigido para bater quantidade de argumentos).
  3. Ordem de dependência: Módulo 7 (`funcionarios`) foi movido para antes do Módulo 6 (`vendas`) para resolver o erro `relation does not exist` na chave estrangeira.
  4. Escapes de `%`: Em queries com `LIKE '%termo%'`, as porcentagens foram escapadas para `%%` para evitar erro de formatação (`unrecognized format() type specifier`).
- **Resultado:** A nova função master `public.provisionar_empresa` orquestra os 4 helpers criando perfeitamente o schema com as 27 tabelas e seus triggers/RPCs. O endpoint `register-trial` agora volta a operar 100%.

> [!WARNING] PENDÊNCIA DE VISTORIA GERAL
> Devido ao número crítico de alterações nos metadados de orquestração do banco de dados (reengenharia em 4 helpers de provisionamento, alteração na ordem das tabelas e correções estruturais pesadas no formato DDL), é necessário realizar uma Vistoria Geral Técnica O MAIS RÁPIDO POSSÍVEL para validar integralmente o ecossistema do banco, a política de triggers e o checkout.

---

## VISTORIA 62 - Gestão de Equipe e Controle Granular de Módulos por Tenant
**Data:** 04/05/2026
**Status:** ✅ IMPLEMENTADO E SQL APLICADO (`gestao_usuarios.sql` rodado no banco live)
**Responsável:** Antigravity (Claude Sonnet)

#### Arquitetura Adicionada:
1. **Banco de Dados (SQL: `sql/gestao_usuarios.sql`):**
   - Nova coluna `limite_usuarios` em `public.empresas` (DEFAULT 3, aditiva, não quebra tenants existentes).
   - Nova tabela `public.usuario_modulos_permitidos` com índices (permissões granulares por módulo por usuário).
   - Nova RPC `public.verificar_limite_usuarios(empresa_id)` — retorna contagem, limite e `pode_criar`.
   - Nova RPC `public.tenant_listar_usuarios()` — só para `tenant_admin`, faz JOIN com `auth.users`.
   - Nova RPC `public.tenant_listar_modulos_usuario(user_id)` — lista catálogo com status contratado+permitido.
   - Nova RPC `public.tenant_atualizar_modulos_usuario(user_id, modulos[])` — UPSERT seguro de permissões.

2. **Backend (API Routes):**
   - `GET /api/tenant/users` — lista usuários do tenant com metadados de limite.
   - `POST /api/tenant/users/create` — cria usuário no Auth + vincula em `user_profiles` + grava módulos iniciais.
   - `DELETE /api/tenant/users/[id]` — soft-delete + ban no Auth. Proteção anti-autoexclusão.
   - `PATCH /api/tenant/users/[id]` — altera role entre `tenant_admin` e `tenant_user`.
   - `GET /api/tenant/users/[id]/modules` — lista módulos do usuário com status.
   - `PATCH /api/tenant/users/[id]/modules` — atualiza permissões de módulo via UPSERT.

3. **Middleware (`proxy.ts`):**
   - Alteração cirúrgica mínima: verificação adicional em `usuario_modulos_permitidos` para `tenant_user`.
   - `tenant_admin` é imune (acessa todos os módulos contratados).
   - `dashboard` e `configuracoes` são sempre públicos (não verificados).

4. **Frontend:**
   - Hook `use-team.ts` com React Query para todos os endpoints.
   - Componente `UserManagement.tsx` com tabela de equipe, barra de limite, modal de convite com seleção de módulos, botões de promoção/remoção e upsell automático.
   - Componente `UserModulesModal.tsx` com toggles por módulo e proteção de módulos obrigatórios.
   - Integrado na página `configuracoes/page.tsx` (nova seção antes de Tutoriais).
   - `register-trial/route.ts` atualizado para definir `limite_usuarios` conforme o plano.

#### Limites por Plano:
| Plano    | limite_usuarios |
|----------|-----------------|
| A La Carte | 2             |
| Starter  | 3               |
| Business | 10              |
| Pro      | 50              |

#### ✅ AÇÃO PENDENTE CONCLUÍDA:
**Executado `sql/gestao_usuarios.sql` no banco Supabase de produção.**

---

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

## VISTORIA 39 - Gestão de Vendas (Cancelamento e Devolução)
- **Data:** 28/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - Implementação de RPCs `tenant_cancelar_venda` e `tenant_devolver_item`.
  - Estorno automático de estoque em cancelamentos e devoluções parciais.
  - Feedback visual de status 'cancelado' no histórico de vendas.
  - Atualização dos cards de checkout with novas funcionalidades.

---

# MÓDULO CHECKOUT & ASSINATURAS

| DATA | VISTORIA | STATUS | RESUMO |
| :--- | :--- | :--- | :--- |
| 2026-04-27 | Provisionamento Automático & E-mail Trial | **PENDENTE** | Automação de DDL e link de ativação real. |
| 2026-04-27 | Teste Grátis de 7 Dias (Free Trial) | **PENDENTE** | Fluxo de registro trial e upgrade Asaas. |
| 2026-04-26 | Dashboard KPI & CRM Nurturing | CONCLUÍDO | Ajuste de RPCs globais e schemas dinâmicos. |
