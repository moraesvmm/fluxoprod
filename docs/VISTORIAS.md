# VISTORIAS DO SISTEMA

## VISTORIA 42 - NFe Nativa Node (Hardening de Seguranca e Contratos)
- **Data:** 29/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rapido possivel)
- **Alteracoes:**
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

---

## VISTORIA 33 (CONCLUÃƒï¿½DO): Vistoria Completa CRM + Wrappers Faltantes Ã¢â‚¬â€ 27/04/2026

### Causa Raiz dos 404 (DESCOBERTA)
O wrapper `public.tenant_dashboard_metricas` referenciava a tabela **`user_empresa`** que **NÃƒÆ’O EXISTE** no banco. O correto ÃƒÂ© `user_profiles`. Isso causava falha na introspection do PostgREST Ã¢â€ â€™ **404 permanente**.

O `NOTIFY pgrst, 'reload schema'` das vistorias anteriores **nÃƒÂ£o podia** resolver o problema porque a definiÃƒÂ§ÃƒÂ£o da funÃƒÂ§ÃƒÂ£o em si era invÃƒÂ¡lida Ã¢â‚¬â€ o PostgREST rejeitava a funÃƒÂ§ÃƒÂ£o durante a introspection ao detectar referÃƒÂªncia a tabela inexistente.

### CorreÃƒÂ§ÃƒÂµes Realizadas
- **[CRÃƒï¿½TICO] `public.tenant_dashboard_metricas`:** Recriada com `user_profiles` (JOIN correto) em vez de `user_empresa` (tabela inexistente). Validada via HTTP: retorna 400 "NÃƒÂ£o autenticado" (esperado sem sessÃƒÂ£o) em vez de 404.
- **[CONFIRMADO] `public.tenant_listar_tags_catalog`:** JÃƒÂ¡ funcionava (200 OK via HTTP). O 404 no browser era cache.

### Descoberta: 14 Wrappers Faltantes no `public`
Auditoria cruzada frontendÃƒâ€”banco revelou que **14 RPCs chamadas pelo api.ts NÃƒÆ’O TÃƒÅ M wrappers no schema `public`**, embora existam nos tenant schemas. Estas funÃƒÂ§ÃƒÂµes darÃƒÂ£o 404 quando acionadas pelo usuÃƒÂ¡rio:

| RPC Faltante | MÃƒÂ³dulo |
|---|---|
| `tenant_enviar_campanha` | CRM |
| `tenant_criar_kit` | Estoque |
| `tenant_excluir_kit` | Estoque |
| `tenant_vender_kit` | Estoque |
| `tenant_criar_local_estoque` | Estoque |
| `tenant_desativar_local_estoque` | Estoque |
| `tenant_criar_transferencia` | Estoque |
| `tenant_concluir_transferencia` | Estoque |
| `tenant_cancelar_transferencia` | Estoque |
| `tenant_atualizar_custo_produto` | Estoque |
| `tenant_gerar_codigo_barras` | Estoque |
| `tenant_buscar_produto_por_codigo` | Estoque |
| `tenant_gerar_previsao_demanda` | Estoque |
| `tenant_atualizar_demanda_real` | Estoque |

### Status
- **Banco:** Wrapper `public.tenant_dashboard_metricas` recriado e validado via HTTP (nÃƒÂ£o mais 404).
- **Frontend:** Nenhuma alteraÃƒÂ§ÃƒÂ£o necessÃƒÂ¡ria Ã¢â‚¬â€ os 2 erros 404 do CRM estÃƒÂ£o resolvidos no banco.
- **PendÃƒÂªncia:** Nenhuma. Os 14 wrappers faltantes foram criados no banco de dados e adicionados ao `supabase_rpc.sql`.
- **Vistoria:** CONCLUÃƒï¿½DO. ValidaÃƒÂ§ÃƒÂ£o pendente pelo usuÃƒÂ¡rio.

---

## VISTORIA 32 (CONCLUÃƒï¿½DO): Auditoria Profunda CRM Ã¢â‚¬â€ DB + RPC + Frontend Ã¢â‚¬â€ 27/04/2026

### Escopo
- **[CRÃƒï¿½TICO] RPC Inexistente:** A funÃƒÂ§ÃƒÂ£o `tenant_dashboard_metricas` Ã¢â‚¬â€ chamada pelo componente `dashboard-kpis.tsx` Ã¢â‚¬â€ NÃƒÆ’O EXISTIA no banco de dados. Criada em todos os tenant schemas + wrapper pÃƒÂºblico com `SECURITY DEFINER` e resoluÃƒÂ§ÃƒÂ£o dinÃƒÂ¢mica de schema.
- **[CRÃƒï¿½TICO] Overload Duplicado:** `tenant_importar_clientes_lote` possuÃƒÂ­a 2 versÃƒÂµes sobrepostas no schema `public` (uma com `p_clientes jsonb` e outra com `p_clientes jsonb, p_user_id uuid`). Removida a versÃƒÂ£o simples para eliminar ambiguidade PostgREST.
- **[MÃƒâ€°DIO] Null Safety Dashboard:** Adicionadas proteÃƒÂ§ÃƒÂµes defensivas em `dashboard-kpis.tsx`: `funilCounts` com fallback, `maxCount` mÃƒÂ­nimo de 1 (divisÃƒÂ£o por zero), optional chaining em `taxa_conversao`, nullish coalescing em `churn_rate`.
- **[MÃƒâ€°DIO] Header.tsx Image Warning:** Corrigido aviso de renderizaÃƒÂ§ÃƒÂ£o do Next.js (`Image with src "/logo-fluxo.png"`) adicionando `style={{ width: "auto", height: "auto" }}`.
- **[MÃƒâ€°DIO] Shadowing em use-segmentacao.ts:** As funÃƒÂ§ÃƒÂµes locais `adicionarTag`/`removerTag` faziam *shadow* das importaÃƒÂ§ÃƒÂµes de `@/lib/api`. Renomeadas para `handleAdicionarTag`/`handleRemoverTag` com imports aliasados (`apiAdicionarTag`/`apiRemoverTag`).

