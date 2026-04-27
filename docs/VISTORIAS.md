# MÓDULO CHECKOUT & ASSINATURAS

> **⚠ VISTORIA PENDENTE (Validação de E-mail Real — 27/04/2026):** Implementada validação de domínios fictícios (blacklisting) no frontend e backend. O fluxo de criação de usuário no Webhook foi alterado para `email_confirm: false`, forçando a verificação real via link do Supabase antes do login. Página de login atualizada com mensagens de erro amigáveis para e-mails não confirmados.

> **⚠ VISTORIA PENDENTE (SaaS Subscriptions — 26/04/2026):** Foi implementado o modelo de assinaturas mensais recorrentes via Asaas. Alterações críticas realizadas no banco de dados (public.empresas), checkout session, webhook de pagamento e UI do checkout. Uma vistoria completa de integridade deve ser realizada com prioridade máxima.

## VISTORIA 26 (VALIDADA): Flexibilização Modular A La Carte e CRM Avulso — 27/04/2026

### Escopo
- Alteração do modelo de vendas do Fluxoprod para suportar checkout "A La Carte" (sem plano base obrigatório).
- Inclusão do módulo "CRM & Nurturing" como extensão avulsa (R$ 129,90) na tabela `public.modulos_avulsos`.
- Adaptação do payload de sessão de checkout para processar assinaturas no Asaas sem um "plano principal" nomeado.
- Refatoração da UI de checkout (Step 1) para permitir a desmarcação de planos e exibição do catálogo de Módulos A La Carte.

### Arquivos Modificados
- `public.modulos_avulsos` [DB] — Inserção da key `crm` com o valor de R$ 129,90.
- `apps/web/src/app/(auth)/checkout/page.tsx` [MODIFICADO] — Lógica de `selectedPlan` opcional, cálculos de carrinho flexíveis, card "A La Carte" e inclusão no `MODULOS_FALLBACK`.
- `apps/web/src/app/api/checkout/session/route.ts` [MODIFICADO] — Tratamento amigável da descrição da assinatura no Asaas ("Módulos A La Carte" quando plano não está presente).

### Status
- **Banco:** Estruturas e RPCs (`listar_modulos_avulsos_checkout` e `listar_planos_checkout`) validadas sem exposição indevida. Payload armazenando corretamente a senha criptografada.
- **Frontend/Backend:** Cálculo matemático, lógicas de trava de botões e payloads de ciclo "MONTHLY" plenamente aderentes ao contrato da arquitetura e Gateway Asaas.
- **Vistoria:** VALIDADA. Todo o ciclo transacional e de segurança analisado com êxito.

## VISTORIA 22 (PENDENTE): Implementação de Assinaturas Mensais — 26/04/2026

### Escopo
- Migração de pagamentos pontuais para assinaturas recorrentes (`cycle: MONTHLY`)
- Evolução estrutural da tabela `public.empresas` (subscription_id, status, vencimento)
- Orquestração de webhook para lidar com renovações e inadimplência
- Interface de checkout atualizada com labels de recorrência

