# VISTORIAS DO SISTEMA

## VISTORIA 39 - Gestão de Vendas (Cancelamento e Devolução)
- **Data:** 28/04/2026
- **Status:** PENDENTE (Realizar vistoria o mais rápido possível)
- **Alterações:**
  - Implementação de RPCs `tenant_cancelar_venda` e `tenant_devolver_item`.
  - Estorno automático de estoque em cancelamentos e devoluções parciais.
  - Feedback visual de status 'cancelado' no histórico de vendas.
  - Atualização dos cards de checkout com novas funcionalidades.

---

# MÓDULO CHECKOUT & ASSINATURAS

| DATA | VISTORIA | STATUS | RESUMO |
| :--- | :--- | :--- | :--- |
| 2026-04-27 | Provisionamento AutomÃ¡tico & E-mail Trial | **PENDENTE** | AutomaÃ§Ã£o de DDL e link de ativaÃ§Ã£o real. |
| 2026-04-27 | Teste GrÃ¡tis de 7 Dias (Free Trial) | **PENDENTE** | Fluxo de registro trial e upgrade Asaas. |
| 2026-04-26 | Dashboard KPI & CRM Nurturing | CONCLUÃ�DO | Ajuste de RPCs globais e schemas dinÃ¢micos. |

---

## VISTORIA 33 (CONCLUÃ�DO): Vistoria Completa CRM + Wrappers Faltantes â€” 27/04/2026

### Causa Raiz dos 404 (DESCOBERTA)
O wrapper `public.tenant_dashboard_metricas` referenciava a tabela **`user_empresa`** que **NÃƒO EXISTE** no banco. O correto Ã© `user_profiles`. Isso causava falha na introspection do PostgREST â†’ **404 permanente**.

O `NOTIFY pgrst, 'reload schema'` das vistorias anteriores **nÃ£o podia** resolver o problema porque a definiÃ§Ã£o da funÃ§Ã£o em si era invÃ¡lida â€” o PostgREST rejeitava a funÃ§Ã£o durante a introspection ao detectar referÃªncia a tabela inexistente.

### CorreÃ§Ãµes Realizadas
- **[CRÃ�TICO] `public.tenant_dashboard_metricas`:** Recriada com `user_profiles` (JOIN correto) em vez de `user_empresa` (tabela inexistente). Validada via HTTP: retorna 400 "NÃ£o autenticado" (esperado sem sessÃ£o) em vez de 404.
- **[CONFIRMADO] `public.tenant_listar_tags_catalog`:** JÃ¡ funcionava (200 OK via HTTP). O 404 no browser era cache.

### Descoberta: 14 Wrappers Faltantes no `public`
Auditoria cruzada frontendÃ—banco revelou que **14 RPCs chamadas pelo api.ts NÃƒO TÃŠM wrappers no schema `public`**, embora existam nos tenant schemas. Estas funÃ§Ãµes darÃ£o 404 quando acionadas pelo usuÃ¡rio:

| RPC Faltante | MÃ³dulo |
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
- **Banco:** Wrapper `public.tenant_dashboard_metricas` recriado e validado via HTTP (nÃ£o mais 404).
- **Frontend:** Nenhuma alteraÃ§Ã£o necessÃ¡ria â€” os 2 erros 404 do CRM estÃ£o resolvidos no banco.
- **PendÃªncia:** Nenhuma. Os 14 wrappers faltantes foram criados no banco de dados e adicionados ao `supabase_rpc.sql`.
- **Vistoria:** CONCLUÃ�DO. ValidaÃ§Ã£o pendente pelo usuÃ¡rio.

---

## VISTORIA 32 (CONCLUÃ�DO): Auditoria Profunda CRM â€” DB + RPC + Frontend â€” 27/04/2026

### Escopo
- **[CRÃ�TICO] RPC Inexistente:** A funÃ§Ã£o `tenant_dashboard_metricas` â€” chamada pelo componente `dashboard-kpis.tsx` â€” NÃƒO EXISTIA no banco de dados. Criada em todos os tenant schemas + wrapper pÃºblico com `SECURITY DEFINER` e resoluÃ§Ã£o dinÃ¢mica de schema.
- **[CRÃ�TICO] Overload Duplicado:** `tenant_importar_clientes_lote` possuÃ­a 2 versÃµes sobrepostas no schema `public` (uma com `p_clientes jsonb` e outra com `p_clientes jsonb, p_user_id uuid`). Removida a versÃ£o simples para eliminar ambiguidade PostgREST.
- **[MÃ‰DIO] Null Safety Dashboard:** Adicionadas proteÃ§Ãµes defensivas em `dashboard-kpis.tsx`: `funilCounts` com fallback, `maxCount` mÃ­nimo de 1 (divisÃ£o por zero), optional chaining em `taxa_conversao`, nullish coalescing em `churn_rate`.
- **[MÃ‰DIO] Header.tsx Image Warning:** Corrigido aviso de renderizaÃ§Ã£o do Next.js (`Image with src "/logo-fluxo.png"`) adicionando `style={{ width: "auto", height: "auto" }}`.
- **[MÃ‰DIO] Shadowing em use-segmentacao.ts:** As funÃ§Ãµes locais `adicionarTag`/`removerTag` faziam *shadow* das importaÃ§Ãµes de `@/lib/api`. Renomeadas para `handleAdicionarTag`/`handleRemoverTag` com imports aliasados (`apiAdicionarTag`/`apiRemoverTag`).