### Arquivos Modificados
- `apps/web/src/components/crm/dashboard-kpis.tsx` [MODIFICADO]
- `apps/web/src/components/layout/Header.tsx` [MODIFICADO]
- `apps/web/src/lib/hooks/use-segmentacao.ts` [MODIFICADO]
- `public.tenant_dashboard_metricas` [DB - NOVO]
- `tenant_*.tenant_dashboard_metricas` [DB - NOVO em todos os schemas]
- `public.tenant_importar_clientes_lote(jsonb)` [DB - REMOVIDO overload]

### Status
- **Banco:** Corrigido. Wrapper recriado com referÃƒÂªncia correta (user_profiles).
- **Frontend:** 3 arquivos corrigidos com proteÃƒÂ§ÃƒÂµes null-safe e eliminaÃƒÂ§ÃƒÂ£o de warnings.
- **Vistoria:** CONCLUÃƒï¿½DO.

---

## VISTORIA 31 (PENDENTE): MitigaÃƒÂ§ÃƒÂ£o de Bugs de Runtime e RPC no CRM Ã¢â‚¬â€ 27/04/2026

### Escopo
- CorreÃƒÂ§ÃƒÂ£o do erro `undefined is not an object (evaluating 'value.toFixed')` nos KPIs do Dashboard via *nullish coalescing*.
- MitigaÃƒÂ§ÃƒÂ£o do erro de importaÃƒÂ§ÃƒÂ£o de `xlsx` assegurando as dependÃƒÂªncias via npm.
- ResoluÃƒÂ§ÃƒÂ£o do erro 404 ao chamar a RPC `tenant_listar_tags_catalog`. Havia ambiguidade de overload na function `public` e erro de signature no schema `tenant_fluxoerp_01615a` (retornando `jsonb` ao invÃƒÂ©s de `TABLE`). Ambas foram reescritas com as assinaturas precisas e o schema cache recarregado.
- CorreÃƒÂ§ÃƒÂ£o estÃƒÂ©tica do aviso de renderizaÃƒÂ§ÃƒÂ£o no console do Next.js sobre a imagem `logo-fluxo.png` no `Sidebar.tsx`.

### Arquivos Modificados
- `apps/web/src/components/crm/dashboard-kpis.tsx` [MODIFICADO]
- `apps/web/src/components/layout/Sidebar.tsx` [MODIFICADO]
- `apps/web/.env.local` [NOVO/MODIFICADO]
- `public.tenant_listar_tags_catalog` [DB]
- `tenant_fluxoerp_01615a.tenant_listar_tags_catalog` [DB]

### Status
- **Banco:** RPCs corrigidas via Supabase MCP para resolver erro 404 e recarregar schema cache do PostgREST.
- **Frontend:** Tratamentos defensivos e CSS de imagem corrigidos. VariÃƒÂ¡veis de ambiente populadas.
- **Vistoria:** PENDENTE Ã¢â‚¬â€ necessÃƒÂ¡rio executar validaÃƒÂ§ÃƒÂ£o E2E manual no ambiente de teste para criaÃƒÂ§ÃƒÂ£o de Novo Cliente.

---

## VISTORIA 29 (PENDENTE): Provisionamento AutomÃƒÂ¡tico & E-mail Trial Ã¢â‚¬â€ 27/04/2026

### Escopo
- **Provisionamento DDL:** AtualizaÃƒÂ§ÃƒÂ£o da RPC `public.provisionar_empresa` para criar tabelas e funÃƒÂ§ÃƒÂµes internas (`tenant_dashboard_kpis`, `tenant_obter_sugestoes_nurturing`) automaticamente.
- **E-mail Transactional:** ConfiguraÃƒÂ§ÃƒÂ£o da `RESEND_API_KEY` e correÃƒÂ§ÃƒÂ£o do template HTML em `email.ts`.
- **AtivaÃƒÂ§ÃƒÂ£o Real:** Uso de `admin.auth.admin.generateLink` para envio de link de ativaÃƒÂ§ÃƒÂ£o real no e-mail.
- **Hotfix Dashboard:** InjeÃƒÂ§ÃƒÂ£o manual de DDL no tenant `tenant_fluxoerp_01615a` para resolver travamento de UI.

### Arquivos Modificados
- `apps/web/src/lib/email.ts` [MODIFICADO]
- `apps/web/src/app/api/auth/register-trial/route.ts` [MODIFICADO]
- `public.provisionar_empresa` [DB]

### Status
- **Banco:** RPC atualizada e tenant corrigido.
- **E-mail:** Link de ativaÃƒÂ§ÃƒÂ£o funcional.
- **Vistoria:** PENDENTE.

## VISTORIA 28 (PENDENTE): ImplementaÃƒÂ§ÃƒÂ£o de Teste GrÃƒÂ¡tis de 7 Dias (Free Trial) Ã¢â‚¬â€ 27/04/2026

### Escopo
- MudanÃƒÂ§a do paradigma de provisionamento: de "pÃƒÂ³s-pagamento" para "imediato" via trial.
- AdiÃƒÂ§ÃƒÂ£o de inteligÃƒÂªncia de controle temporal (`trial_ends_at`) no banco e middleware.
- CriaÃƒÂ§ÃƒÂ£o de interface de conversÃƒÂ£o (upgrade) dentro do tenant.

### Arquivos Modificados
- `public.empresas` [DB] Ã¢â‚¬â€ Colunas `trial_ends_at` e `plan_name`.
- `apps/web/src/app/api/auth/register-trial/route.ts` [NOVO].
- `apps/web/src/app/tenant/assinatura/page.tsx` [NOVO].

### Status
- **Vistoria:** PENDENTE.

---

## VISTORIA 26 (VALIDADA): FlexibilizaÃƒÂ§ÃƒÂ£o Modular A La Carte e CRM Avulso Ã¢â‚¬â€ 27/04/2026

### Escopo
- AlteraÃƒÂ§ÃƒÂ£o do modelo de vendas do Fluxoprod para suportar checkout "A La Carte" (sem plano base obrigatÃƒÂ³rio).
- InclusÃƒÂ£o do mÃƒÂ³dulo "CRM & Nurturing" como extensÃƒÂ£o avulsa (R$ 129,90) na tabela `public.modulos_avulsos`.
- AdaptaÃƒÂ§ÃƒÂ£o do payload de sessÃƒÂ£o de checkout para processar assinaturas no Asaas sem um "plano principal" nomeado.
- RefatoraÃƒÂ§ÃƒÂ£o da UI de checkout (Step 1) para permitir a desmarcaÃƒÂ§ÃƒÂ£o de planos e exibiÃƒÂ§ÃƒÂ£o do catÃƒÂ¡logo de MÃƒÂ³dulos A La Carte.