### Arquivos Modificados
- `public.empresas` [DB] — novos campos de assinatura
- `apps/web/src/app/api/checkout/session/route.ts` [MODIFICADO] — criação de subscription via Asaas
- `apps/web/src/app/api/webhook/payment/route.ts] [MODIFICADO] — lógica de renovação e status
- `apps/web/src/app/(auth)/checkout/page.tsx` [MODIFICADO] — UI de checkout SaaS

### Status
- **Banco:** Migração aplicada via Supabase MCP
- **Vistoria:** PENDENTE — aguardando teste de integração com Sandbox Asaas

# MÓDULO CRM

## VISTORIA 27 (PENDENTE): Venda Nativa no CRM e Nurturing Híbrido — 27/04/2026

### Objetivo:
Habilitar a autossuficiência do módulo CRM para clientes "A La Carte", permitindo o registro de vendas manuais e alertas de reengajamento sem depender do módulo de Vendas.

### Itens Auditados:
- **`public.tenant_obter_sugestoes_nurturing` [DB]** — Evoluída para modelo híbrido (UNION ALL entre Vendas e Interações).
- **`interacoes_clientes_tipo_check` [DB]** — Constraint atualizada em todos os schemas para incluir o tipo `'venda'`.
- **`apps/web/src/lib/api.ts` [MODIFICADO]** — Interfaces atualizadas com o novo tipo e metadata estruturado.
- **`apps/web/src/components/crm/timeline-interacoes.tsx` [MODIFICADO]** — UI com campos de Produto, Valor e Ciclo de Recompra.
- **`apps/api/migrations/rpc_nurturing_interacoes_venda.sql` [NOVO]** — Script de migração unificado.

### Status:
- [x] Migrações de banco aplicadas em todos os schemas via `execute_dynamic_ddl`.
- [x] Tipos TypeScript sincronizados em `api.ts`.
- [x] Interface do usuário (`timeline-interacoes.tsx`) funcional com campos condicionais e ícone `ShoppingBag`.
- [ ] Validação final em produção (Vercel).

---

## VISTORIA 25 (VALIDADA): Auditoria Arquitetural e Estrutural do CRM — 27/04/2026

### Escopo
- Revisão completa do alinhamento arquitetural do módulo CRM (Opção A).
- Validação de tipagem e isolamento nas chamadas via Next.js (`apps/web/src/lib/api.ts`).
- Verificação de implementação de Soft Delete (`deleted_at`) e Idempotência (`idempotency_control`).
- Análise de componentes e uso de hooks fragmentados (`use-clientes`, `use-segmentacao`, `use-interacoes`).

### Arquivos Analisados
- `apps/api/supabase_rpc.sql` [VERIFICADO]
- `apps/web/src/lib/api.ts` [VERIFICADO]
- `apps/web/src/app/tenant/crm/page.tsx` [VERIFICADO]
- Scripts `.py` locais/scratch [MORTOS/IGNORADOS]

### Status
- **Banco:** Estruturas base e complementares (`interacoes_clientes`, `tags_catalog`, `idempotency_control`) perfeitamente validadas.
- **Frontend:** Absoluta conformidade. Nenhuma query `.from()` vazada no frontend para CRM. Uso eficiente de custom hooks isolados.
- **Vistoria:** VALIDADA. Módulo robusto e pronto para produção sem ressalvas técnicas pendentes além dos testes de usabilidade finais de importação e nurturing.

> [!NOTE]
> As vistorias 24 e 23 (abaixo) foram verificadas estaticamente nesta auditoria 25 e possuem código consistente, dependendo apenas de validação E2E final para limpeza dos alertas originais.

## VISTORIA 24 (VALIDADA): Inteligência de Nurturing e Reengajamento — 27/04/2026

### Escopo
- Criação da tabela `crm_nurturing_alertas` com suporte a multi-tenant.
- Implementação do "Cérebro" de sugestões via RPC (`tenant_obter_sugestoes_nurturing`).
- Integração total com o PDV: campo "Ciclo de Recompra" que gera alertas automáticos.
- Painel de Inteligência Proativa no CRM com ações rápidas via WhatsApp.
- Lógica de arquivamento/finalização de alertas (`tenant_finalizar_alerta_nurturing`).

### Arquivos Modificados
- `public.crm_nurturing_alertas` [DB] — Nova tabela em todos os schemas.
- `public.tenant_obter_sugestoes_nurturing` [DB] — Lógica de detecção de inatividade e recompra.
- `apps/web/src/components/crm/NurturingPanel.tsx` [NOVO] — UI premium de insights com botão de descarte (X).
- `apps/web/src/app/tenant/vendas/pdv/page.tsx` [MODIFICADO] — Integração com o ciclo de venda e estabilização de conexão.
- `apps/web/src/app/tenant/crm/page.tsx` [RESTAURADO] — Integração do painel e limpeza de layout.
- `apps/web/src/lib/api.ts` [MODIFICADO] — Novos endpoints de nurturing.

### Status
- **Banco:** Estrutura e RPCs aplicadas via Supabase MCP. Inteligência nativa independente de vendas ativada.
- **Frontend:** Implementado com design premium, animações e botão de descarte (X) funcional.
- **Vistoria:** VALIDADA LOCALMENTE — o sistema agora detecta leads inativos (15 dias) e permite remoção manual dos cards.

## VISTORIA 23 (PENDENTE): Importador massivo de Clientes (CRM) — 27/04/2026

### Escopo
- Criação de RPC de importação em lote (`tenant_importar_clientes_lote`) no Supabase.
- Integração da biblioteca `xlsx` para processamento client-side de arquivos Excel/CSV.
- Mapeamento inteligente de cabeçalhos (Nome, Email, Telefone, CPF/CNPJ).
- Lógica de concatenação de subinformações de endereço (Rua, Número, Bairro, CEP, etc) para o campo único `endereco`.

### Arquivos Modificados
- `public.tenant_importar_clientes_lote` [DB] — Nova RPC massiva
- `apps/web/src/lib/api.ts` [MODIFICADO] — Adicionado `importarClientesLote`
- `apps/web/src/lib/hooks/use-clientes.ts` [MODIFICADO] — Adicionado hook `useImportClientes`
- `apps/web/src/components/crm/ImportadorClientesExcel.tsx` [NOVO] — Componente de UI e parser
- `apps/web/src/app/tenant/crm/page.tsx` [MODIFICADO] — Integração do botão e modal

### Status
- **Banco:** RPC criada e testada via MCP
- **Vistoria:** PENDENTE — aguardando validação com planilhas reais de clientes

## VISTORIA 21: Resolução de Conflitos RPC no CRM e Governança de Instâncias — 23/04/2026

### Escopo Analisado
- Bug bloqueante crítico ("Erro ao salvar cliente") no carregamento multi-tenant do CRM surgindo após as "Melhorias Comerciais Sprint 24".
- Divergências de tipagem (`VARCHAR` vs `TEXT`) detectadas nas functions `tenant_criar_cliente` e `tenant_atualizar_cliente`.
- Contrato base do frontend divergente do estado consolidado do banco (wrappers explícitos omitidos/antigos).

### Ações Executadas
- Criação do helper `public.get_tenant_schema()` faltante nos wrappers.
- Execução do script `fix_crm_sprint24.sql` para limpar assinaturas duplicadas.
- Reinclusão da feature `soft_delete` alinhada com a governança da Vistoria 9.
- O Dashboard possuía um componente `BoasVindasBanner` corrigido para saudação inteligente.

# OUTROS MÓDULOS

*Sem vistorias recentes pendentes nesta seção.*