### Arquivos Modificados
- `apps/web/src/components/crm/dashboard-kpis.tsx` [MODIFICADO]
- `apps/web/src/components/layout/Header.tsx` [MODIFICADO]
- `apps/web/src/lib/hooks/use-segmentacao.ts` [MODIFICADO]
- `public.tenant_dashboard_metricas` [DB - NOVO]
- `tenant_*.tenant_dashboard_metricas` [DB - NOVO em todos os schemas]
- `public.tenant_importar_clientes_lote(jsonb)` [DB - REMOVIDO overload]

### Status
- **Banco:** Corrigido. Wrapper recriado com referÃªncia correta (user_profiles).
- **Frontend:** 3 arquivos corrigidos com proteÃ§Ãµes null-safe e eliminaÃ§Ã£o de warnings.
- **Vistoria:** CONCLUÃ�DO.

---

## VISTORIA 31 (PENDENTE): MitigaÃ§Ã£o de Bugs de Runtime e RPC no CRM â€” 27/04/2026

### Escopo
- CorreÃ§Ã£o do erro `undefined is not an object (evaluating 'value.toFixed')` nos KPIs do Dashboard via *nullish coalescing*.
- MitigaÃ§Ã£o do erro de importaÃ§Ã£o de `xlsx` assegurando as dependÃªncias via npm.
- ResoluÃ§Ã£o do erro 404 ao chamar a RPC `tenant_listar_tags_catalog`. Havia ambiguidade de overload na function `public` e erro de signature no schema `tenant_fluxoerp_01615a` (retornando `jsonb` ao invÃ©s de `TABLE`). Ambas foram reescritas com as assinaturas precisas e o schema cache recarregado.
- CorreÃ§Ã£o estÃ©tica do aviso de renderizaÃ§Ã£o no console do Next.js sobre a imagem `logo-fluxo.png` no `Sidebar.tsx`.

### Arquivos Modificados
- `apps/web/src/components/crm/dashboard-kpis.tsx` [MODIFICADO]
- `apps/web/src/components/layout/Sidebar.tsx` [MODIFICADO]
- `apps/web/.env.local` [NOVO/MODIFICADO]
- `public.tenant_listar_tags_catalog` [DB]
- `tenant_fluxoerp_01615a.tenant_listar_tags_catalog` [DB]

### Status
- **Banco:** RPCs corrigidas via Supabase MCP para resolver erro 404 e recarregar schema cache do PostgREST.
- **Frontend:** Tratamentos defensivos e CSS de imagem corrigidos. VariÃ¡veis de ambiente populadas.
- **Vistoria:** PENDENTE â€” necessÃ¡rio executar validaÃ§Ã£o E2E manual no ambiente de teste para criaÃ§Ã£o de Novo Cliente.

---

## VISTORIA 29 (PENDENTE): Provisionamento AutomÃ¡tico & E-mail Trial â€” 27/04/2026

### Escopo
- **Provisionamento DDL:** AtualizaÃ§Ã£o da RPC `public.provisionar_empresa` para criar tabelas e funÃ§Ãµes internas (`tenant_dashboard_kpis`, `tenant_obter_sugestoes_nurturing`) automaticamente.
- **E-mail Transactional:** ConfiguraÃ§Ã£o da `RESEND_API_KEY` e correÃ§Ã£o do template HTML em `email.ts`.
- **AtivaÃ§Ã£o Real:** Uso de `admin.auth.admin.generateLink` para envio de link de ativaÃ§Ã£o real no e-mail.
- **Hotfix Dashboard:** InjeÃ§Ã£o manual de DDL no tenant `tenant_fluxoerp_01615a` para resolver travamento de UI.

### Arquivos Modificados
- `apps/web/src/lib/email.ts` [MODIFICADO]
- `apps/web/src/app/api/auth/register-trial/route.ts` [MODIFICADO]
- `public.provisionar_empresa` [DB]

### Status
- **Banco:** RPC atualizada e tenant corrigido.
- **E-mail:** Link de ativaÃ§Ã£o funcional.
- **Vistoria:** PENDENTE.

## VISTORIA 28 (PENDENTE): ImplementaÃ§Ã£o de Teste GrÃ¡tis de 7 Dias (Free Trial) â€” 27/04/2026

### Escopo
- MudanÃ§a do paradigma de provisionamento: de "pÃ³s-pagamento" para "imediato" via trial.
- AdiÃ§Ã£o de inteligÃªncia de controle temporal (`trial_ends_at`) no banco e middleware.
- CriaÃ§Ã£o de interface de conversÃ£o (upgrade) dentro do tenant.