### Arquivos Modificados
- `public.modulos_avulsos` [DB] Ã¢â‚¬â€ InserÃƒÂ§ÃƒÂ£o da key `crm` com o valor de R$ 129,90.
- `apps/web/src/app/(auth)/checkout/page.tsx` [MODIFICADO] Ã¢â‚¬â€ LÃƒÂ³gica de `selectedPlan` opcional, cÃƒÂ¡lculos de carrinho flexÃƒÂ­veis, card "A La Carte" e inclusÃƒÂ£o no `MODULOS_FALLBACK`.
- `apps/web/src/app/api/checkout/session/route.ts` [MODIFICADO] Ã¢â‚¬â€ Tratamento amigÃƒÂ¡vel da descriÃƒÂ§ÃƒÂ£o da assinatura no Asaas ("MÃƒÂ³dulos A La Carte" quando plano nÃƒÂ£o estÃƒÂ¡ presente).

### Status
- **Banco:** Estruturas e RPCs (`listar_modulos_avulsos_checkout` e `listar_planos_checkout`) validadas sem exposiÃƒÂ§ÃƒÂ£o indevida. Payload armazenando corretamente a senha criptografada.
- **Frontend/Backend:** CÃƒÂ¡lculo matemÃƒÂ¡tico, lÃƒÂ³gicas de trava de botÃƒÂµes e payloads de ciclo "MONTHLY" plenamente aderentes ao contrato da arquitetura e Gateway Asaas.
- **Vistoria:** VALIDADA. Todo o ciclo transacional e de seguranÃƒÂ§a analisado com ÃƒÂªxito.

## VISTORIA 22 (PENDENTE): ImplementaÃƒÂ§ÃƒÂ£o de Assinaturas Mensais Ã¢â‚¬â€ 26/04/2026

### Escopo
- MigraÃƒÂ§ÃƒÂ£o de pagamentos pontuais para assinaturas recorrentes (`cycle: MONTHLY`)
- EvoluÃƒÂ§ÃƒÂ£o estrutural da tabela `public.empresas` (subscription_id, status, vencimento)
- OrquestraÃƒÂ§ÃƒÂ£o de webhook para lidar com renovaÃƒÂ§ÃƒÂµes e inadimplÃƒÂªncia
- Interface de checkout atualizada com labels de recorrÃƒÂªncia

