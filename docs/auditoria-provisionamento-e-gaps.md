# Auditoria FLUXO - Provisionamento e Gaps

## Eixo 1 - Diagnostico do HTTP 500 no MASTER

### Causas provaveis (priorizadas)
1. **Erro silencioso em background task**: o endpoint respondia `200/provisionando` antes da execucao real; falhas em `urllib` eram somente `print`, sem propagar excecao.
2. **Mensagem de erro perdida no frontend**: a UI tratava qualquer `!res.ok` com erro generico, sem parse de `detail`.
3. **Violacao de constraint em `public.empresas`**: `cnpj` e `schema_name` unicos podem disparar erro REST e virarem falha sem contexto.
4. **Falha de RPC com DDL**: retorno `status:error` da `provisionar_empresa` nao era convertido em erro de API.
5. **Fluxo nao transacional de ponta a ponta**: empresa podia ser inserida e o schema falhar depois, gerando inconsistencias operacionais.

### Correcoes aplicadas no codigo
- `apps/api/routers/provisioning.py`
  - remove `BackgroundTasks` e executa provisionamento de forma sincronizada.
  - converte falhas HTTP do Supabase em `RuntimeError` com mensagem contextual.
  - passa a chamar RPC unica `provisionar_empresa_master` (empresa + schema + modulos).
  - retorna `status=success` apenas quando tudo conclui.
- `apps/api/supabase_rpc.sql`
  - adiciona `public.provisionar_empresa_master(...)` com validacao de schema e modulos.
  - registra sucesso/erro em `logs_provisionamento`.
  - restringe EXECUTE da RPC para `service_role`.
- `apps/web/src/app/mestre/page.tsx`
  - parseia payload de erro da API (`detail/message`) e exibe na UI.
  - separa status de progresso de detalhe tecnico de erro.
- `apps/api/models/schemas.py`
  - corrige lista mutavel padrao para `Field(default_factory=list)`.

### Observacao arquitetural critica
- A transacao forte foi implementada na camada SQL via `provisionar_empresa_master(...)`.
- Para entrar em vigor, esta versao do SQL precisa ser aplicada no Supabase (SQL Editor ou migration).

## Eixo 2 - Gaps prototipo (tenant UI) vs producao backend

### Implementado no prototipo, ausente/incompleto no backend real
- **Dashboard**: KPIs, grafico e transacoes estao mockados no frontend.
- **CRM**: lista, busca, campanha em massa e status estao sem persistencia real.
- **Financeiro**: conciliacao, sincronizacao bancaria e fluxo de caixa sem integracao.
- **Vendas/PDV**: carrinho e pagamento sao estado local; nao persiste venda nem itens.
- **Estoque**: alertas e tabela mockados; sem movimentacao real de estoque.
- **Catalogo e RH**: telas majoritariamente visuais (placeholder).
- **Configuracoes**: formulario sem escrita em banco.

### Divergencias de modelagem
- Existe `vendas`, mas falta tabela de itens (`vendas_itens`) para fechar PDV corretamente.
- `financeiro` mistura conceito de lancamento e conciliacao; faltam tabelas de extrato/transacao bancaria e vinculo de conciliacao.
- `funcionarios` possui coluna `role`, mas nao conversa com RBAC em `user_profiles`.
- Falta padrao de auditoria por tenant (created_by, updated_by, soft delete, idempotency keys).

### Feature toggling visual vs real
- **Real no backend**: middleware bloqueia rota por `empresa_modulos`.
- **Parcial**: componentes e acoes internas ainda podem permanecer clicaveis sem bloqueio por permissao funcional.
- **Necessario**: checagem server-side por modulo em toda mutacao/API (nao apenas navegacao).

## Decisoes criticas pendentes
- Definir estrategia unica de isolamento de dados do tenant:
  - schemas por tenant (atual), mantendo API publica estrita e acesso apenas via service layer.
- Definir matriz de permissao por papel interno (`tenant_admin`, `tenant_user`) por modulo e acao.
- Definir pipeline de seed de tenant com versao de schema (migrations versionadas por tenant).
- Definir padrao de observabilidade: correlation-id de provisionamento, logs estruturados e status machine (`pending`, `running`, `failed`, `done`).

## Checklist de confiabilidade (go-live)
- [ ] Endpoint de provisionamento retorna erro detalhado e rastreavel.
- [ ] Nao existe mais falha silenciosa em tarefa de fundo.
- [ ] Falha na RPC nao deixa empresa ativa sem ambiente funcional.
- [ ] Modulos escolhidos no onboarding sao refletidos em `empresa_modulos`.
- [ ] UI MASTER exibe causa tecnica real de erro.
- [ ] Cada modulo tenant com persistencia real e sem dados mockados em producao.
- [ ] Rotas **e** mutacoes protegidas por feature toggling backend.
- [ ] RLS revisado em todas as tabelas publicas sensiveis.
- [ ] Secrets de `service_role` somente no backend seguro (nunca no client).
- [ ] Testes de provisionamento cobrindo sucesso, duplicidade, timeout e rollback compensatorio.