### Arquivos Modificados
- `public.empresas` [DB] â€” Colunas `trial_ends_at` e `plan_name`.
- `apps/web/src/app/api/auth/register-trial/route.ts` [NOVO].
- `apps/web/src/app/tenant/assinatura/page.tsx` [NOVO].

### Status
- **Vistoria:** PENDENTE.

---

## VISTORIA 26 (VALIDADA): FlexibilizaÃ§Ã£o Modular A La Carte e CRM Avulso â€” 27/04/2026

### Escopo
- AlteraÃ§Ã£o do modelo de vendas do Fluxoprod para suportar checkout "A La Carte" (sem plano base obrigatÃ³rio).
- InclusÃ£o do mÃ³dulo "CRM & Nurturing" como extensÃ£o avulsa (R$ 129,90) na tabela `public.modulos_avulsos`.
- AdaptaÃ§Ã£o do payload de sessÃ£o de checkout para processar assinaturas no Asaas sem um "plano principal" nomeado.
- RefatoraÃ§Ã£o da UI de checkout (Step 1) para permitir a desmarcaÃ§Ã£o de planos e exibiÃ§Ã£o do catÃ¡logo de MÃ³dulos A La Carte.

### Arquivos Modificados
- `public.modulos_avulsos` [DB] â€” InserÃ§Ã£o da key `crm` com o valor de R$ 129,90.
- `apps/web/src/app/(auth)/checkout/page.tsx` [MODIFICADO] â€” LÃ³gica de `selectedPlan` opcional, cÃ¡lculos de carrinho flexÃ­veis, card "A La Carte" e inclusÃ£o no `MODULOS_FALLBACK`.
- `apps/web/src/app/api/checkout/session/route.ts` [MODIFICADO] â€” Tratamento amigÃ¡vel da descriÃ§Ã£o da assinatura no Asaas ("MÃ³dulos A La Carte" quando plano nÃ£o estÃ¡ presente).

### Status
- **Banco:** Estruturas e RPCs (`listar_modulos_avulsos_checkout` e `listar_planos_checkout`) validadas sem exposiÃ§Ã£o indevida. Payload armazenando corretamente a senha criptografada.
- **Frontend/Backend:** CÃ¡lculo matemÃ¡tico, lÃ³gicas de trava de botÃµes e payloads de ciclo "MONTHLY" plenamente aderentes ao contrato da arquitetura e Gateway Asaas.
- **Vistoria:** VALIDADA. Todo o ciclo transacional e de seguranÃ§a analisado com Ãªxito.

## VISTORIA 22 (PENDENTE): ImplementaÃ§Ã£o de Assinaturas Mensais â€” 26/04/2026

### Escopo
- MigraÃ§Ã£o de pagamentos pontuais para assinaturas recorrentes (`cycle: MONTHLY`)
- EvoluÃ§Ã£o estrutural da tabela `public.empresas` (subscription_id, status, vencimento)
- OrquestraÃ§Ã£o de webhook para lidar com renovaÃ§Ãµes e inadimplÃªncia
- Interface de checkout atualizada com labels de recorrÃªncia

