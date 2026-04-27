> **⚠ VISTORIA PENDENTE (Inteligência de Nurturing — 27/04/2026):** Implementação do sistema de reengajamento proativo integrado entre PDV e CRM. Alertas automáticos de recompra e recuperação de clientes inativos com integração direta via WhatsApp.
> **⚠ VISTORIA PENDENTE (Importador CRM — 27/04/2026):** Implementação de importação massiva de clientes via Excel no módulo CRM. Sistema com mapeamento inteligente de campos e tratamento de subinformações de endereço.
> **⚠ VISTORIA PENDENTE (SaaS Subscriptions — 26/04/2026):** Foi implementado o modelo de assinaturas mensais recorrentes via Asaas. Alterações críticas realizadas no banco de dados (public.empresas), checkout session, webhook de pagamento e UI do checkout. Uma vistoria completa de integridade deve ser realizada com prioridade máxima.

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
