# VISTORIAS - Vistoria Profunda do Sistema

> Atualizacao de correcoes em 22/04/2026: checkout/webhook, relatorios, comissoes, scanner e build foram saneados e validados em `tsc --noEmit` + `next build`; permanece pendente re-vistoria urgente apos a publicacao SQL das RPCs de regras de comissao no banco live.

> Atualizacao da Vistoria 17 em 22/04/2026: nova vistoria completa registrada neste documento; ver secao imediatamente abaixo de status/metadados.

## VISTORIA 20: Painel Administrativo de Preços (Master) — 23/04/2026

### Escopo
- Criação de tabelas `planos`, `modulos_avulsos` e `historico_precos` no banco de dados
- RPCs de leitura pública (checkout) e escrita restrita (master)
- Painel master (`/mestre`) reestruturado com sistema de abas (Provisionar + Preços)
- Checkout dinâmico consumindo preços do banco em vez de constantes hardcoded

### O que foi feito
- **Banco de dados**: 3 tabelas criadas com seed correspondente aos preços atuais, triggers `updated_at`, índices por `key`/`ativo`, 5 RPCs (`listar_planos_checkout`, `listar_modulos_avulsos_checkout`, `master_atualizar_plano`, `master_atualizar_modulo_avulso`, `master_listar_historico_precos`)
- **Painel Master**: Novo componente `PricingPanel.tsx` com edição inline, preço promocional, badges visuais e histórico de audit trail. Página reestruturada com abas animadas.
- **Checkout**: Constantes `PLANOS`, `MODULOS_AVULSOS` e `PRECO_MODULO_AVULSO` removidas. Agora consome RPCs com fallback silencioso. Suporte a preço promocional (preço riscado + novo em verde) e selo PROMO nos cards.
- **Preço individual por módulo**: Cada módulo avulso agora pode ter seu próprio preço (não mais R$ 79,90 fixo para todos).
- **Visibilidade Master**: Corrigido redirecionamento de login e adicionados links "Setup Master" no `/admin` e Sidebar do tenant para o usuário mestre.

### Arquivos Modificados
- `apps/api/migrations/pricing_tables.sql` [NOVO]
- `apps/web/src/app/mestre/PricingPanel.tsx` [NOVO]
- `apps/web/src/app/mestre/page.tsx` [MODIFICADO]
- `apps/web/src/app/(auth)/checkout/page.tsx` [MODIFICADO]
- `apps/web/src/app/(auth)/login/page.tsx` [MODIFICADO]
- `apps/web/src/app/admin/layout.tsx` [MODIFICADO]
- `apps/web/src/components/layout/Sidebar.tsx` [MODIFICADO]
- `apps/web/src/lib/hooks/use-sidebar-data.ts` [MODIFICADO]

### Validação
- `tsc --noEmit`: zero erros
- Checkout renderiza preços do banco corretamente (validado visualmente)
- `/mestre` protegido por middleware de autenticação

> NOTA: Mais de 3 alterações realizadas. Vistoria técnica de integridade recomendada.

## VISTORIA 19: Melhorias de UI/UX (Exportações, Alertas, Dashboard e Configurações) — 22/04/2026

### Escopo Analisado
- Modulo de Relatórios: formatação de exportação CSV e PDF.
- Modulo de Configurações: erro ao salvar (HTTP 406 Not Acceptable).
- Módulo de Estoque (Painel de Alertas): atualização da interface não ocorria ao clicar no botão.
- Dashboard e Layout: Banner de Boas-vindas oculto e Sidebar sem reatividade de cache.

### Problemas Identificados
- Exportações CSV sem o BOM (`\uFEFF`), corrompendo acentuações no Excel do Windows.
- Exportações PDF geravam uma tabela crua sem estilização e sem KPI visíveis.
- Erro no salvamento de Configurações da Empresa ocorria devido à ausência de política de UPDATE na tabela `empresas` para os usuários Tenants, bloqueando a edição através do RLS.
- O Dashboard possuía um componente `BoasVindasBanner`, mas ele utilizava classes de animação indisponíveis (fazendo-o renderizar com opacidade zero) e com um timer de ocultamento muito longo (7 dias).
- A Sidebar mantinha o cache agressivo de 5 minutos, não refletindo alterações feitas na Razão Social no menu Configurações.