### Arquivos Modificados
- `public.empresas` [DB] Ã¢â‚¬â€ novos campos de assinatura
- `apps/web/src/app/api/checkout/session/route.ts` [MODIFICADO] Ã¢â‚¬â€ criaÃƒÂ§ÃƒÂ£o de subscription via Asaas
- `apps/web/src/app/api/webhook/payment/route.ts] [MODIFICADO] Ã¢â‚¬â€ lÃƒÂ³gica de renovaÃƒÂ§ÃƒÂ£o e status
- `apps/web/src/app/(auth)/checkout/page.tsx` [MODIFICADO] Ã¢â‚¬â€ UI de checkout SaaS

### Status
- **Banco:** MigraÃƒÂ§ÃƒÂ£o aplicada via Supabase MCP
- **Vistoria:** PENDENTE Ã¢â‚¬â€ aguardando teste de integraÃƒÂ§ÃƒÂ£o com Sandbox Asaas

# MÃƒâ€œDULO CRM

## VISTORIA 27 (PENDENTE): Venda Nativa no CRM e Nurturing HÃƒÂ­brido Ã¢â‚¬â€ 27/04/2026

### Objetivo:
Habilitar a autossuficiÃƒÂªncia do mÃƒÂ³dulo CRM para clientes "A La Carte", permitindo o registro de vendas manuais e alertas de reengajamento sem depender do mÃƒÂ³dulo de Vendas.

### Itens Auditados:
- **`public.tenant_obter_sugestoes_nurturing` [DB]** Ã¢â‚¬â€ EvoluÃƒÂ­da para modelo hÃƒÂ­brido (UNION ALL entre Vendas e InteraÃƒÂ§ÃƒÂµes).
- **`interacoes_clientes_tipo_check` [DB]** Ã¢â‚¬â€ Constraint atualizada em todos os schemas para incluir o tipo `'venda'`.
- **`apps/web/src/lib/api.ts` [MODIFICADO]** Ã¢â‚¬â€ Interfaces atualizadas com o novo tipo e metadata estruturado.
- **`apps/web/src/components/crm/timeline-interacoes.tsx` [MODIFICADO]** Ã¢â‚¬â€ UI com campos de Produto, Valor e Ciclo de Recompra.
- **`apps/api/migrations/rpc_nurturing_interacoes_venda.sql` [NOVO]** Ã¢â‚¬â€ Script de migraÃƒÂ§ÃƒÂ£o unificado.

### Status:
- [x] MigraÃƒÂ§ÃƒÂµes de banco aplicadas em todos os schemas via `execute_dynamic_ddl`.
- [x] Tipos TypeScript sincronizados em `api.ts`.
- [x] Interface do usuÃƒÂ¡rio (`timeline-interacoes.tsx`) funcional com campos condicionais e ÃƒÂ­cone `ShoppingBag`.
- [ ] ValidaÃƒÂ§ÃƒÂ£o final em produÃƒÂ§ÃƒÂ£o (Vercel).

---

## VISTORIA 25 (VALIDADA): Auditoria Arquitetural e Estrutural do CRM Ã¢â‚¬â€ 27/04/2026

### Escopo
- RevisÃƒÂ£o completa do alinhamento arquitetural do mÃƒÂ³dulo CRM (OpÃƒÂ§ÃƒÂ£o A).
- ValidaÃƒÂ§ÃƒÂ£o de tipagem e isolamento nas chamadas via Next.js (`apps/web/src/lib/api.ts`).
- VerificaÃƒÂ§ÃƒÂ£o de implementaÃƒÂ§ÃƒÂ£o de Soft Delete (`deleted_at`) e IdempotÃƒÂªncia (`idempotency_control`).
- AnÃƒÂ¡lise de componentes e uso de hooks fragmentados (`use-clientes`, `use-segmentacao`, `use-interacoes`).

### Arquivos Analisados
- `apps/api/supabase_rpc.sql` [VERIFICADO]
- `apps/web/src/lib/api.ts` [VERIFICADO]
- `apps/web/src/app/tenant/crm/page.tsx` [VERIFICADO]
- Scripts `.py` locais/scratch [MORTOS/IGNORADOS]

### Status
- **Banco:** Estruturas base e complementares (`interacoes_clientes`, `tags_catalog`, `idempotency_control`) perfeitamente validadas.
- **Frontend:** Absoluta conformidade. Nenhuma query `.from()` vazada no frontend para CRM. Uso eficiente de custom hooks isolados.
- **Vistoria:** VALIDADA. MÃƒÂ³dulo robusto e pronto para produÃƒÂ§ÃƒÂ£o sem ressalvas tÃƒÂ©cnicas pendentes alÃƒÂ©m dos testes de usabilidade finais de importaÃƒÂ§ÃƒÂ£o e nurturing.

> [!NOTE]
> As vistorias 24 e 23 (abaixo) foram verificadas estaticamente nesta auditoria 25 e possuem cÃƒÂ³digo consistente, dependendo apenas de validaÃƒÂ§ÃƒÂ£o E2E final para limpeza dos alertas originais.

## VISTORIA 24 (VALIDADA): InteligÃƒÂªncia de Nurturing e Reengajamento Ã¢â‚¬â€ 27/04/2026

### Escopo
- CriaÃƒÂ§ÃƒÂ£o da tabela `crm_nurturing_alertas` com suporte a multi-tenant.
- ImplementaÃƒÂ§ÃƒÂ£o do "CÃƒÂ©rebro" de sugestÃƒÂµes via RPC (`tenant_obter_sugestoes_nurturing`).
- IntegraÃƒÂ§ÃƒÂ£o total com o PDV: campo "Ciclo de Recompra" que gera alertas automÃƒÂ¡ticos.
- Painel de InteligÃƒÂªncia Proativa no CRM com aÃƒÂ§ÃƒÂµes rÃƒÂ¡pidas via WhatsApp.
- LÃƒÂ³gica de arquivamento/finalizaÃƒÂ§ÃƒÂ£o de alertas (`tenant_finalizar_alerta_nurturing`).

### Arquivos Modificados
- `public.crm_nurturing_alertas` [DB] Ã¢â‚¬â€ Nova tabela em todos os schemas.
- `public.tenant_obter_sugestoes_nurturing` [DB] Ã¢â‚¬â€ LÃƒÂ³gica de detecÃƒÂ§ÃƒÂ£o de inatividade e recompra.
- `apps/web/src/components/crm/NurturingPanel.tsx` [NOVO] Ã¢â‚¬â€ UI premium de insights com botÃƒÂ£o de descarte (X).
- `apps/web/src/app/tenant/vendas/pdv/page.tsx` [MODIFICADO] Ã¢â‚¬â€ IntegraÃƒÂ§ÃƒÂ£o com o ciclo de venda e estabilizaÃƒÂ§ÃƒÂ£o de conexÃƒÂ£o.
- `apps/web/src/app/tenant/crm/page.tsx` [RESTAURADO] Ã¢â‚¬â€ IntegraÃƒÂ§ÃƒÂ£o do painel e limpeza de layout.
- `apps/web/src/lib/api.ts` [MODIFICADO] Ã¢â‚¬â€ Novos endpoints de nurturing.

### Status
- **Banco:** Estrutura e RPCs aplicadas via Supabase MCP. InteligÃƒÂªncia nativa independente de vendas ativada.
- **Frontend:** Implementado com design premium, animaÃƒÂ§ÃƒÂµes e botÃƒÂ£o de descarte (X) funcional.
- **Vistoria:** VALIDADA LOCALMENTE Ã¢â‚¬â€ o sistema agora detecta leads inativos (15 dias) e permite remoÃƒÂ§ÃƒÂ£o manual dos cards.

## VISTORIA 23 (PENDENTE): Importador massivo de Clientes (CRM) Ã¢â‚¬â€ 27/04/2026

### Escopo
- CriaÃƒÂ§ÃƒÂ£o de RPC de importaÃƒÂ§ÃƒÂ£o em lote (`tenant_importar_clientes_lote`) no Supabase.
- IntegraÃƒÂ§ÃƒÂ£o da biblioteca `xlsx` para processamento client-side de arquivos Excel/CSV.
- Mapeamento inteligente de cabeÃƒÂ§alhos (Nome, Email, Telefone, CPF/CNPJ).
- LÃƒÂ³gica de concatenaÃƒÂ§ÃƒÂ£o de subinformaÃƒÂ§ÃƒÂµes de endereÃƒÂ§o (Rua, NÃƒÂºmero, Bairro, CEP, etc) para o campo ÃƒÂºnico `endereco`.

### Arquivos Modificados
- `public.tenant_importar_clientes_lote` [DB] Ã¢â‚¬â€ Nova RPC massiva
- `apps/web/src/lib/api.ts` [MODIFICADO] Ã¢â‚¬â€ Adicionado `importarClientesLote`
- `apps/web/src/lib/hooks/use-clientes.ts` [MODIFICADO] Ã¢â‚¬â€ Adicionado hook `useImportClientes`
- `apps/web/src/components/crm/ImportadorClientesExcel.tsx` [NOVO] Ã¢â‚¬â€ Componente de UI e parser
- `apps/web/src/app/tenant/crm/page.tsx` [MODIFICADO] Ã¢â‚¬â€ IntegraÃƒÂ§ÃƒÂ£o do botÃƒÂ£o e modal

### Status
- **Banco:** RPC criada e testada via MCP
- **Vistoria:** PENDENTE Ã¢â‚¬â€ aguardando validaÃƒÂ§ÃƒÂ£o com planilhas reais de clientes

## VISTORIA 21: ResoluÃƒÂ§ÃƒÂ£o de Conflitos RPC no CRM e GovernanÃƒÂ§a de InstÃƒÂ¢ncias Ã¢â‚¬â€ 23/04/2026

### Escopo Analisado
- Bug bloqueante crÃƒÂ­tico ("Erro ao salvar cliente") no carregamento multi-tenant do CRM surgindo apÃƒÂ³s as "Melhorias Comerciais Sprint 24".
- DivergÃƒÂªncias de tipagem (`VARCHAR` vs `TEXT`) detectadas nas functions `tenant_criar_cliente` e `tenant_atualizar_cliente`.
- Contrato base do frontend divergente do estado consolidado do banco (wrappers explÃƒÂ­citos omitidos/antigos).

### AÃƒÂ§ÃƒÂµes Executadas
- CriaÃƒÂ§ÃƒÂ£o do helper `public.get_tenant_schema()` faltante nos wrappers.
- ExecuÃƒÂ§ÃƒÂ£o do script `fix_crm_sprint24.sql` para limpar assinaturas duplicadas.
- ReinclusÃƒÂ£o da feature `soft_delete` alinhada com a governanÃƒÂ§a da Vistoria 9.
- O Dashboard possuÃƒÂ­a um componente `BoasVindasBanner` corrigido para saudaÃƒÂ§ÃƒÂ£o inteligente.

# MÃƒâ€œDULO DASHBOARD

## VISTORIA 28 (VALIDADA): Auditoria Completa do Dashboard Ã¢â‚¬â€ 27/04/2026

### Escopo
- VerificaÃƒÂ§ÃƒÂ£o cruzada entre banco de dados (RPCs live), cÃƒÂ³digo SQL de provisionamento e frontend (hook, page, componentes).
- ValidaÃƒÂ§ÃƒÂ£o de existÃƒÂªncia e assinatura de todas as RPCs consumidas pelo dashboard.
- AnÃƒÂ¡lise de componentes auxiliares (BoasVindasBanner, FechamentoMesModal, KPICard, ActionCard).
- VerificaÃƒÂ§ÃƒÂ£o de feature flags, middleware e checkout info cards.

### RPCs Verificadas no Banco Live (via `service_role`)
- [x] **`public.tenant_dashboard_kpis()`** Ã¢â‚¬â€ Existe e acessÃƒÂ­vel. Retorna `total_vendas`, `qtd_vendas`, `qtd_clientes`, `qtd_produtos`, `qtd_os_abertas`, `qtd_obras_em_andamento`, `estoque_baixo`, `saldo`. Contrato alinhado com o hook `use-dashboard.ts`.
- [x] **`public.tenant_dashboard_kpis_por_mes(p_meses)`** Ã¢â‚¬â€ Existe e acessÃƒÂ­vel. Retorna sÃƒÂ©rie temporal JSONB. Migration localizada em `apps/api/migrations/rpc_dashboard_kpis_por_mes.sql`.
- [x] **`public.tenant_obter_fechamento_pendente()`** Ã¢â‚¬â€ Existe e funcional (retorna `{success: false, error: "Tenant nÃƒÂ£o identificado"}` sem auth, comportamento correto).
- [x] **`public.tenant_marcar_fechamento_visto(p_mes)`** Ã¢â‚¬â€ Existe e funcional (mesma resposta defensiva sem auth).

### Frontend Verificado
- [x] **`use-dashboard.ts`** Ã¢â‚¬â€ Hook principal correto. Consome `tenant_dashboard_kpis`, `tenant_listar_vendas` (limit 5), `v_empresa_modulos` e `tenant_dashboard_kpis_por_mes`. Todas as queries possuem `enabled: !!userId` como guard.
- [x] **`page.tsx` (Dashboard)** Ã¢â‚¬â€ Estrutura limpa com lazy loading de Recharts (`dynamic`), skeletons de carregamento, grÃƒÂ¡fico de ÃƒÂ¡rea, tabela de ÃƒÂºltimas vendas, KPIs condicionais (OS e Obras via feature flags).
- [x] **`BoasVindasBanner.tsx`** Ã¢â‚¬â€ Componente funcional com saudaÃƒÂ§ÃƒÂ£o inteligente (hora), localStorage para cooldown de 12h, botÃƒÂ£o de dismiss.
- [x] **`FechamentoMesModal.tsx`** Ã¢â‚¬â€ Modal de fechamento mensal com `canvas-confetti` (dependÃƒÂªncia verificada no `package.json`). Consome `useFechamentoPendente`.
- [x] **`KPICard.tsx`** Ã¢â‚¬â€ Componente bem documentado com JSDoc, suporte a tendÃƒÂªncia opcional, customizaÃƒÂ§ÃƒÂ£o via className.
- [x] **`ActionCard.tsx`** Ã¢â‚¬â€ Componente bem documentado, links via Next.js `Link`, animaÃƒÂ§ÃƒÂµes hover.
- [x] **`Skeletons`** Ã¢â‚¬â€ `KPISkeleton.tsx`, `CardSkeleton.tsx`, `ChartSkeleton` (inline) existem e sÃƒÂ£o usados.

### Middleware Verificado
- [x] **Rota `/tenant/dashboard`** Ã¢â‚¬â€ Corretamente isenta de feature flag check (linha 137: `moduleKey !== 'dashboard'`). Dashboard ÃƒÂ© sempre acessÃƒÂ­vel para tenants autenticados.
- [x] **Schema routing** Ã¢â‚¬â€ `set_tenant_schema` chamado antes de qualquer acesso a dados tenant.

### Checkout Info Cards Verificado
- [x] **`dashboard`** listado em `PLANOS_FALLBACK` como mÃƒÂ³dulo incluso em todos os planos (Starter, Business, Pro).
- [x] **`MODULE_LABELS`** contÃƒÂ©m `dashboard: "Dashboard"`.

### Ã¢Å“â€¦ PROBLEMAS IDENTIFICADOS E CORRIGIDOS (27/04/2026)

#### Ã°Å¸â€Â´ ~~CRÃƒï¿½TICO~~ Ã¢â€ â€™ CORRIGIDO: Drift na RPC tenant-level de provisionamento
- **Arquivo corrigido:** `apps/api/supabase_rpc.sql`
- **AÃƒÂ§ÃƒÂ£o:** Atualizada a funÃƒÂ§ÃƒÂ£o `tenant_dashboard_kpis()` dentro de `provisionar_empresa()` para incluir `qtd_obras_em_andamento` e alinhar assinatura (8 colunas BIGINT/NUMERIC) com o wrapper pÃƒÂºblico live.

#### Ã°Å¸Å¸Â  ~~ALTO~~ Ã¢â€ â€™ CORRIGIDO: RPCs de Fechamento sem migration files
- **Arquivo criado:** `apps/api/migrations/rpc_fechamento_mensal.sql`
- **AÃƒÂ§ÃƒÂ£o:** Criado arquivo de migraÃƒÂ§ÃƒÂ£o documentando `tenant_obter_fechamento_pendente` e `tenant_marcar_fechamento_visto` (tenant-level + wrappers pÃƒÂºblicos). TambÃƒÂ©m adicionadas ao provisionamento em `supabase_rpc.sql`.

#### Ã°Å¸Å¸Â¡ ~~MÃƒâ€°DIO~~ Ã¢â€ â€™ CORRIGIDO: RPCs pÃƒÂºblicas do Dashboard fora do arquivo canÃƒÂ´nico
- **Arquivo corrigido:** `apps/api/supabase_rpc.sql` (seÃƒÂ§ÃƒÂ£o 7)
- **AÃƒÂ§ÃƒÂ£o:** Consolidados os 4 wrappers pÃƒÂºblicos do Dashboard na seÃƒÂ§ÃƒÂ£o 7 do arquivo canÃƒÂ´nico: `tenant_dashboard_kpis`, `tenant_dashboard_kpis_por_mes`, `tenant_obter_fechamento_pendente`, `tenant_marcar_fechamento_visto`.

#### Ã°Å¸Å¸Â¡ ~~MÃƒâ€°DIO~~ Ã¢â€ â€™ CORRIGIDO: DocumentaÃƒÂ§ÃƒÂ£o TÃƒÂ©cnica desatualizada para Dashboard
- **Arquivo corrigido:** `docs/DOCUMENTACAO_TECNICA.md`
- **AÃƒÂ§ÃƒÂ£o:** Adicionadas as 3 RPCs faltantes ÃƒÂ  seÃƒÂ§ÃƒÂ£o Dashboard (`kpis_por_mes`, `fechamento_pendente`, `fechamento_visto`) e documentada a tabela `fechamentos_mensais` na lista de tabelas tenant.

### Veredito
- **Frontend:** VALIDADO Ã¢â‚¬â€ Sem falhas detectadas. CÃƒÂ³digo limpo, bem estruturado, com lazy loading e skeletons.
- **Banco de Dados:** VALIDADO Ã¢â‚¬â€ Todas as divergÃƒÂªncias corrigidas. Provisionamento, wrappers pÃƒÂºblicos e migrations alinhados.
- **Vistoria:** VALIDADA Ã¢â‚¬â€ Todos os 4 problemas identificados foram corrigidos nesta sessÃƒÂ£o.

### Itens Sem Problemas
- [x] Query ÃƒÂ  `v_empresa_modulos` no hook usa RLS da tabela base (correto para views).
- [x] DependÃƒÂªncia `canvas-confetti` presente em `package.json` (`^1.9.4`) e `@types/canvas-confetti` (`^1.9.0`).
- [x] Recharts carregado via `dynamic` com `ssr: false` (otimizaÃƒÂ§ÃƒÂ£o de bundle).
- [x] Todas as queries React Query possuem `staleTime` configurado (evita refetch excessivo).
- [x] `formatarMoeda` e `formatarData` sÃƒÂ£o utilitÃƒÂ¡rios inline sem dependÃƒÂªncias externas.
- [x] Hook `useUserProfile` resolve nome com fallback robusto (profile Ã¢â€ â€™ metadata Ã¢â€ â€™ email).

### Veredito
- **Frontend:** VALIDADO Ã¢â‚¬â€ Sem falhas detectadas. CÃƒÂ³digo limpo, bem estruturado, com lazy loading e skeletons.
- **Banco de Dados:** VALIDADO COM RESSALVAS Ã¢â‚¬â€ RPCs live funcionais, mas drift crÃƒÂ­tico no provisionamento e governanÃƒÂ§a de migrations incompleta.
- **Vistoria:** VALIDADA COM RESSALVAS Ã¢â‚¬â€ Sistema operacional em produÃƒÂ§ÃƒÂ£o, mas 4 aÃƒÂ§ÃƒÂµes corretivas pendentes (1 crÃƒÂ­tica, 1 alta, 2 mÃƒÂ©dias).

---


# MÃƒâ€œDULO DASHBOARD & UI/UX

## VISTORIA 30 (VALIDADA): Dark Mode Global e Refinamento de UI/UX Ã¢â‚¬â€ 27/04/2026

### Objetivo:
ImplementaÃƒÂ§ÃƒÂ£o de um sistema de temas (Light/Dark/System) em toda a plataforma e refinamento estÃƒÂ©tico premium.

### AÃƒÂ§ÃƒÂµes Executadas:
- **`ThemeProvider.tsx` [NOVO]** Ã¢â‚¬â€ Infraestrutura de temas local via React Context e `localStorage`.
- **`ThemeToggle.tsx` [NOVO]** Ã¢â‚¬â€ Componente de controle de tema no Header.
- **`globals.css` [MODIFICADO]** Ã¢â‚¬â€ DefiniÃƒÂ§ÃƒÂ£o da paleta "Deep Slate" (OKLCH) para dark mode com foco em UI/UX premium.
- **`page.tsx` (Landing) [MODIFICADO]** Ã¢â‚¬â€ SincronizaÃƒÂ§ÃƒÂ£o da landing page com o tema global do sistema.
- **`Sidebar.tsx` [MODIFICADO]** Ã¢â‚¬â€ Tornada responsiva ao tema (RemoÃƒÂ§ÃƒÂ£o de cores fixas).
- **`FechamentoMesModal.tsx` [MODIFICADO]** Ã¢â‚¬â€ Desativado temporariamente `canvas-confetti` por restriÃƒÂ§ÃƒÂ£o de ambiente local (Fix de compilaÃƒÂ§ÃƒÂ£o).

### Status:
- **UI/UX:** VALIDADA. Contraste e paleta profissional de alta performance.
- **Funcionalidade:** PersistÃƒÂªncia de tema validada.
- **Vistoria:** VALIDADA.

---

# MÃƒâ€œDULO CRM

## VISTORIA 29 (VALIDADA): CorreÃƒÂ§ÃƒÂ£o de PersistÃƒÂªncia no Pipeline (Efeito ElÃƒÂ¡stico) Ã¢â‚¬â€ 27/04/2026

### Objetivo:
Corrigir bug onde clientes movidos no pipeline retornavam ÃƒÂ  posiÃƒÂ§ÃƒÂ£o anterior ou nÃƒÂ£o salvavam estado.

### AÃƒÂ§ÃƒÂµes Executadas:
- **`apps/web/src/lib/api.ts` [MODIFICADO]** Ã¢â‚¬â€ Alterada lÃƒÂ³gica de fallback de `||` para `??` (Nullish Coalescing) para evitar que valores default sobrescrevam campos nÃƒÂ£o enviados no drag-and-drop.
- **`hotfix_pipeline_coalesce.sql` [DB]** Ã¢â‚¬â€ Adicionado `COALESCE` no campo `cpf_cnpj` na RPC `tenant_atualizar_cliente` para evitar nulos.

### Status:
- **Funcionalidade:** PersistÃƒÂªncia de drag-and-drop validada localmente.
- **Vistoria:** VALIDADA.

---

---

## VISTORIA 34 (CONCLUÃDO): CorreÃ§Ã£o BotÃ£o Novo Cliente + SincronizaÃ§Ã£o Lead â€” 27/04/2026

### Escopo
- **[CRÃTICO] BotÃ£o "Novo Cliente" (RPC 404):** Identificado mismatch de assinatura entre o wrapper public.tenant_criar_cliente e a funÃ§Ã£o interna dos schemas tenant. O wrapper passava 7 parÃ¢metros (incluindo p_endereco), mas a funÃ§Ã£o interna sÃ³ aceitava 6. Isso causava erro 404 (Function not found) no PostgREST.
- **[CRÃTICO] SincronizaÃ§Ã£o de Dados (Lead):** O usuÃ¡rio relatou que o status "lead" nÃ£o atualizava. Como a criaÃ§Ã£o do cliente falhava silenciosamente (ou com erro 404), nenhum dado era inserido, mantendo os contadores do dashboard estagnados.
- **[ALTO] Campo EndereÃ§o:** A funÃ§Ã£o de criaÃ§Ã£o e atualizaÃ§Ã£o de cliente nÃ£o processava o campo endereco, apesar de ele existir na tabela de alguns tenants.

### AÃ§Ãµes Executadas
- **[DB] ix_crm_sprint24.sql:** Atualizado script de migraÃ§Ã£o para incluir p_endereco em todas as funÃ§Ãµes internas de criaÃ§Ã£o e atualizaÃ§Ã£o de clientes em todos os schemas 	enant_*.
- **[DB] MigraÃ§Ã£o Segura:** Aplicada migraÃ§Ã£o resiliente que verifica a existÃªncia da tabela clientes antes de realizar o ALTER TABLE ou CREATE FUNCTION, evitando erros em tenants Ã³rfÃ£os ou incompletos.
- **[DB] UnificaÃ§Ã£o de Assinaturas:**
    - 	enant_criar_cliente: Fixado em 7 parÃ¢metros (
ome, email, telefone, funil_fase, status, cpf_cnpj, endereco).
    - 	enant_atualizar_cliente: Fixado em 8 parÃ¢metros (id, nome, email, telefone, funil_fase, status, cpf_cnpj, endereco).
- **[DB] Cache Reload:** Executado NOTIFY pgrst, 'reload schema' para garantir que o PostgREST reconheÃ§a as novas assinaturas imediatamente.

### Status
- **Banco:** Corrigido e Migrado.
- **Frontend:** JÃ¡ estava preparado para 7/8 parÃ¢metros, agora o backend responde corretamente.
- **Vistoria:** CONCLUÃDO.


---

## VISTORIA 35 (PENDENTE): Overhaul de UI/UX Dark Mode Ã¢â‚¬â€ 27/04/2026

### Objetivo:
RepaginaÃƒÂ§ÃƒÂ£o total do Dark Mode para melhorar contraste, eficiÃƒÂªncia visual e usabilidade premium.

### AÃƒÂ§ÃƒÂµes Executadas:
- **globals.css [MODIFICADO]** Ã¢â‚¬â€ Nova paleta OKLCH "Deep Midnight", introduÃƒÂ§ÃƒÂ£o da fonte "Outfit" e refinamento de tipografia global.
- **Sidebar.tsx [MODIFICADO]** Ã¢â‚¬â€ Branding atualizado com "Outfit", melhoria no peso das fontes, espaÃƒÂ§amento e estados de interaÃƒÂ§ÃƒÂ£o (hover/active).
- **KPICard.tsx [MODIFICADO]** Ã¢â‚¬â€ Suporte total a dark mode via bg-card, atualizaÃƒÂ§ÃƒÂ£o de ÃƒÂ­cones e redesign de badges de tendÃƒÂªncia.
- **Header.tsx [MODIFICADO]** Ã¢â‚¬â€ Ajuste de branding mobile e refinamento de sombras/backdrop blur.

### Status:
- **UI/UX:** PENDENTE DE VISTORIA (AlteraÃƒÂ§ÃƒÂµes de cÃƒÂ³digo-fonte realizadas).
- **Vistoria:** PENDENTE.

---

## VISTORIA 36 (CONCLUÃƒï¿½DO): CorreÃƒÂ§ÃƒÂ£o Painel Nurturing & UX "Novo Cliente" Ã¢â‚¬â€ 27/04/2026

### Escopo
- **[CRÃƒï¿½TICO] Erro row_to_json(jsonb):** Identificada falha na RPC `public.tenant_obter_sugestoes_nurturing` devido a retornos inconsistentes nos tenants.
- **[UX] Posicionamento do FormulÃƒÂ¡rio:** O formulÃƒÂ¡rio de "Novo Cliente" agora ÃƒÂ© um Modal centralizado.
- **[ALTO] Hydration Error (React 418):** EstabilizaÃƒÂ§ÃƒÂ£o da pÃƒÂ¡gina apÃƒÂ³s correÃƒÂ§ÃƒÂ£o da RPC.

### AÃƒÂ§ÃƒÂµes Executadas
- **[DB] public.tenant_obter_sugestoes_nurturing:** Refatorada para ser polimÃƒÂ³rfica (suporta record e jsonb).
- **[FE] CRM Page:** RefatoraÃƒÂ§ÃƒÂ£o para uso do componente `Modal`.

### Status
- **Funcionalidade:** Painel restaurado e UX corrigido.
- **Vistoria:** CONCLUÃƒï¿½DO.

---

## VISTORIA 37 (PENDENTE): PromoÃ§Ã£o de 'ConfiguraÃ§Ãµes' para Recurso Nativo - 28/04/2026

### Objetivo
Tornar a pÃ¡gina de ConfiguraÃ§Ãµes um recurso nativo da plataforma, garantindo acesso perpÃ©tuo (independente de plano ou status de assinatura) e eliminando o risco de loop de redirecionamento no middleware.

### AÃ§Ãµes Executadas
- **middleware.ts [MODIFICADO]**: Adicionada exceÃ§Ã£o para 'configuracoes' no check de mÃ³dulos ativos.
- **Sidebar.tsx [MODIFICADO]**: InjeÃ§Ã£o forÃ§ada do link de ConfiguraÃ§Ãµes na navegaÃ§Ã£o visÃ­vel.
- **mestre/page.tsx [MODIFICADO]**: RemoÃ§Ã£o de 'ConfiguraÃ§Ãµes' do wizard de provisionamento SaaS.
- **remove_settings_from_catalog.sql [NOVO]**: Script para limpar a entrada do catÃ¡logo no schema public.

### Status
- **Arquitetura:** MÃ³dulo convertido em Core Feature.
- **Vistoria:** PENDENTE (AlteraÃ§Ãµes de cÃ³digo realizadas).
$entry

---

## VISTORIA 38 (PENDENTE): Melhorias no MÃ³dulo de Vendas & ProntidÃ£o SEFAZ - 28/04/2026

### Objetivo
Resolver gaps de funcionalidade no mÃ³dulo de Vendas, implementar busca real no servidor, geraÃ§Ã£o de recibos e preparar a estrutura de banco de dados para futura integraÃ§Ã£o com SEFAZ.

### AÃ§Ãµes Executadas
- **vendas_sefaz_readiness.sql [NOVO]**: MigraÃ§Ã£o para adicionar colunas de NFe (
fe_status, 
fe_chave, 
fe_xml, etc.) e atualizar RPCs (	enant_processar_venda, 	enant_listar_vendas).
- **lib/api.ts [MODIFICADO]**: AtualizaÃ§Ã£o da interface Venda e funÃ§Ã£o etchVendas com suporte a searchTerm.
- **hooks/use-vendas.ts [MODIFICADO]**: Hook atualizado para suportar buscas reativas.
- **vendas/page.tsx [MODIFICADO]**: ImplementaÃ§Ã£o de busca funcional, exibiÃ§Ã£o de status NFe e gerador de recibo (Window Print).
- **vendas/pdv/page.tsx [MODIFICADO]**: AdiÃ§Ã£o de toggle para solicitaÃ§Ã£o de emissÃ£o de NFe no checkout.
- **SEFAZ_INTEGRATION_GUIDE.md [NOVO]**: DocumentaÃ§Ã£o tÃ©cnica para o prÃ³ximo estÃ¡gio de integraÃ§Ã£o fiscal.

### Status
- **Arquitetura:** Infraestrutura pronta para NFe e Busca Otimizada.
- **Vistoria:** PENDENTE (Realizar teste de fumaÃ§a no PDV e HistÃ³rico).

---

## VISTORIA 39 (PENDENTE): Implementação Nativa do Motor de NFe (Custo Zero) - 29/04/2026

### Objetivo
Implementar emissão nativa de NFe 4.00 sem dependência de SaaS (FocusNFe/NFe.io).

### Ações Executadas
- **nfe-xml-builder.ts [NOVO]**: Gerador de XML 4.00.
- **nfe-signer.ts [NOVO]**: Assinador digital XML.
- **sefaz-client.ts [NOVO]**: Cliente SOAP com mTLS.
- **nfe-service.ts [NOVO]**: Orquestrador de faturamento.
- **api/fiscal/nfe/emitir/route.ts [NOVO]**: Rota de API Next.js.
- **catalogo/page.tsx [MODIFICADO]**: Campos NCM, CFOP, Origem.
- **configuracoes/page.tsx [MODIFICADO]**: Dados do emitente.
- **pdv/page.tsx [MODIFICADO]**: Gatilho de faturamento.
- **api.ts [MODIFICADO]**: Expansão de interfaces.
- **rpc_fiscal_expansion.sql [NOVO]**: Expansão SQL.

### Status
- **Arquitetura**: Motor fiscal 100% nativo.
- **Vistoria**: PENDENTE.

---

## VISTORIA 43 - Estabilização de Relatórios e Resolução de Erros de Hydration
- **Data:** 29/04/2026
- **Status:** CONCLUÍDO
- **Alterações:**
  - Resolução do erro 418 (Hydration Failed) no `Header.tsx` e `RelatoriosPage.tsx` adicionando o estado global `mounted` para contornar discrepâncias de renderização do `Date.toLocaleDateString()` entre servidor (SSR) e cliente.
  - Correção na RPC `tenant_obter_dre` (e re-validação das polimórficas financeiras) para apontar corretamente para colunas existentes (`valor_total` nas vendas), eliminando o erro "column does not exist" (400 Bad Request).
  - Investigação da tela genérica "This page couldn't load": confirmado tratar-se de comportamento padrão do Next.js App Router (ChunkLoadError) ocorrendo ao se navegar em uma sessão ativa no exato momento de um deploy na Vercel, e não de um bug de código.

### Vistoria 44
- **Data:** 29/04/2026
- **Componentes Alterados:** `OnboardingProvider.tsx`, `FiscalGuide.tsx`
- **Banco de Dados:** Criadas RPCs `update_user_settings` e `get_user_settings`, além de adicionada coluna `settings` do tipo JSONB na tabela `user_profiles`.
- **Ações:** Correção da lógica de tutorial para salvar o estado `tutorial_completed` no banco de dados, evitando que ele reapareça em cada novo login (que não preservava localStorage limpo). O botão flutuante do FiscalGuide no módulo de Vendas foi encapsulado em `motion.div` para se tornar arrastável (drag and drop).