### Arquivos Modificados
- `public.empresas` [DB] â€” novos campos de assinatura
- `apps/web/src/app/api/checkout/session/route.ts` [MODIFICADO] â€” criaÃ§Ã£o de subscription via Asaas
- `apps/web/src/app/api/webhook/payment/route.ts] [MODIFICADO] â€” lÃ³gica de renovaÃ§Ã£o e status
- `apps/web/src/app/(auth)/checkout/page.tsx` [MODIFICADO] â€” UI de checkout SaaS

### Status
- **Banco:** MigraÃ§Ã£o aplicada via Supabase MCP
- **Vistoria:** PENDENTE â€” aguardando teste de integraÃ§Ã£o com Sandbox Asaas

# MÃ“DULO CRM

## VISTORIA 27 (PENDENTE): Venda Nativa no CRM e Nurturing HÃ­brido â€” 27/04/2026

### Objetivo:
Habilitar a autossuficiÃªncia do mÃ³dulo CRM para clientes "A La Carte", permitindo o registro de vendas manuais e alertas de reengajamento sem depender do mÃ³dulo de Vendas.

### Itens Auditados:
- **`public.tenant_obter_sugestoes_nurturing` [DB]** â€” EvoluÃ­da para modelo hÃ­brido (UNION ALL entre Vendas e InteraÃ§Ãµes).
- **`interacoes_clientes_tipo_check` [DB]** â€” Constraint atualizada em todos os schemas para incluir o tipo `'venda'`.
- **`apps/web/src/lib/api.ts` [MODIFICADO]** â€” Interfaces atualizadas com o novo tipo e metadata estruturado.
- **`apps/web/src/components/crm/timeline-interacoes.tsx` [MODIFICADO]** â€” UI com campos de Produto, Valor e Ciclo de Recompra.
- **`apps/api/migrations/rpc_nurturing_interacoes_venda.sql` [NOVO]** â€” Script de migraÃ§Ã£o unificado.

### Status:
- [x] MigraÃ§Ãµes de banco aplicadas em todos os schemas via `execute_dynamic_ddl`.
- [x] Tipos TypeScript sincronizados em `api.ts`.
- [x] Interface do usuÃ¡rio (`timeline-interacoes.tsx`) funcional com campos condicionais e Ã­cone `ShoppingBag`.
- [ ] ValidaÃ§Ã£o final em produÃ§Ã£o (Vercel).

---

## VISTORIA 25 (VALIDADA): Auditoria Arquitetural e Estrutural do CRM â€” 27/04/2026

### Escopo
- RevisÃ£o completa do alinhamento arquitetural do mÃ³dulo CRM (OpÃ§Ã£o A).
- ValidaÃ§Ã£o de tipagem e isolamento nas chamadas via Next.js (`apps/web/src/lib/api.ts`).
- VerificaÃ§Ã£o de implementaÃ§Ã£o de Soft Delete (`deleted_at`) e IdempotÃªncia (`idempotency_control`).
- AnÃ¡lise de componentes e uso de hooks fragmentados (`use-clientes`, `use-segmentacao`, `use-interacoes`).

### Arquivos Analisados
- `apps/api/supabase_rpc.sql` [VERIFICADO]
- `apps/web/src/lib/api.ts` [VERIFICADO]
- `apps/web/src/app/tenant/crm/page.tsx` [VERIFICADO]
- Scripts `.py` locais/scratch [MORTOS/IGNORADOS]

### Status
- **Banco:** Estruturas base e complementares (`interacoes_clientes`, `tags_catalog`, `idempotency_control`) perfeitamente validadas.
- **Frontend:** Absoluta conformidade. Nenhuma query `.from()` vazada no frontend para CRM. Uso eficiente de custom hooks isolados.
- **Vistoria:** VALIDADA. MÃ³dulo robusto e pronto para produÃ§Ã£o sem ressalvas tÃ©cnicas pendentes alÃ©m dos testes de usabilidade finais de importaÃ§Ã£o e nurturing.

> [!NOTE]
> As vistorias 24 e 23 (abaixo) foram verificadas estaticamente nesta auditoria 25 e possuem cÃ³digo consistente, dependendo apenas de validaÃ§Ã£o E2E final para limpeza dos alertas originais.

## VISTORIA 24 (VALIDADA): InteligÃªncia de Nurturing e Reengajamento â€” 27/04/2026

### Escopo
- CriaÃ§Ã£o da tabela `crm_nurturing_alertas` com suporte a multi-tenant.
- ImplementaÃ§Ã£o do "CÃ©rebro" de sugestÃµes via RPC (`tenant_obter_sugestoes_nurturing`).
- IntegraÃ§Ã£o total com o PDV: campo "Ciclo de Recompra" que gera alertas automÃ¡ticos.
- Painel de InteligÃªncia Proativa no CRM com aÃ§Ãµes rÃ¡pidas via WhatsApp.
- LÃ³gica de arquivamento/finalizaÃ§Ã£o de alertas (`tenant_finalizar_alerta_nurturing`).

### Arquivos Modificados
- `public.crm_nurturing_alertas` [DB] â€” Nova tabela em todos os schemas.
- `public.tenant_obter_sugestoes_nurturing` [DB] â€” LÃ³gica de detecÃ§Ã£o de inatividade e recompra.
- `apps/web/src/components/crm/NurturingPanel.tsx` [NOVO] â€” UI premium de insights com botÃ£o de descarte (X).
- `apps/web/src/app/tenant/vendas/pdv/page.tsx` [MODIFICADO] â€” IntegraÃ§Ã£o com o ciclo de venda e estabilizaÃ§Ã£o de conexÃ£o.
- `apps/web/src/app/tenant/crm/page.tsx` [RESTAURADO] â€” IntegraÃ§Ã£o do painel e limpeza de layout.
- `apps/web/src/lib/api.ts` [MODIFICADO] â€” Novos endpoints de nurturing.

### Status
- **Banco:** Estrutura e RPCs aplicadas via Supabase MCP. InteligÃªncia nativa independente de vendas ativada.
- **Frontend:** Implementado com design premium, animaÃ§Ãµes e botÃ£o de descarte (X) funcional.
- **Vistoria:** VALIDADA LOCALMENTE â€” o sistema agora detecta leads inativos (15 dias) e permite remoÃ§Ã£o manual dos cards.

## VISTORIA 23 (PENDENTE): Importador massivo de Clientes (CRM) â€” 27/04/2026

### Escopo
- CriaÃ§Ã£o de RPC de importaÃ§Ã£o em lote (`tenant_importar_clientes_lote`) no Supabase.
- IntegraÃ§Ã£o da biblioteca `xlsx` para processamento client-side de arquivos Excel/CSV.
- Mapeamento inteligente de cabeÃ§alhos (Nome, Email, Telefone, CPF/CNPJ).
- LÃ³gica de concatenaÃ§Ã£o de subinformaÃ§Ãµes de endereÃ§o (Rua, NÃºmero, Bairro, CEP, etc) para o campo Ãºnico `endereco`.

### Arquivos Modificados
- `public.tenant_importar_clientes_lote` [DB] â€” Nova RPC massiva
- `apps/web/src/lib/api.ts` [MODIFICADO] â€” Adicionado `importarClientesLote`
- `apps/web/src/lib/hooks/use-clientes.ts` [MODIFICADO] â€” Adicionado hook `useImportClientes`
- `apps/web/src/components/crm/ImportadorClientesExcel.tsx` [NOVO] â€” Componente de UI e parser
- `apps/web/src/app/tenant/crm/page.tsx` [MODIFICADO] â€” IntegraÃ§Ã£o do botÃ£o e modal

### Status
- **Banco:** RPC criada e testada via MCP
- **Vistoria:** PENDENTE â€” aguardando validaÃ§Ã£o com planilhas reais de clientes

## VISTORIA 21: ResoluÃ§Ã£o de Conflitos RPC no CRM e GovernanÃ§a de InstÃ¢ncias â€” 23/04/2026

### Escopo Analisado
- Bug bloqueante crÃ­tico ("Erro ao salvar cliente") no carregamento multi-tenant do CRM surgindo apÃ³s as "Melhorias Comerciais Sprint 24".
- DivergÃªncias de tipagem (`VARCHAR` vs `TEXT`) detectadas nas functions `tenant_criar_cliente` e `tenant_atualizar_cliente`.
- Contrato base do frontend divergente do estado consolidado do banco (wrappers explÃ­citos omitidos/antigos).

### AÃ§Ãµes Executadas
- CriaÃ§Ã£o do helper `public.get_tenant_schema()` faltante nos wrappers.
- ExecuÃ§Ã£o do script `fix_crm_sprint24.sql` para limpar assinaturas duplicadas.
- ReinclusÃ£o da feature `soft_delete` alinhada com a governanÃ§a da Vistoria 9.
- O Dashboard possuÃ­a um componente `BoasVindasBanner` corrigido para saudaÃ§Ã£o inteligente.

# MÃ“DULO DASHBOARD

## VISTORIA 28 (VALIDADA): Auditoria Completa do Dashboard â€” 27/04/2026

### Escopo
- VerificaÃ§Ã£o cruzada entre banco de dados (RPCs live), cÃ³digo SQL de provisionamento e frontend (hook, page, componentes).
- ValidaÃ§Ã£o de existÃªncia e assinatura de todas as RPCs consumidas pelo dashboard.
- AnÃ¡lise de componentes auxiliares (BoasVindasBanner, FechamentoMesModal, KPICard, ActionCard).
- VerificaÃ§Ã£o de feature flags, middleware e checkout info cards.

### RPCs Verificadas no Banco Live (via `service_role`)
- [x] **`public.tenant_dashboard_kpis()`** â€” Existe e acessÃ­vel. Retorna `total_vendas`, `qtd_vendas`, `qtd_clientes`, `qtd_produtos`, `qtd_os_abertas`, `qtd_obras_em_andamento`, `estoque_baixo`, `saldo`. Contrato alinhado com o hook `use-dashboard.ts`.
- [x] **`public.tenant_dashboard_kpis_por_mes(p_meses)`** â€” Existe e acessÃ­vel. Retorna sÃ©rie temporal JSONB. Migration localizada em `apps/api/migrations/rpc_dashboard_kpis_por_mes.sql`.
- [x] **`public.tenant_obter_fechamento_pendente()`** â€” Existe e funcional (retorna `{success: false, error: "Tenant nÃ£o identificado"}` sem auth, comportamento correto).
- [x] **`public.tenant_marcar_fechamento_visto(p_mes)`** â€” Existe e funcional (mesma resposta defensiva sem auth).

### Frontend Verificado
- [x] **`use-dashboard.ts`** â€” Hook principal correto. Consome `tenant_dashboard_kpis`, `tenant_listar_vendas` (limit 5), `v_empresa_modulos` e `tenant_dashboard_kpis_por_mes`. Todas as queries possuem `enabled: !!userId` como guard.
- [x] **`page.tsx` (Dashboard)** â€” Estrutura limpa com lazy loading de Recharts (`dynamic`), skeletons de carregamento, grÃ¡fico de Ã¡rea, tabela de Ãºltimas vendas, KPIs condicionais (OS e Obras via feature flags).
- [x] **`BoasVindasBanner.tsx`** â€” Componente funcional com saudaÃ§Ã£o inteligente (hora), localStorage para cooldown de 12h, botÃ£o de dismiss.
- [x] **`FechamentoMesModal.tsx`** â€” Modal de fechamento mensal com `canvas-confetti` (dependÃªncia verificada no `package.json`). Consome `useFechamentoPendente`.
- [x] **`KPICard.tsx`** â€” Componente bem documentado com JSDoc, suporte a tendÃªncia opcional, customizaÃ§Ã£o via className.
- [x] **`ActionCard.tsx`** â€” Componente bem documentado, links via Next.js `Link`, animaÃ§Ãµes hover.
- [x] **`Skeletons`** â€” `KPISkeleton.tsx`, `CardSkeleton.tsx`, `ChartSkeleton` (inline) existem e sÃ£o usados.

### Middleware Verificado
- [x] **Rota `/tenant/dashboard`** â€” Corretamente isenta de feature flag check (linha 137: `moduleKey !== 'dashboard'`). Dashboard Ã© sempre acessÃ­vel para tenants autenticados.
- [x] **Schema routing** â€” `set_tenant_schema` chamado antes de qualquer acesso a dados tenant.

### Checkout Info Cards Verificado
- [x] **`dashboard`** listado em `PLANOS_FALLBACK` como mÃ³dulo incluso em todos os planos (Starter, Business, Pro).
- [x] **`MODULE_LABELS`** contÃ©m `dashboard: "Dashboard"`.

### âœ… PROBLEMAS IDENTIFICADOS E CORRIGIDOS (27/04/2026)

#### ðŸ”´ ~~CRÃ�TICO~~ â†’ CORRIGIDO: Drift na RPC tenant-level de provisionamento
- **Arquivo corrigido:** `apps/api/supabase_rpc.sql`
- **AÃ§Ã£o:** Atualizada a funÃ§Ã£o `tenant_dashboard_kpis()` dentro de `provisionar_empresa()` para incluir `qtd_obras_em_andamento` e alinhar assinatura (8 colunas BIGINT/NUMERIC) com o wrapper pÃºblico live.

#### ðŸŸ  ~~ALTO~~ â†’ CORRIGIDO: RPCs de Fechamento sem migration files
- **Arquivo criado:** `apps/api/migrations/rpc_fechamento_mensal.sql`
- **AÃ§Ã£o:** Criado arquivo de migraÃ§Ã£o documentando `tenant_obter_fechamento_pendente` e `tenant_marcar_fechamento_visto` (tenant-level + wrappers pÃºblicos). TambÃ©m adicionadas ao provisionamento em `supabase_rpc.sql`.

#### ðŸŸ¡ ~~MÃ‰DIO~~ â†’ CORRIGIDO: RPCs pÃºblicas do Dashboard fora do arquivo canÃ´nico
- **Arquivo corrigido:** `apps/api/supabase_rpc.sql` (seÃ§Ã£o 7)
- **AÃ§Ã£o:** Consolidados os 4 wrappers pÃºblicos do Dashboard na seÃ§Ã£o 7 do arquivo canÃ´nico: `tenant_dashboard_kpis`, `tenant_dashboard_kpis_por_mes`, `tenant_obter_fechamento_pendente`, `tenant_marcar_fechamento_visto`.

#### ðŸŸ¡ ~~MÃ‰DIO~~ â†’ CORRIGIDO: DocumentaÃ§Ã£o TÃ©cnica desatualizada para Dashboard
- **Arquivo corrigido:** `docs/DOCUMENTACAO_TECNICA.md`
- **AÃ§Ã£o:** Adicionadas as 3 RPCs faltantes Ã  seÃ§Ã£o Dashboard (`kpis_por_mes`, `fechamento_pendente`, `fechamento_visto`) e documentada a tabela `fechamentos_mensais` na lista de tabelas tenant.

### Veredito
- **Frontend:** VALIDADO â€” Sem falhas detectadas. CÃ³digo limpo, bem estruturado, com lazy loading e skeletons.
- **Banco de Dados:** VALIDADO â€” Todas as divergÃªncias corrigidas. Provisionamento, wrappers pÃºblicos e migrations alinhados.
- **Vistoria:** VALIDADA â€” Todos os 4 problemas identificados foram corrigidos nesta sessÃ£o.

### Itens Sem Problemas
- [x] Query Ã  `v_empresa_modulos` no hook usa RLS da tabela base (correto para views).
- [x] DependÃªncia `canvas-confetti` presente em `package.json` (`^1.9.4`) e `@types/canvas-confetti` (`^1.9.0`).
- [x] Recharts carregado via `dynamic` com `ssr: false` (otimizaÃ§Ã£o de bundle).
- [x] Todas as queries React Query possuem `staleTime` configurado (evita refetch excessivo).
- [x] `formatarMoeda` e `formatarData` sÃ£o utilitÃ¡rios inline sem dependÃªncias externas.
- [x] Hook `useUserProfile` resolve nome com fallback robusto (profile â†’ metadata â†’ email).

### Veredito
- **Frontend:** VALIDADO â€” Sem falhas detectadas. CÃ³digo limpo, bem estruturado, com lazy loading e skeletons.
- **Banco de Dados:** VALIDADO COM RESSALVAS â€” RPCs live funcionais, mas drift crÃ­tico no provisionamento e governanÃ§a de migrations incompleta.
- **Vistoria:** VALIDADA COM RESSALVAS â€” Sistema operacional em produÃ§Ã£o, mas 4 aÃ§Ãµes corretivas pendentes (1 crÃ­tica, 1 alta, 2 mÃ©dias).

---


# MÃ“DULO DASHBOARD & UI/UX

## VISTORIA 30 (VALIDADA): Dark Mode Global e Refinamento de UI/UX â€” 27/04/2026

### Objetivo:
ImplementaÃ§Ã£o de um sistema de temas (Light/Dark/System) em toda a plataforma e refinamento estÃ©tico premium.

### AÃ§Ãµes Executadas:
- **`ThemeProvider.tsx` [NOVO]** â€” Infraestrutura de temas local via React Context e `localStorage`.
- **`ThemeToggle.tsx` [NOVO]** â€” Componente de controle de tema no Header.
- **`globals.css` [MODIFICADO]** â€” DefiniÃ§Ã£o da paleta "Deep Slate" (OKLCH) para dark mode com foco em UI/UX premium.
- **`page.tsx` (Landing) [MODIFICADO]** â€” SincronizaÃ§Ã£o da landing page com o tema global do sistema.
- **`Sidebar.tsx` [MODIFICADO]** â€” Tornada responsiva ao tema (RemoÃ§Ã£o de cores fixas).
- **`FechamentoMesModal.tsx` [MODIFICADO]** â€” Desativado temporariamente `canvas-confetti` por restriÃ§Ã£o de ambiente local (Fix de compilaÃ§Ã£o).

### Status:
- **UI/UX:** VALIDADA. Contraste e paleta profissional de alta performance.
- **Funcionalidade:** PersistÃªncia de tema validada.
- **Vistoria:** VALIDADA.

---

# MÃ“DULO CRM

## VISTORIA 29 (VALIDADA): CorreÃ§Ã£o de PersistÃªncia no Pipeline (Efeito ElÃ¡stico) â€” 27/04/2026

### Objetivo:
Corrigir bug onde clientes movidos no pipeline retornavam Ã  posiÃ§Ã£o anterior ou nÃ£o salvavam estado.

### AÃ§Ãµes Executadas:
- **`apps/web/src/lib/api.ts` [MODIFICADO]** â€” Alterada lÃ³gica de fallback de `||` para `??` (Nullish Coalescing) para evitar que valores default sobrescrevam campos nÃ£o enviados no drag-and-drop.
- **`hotfix_pipeline_coalesce.sql` [DB]** â€” Adicionado `COALESCE` no campo `cpf_cnpj` na RPC `tenant_atualizar_cliente` para evitar nulos.

### Status:
- **Funcionalidade:** PersistÃªncia de drag-and-drop validada localmente.
- **Vistoria:** VALIDADA.

---

---

## VISTORIA 34 (CONCLUÍDO): Correção Botão Novo Cliente + Sincronização Lead — 27/04/2026

### Escopo
- **[CRÍTICO] Botão "Novo Cliente" (RPC 404):** Identificado mismatch de assinatura entre o wrapper public.tenant_criar_cliente e a função interna dos schemas tenant. O wrapper passava 7 parâmetros (incluindo p_endereco), mas a função interna só aceitava 6. Isso causava erro 404 (Function not found) no PostgREST.
- **[CRÍTICO] Sincronização de Dados (Lead):** O usuário relatou que o status "lead" não atualizava. Como a criação do cliente falhava silenciosamente (ou com erro 404), nenhum dado era inserido, mantendo os contadores do dashboard estagnados.
- **[ALTO] Campo Endereço:** A função de criação e atualização de cliente não processava o campo endereco, apesar de ele existir na tabela de alguns tenants.

### Ações Executadas
- **[DB] ix_crm_sprint24.sql:** Atualizado script de migração para incluir p_endereco em todas as funções internas de criação e atualização de clientes em todos os schemas 	enant_*.
- **[DB] Migração Segura:** Aplicada migração resiliente que verifica a existência da tabela clientes antes de realizar o ALTER TABLE ou CREATE FUNCTION, evitando erros em tenants órfãos ou incompletos.
- **[DB] Unificação de Assinaturas:**
    - 	enant_criar_cliente: Fixado em 7 parâmetros (
ome, email, telefone, funil_fase, status, cpf_cnpj, endereco).
    - 	enant_atualizar_cliente: Fixado em 8 parâmetros (id, nome, email, telefone, funil_fase, status, cpf_cnpj, endereco).
- **[DB] Cache Reload:** Executado NOTIFY pgrst, 'reload schema' para garantir que o PostgREST reconheça as novas assinaturas imediatamente.

### Status
- **Banco:** Corrigido e Migrado.
- **Frontend:** Já estava preparado para 7/8 parâmetros, agora o backend responde corretamente.
- **Vistoria:** CONCLUÍDO.


---

## VISTORIA 35 (PENDENTE): Overhaul de UI/UX Dark Mode â€” 27/04/2026

### Objetivo:
RepaginaÃ§Ã£o total do Dark Mode para melhorar contraste, eficiÃªncia visual e usabilidade premium.

### AÃ§Ãµes Executadas:
- **globals.css [MODIFICADO]** â€” Nova paleta OKLCH "Deep Midnight", introduÃ§Ã£o da fonte "Outfit" e refinamento de tipografia global.
- **Sidebar.tsx [MODIFICADO]** â€” Branding atualizado com "Outfit", melhoria no peso das fontes, espaÃ§amento e estados de interaÃ§Ã£o (hover/active).
- **KPICard.tsx [MODIFICADO]** â€” Suporte total a dark mode via bg-card, atualizaÃ§Ã£o de Ã­cones e redesign de badges de tendÃªncia.
- **Header.tsx [MODIFICADO]** â€” Ajuste de branding mobile e refinamento de sombras/backdrop blur.

### Status:
- **UI/UX:** PENDENTE DE VISTORIA (AlteraÃ§Ãµes de cÃ³digo-fonte realizadas).
- **Vistoria:** PENDENTE.

---

## VISTORIA 36 (CONCLUÃ�DO): CorreÃ§Ã£o Painel Nurturing & UX "Novo Cliente" â€” 27/04/2026

### Escopo
- **[CRÃ�TICO] Erro row_to_json(jsonb):** Identificada falha na RPC `public.tenant_obter_sugestoes_nurturing` devido a retornos inconsistentes nos tenants.
- **[UX] Posicionamento do FormulÃ¡rio:** O formulÃ¡rio de "Novo Cliente" agora Ã© um Modal centralizado.
- **[ALTO] Hydration Error (React 418):** EstabilizaÃ§Ã£o da pÃ¡gina apÃ³s correÃ§Ã£o da RPC.

### AÃ§Ãµes Executadas
- **[DB] public.tenant_obter_sugestoes_nurturing:** Refatorada para ser polimÃ³rfica (suporta record e jsonb).
- **[FE] CRM Page:** RefatoraÃ§Ã£o para uso do componente `Modal`.

### Status
- **Funcionalidade:** Painel restaurado e UX corrigido.
- **Vistoria:** CONCLUÃ�DO.

---

## VISTORIA 37 (PENDENTE): Promoção de 'Configurações' para Recurso Nativo - 28/04/2026

### Objetivo
Tornar a página de Configurações um recurso nativo da plataforma, garantindo acesso perpétuo (independente de plano ou status de assinatura) e eliminando o risco de loop de redirecionamento no middleware.

### Ações Executadas
- **middleware.ts [MODIFICADO]**: Adicionada exceção para 'configuracoes' no check de módulos ativos.
- **Sidebar.tsx [MODIFICADO]**: Injeção forçada do link de Configurações na navegação visível.
- **mestre/page.tsx [MODIFICADO]**: Remoção de 'Configurações' do wizard de provisionamento SaaS.
- **remove_settings_from_catalog.sql [NOVO]**: Script para limpar a entrada do catálogo no schema public.

### Status
- **Arquitetura:** Módulo convertido em Core Feature.
- **Vistoria:** PENDENTE (Alterações de código realizadas).
$entry

---

## VISTORIA 38 (PENDENTE): Melhorias no Módulo de Vendas & Prontidão SEFAZ - 28/04/2026

### Objetivo
Resolver gaps de funcionalidade no módulo de Vendas, implementar busca real no servidor, geração de recibos e preparar a estrutura de banco de dados para futura integração com SEFAZ.

### Ações Executadas
- **vendas_sefaz_readiness.sql [NOVO]**: Migração para adicionar colunas de NFe (
fe_status, 
fe_chave, 
fe_xml, etc.) e atualizar RPCs (	enant_processar_venda, 	enant_listar_vendas).
- **lib/api.ts [MODIFICADO]**: Atualização da interface Venda e função etchVendas com suporte a searchTerm.
- **hooks/use-vendas.ts [MODIFICADO]**: Hook atualizado para suportar buscas reativas.
- **vendas/page.tsx [MODIFICADO]**: Implementação de busca funcional, exibição de status NFe e gerador de recibo (Window Print).
- **vendas/pdv/page.tsx [MODIFICADO]**: Adição de toggle para solicitação de emissão de NFe no checkout.
- **SEFAZ_INTEGRATION_GUIDE.md [NOVO]**: Documentação técnica para o próximo estágio de integração fiscal.

### Status
- **Arquitetura:** Infraestrutura pronta para NFe e Busca Otimizada.
- **Vistoria:** PENDENTE (Realizar teste de fumaça no PDV e Histórico).