### Ações e Correções
- Corrigida a função `handleExport` do Módulo de Relatórios adicionando encoding BOM no CSV e formatando o PDF de maneira premium (usando fonte Inter, estilização corporativa, data/hora, marca d'água da Fluxo e resumo de métricas).
- Criada a policy `tenant_update_own_empresa` e persistida no `supabase_rpc.sql` para permitir que tenants atualizem os dados de suas próprias empresas, sanando o Erro 406 ao salvar configurações.
- Adicionado o disparador de `invalidateQueries` para o botão "Verificar Alertas" em `use-alertas-estoque.ts` e também para `sidebar-data` ao atualizar a empresa.
- Corrigido o `BoasVindasBanner` para aplicar a saudação inteligente ("Bom dia/Boa tarde/Boa noite"), utilizar classes nativas de animação (`animate-page-enter`) e reapresentar-se a cada 12 horas.

> NOTA DE REGRA GLOBAL: Foram feitas mais de 3 alterações no código-fonte. O sistema indica a necessidade de uma próxima Vistoria Geral Técnica de Integridade para garantir que estas correções não afetem módulos integrados, recomendada para a próxima sessão.

## VISTORIA 18: Resolução de Bugs de Mapeamento no CRM e OS — 22/04/2026

### Escopo Analisado
- Bug crítico no CRM onde a data de cadastro do cliente retornava "Invalid Date".
- Bug crítico no CRM onde a listagem não exibia os nomes e contatos.
- Erro no log do React: `Each child in a list should have a unique "key" prop` nas listagens do CRM e na tag `<select>` da página de Ordens de Serviço.
- Erro no módulo de Vendas/PDV: falha ao carregar lista de estoque para Nova Venda, retornando HTTP 404 na rota `/rest/v1/rpc/tenant_listar_estoque`.

### Problemas Identificados
- A RPC `public.tenant_listar_clientes` no schema público estava retornando um tipo incompatível (`RETURNS TABLE` em código mas se comportando como `SETOF JSONB` via Supabase API) encapsulando um `jsonb_agg`. Isso resultou no PostgREST servindo um *array duplo* (ex: `[[{"id": 1, "nome": "..."}]]`).
- Devido ao duplo empacotamento, a variável `item` usada dentro do `map` de `clientes.map(item => ...)` no front-end era na verdade um array em vez de um objeto, fazendo com que `item.id`, `item.nome` e `item.criado_em` fossem avaliados como `undefined`.
- A RPC `public.tenant_listar_estoque` possuía uma falha grave de isolamento: não identificava o schema do tenant (`v_schema_name`), forçando o Supabase a ler da tabela `public.estoque` (que não existe). O PostgREST não conseguia montar o schema OpenAPI da função adequadamente ou ela falhava no start, resultando em erro 404 Not Found no Front-end, impossibilitando a abertura do PDV.

### Ações e Correções
- Corrigida a assinatura da função `public.tenant_listar_clientes` para retornar explicitamente `JSONB`.
- Substituída a expressão de retorno por um simples `EXECUTE format` com `INTO` retornando a agregação de JSON direta.
- O arquivo de migração local `apps/api/migrations/rpc_crm_fixes.sql` foi atualizado.
- Com isso, `item` volta a ser interpretado como Objeto (`{}`), restaurando todos os valores (Nome, Contato, Datas, Keys) na tabela do CRM e no seletor de clientes do módulo OS.
- A função `public.tenant_listar_estoque` foi inteiramente reescrita como um wrapper Multi-tenant autêntico (adicionando a lógica de `user_profiles` + `auth.uid()` para encontrar o `schema_name`), encapsulando a chamada real `FROM %I.tenant_listar_estoque` em `JSONB`.
- Foi criado o arquivo de migração `apps/api/migrations/rpc_estoque_pdv_fixes.sql` com o backup do código-fonte para manter a rastreabilidade do projeto.
- O cache do PostgREST foi invalidado localmente via comando `NOTIFY pgrst, 'reload schema'` no Postgres, resolvendo o 404 e trazendo os produtos corretamente para o sistema PDV.

## VISTORIA 17: Vistoria Completa de Arquitetura, Banco, RPCs e Frontend - 22/04/2026

### Metodologia Executada
- 4 passagens documentais incrementais em `docs/`, cruzando documentacao principal, auditorias, estudos e retrospectivas.
- 4 passagens tecnicas incrementais no sistema, cobrindo `apps/api/supabase_rpc.sql`, `apps/api/webhook_provisionamento.sql`, `apps/web/src`, hooks, middleware e paginas tenant.
- Validacao live do banco com `service_role` via REST do Supabase para tabelas e views publicas de governanca.

### Limites da Vistoria
- O MCP do Supabase nao estava configurado neste ambiente durante a inspecao.
- A API Management do Supabase nao retornou acesso autorizado com a credencial fornecida, entao a vistoria live do banco ficou restrita ao REST exposto do projeto.
- Os schemas tenant nao estao expostos no REST; a API retornou `PGRST106`, informando exposicao apenas de `public` e `graphql_public`.

### Evidencias Confirmadas no Banco Live
- `public.modulos_catalogo` esta populada com 12 modulos e a shape observada foi `key`, `nome`, `descricao`, `criado_em`.
- `public.v_empresa_modulos` esta populada e apresenta combinacoes reais de feature flags ativas e inativas por empresa.
- `public.empresas` expoe `atualizado_em` e `deleted_at`, alem dos campos ja documentados.
- `public.user_profiles` expoe `nome` e `deleted_at`, alem de `user_id`, `empresa_id`, `role` e `criado_em`.
- `public.checkout_vendas` e `public.webhook_audit_log` existem, mas estavam vazias no momento da vistoria.

### Achados Criticos
- Checkout transporta senha em texto puro para o gateway e para o webhook.
  Evidencia: `apps/web/src/services/PaymentGatewayService.ts:84-94` e `apps/web/src/app/api/webhook/payment/route.ts:55-71`.
- Provisionamento grava diretamente em `auth.users` com `crypt(..., gen_salt('bf'))`.
  Evidencia: `apps/api/webhook_provisionamento.sql:90-111`.
- Modulos `relatorios` e `comissoes` seguem fora do padrao RPC/Opcao A.
  Evidencia: `apps/web/src/app/tenant/relatorios/page.tsx:57-127` e `apps/web/src/app/tenant/comissoes/page.tsx:72-151`.

### Achados Altos
- Webhook administrativo falha em modo fail-open de credencial.
  Evidencia: `apps/web/src/app/api/webhook/payment/route.ts:6-19`.
- Ha drift relevante entre frontend e contrato SQL principal.
  Evidencia de consumo: `apps/web/src/lib/api.ts:540-610` e `apps/web/src/lib/api.ts:1030-1125`.
- Na inspecao do `apps/api/supabase_rpc.sql`, nao foram encontrados contratos para `tenant_atualizar_cliente`, `tenant_listar_interacoes`, `tenant_criar_interacao`, `tenant_excluir_interacao`, `tenant_adicionar_tag`, `tenant_remover_tag`, `tenant_listar_tags_catalog`, `tenant_enviar_campanha`, `tenant_criar_funcionario`, `tenant_atualizar_funcionario`, `tenant_excluir_funcionario`, `tenant_atualizar_financeiro`, `tenant_atualizar_comissao`, `tenant_dashboard_kpis_por_mes` e `tenant_dashboard_metricas`.

### Achados Medios
- `modulos_catalogo` esta documentado com shape divergente do banco live.
- `empresas` e `user_profiles` estao documentados com menos campos que o estado live.
- O fluxo de checkout segue sem validacao forte antes do gateway.

### Conclusao da Vistoria 17
- A arquitetura central continua coerente, mas o estado real nao sustenta mais a afirmacao de production-ready sem ressalvas.
- As pendencias criticas concentram-se em checkout/provisionamento, aderencia arquitetural de `relatorios` e `comissoes` e consolidacao do contrato SQL canonico.

### Prioridade Recomendada
1. Remover senha do metadata do gateway e tirar a criacao manual de `auth.users` do SQL.
2. Reescrever `relatorios` e `comissoes` para consumir RPCs compativeis com a Opcao A.
3. Consolidar no `apps/api/supabase_rpc.sql` todas as RPCs realmente consumidas pelo frontend ou eliminar chamadas mortas.
4. Reexecutar vistoria tecnica apos as correcoes acima.

### Atualizacao Pos-Correcao - 22/04/2026
- `apps/web/src/app/api/checkout/session/route.ts` passou a persistir o estado do checkout no banco e a manter a senha apenas cifrada no servidor; o gateway nao recebe mais `password` em `metadata`.
- `apps/web/src/app/api/webhook/payment/route.ts` deixou de depender da RPC legada `webhook_provisionar_assinatura` e agora orquestra o provisionamento no backend com `provisionar_empresa_master`, `user_profiles`, `checkout_vendas` e `webhook_audit_log`.
- `apps/web/src/app/tenant/relatorios/page.tsx` e `apps/web/src/app/tenant/comissoes/page.tsx` foram migrados para a camada `@/lib/api`, removendo o acesso direto a tabelas tenant no browser.
- `apps/web/src/components/modules/estoque/BarcodeScanner.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/layout/Sidebar.tsx` e `apps/web/src/app/globals.css` foram ajustados para remover dependencias de build em `html5-qrcode` ausente e em fontes remotas do Google.
- Validacao executada com sucesso em 22/04/2026: `tsc --noEmit` e `next build`.
- Pendencia remanescente: o banco live ainda nao publicou `tenant_listar_regras_comissao`, `tenant_criar_regra_comissao` e `tenant_excluir_regra_comissao`; por isso a gestao de regras de comissao fica degradada com mensagem explicita ate a aplicacao de `apps/api/migrations/rpc_comissoes_regras.sql`.
- Re-vistoria obrigatoria pendente: devido ao volume de alteracoes no codigo-fonte, deve ser executada uma nova vistoria tecnica completa o mais rapido possivel apos a publicacao SQL remanescente.

**Última atualização:** 22/04/2026
**Versão:** 1.5
**Status:** ✅ Revisado

---

## VISTORIA 16: Logística de Checkout e Pagamento — 22/04/2026

### Escopo Analisado
- Fluxo completo de checkout (frontend)
- Integração com Gateway de Pagamento Asaas
- Backend: API routes e RPCs de processamento
- Banco de dados: tabelas de checkout, vendas e webhook
- Webhook de provisionamento de tenants

### Arquitetura do Fluxo de Checkout

**Frontend (CheckoutPage.tsx):**
- 3 steps: Plano → Cadastro → Pagamento
- Seleção de planos (Starter, Business, Pro)
- Seleção de módulos avulsos (OS, Obras, Comissões, Relatórios, RH)
- Coleta de dados: cliente (nome, email, senha), empresa (razão social, CNPJ, porte, segmento)
- Redirecionamento para Asaas Invoice
- Tratamento de sucesso via query param `?success=true`

**Service Layer (PaymentGatewayService.ts):**
- Proxy para API do Asaas (evita CORS, protege API key)
- Criação de cliente no Asaas (POST /customers)
- Criação de pagamento no Asaas (POST /payments)
- Suporte a PIX (QR code)
- Configuração de callback (successUrl + autoRedirect)

**Backend (API Routes):**
- `/api/asaas/customers` - Proxy para criação/busca de clientes
- `/api/asaas/payments` - Proxy para criação de pagamentos e QR code PIX
- Modo sandbox/production configurado via env

**RPCs de Processamento:**
- `tenant_processar_venda` - RPC transacional para PDV (não usada no checkout SaaS)
- `webhook_provisionar_assinatura` - RPC transacional para provisionamento pós-pagamento

**Banco de Dados:**
- `public.checkout_vendas` - Rastreabilidade global de vendas SaaS
- `public.webhook_audit_log` - Auditoria de webhooks
- `tenant.vendas` - Tabela de vendas por tenant (PDV)
- `tenant.vendas_itens` - Itens de venda por tenant (PDV)

### Pontos Fortes

**1. Arquitetura Bem Definida (ALTO)**
- Separação clara de responsabilidades (Frontend → Service → API → RPC)
- Proxy server-side protege API key do Asaas
- Idempotência implementada em RPCs críticas

**2. Transações Atômicas (CRÍTICO)**
- `webhook_provisionar_assinatura` usa transação completa
- Rollback automático em caso de falha
- Provisionamento de tenant + criação de usuário em uma única transação

**3. Auditoria e Rastreabilidade (MÉDIO)**
- `webhook_audit_log` registra todos os eventos
- `checkout_vendas` rastreia vendas globais
- Idempotência evita processamento duplicado

**4. UX de Checkout (MÉDIO)**
- 3 steps claros e intuitivos
- Resumo sticky bar com valor total
- Modal informativo de módulos
- Feedback visual de loading e sucesso

**5. Integração com Gateway (MÉDIO)**
- Suporte a PIX e Invoice
- Redirecionamento automático pós-pagamento
- Configuração de ambiente (sandbox/production)

### Riscos Técnicos

**1. Criptografia de Senha Fraca (ALTO)**
- **Causa:** `webhook_provisionamento.sql` usa `crypt(p_senha, gen_salt('bf'))` (bcrypt)
- **Problema:** Supabase Auth usa criptografia própria (pbkdf2), não bcrypt
- **Impacto:** Senha pode não funcionar no login do Supabase
- **Solução:** Usar Supabase Admin API ou edge function para criar usuário

**2. Falta de Validação de Dados (MÉDIO)**
- **Causa:** CheckoutPage não valida CNPJ, email forte, senha forte
- **Impacto:** Dados inválidos podem causar falhas no provisionamento
- **Solução:** Adicionar validações com Zod antes de enviar para gateway

**3. Dependência de Webhook para Provisionamento (ALTO)**
- **Causa:** Provisionamento só ocorre via webhook do Asaas
- **Problema:** Se webhook falhar ou não for entregue, tenant não é criado
- **Impacto:** Cliente paga mas não tem acesso ao sistema
- **Solução:** Implementar polling ou retry mechanism

**4. Inconsistência de Nomenclatura (BAIXO)**
- **Causa:** `tenant_processar_venda` usa `p_forma_pagamento` mas auditoria diz que deveria ser `p_metodo_pagamento`
- **Impacto:** Confusão em manutenção futura
- **Solução:** Padronizar nomenclatura em todas as RPCs

**5. Falta de Retry em Webhook (MÉDIO)**
- **Causa:** `webhook_provisionar_assinatura` não tem retry automático
- **Impacto:** Falhas temporárias não são recuperadas
- **Solução:** Implementar fila de retry ou dead letter queue

**6. Logs de Erro Insuficientes (BAIXO)**
- **Causa:** `webhook_audit_log` registra sucesso mas não detalhes de erro
- **Impacto:** Dificuldade em debugar falhas de provisionamento
- **Solução:** Adicionar campos de error_code, error_message, stack_trace

### Dívidas Técnicas

**1. Validação de Dados (MÉDIO)**
- Adicionar validação de CNPJ (formato e dígitos verificadores)
- Adicionar validação de email (formato e domínio)
- Adicionar validação de senha (complexidade)
- Usar Zod para validação de schema

**2. Tratamento de Falhas (MÉDIO)**
- Implementar retry automático para webhook
- Adicionar dead letter queue para falhas permanentes
- Implementar dashboard de monitoramento de webhooks

**3. Testes de Integração (ALTO)**
- Testar webhook em sandbox do Asaas
- Testar provisionamento completo end-to-end
- Testar cenários de erro (pagamento falhado, webhook duplicado)

**4. Documentação de API (BAIXO)**
- Documentar API routes do Asaas
- Documentar payload esperado do webhook
- Documentar erros possíveis e soluções

### Compreensão Funcional

**Fluxo Atual (IMPLEMENTADO):**
1. Usuário seleciona plano e módulos
2. Usuário preenche cadastro
3. Usuário clica em "Confirmar e Assinar"
4. PaymentGatewayService cria cliente e pagamento no Asaas
5. Usuário é redirecionado para checkout do Asaas
6. Usuário paga no Asaas
7. Asaas envia webhook para `/api/webhook/payment`
8. ✅ Webhook valida assinatura
9. ✅ Webhook chama `webhook_provisionar_assinatura`
10. ⚠️ Tenant é provisionado (mas pode falhar devido a criptografia de senha)
11. ⚠️ Usuário é criado no Supabase Auth (mas senha pode não funcionar)

**Fluxo Esperado (CORRIGIDO):**
1. Usuário seleciona plano e módulos
2. Usuário preenche cadastro (com validações)
3. Usuário clica em "Confirmar e Assinar"
4. PaymentGatewayService cria cliente e pagamento no Asaas
5. Usuário é redirecionado para checkout do Asaas
6. Usuário paga no Asaas
7. Asaas envia webhook para `/api/webhook/payment`
8. ✅ Webhook valida assinatura
9. ✅ Webhook chama `webhook_provisionar_assinatura` (com correção de senha)
10. ✅ Tenant é provisionado
11. ✅ Usuário é criado no Supabase Auth (com senha correta)
12. ✅ Usuário recebe email de boas-vindas
13. ✅ Usuário pode fazer login

### Recomendações Imediatas

**Prioridade CRÍTICA:**
1. Corrigir criação de usuário no Supabase Auth (usar Admin API em vez de bcrypt)
2. Testar fluxo completo em sandbox para verificar se senha funciona no login
3. Validar se webhook URL está configurado corretamente no painel do Asaas

**Prioridade ALTA:**
1. Adicionar validação de dados no checkout (CNPJ, email, senha)
2. Implementar retry automático para webhook
3. Adicionar monitoramento de webhooks
4. Documentar API de webhook

**Prioridade MÉDIA:**
1. Padronizar nomenclatura de RPCs
2. Melhorar logs de erro em webhook_audit_log
3. Adicionar dashboard de provisionamento
4. Implementar polling como fallback

### Observações

- A arquitetura de provisionamento via webhook está bem desenhada (transacional, idempotente)
- O endpoint de webhook `/api/webhook/payment` já existe e está implementado
- O maior risco é a criptografia de senha (bcrypt vs Supabase pbkdf2), que pode impedir login
- A UX de checkout está bem implementada, mas precisa de validações
- A integração com Asaas está correta e funcional
- É necessário validar se webhook URL está configurado no painel do Asaas

---

## VISTORIA 15: Redirecionamento Pós-Pagamento e UX de Checkout — 21/04/2026

> [!IMPORTANT]
> **Status:** ⚠️ PENDENTE DE VISTORIA TÉCNICA
> **Assunto:** Implementação de redirecionamento automático pós-pagamento (Asaas) e tratamento de sucesso no frontend.

### Alterações Realizadas
- **PaymentGatewayService.ts**: Adicionado objeto `callback` na criação de transações Asaas para suportar redirecionamento automático via `successUrl` e `autoRedirect: true`.
- **CheckoutPage.tsx**: 
  - Implementado hook `useSearchParams` para detectar o parâmetro `?success=true`.
  - Ativado estado de sucesso para exibir a tela de "Pagamento Aprovado!" automaticamente após o retorno do gateway.
  - Vinculado botão de login à rota `/login`.
  - Refatorado componente com `Suspense` boundary para conformidade com as diretrizes do Next.js (Turbo/App Router).

### Verificações Pendentes
- Testar redirecionamento real em ambiente de Sandbox do Asaas.
- Validar se o `Suspense` não causa flashes indesejados no carregamento inicial do checkout.
- Confirmar se o link `successUrl` gerado dinamicamente via `window.location.origin` funciona em produção (Vercel/Netlify).

---


## VISTORIA 14: Resolução de Conflitos de Caminhos (Netlify) — 20/04/2026

> [!NOTE]
> Os detalhes técnicos desta vistoria foram migrados para a Retrospectiva do **[Plano de Prevenção de Deploy](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/PLANO_PREVENCAO_DEPLOY.md)**.
> **Assunto:** Erro de Publish Directory (Monorepo) corrigido.

---

## VISTORIA 13: Pipeline Netlify e Actions Node 24 — 20/04/2026

> [!NOTE]
> Os detalhes técnicos desta vistoria foram migrados para a Retrospectiva do **[Plano de Prevenção de Deploy](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/PLANO_PREVENCAO_DEPLOY.md)**.
> **Assunto:** Unificação de Build/Deploy e upgrade para Node 24.

---

## VISTORIA 12: Otimização de Performance Web (Landing Page e Módulos Tenant) — 20/04/2026

### Escopo Analisado
- Tempo de carregamento da Landing Page relatado como lento.
- Transições abruptas entre os módulos da plataforma (Tenant).
- Pesos de arquivos estáticos (`logo-fluxo.png` e favicons).

### Problemas Identificados
**1. Peso Excessivo de Arquivos Estáticos (CRÍTICO)**
- O `logo-fluxo.png` possuía dimensões originais massivas e não-comprimidas de **2612x1632** pesando respeitáveis **1.24 MB**. Isso não só atrasava a pintura inicial da tela de login, landing page e sidebar, mas consumia muita banda. O mesmo logo pesado era utilizado para a meta-tag `icon.png`.

**2. Falta de SSR (Server-Side Rendering) e Video Preload (ALTO)**
- Todo o corpo da `page.tsx` estava como `"use client"`.
- O `<video>` carregava todo o meta-dado imediatamente através do `preload="metadata"`, estourando a fila de download durante o First Contentful Paint.
- Renderização do componente de partículas gerava warnings nativos do React (Hydration Mismatch) devido ao cálculo de posições randômicas ocorrendo no render do cliente mas não do servidor.

**3. Navegação Inter-Módulos sem Cache e Feedback (MÉDIO)**
- O `loading.tsx` apresentava apenas um spinner estático e não-agradável esteticamente.
- Ao clicar em links da Sidebar, a rota transitava secamente sem animações, tirando a percepção "Premium" do sistema.
- A própria `Sidebar` possuía um hook `useEffect` executando 3 RPCs do Supabase sequencialmente (Perfil -> Empresa -> Módulos) **sem nenhuma estratégia de cache**, re-puxando tudo da rede a cada reload de rota.

### Ações e Correções

**1. Compressão Rigorosa e Troca de Tags (Componente 1)**
- Redimensionamento e compressão lossless (algoritmo Lanczos via Pillow) da logo de **1.24MB para ~64KB** e do icon.png para **~5KB**. 
- Configuração do `next.config.ts` liberando as diretrizes de otimização de imagem avançada (WebP/AVIF).
- Substituição de tags `<img src="...">` cruas pelas propriedades super otimizadas do `<Image>` no `Sidebar.tsx` e `Header.tsx`.

**2. Revisão de Performance da Page.tsx e Vídeos (Componente 2)**
- `VideoDemo.tsx` isolado e lazy-loadado via `next/dynamic()`, bloqueando preloads do `<video>` e definindo `loading="lazy"`.
- Remoção do hydration mismatch do fundo dinâmico extraindo os cálculos randômicos de Math para dentro de um `useMemo()`.

**3. Cache de Sidebar e Animações Premium (Componente 3 e 4)**
- Criado o hook customizado `@/lib/hooks/use-sidebar-data.ts` atrelado ao `useQuery` de modo a manter um `staleTime` da sidebar de 5 minutos, parando os múltiplos fetchings desnecessários no banco de dados. 
- Substituição do `loading.tsx` primitivo para um visual super Premium exibindo um esqueleto e uma barra de carregamento dinâmica `cubic-bezier`.
- Instalação das utilidades CSS de transição no `globals.css` e uso do provider `<PageTransition>` no Layout Base (fade + slideUp simultâneos e orgânicos em 300ms a cada mudança de módulo).

---

## VISTORIA 11: Módulo de CRM - Erros 404/400 (RPCs Ausentes ou Assinaturas Erradas) — 20/04/2026

### Escopo Analisado
- Erros de requisição `404 Not Found` no endpoint `tenant_listar_clientes` e `tenant_listar_tags_catalog`.
- Erros de requisição `400 Bad Request` no endpoint `tenant_dashboard_kpis_por_mes`.
- Falha na visualização de KPI de vendas e CRM Dashboard devido a chamadas em RPCs inexistentes no ambiente local/remoto do tenant.

### Problemas Identificados

**1. Wrappers Public Ausentes (CRÍTICO)**
- **Causa:** O sistema utiliza multi-tenant e espera rotear todas as chamadas Supabase pelas funções da role `public`. Contudo, os wrappers `public.tenant_listar_tags_catalog` e `public.tenant_dashboard_metricas` estavam ausentes. Isto resulta em HTTP 404 diretamente durante a chamada.
- **Impacto:** O Dashboard do CRM não carregava os cálculos de LTV Médio, Churn, Velocidade Média, entre outros.

**2. Assinatura Incompatível em tenant_listar_clientes (ALTO)**
- **Causa:** O front-end enviava 8 argumentos explícitos (`p_cursor`, `p_limit`, `p_status`, `p_funil_fase`, `p_busca`, `p_order_by`, `p_order_dir`, `p_tags`) para a RPC de clientes. O wrapper do Supabase não possuía o parâmetro `p_tags TEXT[]`, gerando incompatibilidade de assinatura e um falso 404 (Supabase não encontra a função).
- **Impacto:** A listagem de clientes falhava silenciosamente, impedindo filtro ou paginação.

### Ações e Correções

**1. Criação do Script de Migração Consolidado**
- Desenvolvido o script `apps/api/migrations/rpc_crm_fixes.sql` que engloba:
  - Criação de `public.tenant_listar_tags_catalog`.
  - Criação de `public.tenant_dashboard_metricas`.
  - Recriação de `public.tenant_listar_clientes(..., p_tags TEXT[])`.
  - Garantia de permissões (GRANT EXECUTE TO authenticated).

**2. Verificação Frontend e Conectividade**
- Validamos o arquivo `apps/web/src/lib/api.ts` e confirmamos que a API do front-end está com as assinaturas precisas correspondendo a migração fornecida.
- **Atenção (Deployment):** As restrições de IPv6/DNS do ambiente de terminal inviabilizaram a execução automática das migrações via scripts locais do Supabase. O script `rpc_crm_fixes.sql` precisa ser inserido manualmente no Editor SQL do painel do Supabase.

---

## VISTORIA 10: Deploy Netlify e Erros Next.js — 20/04/2026

> [!NOTE]
> Os detalhes técnicos desta vistoria foram migrados para a Retrospectiva do **[Plano de Prevenção de Deploy](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/PLANO_PREVENCAO_DEPLOY.md)**.
> **Assunto:** Conflito de `netlify.toml` e correções de TypeScript.

---

## VISTORIA 9: Implementação de Soft Delete Global — 19/04/2026

### Escopo da Alteração
Mudança estrutural: substituição de `DELETE` físico por `UPDATE ... SET deleted_at = NOW()` em todas as entidades com RPCs de exclusão. Cobre 4 schemas tenant + schema public.

### Tabelas Alteradas (coluna `deleted_at` adicionada)

| Tabela | Schemas Cobertos |
|:---|:---|
| `clientes` | todos os 4 (já existia — IF NOT EXISTS) |
| `produtos` | todos os 4 |
| `vendas` | todos os 4 |
| `financeiro` | todos os 4 |
| `funcionarios` | todos os 4 |
| `kits` | todos os 4 |
| `kit_itens` | todos os 4 |
| `alertas_estoque` | todos os 4 |
| `interacoes_clientes` | todos os 4 |
| `obras` | tenant_62a495e1 |
| `obras_etapas` | tenant_62a495e1 |
| `obras_custos` | tenant_62a495e1 |
| `obras_recursos` | tenant_62a495e1 |
| `ordens_servico` | tenant_62a495e1 |
| `comissoes` | tenant_62a495e1 |
| `user_profiles` | public |
| `empresas` | public |

**Total: 43 combinações tabela×schema confirmadas com `has_deleted_at: true`**

### Índices Parciais Criados

9 índices por schema comum (36 total) + 6 exclusivos de tenant_62a495e1 + 2 no schema public = **44 índices parciais** `WHERE deleted_at IS NULL`.
Nomenclatura: `idx_{prefixo_schema}_{tabela}_not_deleted`

### RPCs de Exclusão Atualizadas (DELETE → Soft Delete)

| RPC | Antes | Depois |
|:---|:---:|:---:|
| `tenant_excluir_cliente` | `DELETE` | `UPDATE ... SET deleted_at = NOW()` |
| `tenant_excluir_produto` | `DELETE` (+ estoque) | `UPDATE` (estoque mantido) |
| `tenant_excluir_financeiro` | `DELETE` | `UPDATE` |
| `tenant_excluir_funcionario` | `DELETE` | `UPDATE` |
| `tenant_excluir_obra` | `DELETE` | `UPDATE` |
| `tenant_excluir_os` | `DELETE` | `UPDATE` |

Todas retornam `error: 'X não encontrado ou já excluído'` quando `ROW_COUNT = 0`.

### RPCs de Listagem Atualizadas (filtro `WHERE deleted_at IS NULL`)

| RPC | Observação |
|:---|:---|
| `tenant_listar_clientes` | Adicionado `WHERE deleted_at IS NULL` |
| `tenant_listar_produtos` | Filtro em `p.deleted_at IS NULL` |
| `tenant_listar_financeiro` | Adicionado filtro |
| `tenant_listar_funcionarios` | Adicionado filtro |
| `tenant_listar_vendas` | Adicionado filtro |
| `tenant_listar_ordens_servico` | Adicionado filtro |
| `tenant_listar_obras` | **Corrigido bug grave** (sem schema no SELECT) + filtro |

### Bug Corrigido Bônus
- `tenant_listar_obras` tinha `SELECT * FROM obras` sem schema (`v_tenant_schema`), causando erro em todos os tenants. Corrigido para `EXECUTE format('... FROM %I.obras ...', v_tenant_schema)`.

### Arquivo de Migração Gerado
`apps/api/migrations/add_soft_delete_all_entities.sql`

### Melhorias Futuras (Prioridade Alta)
- **Suite de Testes Automatizados:** Implementar testes unitários com Vitest para hooks (`use-clientes`, `use-user-profile`, etc.), testes de utilitários e componentes (`BoasVindasBanner`), e testes End-to-End com Playwright (fluxos de Auth, CRM e Vendas).
- **Rate Limiting no Middleware:** Implementar limitação de requisições baseada em memória (`Map`) para `middleware.ts`, bloqueando requisições abusivas em rotas de auth (5/5min) e limitando tráfego em APIs e páginas, respondendo com HTTP 429.

---

## VISTORIA 8: Sprint de Hardening e Features — 19/04/2026

### Escopo das Alterações
Implementação das correções e funcionalidades priorizadas na Vistoria 7. Todos os itens críticos e de alta prioridade da sprint foram concluídos.

### Alterações Realizadas

| Item | Arquivo | Tipo | Descrição |
|:---|:---|:---:|:---|
| [1] Enum Financeiro | `financeiro/page.tsx` | 🔴 Crítico | Alinhado `receita/despesa` → `receber/pagar` (conformidade com banco) |
| [2] Dashboard Real | `use-dashboard.ts` + `dashboard/page.tsx` | 🔴 Crítico | Substituído `Math.random()` por RPC `tenant_dashboard_kpis_por_mes`; `isLoadingChart` independente |
| [3] RPC Dashboard | Supabase (banco) | 🔴 Crítico | `tenant_dashboard_kpis_por_mes` criada e deployada no schema `public` |
| [4] CRM Anti-pattern | `crm/page.tsx` | 🟠 Alto | `window.location.reload()` → `queryClient.invalidateQueries(['clientes'])` |
| [5] OS Código Morto | `os/page.tsx` | 🟡 Médio | Removida `confirmarExclusao` duplicada |
| [6] Obras Modais | `obras/page.tsx` | 🟠 Alto | Implementados modais funcionais de "Adicionar Custo" e "Alocar Recurso" (substituiu TODOs) |
| [7] CRM Busca Real | `crm/page.tsx` | 🟠 Alto | Input de busca conectado à RPC via `useClientes({ params: { busca } })` com debounce 300ms |
| [8] CRM WhatsApp | `crm/page.tsx` | 🟠 Alto | Botão WhatsApp com `wa.me/55{num}` sanitizado; desabilitado se telefone ausente |
| [9] Estoque Edição | `estoque/page.tsx` | 🟠 Alto | Modal de edição de produto com `useUpdateProduto` |
| [10] Estoque Busca | `estoque/page.tsx` | 🟡 Médio | Busca client-side por nome/SKU com filtragem em `produtosFiltrados` |

### Status Final dos Módulos Pós-Sprint

| Módulo | Status |
|:---|:---:|
| Dashboard | ✅ KPIs reais + gráfico real |
| CRM | ✅ CRUD + busca + WhatsApp + invalidation correta |
| Financeiro | ✅ Enum alinhado com banco |
| Estoque | ✅ CRUD completo com edição e busca |
| Obras | ✅ Modais de custo e recurso funcionais |
| OS | ✅ Código limpo |
| Vendas | ⚠️ Geração de PDF pendente |
| RH | ⚠️ Sem mutations implementadas |

### Backlog Remanescente (Próxima Sprint)
- **Vendas:** geração de recibo PDF via `jsPDF`
- **RH:** hooks de mutations para admissão/demissão/férias
- **Global:** campo `p_busca` nas RPCs de Obras, Estoque, OS
- **Global:** Soft Delete (flag `deleted_at` em vez de `DELETE` físico)
- **Infraestrutura:** suíte de testes Vitest/Playwright

---

## VISTORIA 7: Vistoria Geral do Sistema — 19/04/2026

### Escopo Analisado
- **Frontend:** todos os 8 módulos (`dashboard`, `crm`, `vendas`, `estoque`, `obras`, `os`, `financeiro`, `rh`)
- **Hooks:** todos os arquivos em `apps/web/src/lib/hooks/`
- **Camada de API:** `apps/web/src/lib/api.ts` (1.508 linhas, completo)
- **Middleware:** `apps/web/src/middleware.ts`
- **Banco de dados:** schema `public` e schemas `tenant_*` via `CORRECOES_CRITICAS_SUPABASE.sql`
- **Segurança:** RLS policies, permissões de funções, isolamento de schema

### Estrutura Atual do Sistema
- **8 módulos** frontend cobertos com páginas completas
- **12 arquivos de hooks** TanStack React Query
- **~45 RPCs** distintas mapeadas em `api.ts`
- **6 tabelas no schema `public`** + **14 tabelas por schema `tenant_*`**
- **1 função de provisionamento** (`provisionar_empresa`) cria todo o schema tenant em runtime
- **1 mecanismo de idempotência** (`idempotency_control`) nas operações de escrita

### Módulos e Status

| Módulo | Arquivo | Status | Observação |
|:---|:---|:---:|:---|
| Dashboard | `tenant/dashboard/page.tsx` | ✅ Implementado | KPIs reais via RPC; gráfico mensal usa `Math.random()` — dados fictícios |
| CRM | `tenant/crm/page.tsx` | ⚠️ Parcial | CRUD, Kanban, Campanhas OK; busca não conectada; `window.location.reload()` anti-padrão |
| Vendas | `tenant/vendas/page.tsx` | ⚠️ Parcial | Histórico e PDV OK; KPI "Método Favorito" hardcoded "-"; Recibo PDF visual apenas |
| Estoque | `tenant/estoque/page.tsx` | ⚠️ Parcial | CRUD, Kits, Scanner OK; botão Editar sem modal; Import/Export sem lógica real |
| Obras | `tenant/obras/page.tsx` | ⚠️ Parcial | CRUD, Etapas, Docs OK; handlers de Criar Custo e Criar Recurso retornam `toastError("em desenvolvimento")` |
| OS | `tenant/os/page.tsx` | ⚠️ Parcial | CRUD e Calendário OK; funções `handleDelete` e `confirmarExclusao` duplicadas no mesmo componente |
| Financeiro | `tenant/financeiro/page.tsx` | ⚠️ Parcial | CRUD OK; enum `receita/despesa` diverge do banco (`pagar/receber`) — **risco de falha silenciosa** |
| RH | `tenant/rh/page.tsx` | ✅ Implementado | CRUD, CSV, Folha OK; campo de busca não conectado |

### RPCs Mapeadas

**Por domínio — total ~45 RPCs:**

| Grupo | RPCs | Risco |
|:---|:---|:---|
| Auth/Tenant | `set_tenant_schema`, `tenant_dashboard_kpis` | `tenant_dashboard_kpis` não retorna série temporal — gráfico usa dados falsos |
| CRM | `tenant_listar_clientes`, `tenant_criar_cliente`, `tenant_atualizar_cliente`, `tenant_excluir_cliente`, `tenant_listar_tags_cliente`, `tenant_adicionar_tag_cliente`, `tenant_remover_tag_cliente`, `tenant_criar_interacao`, `tenant_listar_interacoes`, `enviar_campanha_massa` | Nenhum crítico |
| Vendas/PDV | `tenant_listar_vendas`, `tenant_processar_venda`, `tenant_excluir_venda` | `tenant_processar_venda` não deduplica por `idempotency_key` no payload atual |
| Estoque | `tenant_listar_produtos`, `tenant_criar_produto`, `tenant_excluir_produto`, `tenant_alertas_estoque`, `tenant_listar_kits`, `tenant_criar_kit`, `tenant_listar_transferencias`, `tenant_criar_transferencia`, `tenant_valorizacao_estoque`, `tenant_listar_codigos_produto`, `tenant_previsao_demanda` | Falta `tenant_atualizar_produto` — edição impossível via RPC |
| OS | `tenant_listar_os`, `tenant_criar_os`, `tenant_atualizar_os`, `tenant_excluir_os` | Nenhum crítico |
| Obras | `tenant_listar_obras`, `tenant_criar_obra`, `tenant_atualizar_obra`, `tenant_excluir_obra`, `tenant_listar_etapas_obra`, `tenant_criar_etapa_obra`, `tenant_atualizar_etapa_obra`, `tenant_excluir_etapa_obra`, `tenant_progresso_obra`, `tenant_listar_custos_obra`, `tenant_criar_custo_obra`, `tenant_atualizar_custo_obra`, `tenant_excluir_custo_obra`, `tenant_obras_resumo_financeiro`, `tenant_listar_recursos_obra`, `tenant_alocar_recurso_obra`, `tenant_atualizar_recurso_obra`, `tenant_excluir_recurso_obra`, `tenant_listar_documentos_obra`, `tenant_upload_documento_obra`, `tenant_excluir_documento_obra` | Modais de criação de custo/recurso não chamam as RPCs — botões stub no frontend |
| Financeiro | `tenant_listar_financeiro`, `tenant_criar_financeiro`, `tenant_atualizar_financeiro`, `tenant_excluir_financeiro` | **CRÍTICO:** frontend envia `tipo: "receita"/"despesa"`, banco CHECK aceita só `"pagar"/"receber"` — violação de constraint |
| RH | `tenant_listar_funcionarios`, `tenant_criar_funcionario`, `tenant_atualizar_funcionario`, `tenant_excluir_funcionario` | Nenhum crítico |

### Banco de Dados

**Schema `public` — Governança Global:**

| Tabela | Constraints | RLS | Soft Delete |
|:---|:---|:---:|:---:|
| `empresas` | PK uuid, UNIQUE schema_name | ✅ | ❌ |
| `modulos_catalogo` | PK uuid, UNIQUE key | ✅ | ❌ |
| `empresa_modulos` | PK composta (empresa_id, modulo_key), FK duplo | ✅ | ❌ |
| `user_profiles` | PK user_id, FK auth.users, CHECK role, CHECK empresa obrigatória para tenant | ✅ | ❌ |
| `logs_provisionamento` | PK uuid, FK empresa | ❌ | ❌ |
| `v_empresa_modulos` | View (não tabela) | — | — |

**Schema `tenant_*` — Por Empresa:**

| Tabela | Constraints Presentes | Soft Delete | Índices |
|:---|:---|:---:|:---:|
| `clientes` | CHECK funil_fase, CHECK status | ❌ | ❌ explícito |
| `produtos` | CHECK tipo IN (produto, servico), CHECK preco_base >= 0 | ❌ | ❌ |
| `estoque` | UNIQUE sku, CHECK quantidade >= 0, CHECK quantidade_minima > 0 | ❌ | ❌ |
| `vendas` | CHECK metodo_pagamento, CHECK status | ❌ | ❌ |
| `vendas_itens` | FK duplo, CHECK quantidade > 0, `subtotal` GENERATED ALWAYS | ❌ | ❌ |
| `funcionarios` | CHECK role IN (funcionario, gerente, admin, colaborador) | ❌ | ❌ |
| `financeiro` | CHECK tipo IN (**pagar, receber**) — diverge do frontend | ❌ | ❌ |
| `os` | FK clientes, FK funcionarios | ❌ | ❌ |
| `obras` | FK clientes | ❌ | ❌ |
| `obras_etapas` | FK obras ON DELETE CASCADE | ❌ | ❌ |
| `obras_custos` | FK obras | ❌ | ❌ |
| `obras_recursos` | FK obras | ❌ | ❌ |
| `obras_documentos` | FK obras | ❌ | ❌ |
| `idempotency_control` | PK key | — | — |

### Pontos Fortes
- **Isolamento de schema real:** cada tenant tem schema PostgreSQL exclusivo — sem risco de cross-tenant por SQL acidental
- **`SECURITY DEFINER` + `search_path` fixo:** todas as RPCs tenant fixam `SET search_path = %I` no momento da criação — proteção contra injection de schema
- **RLS ativo no schema public:** todas as tabelas de governança têm políticas; `is_master()` bem implementado
- **Idempotência:** tabela `idempotency_control` presente em todos os tenants
- **Provisionamento transacional:** `provisionar_empresa_master` é atômico — erro em qualquer etapa faz rollback e loga em `logs_provisionamento`
- **Padrão de hooks consistente:** todos os 12 arquivos seguem o mesmo padrão `useQuery` + `useMutation` + `invalidateQueries` pós-mutação
- **Middleware seguro:** `middleware.ts` valida sessão, obtém perfil, chama `set_tenant_schema` e verifica feature flags antes de qualquer rota

### Riscos Técnicos
- **🔴 CRÍTICO — Inconsistência de enum Financeiro:** `financeiro/page.tsx` envia `tipo: "receita"` e `tipo: "despesa"` mas o banco tem `CHECK tipo IN ('pagar', 'receber')`. INSERTs falham silenciosamente com violação de constraint. Arquivo: `financeiro/page.tsx:59,173` vs `CORRECOES_CRITICAS_SUPABASE.sql:172`
- **🔴 CRÍTICO — Gráfico do Dashboard com dados falsos:** `use-dashboard.ts:61-77` gera array de receita mensal com `Math.random()`. O dashboard exibe números fictícios como dados reais do negócio
- **🔴 — `window.location.reload()` no CRM:** `recarregarClientes()` em `crm/page.tsx:132` faz reload completo da página ao invés de `queryClient.invalidateQueries` — perda de estado e UX degradada
- **🟡 — Funções duplicadas em OS:** `handleDelete` e `confirmarExclusao` em `os/page.tsx:88-110` são idênticas; apenas `handleDelete` é referenciada pelo `ConfirmModal` — código morto
- **🟡 — Modais stub em Obras:** `handleCreateCustoWrapper` e `handleCreateRecursoWrapper` em `obras/page.tsx:234-261` retornam `toastError("Funcionalidade em desenvolvimento")` — botões visíveis sem função
- **🟡 — RPC `tenant_atualizar_produto` ausente:** `use-produtos.ts` não tem `useUpdateProduto`; botão Editar no Estoque é visual sem modal ou RPC de destino
- **🟠 — Ausência total de testes:** zero testes unitários, de integração ou E2E em todo o repositório

### Dívidas Técnicas Identificadas
- **Campos de busca não conectados** em todos os 8 módulos — inputs presentes mas sem lógica de filtro ou parâmetro passado à RPC
- **Soft Delete ausente** em todas as entidades tenant — exclusões são permanentes, sem possibilidade de recuperação
- **Audit Trail ausente** — nenhuma tabela de log de alterações de dados (quem alterou, o quê, quando)
- **Rate Limiting ausente** — nenhuma proteção contra abuso de RPCs ou brute-force de autenticação
- **KPI "Método Favorito" hardcoded** como `"-"` em `vendas/page.tsx:91`
- **Botão WhatsApp no CRM** sem geração de link `wa.me/` — visual apenas
- **Geração de Recibo PDF** visual apenas em `vendas/page.tsx:165`
- **"Sincronizar Banco"** em Financeiro dispara `success()` imediato sem lógica real (`financeiro/page.tsx:126-136`)
- **RPC de série temporal** ausente — `tenant_dashboard_kpis` retorna apenas snapshot atual, sem histórico mensal

### Recomendação de Implementação

1. **Curto prazo (baixo risco — sem risco de quebra):**
   - Corrigir enum Financeiro: alterar frontend para usar `pagar`/`receber` em `financeiro/page.tsx:59,173`
   - Substituir `window.location.reload()` por `queryClient.invalidateQueries(['clientes'])` em `crm/page.tsx:132`
   - Remover função duplicada `confirmarExclusao` de `os/page.tsx`
   - Conectar campo de busca do módulo CRM passando parâmetro `p_busca` à RPC `tenant_listar_clientes`

2. **Médio prazo (médio risco — exige planejamento e nova RPC):**
   - Criar RPC `tenant_dashboard_receita_por_mes` retornando série temporal e conectar ao gráfico do Dashboard
   - Implementar modais de Criar Custo e Criar Recurso em `obras/page.tsx`
   - Criar `tenant_atualizar_produto` RPC + hook `useUpdateProduto` + modal de edição no Estoque
   - Implementar link `wa.me/` no botão WhatsApp do CRM
   - Conectar campos de busca dos demais módulos (Estoque, Vendas, OS, Financeiro, RH, Obras)

3. **Longo prazo (alto risco — refatorações estruturais):**
   - Soft Delete (`deleted_at TIMESTAMPTZ`) em todas as tabelas tenant via migration + adaptar todas as RPCs de listagem
   - Audit Trail: tabela `public.audit_log` + triggers nos schemas tenant
   - Suite de testes: Vitest (unitários) + Playwright (E2E nos fluxos: Login → Criar Cliente → Criar OS → Criar Venda)
   - Rate Limiting: via Supabase Edge Function de proxy ou middleware Next.js com `upstash/ratelimit`

### Observações
- Esta vistoria é 100% analítica — nenhum arquivo foi modificado durante a sessão
- **Riscos das vistorias anteriores verificados:**
  - Vistoria 5 (CRM): campos de busca ainda **não resolvidos** ⚠️
  - Vistoria 6 (Banner): campo `nome` em `user_profiles` ✅ Resolvido — confirmado presente no schema
  - Vistoria 4 (Testes): ausência de testes ainda **não resolvida** ⚠️
- O módulo Obras é o mais complexo do sistema: 21 RPCs, 5 tabelas relacionadas, 5 hooks separados e 4 sub-componentes dedicados (`EtapasTimeline`, `FinanceiroDashboard`, `RecursosTabela`, `DocumentosGaleria`)
- A função `provisionar_empresa` em `CORRECOES_CRITICAS_SUPABASE.sql` cria apenas 6 tabelas básicas no schema tenant — tabelas de `os`, `obras` e derivadas são provisionadas por SQL separado não encontrado nesta sessão e devem existir em outro arquivo SQL do repositório
- Score de saúde estimado: **7.5/10** — arquitetura sólida, execução com gaps de UX e 1 bug crítico de enum

---


---

## VISTORIA 7: Auditoria Técnica Completa do Sistema (19/04/2026)

> **Escopo:** Leitura e mapeamento total de todos os módulos frontend, hooks, camada de API, RPCs SQL e estrutura de banco de dados. Sessão 100% analítica — nenhuma implementação realizada nesta vistoria. Objetivo: gerar base de verdade para guiar próximas sprints.

---

### 1. Inventário Completo de Módulos Frontend

| Módulo | Arquivo | Status | Funcionalidades Confirmadas | Pendências / Bugs Encontrados |
|:---|:---|:---:|:---|:---|
| **Dashboard** | `tenant/dashboard/page.tsx` | ✅ OK | KPIs via `tenant_dashboard_kpis`, gráfico de faturamento, Últimas Vendas, Banner de Boas-Vindas, Ações Rápidas | Gráfico usa dados **sintéticos** com `Math.random()` — não reflete dados reais de meses anteriores. RPC precisa retornar série temporal. |
| **CRM** | `tenant/crm/page.tsx` | ✅ OK | CRUD Clientes, Funil Kanban, Campanha em Massa (email/WhatsApp/SMS), Tags, Timeline de Interações, FiltroTags | Campo de busca **não está conectado** a nenhuma lógica de filtro. Botão WhatsApp na tabela é visual apenas (sem link). Status de clientes sempre exibe "ativo" (hardcoded). |
| **Vendas** | `tenant/vendas/page.tsx` | ✅ OK | Histórico de Vendas, Botão PDV (link `/tenant/vendas/pdv`), Calculadora Flutuante, CRUD básico | KPI "Método Favorito" exibe "-" (hardcoded). Campo de busca não conectado. Geração de Recibo PDF é visual apenas. |
| **Estoque** | `tenant/estoque/page.tsx` | ✅ OK | CRUD Produtos, Alertas, Kits, Transferências, Valoração, Previsão de Demanda, Scanner de Barcode | Campo busca e botão Filtros não conectados. Botão "Importar/Exportar" dispara apenas um `ConfirmModal` sem lógica real de export/import. Edição de produto na tabela é visual (botão sem modal). |
| **Obras** | `tenant/obras/page.tsx` | ✅ OK | CRUD Obras, Etapas (Timeline), Financeiro (Custos/Resumo), Recursos, Documentos (Upload/Storage), Calendário | Handlers de "Criar Custo" e "Criar Recurso" no painel de detalhes exibem `toastError("Funcionalidade em desenvolvimento")` — **modais não implementados**. |
| **OS** | `tenant/os/page.tsx` | ✅ OK | CRUD OS, Calendário, Seleção de Cliente, Seleção de Funcionário Responsável, Histórico | Função `handleDelete` e `confirmarExclusao` são **duplicadas** — ambas chamam `deleteMutation.mutateAsync`. Apenas uma é usada. |
| **Financeiro** | `tenant/financeiro/page.tsx` | ✅ OK | CRUD Transações (receita/despesa), Edição inline, Fluxo de Caixa (toast informativo), Sincronização (placeholder) | "Sincronizar Banco" é placeholder (`success` imediato sem ação real). Campo de busca não conectado. Tipo no schema do banco é `pagar/receber` mas UI usa `receita/despesa` — **inconsistência de enums**. |
| **RH** | `tenant/rh/page.tsx` | ✅ OK | CRUD Funcionários, Exportar CSV, Calculadora Flutuante, Folha Estimada | Campo de busca não conectado. |

---

### 2. Inventário de Hooks (TanStack React Query)

| Hook File | Hooks Exportados | Padrão |
|:---|:---|:---|
| `use-clientes.ts` | `useClientes`, `useCreateCliente`, `useDeleteCliente`, `useUpdateCliente`, `useClientesComFiltros` | ✅ Cursor-based pagination via `next_cursor` |
| `use-dashboard.ts` | `useDashboardData` | ✅ Agrega 3 queries: KPIs, Últimas Vendas, Módulos Ativos |
| `use-vendas.ts` | `useVendas`, `useDeleteVenda` | Padrão OK |
| `use-produtos.ts` | `useProdutos`, `useCreateProduto`, `useDeleteProduto` | Padrão OK — falta `useUpdateProduto` |
| `use-financeiro.ts` | `useFinanceiro`, `useCreateFinanceiro`, `useDeleteFinanceiro`, `useUpdateFinanceiro` | ✅ Completo |
| `use-os.ts` | `useOS`, `useCreateOS`, `useDeleteOS`, `useUpdateOS` | ✅ Completo |
| `use-obras.ts` | `useObras`, `useCreateObra`, `useDeleteObra`, `useUpdateObra` | ✅ Completo |
| `use-obras-etapas.ts` | `useObraEtapas`, `useCreateObraEtapa`, `useUpdateObraEtapa`, `useDeleteObraEtapa`, `useObraProgresso` | ✅ Completo |
| `use-obras-custos.ts` | `useObraCustos`, `useCreateObraCusto`, `useUpdateObraCusto`, `useDeleteObraCusto`, `useObraResumoFinanceiro` | ✅ Completo |
| `use-obras-recursos.ts` | `useObraRecursos`, `useAlocarRecursoObra`, `useUpdateObraRecurso`, `useDeleteObraRecurso` | ✅ Completo |
| `use-obras-documentos.ts` | `useObraDocumentos`, `useUploadObraDocumento`, `useDeleteObraDocumento` | ✅ Completo |
| `use-funcionarios.ts` | `useFuncionarios`, `useCreateFuncionario`, `useDeleteFuncionario`, `useUpdateFuncionario` | ✅ Completo |

---

### 3. Inventário de RPCs — Camada `api.ts`

**Total de RPCs mapeadas no `api.ts`:** ~45 chamadas `.rpc()` distintas.

| Domínio | RPCs Identificadas |
|:---|:---|
| **Auth/Tenant** | `set_tenant_schema`, `tenant_dashboard_kpis` |
| **CRM** | `tenant_listar_clientes`, `tenant_criar_cliente`, `tenant_atualizar_cliente`, `tenant_excluir_cliente`, `tenant_listar_tags_cliente`, `tenant_adicionar_tag_cliente`, `tenant_remover_tag_cliente`, `tenant_criar_interacao`, `tenant_listar_interacoes`, `enviar_campanha_massa` |
| **Vendas/PDV** | `tenant_listar_vendas`, `tenant_processar_venda`, `tenant_excluir_venda`, `tenant_listar_produtos` (para PDV) |
| **Estoque** | `tenant_listar_produtos`, `tenant_criar_produto`, `tenant_excluir_produto`, `tenant_alertas_estoque`, `tenant_listar_kits`, `tenant_criar_kit`, `tenant_listar_transferencias`, `tenant_criar_transferencia`, `tenant_valorizacao_estoque`, `tenant_listar_codigos_produto`, `tenant_previsao_demanda` |
| **OS** | `tenant_listar_os`, `tenant_criar_os`, `tenant_atualizar_os`, `tenant_excluir_os` |
| **Obras** | `tenant_listar_obras`, `tenant_criar_obra`, `tenant_atualizar_obra`, `tenant_excluir_obra`, `tenant_listar_etapas_obra`, `tenant_criar_etapa_obra`, `tenant_atualizar_etapa_obra`, `tenant_excluir_etapa_obra`, `tenant_progresso_obra`, `tenant_listar_custos_obra`, `tenant_criar_custo_obra`, `tenant_atualizar_custo_obra`, `tenant_excluir_custo_obra`, `tenant_obras_resumo_financeiro`, `tenant_listar_recursos_obra`, `tenant_alocar_recurso_obra`, `tenant_atualizar_recurso_obra`, `tenant_excluir_recurso_obra`, `tenant_listar_documentos_obra`, `tenant_upload_documento_obra`, `tenant_excluir_documento_obra` |
| **Financeiro** | `tenant_listar_financeiro`, `tenant_criar_financeiro`, `tenant_atualizar_financeiro`, `tenant_excluir_financeiro` |
| **RH** | `tenant_listar_funcionarios`, `tenant_criar_funcionario`, `tenant_atualizar_funcionario`, `tenant_excluir_funcionario` |

---

### 4. Inventário de Tabelas — Schema Público e Tenant

**Schema `public` (governança global):**

| Tabela | Descrição | Observações |
|:---|:---|:---|
| `empresas` | Registro de empresas tenants | RLS ativo |
| `modulos_catalogo` | Catálogo de módulos disponíveis | RLS ativo |
| `empresa_modulos` | Feature flags por empresa | RLS ativo |
| `user_profiles` | Perfil (role, empresa_id, nome) por auth.user | RLS ativo, campo `nome` adicionado na V6 |
| `logs_provisionamento` | Auditoria de provisionamento de tenants | Sem RLS |
| `v_empresa_modulos` | View materializada para módulos ativos | Usada no Dashboard hook |

**Schema `tenant_*` (por empresa, provisionado em `provisionar_empresa`):**

| Tabela | Colunas Principais | Constraints |
|:---|:---|:---|
| `clientes` | id, nome, email, telefone, funil_fase, status, criado_em | CHECK em funil_fase e status |
| `produtos` | id, nome, descricao, tipo, preco_base, criado_em | CHECK tipo IN (produto, servico) |
| `estoque` | id, produto_id, sku, quantidade, quantidade_minima | UNIQUE SKU, CHECK quantidade >= 0 |
| `vendas` | id, cliente_id, valor_total, metodo_pagamento, status | CHECK metodo_pagamento e status |
| `vendas_itens` | id, venda_id, produto_id, quantidade, preco_unitario, subtotal | subtotal = GENERATED ALWAYS (computed) |
| `funcionarios` | id, nome, cargo, salario, role, criado_em | CHECK role IN (funcionario, gerente, admin, colaborador) |
| `financeiro` | id, tipo, descricao, valor, data_vencimento, status | CHECK tipo IN (pagar, receber) — **diverge da UI** |
| `os` | id, cliente_id, veiculo_equipamento, descricao_problema, colaborador_id, valor, status | FK para clientes e funcionarios |
| `obras` | id, nome, cliente_id, endereco, data_inicio, data_fim_prevista, orcamento, status | FK para clientes |
| `obras_etapas` | id, obra_id, nome, status, data_inicio, data_fim | FK para obras |
| `obras_custos` | id, obra_id, categoria, tipo, valor_previsto, valor_real | FK para obras |
| `obras_recursos` | id, obra_id, tipo, descricao, quantidade, custo_unitario | FK para obras |
| `obras_documentos` | id, obra_id, nome, tipo, tamanho, url, caminho_storage | FK para obras |
| `idempotency_control` | key, created_at | Controle de deduplicação de escritas |

---

### 5. Achados Críticos — PRIORIDADE ALTA 🔴

| # | Achado | Impacto | Localização |
|:---|:---|:---|:---|
| 1 | **Gráfico do Dashboard usa dados sintéticos (`Math.random()`)** | Dashboard exibe dados fictícios de receita por mês, não reflete realidade | `use-dashboard.ts:61-77` |
| 2 | **Inconsistência de enum Financeiro** | A tabela `financeiro.tipo` usa `pagar/receber` mas o frontend cria transações com `receita/despesa` → INSERTs falham silenciosamente por violação de CHECK | `financeiro/page.tsx:L59,173` vs `CORRECOES_CRITICAS_SUPABASE.sql:L172` |
| 3 | **Função `handleDelete` duplicada em OS** | `handleDelete` e `confirmarExclusao` são funções idênticas no mesmo componente, apenas `handleDelete` é usada pelo `ConfirmModal` — código morto que pode confundir manutenção | `os/page.tsx:88-110` |
| 4 | **Modais de Criar/Editar Custo e Recurso não implementados (Obras)** | Botões de Adicionar Custo e Adicionar Recurso no painel de detalhes retornam `toastError("Funcionalidade em desenvolvimento")` | `obras/page.tsx:234-261` |
| 5 | **`window.location.reload()` no CRM** | `recarregarClientes` usa reload completo de página ao invés de invalidar a query via React Query — UX degradada e anti-padrão | `crm/page.tsx:132-136` |
| 6 | **Ausência total de testes automatizados** | Qualquer refatoração futura pode introduzir regressões silenciosas sem cobertura de testes | Todo o repositório |

---

### 6. Achados de Melhoria — PRIORIDADE MÉDIA/BAIXA 🟡

| # | Achado | Impacto | Localização |
|:---|:---|:---|:---|
| 1 | **Campos de busca não conectados** | Busca em todos os módulos (CRM, Vendas, Estoque, Financeiro, OS, Obras, RH) é visual apenas, sem lógica de filtro | Todos os `page.tsx` |
| 2 | **Hook `useProdutos` sem `useUpdateProduto`** | Botão de Editar produto na tabela do Estoque não possui modal implementado | `use-produtos.ts`, `estoque/page.tsx` |
| 3 | **KPI "Método Favorito" em Vendas** | Hardcoded como "-" | `vendas/page.tsx:91` |
| 4 | **Botão WhatsApp no CRM** | Visual apenas, sem geração de link `wa.me/` | `crm/page.tsx:463` |
| 5 | **Botão "Geração de Recibo PDF"** | Visual apenas em Vendas | `vendas/page.tsx:165` |
| 6 | **Sincronizar Banco no Financeiro** | Placeholder que dispara `success()` imediato sem lógica real | `financeiro/page.tsx:126-136` |
| 7 | **Soft Delete ausente** | Exclusões são permanentes em todas as entidades — sem `deleted_at` para recuperação | Todos os schemas tenant |
| 8 | **Audit Trail ausente** | Nenhuma tabela de log de alterações de dados sensíveis (quem alterou o quê e quando) | Schema público |
| 9 | **Rate Limiting ausente** | Nenhuma proteção contra abuso de RPCs ou autenticação | Nível de infraestrutura Supabase |
| 10 | **RPC de Gráfico Mensal ausente** | `tenant_dashboard_kpis` não retorna série temporal por mês — necessário criar nova RPC | `use-dashboard.ts`, banco de dados |

---

### 7. Ações Prioritárias para Próxima Sprint

> As ações abaixo devem ser executadas em ordem de prioridade:

**🔴 CRÍTICO (fazer imediatamente):**
1. **Corrigir enum Financeiro:** Alinhar o frontend para usar `pagar/receber` OU alterar o CHECK do banco para aceitar `receita/despesa`. Verificar impacto nas RPCs existentes.
2. **Implementar dados reais no gráfico do Dashboard:** Criar RPC `tenant_dashboard_kpis_por_mes` que retorne série temporal dos últimos 6 meses e conectar ao hook.
3. **Implementar `window.location.reload()` → `queryClient.invalidateQueries`** no CRM.
4. **Remover função duplicada `confirmarExclusao`** do componente OS.

**🟡 MÉDIO PRAZO:**
5. Implementar modais de Criar Custo e Criar Recurso na aba de detalhes de Obras.
6. Conectar campos de busca a filtros reais via parâmetros das RPCs (todos os módulos).
7. Implementar `useUpdateProduto` e modal de edição no Estoque.
8. Gerar link `wa.me/` no botão de WhatsApp do CRM.
9. Geração real de Recibo PDF via RPC ou biblioteca client-side.

**🟢 LONGO PRAZO:**
10. Soft Delete (`deleted_at`) em todas as entidades.
11. Audit Trail global (tabela `audit_log` no schema public).
12. Suite de testes (Vitest + Playwright E2E).
13. Rate Limiting via Supabase Edge Functions ou middleware customizado.

---

### 8. Estado Geral do Sistema

```
SCORE DE SAÚDE: 7.5/10

✅ Arquitetura multi-tenant: SÓLIDA
✅ Camada de segurança (RLS + middleware): SÓLIDA  
✅ Padrão de hooks React Query: CONSISTENTE
✅ RPCs implementadas: ~45 RPCs cobrindo todos os módulos
⚠️ UX: Vários elementos visuais sem lógica real
⚠️ Dados: 1 inconsistência crítica de enum (Financeiro)
❌ Testes: ZERO cobertura automatizada
❌ Monitoramento: Sem APM ou logging estruturado
```

---

## VISTORIA 6: Banner de Boas-Vindas no Dashboard (19/04/2026)

### Escopo Analisado
- Implementação de banner de boas-vindas personalizado no dashboard
- Adição de campo nome em user_profiles
- Criação de hook useUserProfile para obter dados do usuário
- Criação de componente BoasVindasBanner com persistência
- Integração no dashboard de forma simétrica

### Alterações Realizadas

**Banco de Dados (schema public):**
- Criada migration SQL: `apps/api/migrations/add_nome_user_profiles.sql`
- Adicionada coluna `nome TEXT` opcional em `public.user_profiles`
- Migration aplicada com sucesso via psql

**RPCs (supabase_rpc.sql):**
- Atualizada função `public.provisionar_empresa_master`
- Adicionado parâmetro opcional `p_nome TEXT DEFAULT NULL`
- Mantida compatibilidade retroativa

**Webhook Provisionamento (webhook_provisionamento.sql):**
- Atualizada chamada para `provisionar_empresa_master` passando `p_cliente_nome`
- Atualizado `INSERT INTO user_profiles` para incluir campo `nome`
- Adicionado `ON CONFLICT` para atualizar nome em caso de conflito

**Frontend - Hook:**
- Criado arquivo: `apps/web/src/lib/hooks/use-user-profile.ts`
- Hook `useUserProfile()` busca dados do usuário via Supabase Auth
- Resolve nome com fallback:
  1. `user_profiles.nome` (se preenchido)
  2. `session.user.user_metadata.full_name`
  3. `session.user.user_metadata.name`
  4. Primeira parte do email (antes do @)
- Exporta: `{ nome, email, role, userId, loading }`

**Frontend - Componente:**
- Criado arquivo: `apps/web/src/components/modules/base/BoasVindasBanner.tsx`
- Design: Gradiente `from-violet-500 to-purple-600`
- Mensagem: "Bem-vindo de volta, {nome}!" + subtexto
- Botão X para fechar (dismiss)
- Animação: Tailwind `animate-in fade-in slide-in-from-top-4`
- Responsivo: `px-4 sm:px-6`
- Persistência: localStorage com chave `boas_vindas_${userId}`
- Exibe apenas se chave não existe OU data salva < 7 dias atrás

**Frontend - Dashboard:**
- Atualizado arquivo: `apps/web/src/app/tenant/dashboard/page.tsx`
- Importados `useUserProfile` e `BoasVindasBanner`
- Banner renderizado acima do header "Visão Geral"
- Condicional: exibe apenas quando nome e userId estão disponíveis
- Layout preservado - banner não causa layout shift

### Pontos Fortes
- **Fallback inteligente:** Resolve nome de múltiplas fontes (perfil, metadata, email)
- **Persistência não invasiva:** localStorage com validação de 7 dias
- **SSR-safe:** Verifica `typeof window` antes de acessar localStorage
- **Animação suave:** Tailwind nativo sem dependências externas
- **Layout simétrico:** Banner posicionado de forma consistente com grid existente
- **Compatibilidade retroativa:** Parâmetro p_nome opcional mantém compatibilidade
- **Zero dependências:** Não adiciona framer-motion, date-fns ou outras libs

### Riscos Técnicos
- **localStorage limpeza:** Se usuário limpar localStorage, banner reaparece (comportamento esperado)
- **Nome não disponível:** Fallback para email garante que sempre há algo para exibir
- **SSR hydration:** Verificação de window evita erro de hidratação

### Observações
- Migration aplicada com sucesso em schema public
- Hook usa padrão `useEffect` com cleanup para evitar memory leaks
- Componente usa `animate-in` do Tailwind CSS v4
- Banner desaparece graciosamente sem layout shift
- Funcionalidade existente do dashboard preservada intactamente

---

## VISTORIA 5: Módulo CRM - Gestão de Clientes (19/04/2026)

### Escopo Analisado
- Estrutura atual do módulo CRM
- Funcionalidades implementadas
- Comparação com propostas de melhoria
- Identificação de funcionalidades novas para implementar

### Estrutura Atual do CRM

**Frontend:**
- `/Users/macbook/fluxoprod/apps/web/src/app/tenant/crm/page.tsx` (325 linhas)
- Interface com listagem de clientes, formulário de criação/edição, KPIs básicos

**Hooks:**
- `/Users/macbook/fluxoprod/apps/web/src/lib/hooks/use-clientes.ts` (38 linhas)
- useClientes, useCreateCliente, useDeleteCliente, useUpdateCliente

**API:**
- `/Users/macbook/fluxoprod/apps/web/src/lib/api.ts`
- Interfaces: Cliente, ClienteCreate, ClienteUpdate
- Funções: fetchClientes, createCliente, deleteCliente, updateCliente

**Banco de Dados (tabela clientes):**
- id UUID PRIMARY KEY
- nome VARCHAR(255) NOT NULL
- email VARCHAR(255)
- telefone VARCHAR(50)
- documento VARCHAR(50)
- endereco TEXT
- funil_fase VARCHAR(50) DEFAULT 'lead' (CHECK: lead, prospect, oportunidade, cliente, recuperacao)
- status VARCHAR(50) DEFAULT 'ativo' (CHECK: ativo, inativo, bloqueado)
- criado_em TIMESTAMPTZ
- atualizado_em TIMESTAMPTZ

**RPCs Implementadas:**
- tenant_listar_clientes (p_limit, p_offset)
- tenant_criar_cliente (p_nome, p_email, p_telefone, p_funil_fase, p_status, p_idempotency_key)
- tenant_excluir_cliente (p_cliente_id)
- tenant_atualizar_cliente (p_cliente_id, p_nome, p_email, p_telefone, p_funil_fase, p_status)

### Funcionalidades Atuais Implementadas

**Funcionalidades básicas:**
- ✅ Listar clientes (com paginação LIMIT/OFFSET)
- ✅ Criar cliente (com validação de e-mail)
- ✅ Editar cliente
- ✅ Excluir cliente
- ✅ Envio de e-mail de boas-vindas (via Resend)
- ✅ KPIs básicos (Clientes Ativos, Inativos 30D+, Taxa de Conversão)
- ⚠️ Campanha em massa (simulada, não implementada realmente)

**Funil de vendas básico:**
- ✅ Campo funil_fase com CHECK constraint (lead, prospect, oportunidade, cliente, recuperacao)
- ✅ Campo status com CHECK constraint (ativo, inativo, bloqueado)
- ❌ Visualização de pipeline Kanban não implementada
- ❌ Movimentação automática entre fases não implementada

### Funcionalidades Sugeridas (Documento implementacoes_futuras_melhorias.md)

**1. Histórico de interações** - ❌ NÃO IMPLEMENTADO
- Registrar contatos, reuniões, chamadas com clientes
- Necessário: tabela interacoes_clientes com tipo, data, notas, usuario_id
- Necessário: RPCs para criar/listar interações
- Necessário: Componente UI para timeline de interações

**2. Segmentação de clientes** - ❌ NÃO IMPLEMENTADO
- Tags, categorias, classificações (VIP, inativo, etc.)
- Necessário: tabela cliente_tags ou campo tags JSONB
- Necessário: Sistema de segmentação com filtros
- Necessário: Componente UI para gestão de tags

**3. Gestão de oportunidades** - ⚠️ PARCIALMENTE IMPLEMENTADO
- Pipeline de vendas associado a clientes
- Funil_fase existe mas sem visualização Kanban
- Necessário: Componente Kanban para visualizar pipeline
- Necessário: RPCs para movimentação entre fases
- Necessário: Dashboard de oportunidades por fase

**4. Documentos de clientes** - ❌ NÃO IMPLEMENTADO
- Upload de contratos, propostas, documentos legais
- Necessário: tabela cliente_documentos (similar a obras_documentos)
- Necessário: Integração com Supabase Storage
- Necessário: Componente UI para upload/visualização

**5. Dashboard de clientes** - ⚠️ PARCIALMENTE IMPLEMENTADO
- KPIs de aquisição, retenção, LTV
- KPIs básicos existem (Clientes Ativos, Inativos, Taxa de Conversão)
- Necessário: KPIs avançados (LTV, Churn Rate, CAC)
- Necessário: Gráficos de tendência
- Necessário: Métricas de segmentação

### Funcionalidades Adicionais Identificadas

**Melhorias arquiteturais (Documento MELHORIAS_FUTURAS.md):**
- ⚠️ Validação de e-mail já implementada (✅)
- ❌ Soft delete não implementado em clientes
- ❌ Paginação cursor-based não implementada (usa LIMIT/OFFSET)
- ❌ Filtros avançados não implementados
- ❌ Ordenação flexível não implementada

### Pontos Fortes

**Implementação atual:**
- **Validação de e-mail:** Implementada no frontend antes de envio
- **Idempotência:** RPC tenant_criar_cliente usa idempotency_key
- **Funil de vendas:** Campo funil_fase com CHECK constraint
- **Status tracking:** Campo status com CHECK constraint
- **KPIs básicos:** Dashboard com métricas essenciais
- **Campanha em massa:** Placeholder para implementação futura
- **Consistência de padrões:** Segue padrões RPC do sistema

### Riscos Técnicos

**Limitações atuais:**
- **Exclusão permanente:** Não há soft delete em clientes
- **Paginação LIMIT/OFFSET:** Degrada em grandes volumes
- **Falta de histórico:** Não há registro de interações
- **Falta de segmentação:** Não há tags/categorias
- **Campanha simulada:** Funcionalidade não implementada realmente
- **Pipeline não visual:** Funil existe mas sem UI Kanban

### Observações

**Estado atual do CRM:**
- Módulo CRM funcional para CRUD básico de clientes
- Funil de vendas implementado em nível de banco mas não visual
- Validação de e-mail implementada corretamente
- E-mail de boas-vindas enviado automaticamente

**Funcionalidades críticas faltantes:**
1. Histórico de interações (prioridade ALTA)
2. Segmentação de clientes (prioridade ALTA)
3. Visualização Kanban do pipeline (prioridade MÉDIA)
4. Documentos de clientes (prioridade MÉDIA)
5. Dashboard avançado (prioridade MÉDIA)

**Recomendação de implementação:**
1. **Curto prazo (baixo risco):** Implementar soft delete, adicionar filtros básicos
2. **Médio prazo (médio risco):** Histórico de interações, segmentação, Kanban
3. **Longo prazo (alto risco):** Dashboard avançado, documentos, analytics

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

---

## PENDÊNCIA DE VISTORIA: Automação de Vídeo Comercial (21/04/2026)

### Resumo das Alterações
- **Substituição de Vídeo:** Vídeo comercial da Landing Page atualizado com versão otimizada (Lily @ 1.4x).
- **Limpeza de Repositório:** Remoção de componentes de teste, planos de desenvolvimento obsoletos e +100MB de ativos de áudio experimentais.
- **Correção de Sintaxe:** Ajuste no componente `VideoDemo.tsx` para garantir estabilidade do build.
- **Novas Funcionalidades:** Implementação de suporte a narração sincronizada e mixagem de áudio via ElevenLabs.

### Itens para Vistoria Imediata
- [ ] Verificar performance de carregamento com o novo vídeo de alta velocidade.
- [ ] Validar integridade do componente `VideoDemo.tsx` em resoluções mobile.
- [ ] Revisar logs de build para garantir que a remoção das pastas de teste não afetou dependências.

**STATUS: Pendente de Vistoria de Produção.**

---

---

## VISTORIA 15: Integração do Gateway de Pagamento Real (Asaas) (21/04/2026)

### Resumo das Alterações
- **Migração de Gateway:** Substituído o ambiente de simulação pela integração real com a API do Asaas.
- **Webhook Seguro:** Implementada validação de assinatura (`asaas-access-token`) e mapeamento de payload para provisionamento atômico.
- **Fluxo de Checkout:** Refatorado para redirecionamento direto para faturas do gateway e suporte a PIX em produção.
- **Configuração Vercel:** Chaves de API e Segredo do Webhook configurados como variáveis de ambiente criptografadas.

### Itens para Vistoria Imediata
- [ ] Validar recebimento de Webhook `PAYMENT_RECEIVED` em produção.
- [ ] Verificar logs da RPC `webhook_provisionar_assinatura` para garantir criação de tenant sem falhas.
- [ ] Testar fluxo de redirecionamento mobile para o checkout do Asaas.

**STATUS: PENDENTE_VALIDACAO_PRODUCAO (Realizar vistoria o mais rápido possível).**

