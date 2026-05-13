# DOCUMENTAÇÃO TÉCNICA - FLUXO ERP

> [!IMPORTANT]
> **Regra obrigatória (banco → tipos):** sempre que o banco de dados PostgreSQL/Supabase for alterado (migrações, SQL Editor, CLI, policies, views, RPCs, colunas, índices ou qualquer outro objeto), é **obrigatório** regenerar `apps/web/src/types/database.types.ts` com o comando oficial `supabase gen types typescript` do projeto (credenciais só em variável de ambiente local). Revisar o diff; se houver mudança de contrato, **commitar** o arquivo atualizado junto da alteração. O comando concreto está na seção **Sincronização de Tipos** abaixo.
>
> **Alinhamento SQL completo (`public`):** fluxo operacional (gerador + scripts de verificação no SQL Editor) em [`docs/SQL_ALINHAMENTO_COMPLETO.md`](SQL_ALINHAMENTO_COMPLETO.md).

-- Status: Vistoria 63 Implementada - Gestão de Equipe Multi-Tenant --
## ESTADO ATUAL: PRODUCTION-READY (QUALIFICADO)
## ÚLTIMA ATUALIZAÇÃO: 13/05/2026 (Blindagem E2E)
## VERSÃO: 2.7 (Estável - Blindagem E2E)

---

## 🛡️ ARQUITETURA DE TIPAGEM: BLINDAGEM E2E (Vistoria 76)

O Fluxo ERP utiliza uma arquitetura de **Blindagem E2E (End-to-End Typing)** para garantir a estabilidade do sistema e eliminar erros de comunicação entre o Banco de Dados e a Interface. 

### Comparação de Paradigmas

| Característica | Arquitetura Antiga (any) | Arquitetura Atual (E2E Strict) |
| :--- | :--- | :--- |
| **Detecção de Erros** | Erros em **Runtime** (o sistema quebra no uso). | Erros em **Compilação** (o build falha antes do deploy). |
| **Contrato de Dados** | Drift entre Schema DB e Frontend (adivinhação). | database.types.ts como Única Fonte da Verdade. |
| **Segurança (Safety)** | Acesso direto e inseguro a propriedades. | Guardas de tipo (assertRpcResult, getStringField). |
| **Refatoração** | Perigosa e dependente de testes manuais. | Segura e guiada pelo compilador TypeScript. |
| **Automação** | Silenciamento via as any. | Verificação via tsc --noEmit (Zero Erros). |

### Padrões Obrigatórios de Implementação
1. **getSupabaseStrict()**: Sempre injetar o contrato <Database> nas chamadas.
2. **Tratamento de Erros**: Usar catch (error: unknown) + instanceof Error.
3. **Parsing de RPC**: Proibido as any. Usar helpers de extração segura em lib/api.ts.
4. **Geração de Tipos**: Sincronizar database.types.ts a cada alteração de SQL/Supabase.

---

---

> [!CAUTION]
> **ðŸ›‘ BLINDAGEM DO MÃ“DULO CRM (REGRA DE OURO)**
> O mÃ³dulo de CRM (`apps/web/src/app/tenant/crm/page.tsx` e componentes em `@/components/crm/*`) Ã© o nÃºcleo de inteligÃªncia e reengajamento do Fluxo ERP. 
> **PROIBIDO ALTERAR** a estrutura de RPCs (`tenant_obter_sugestoes_nurturing`, `tenant_criar_cliente`), hooks ou o sistema de Modais sem validaÃ§Ã£o em ambiente multi-tenant diversificado. 
> **RESTRIÃ‡ÃƒO CRÃTICA**: Qualquer modificaÃ§Ã£o em RPCs de CRM deve manter compatibilidade polimÃ³rfica (suporte a retornos `JSONB` e `RECORD`) para evitar quebra de produÃ§Ã£o em tenants legados.

---

## ðŸ›¡ï¸ POLÃTICA DE EVOLUÃ‡ÃƒO E BLINDAGEM GLOBAL

Para garantir a integridade do sistema em caso de rollbacks e evitar quebra de produÃ§Ã£o por agentes ou manutenÃ§Ãµes:

1. **MudanÃ§as Aditivas (NÃ£o Destrutivas)**: 
   - Ao adicionar funcionalidades, priorize a **adiÃ§Ã£o** de novas colunas ou tabelas. 
   - **PROIBIDO** renomear ou excluir colunas existentes sem um plano de migraÃ§Ã£o de dados de duas etapas (dual-run).
   - O cÃ³digo antigo deve sempre ser capaz de ignorar novas colunas adicionadas ao banco.

2. **Versionamento de RPCs (Modo Seguro)**:
   - Se uma alteraÃ§Ã£o em uma RPC existente puder quebrar o contrato atual (ex: mudar parÃ¢metros ou tipo de retorno), **NÃƒO ALTERE** a funÃ§Ã£o original.
   - Crie uma nova versÃ£o da funÃ§Ã£o (ex: `tenant_listar_vendas_v2`).
   - Mantenha a `v1` funcional atÃ© que todos os clientes/componentes tenham migrado para a nova versÃ£o.

3. **IndependÃªncia de Rollback**:
   - O sistema deve ser projetado para que o rollback de um commit do Frontend (Git) nÃ£o resulte em falha catastrÃ³fica devido ao estado "mais novo" do Banco de Dados.

4. **SincronizaÃ§Ã£o de Tipos (EstÃ¡tico)**:
   - **HistÃ³rico e SincronizaÃ§Ã£o**: Sempre que vocÃª alterar o banco de dados por migraÃ§Ãµes ou pelo Editor SQL do Supabase, basta rodar o seguinte comando (jÃ¡ deixei o binÃ¡rio `supabase.exe` na raiz do seu projeto local para facilitar, dispensando o uso de npx/node global):
     ```powershell
     $env:SUPABASE_ACCESS_TOKEN="SEU_TOKEN_DO_SUPABASE"
     .\supabase.exe gen types typescript --project-id wkxtlvxotvutycbupfuh > apps/web/src/types/database.types.ts
     ```
   - **CONFORMIDADE OBRIGATÃ“RIA**: Qualquer alteraÃ§Ã£o de schema, nova tabela, view ou RPC exige a execuÃ§Ã£o imediata deste comando de geraÃ§Ã£o e o commit conjunto do arquivo `database.types.ts` atualizado. Todos os inicializadores de cliente do Supabase no projeto usam estritamente o tipo genÃ©rico `<Database>`, forÃ§ando o compilador Next.js a barrar qualquer deploy que possua falha de comunicaÃ§Ã£o entre frontend e banco.

5. **PolÃ­tica de Testes de RegressÃ£o (Bug-First Testing)**:
   - Toda e qualquer correÃ§Ã£o de bug realizada por agentes ou humanos **deve** ser acompanhada de um caso de teste correspondente no Vitest (`vitest run`). O teste deve reproduzir a falha e validar que a correÃ§Ã£o se mantÃ©m estÃ¡vel, evitando que um agente futuro reverta a soluÃ§Ã£o.

6. **Mensagens de Commit SemÃ¢nticas (Rastreabilidade)**:
   - Commits de alteraÃ§Ãµes de cÃ³digo devem obrigatoriamente seguir as diretrizes do Conventional Commits (ex: `fix(checkout): adjust coupon counter schema validation`). Isso garante rastreabilidade total via `git log` ou `git blame` para identificar qual agente e qual commit ocasionou qualquer regressÃ£o.

---

## ðŸ“‚ GOVERNANÃ‡A DE DOCUMENTAÃ‡ÃƒO (BACKLOG)

Para manter a organizaÃ§Ã£o do repositÃ³rio, utilizamos apenas dois arquivos de planejamento:

1. **[PENDENCIAS.MD](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/PENDENCIAS.md)**: Exclusivo para **alteraÃ§Ãµes de cÃ³digo**, dÃ­vidas tÃ©cnicas, refatoraÃ§Ãµes, correÃ§Ãµes de bugs e riscos de escalabilidade. Se envolve cÃ³digo existente ou estrutura, fica aqui.
2. **[MELHORIAS_FUTURAS.MD](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/MELHORIAS_FUTURAS.md)**: Exclusivo para **novas funcionalidades**, melhorias de UX/UI, expansÃ£o de mÃ³dulos e novas integraÃ§Ãµes. Se Ã© algo que o sistema ainda nÃ£o faz, fica aqui.

---

## ðŸ“‹ ESTRUTURA DO SISTEMA

### Arquitetura Geral (OPÃ‡ÃƒO A - IMPLEMENTADA)
- **Backend**: Supabase (PostgreSQL + RPC) - **FONTE DA VERDADE**
- **Frontend**: Next.js 16.2.2 (apps/web) - **UI E ORQUESTRADOR** — deploy em **Vercel** (ver `apps/web/vercel.json`)
- **Database**: Supabase PostgreSQL com multi-tenancy por schema
- **Backend Python**: **NÃƒO EXISTE** - deve ser ignorado
- **Provisionamento**: RPC Functions via Supabase
- **Tecnologias Frontend**: React 19.2.4, TypeScript 5, TailwindCSS 4, @tanstack/react-query 5.96.2

### Atualizacao Corretiva 22/04/2026
- Leitura oficial desta data: o sistema esta operavel em producao no fluxo critico, mas ainda com pendencia SQL pontual para fechamento integral sem ressalvas.
- Checkout nao envia mais senha ao gateway; a senha fica apenas em estado cifrado server-side.
- O webhook de pagamento agora provisiona tenant pelo backend usando `provisionar_empresa_master`, `user_profiles`, `checkout_vendas` e `webhook_audit_log`, sem depender da RPC legada `webhook_provisionar_assinatura`.
- `relatorios` e `comissoes` foram trazidos para a camada `@/lib/api`, removendo acesso direto a tabelas tenant no browser.
- Validacao executada em 22/04/2026: `tsc --noEmit` e `next build` concluidos com sucesso.
- Pendencia remanescente: publicar no banco live `apps/api/migrations/rpc_comissoes_regras.sql`.
- Re-vistoria obrigatoria pendente apos essa publicacao SQL.

### Status Atual (consolidado - Vistoria 77, 13/05/2026)
- **Arquitetura:** multi-tenancy por schema, `set_tenant_schema`, feature flags e RPCs como padrão principal (inalterado).
- **Checkout / webhook:** provisionamento via `/api/webhook/payment` com auditoria em `webhook_audit_log` usando colunas `external_transaction_id`, `status`, `payload`, `detalhes` (contrato em `database.types.ts`).
- **Camada de dados no browser:** módulos `relatorios` e `comissoes` consumidos via `@/lib/api` (sem leitura direta de tabelas tenant no cliente, conforme atualização de 22/04/2026).
- **Validação de tipagem:** manter `tsc --noEmit` sem erros antes de cada deploy (Blindagem E2E).
- **Pendência operacional de banco (live):** publicar migrações ainda não aplicadas no projeto Supabase; prioridade mínima documentada em `docs/PENDENCIAS.md` e checklist da Vistoria 77 em `docs/VISTORIAS.md` (ex.: `rpc_comissoes_regras.sql`, `fix_indexes_checkout_webhook.sql`).

âœ… **O sistema estÃ¡ PRODUCTION-READY** apÃ³s as correÃ§Ãµes crÃ­ticas de 22/04/2026:
- **SeguranÃ§a de Checkout**: Senhas nÃ£o trafegam mais no gateway e sÃ£o processadas apenas no backend.
- **Provisionamento Robusto**: Novo fluxo orquestrado via `/api/webhook/payment` utilizando RPCs atÃ´micas.
- **Saneamento de CÃ³digo**: RemoÃ§Ã£o de acessos diretos a tabelas tenant em `relatorios` e `comissoes`.
- **Build EstÃ¡vel**: RemoÃ§Ã£o de dependÃªncias de fontes remotas e pacotes ausentes, garantindo `next build` com sucesso.
- **Soft Delete Global**: Implementado em todas as entidades tenant (coluna `deleted_at` + Ã­ndices parciais).
- **Escalabilidade**: Mantido o padrÃ£o de LIMIT (1000) e roteamento de schema seguro.

> [!WARNING]
> **Ressalva Pendente:** A funcionalidade de gestÃ£o de regras de comissÃ£o depende da aplicaÃ§Ã£o de `apps/api/migrations/rpc_comissoes_regras.sql` no banco live. AtÃ© lÃ¡, o mÃ³dulo opera em modo degradado.

### EstratÃ©gia Multi-Tenant (OPÃ‡ÃƒO A - IMPLEMENTADA)
- **Isolamento**: Um schema PostgreSQL por tenant (ex: `tenant_empresa_xyz`)
- **Schema Routing**: RPC `set_tenant_schema()` configura `search_path` baseado em `user_profiles`
- **Middleware**: Injeta schema via RPC em cada request, valida role e feature flags
- **RLS**: Policies permissivas (`USING (true)`) pois isolamento Ã© por schema routing
- **RBAC**: Tabela `role_permissions` com roles `tenant_admin` e `tenant_user` padrÃ£o

### MÃ³dulo Fiscal (NFe Nativa - OPÃ‡ÃƒO CUSTO ZERO)
- **Motor**: Node.js Nativo (`node-forge` + `xml-crypto` + `axios`)
- **Escopo Atual**: EmissÃ£o nativa liberada somente para empresas do **Simples Nacional**.
- **Certificado (Multi-tenant)**: Armazenamento isolado em Supabase Storage (`fiscal/{empresa_id}/certificado.pfx`).
- **GestÃ£o**: Cada empresa realiza o upload de seu prÃ³prio certificado e senha via painel de ConfiguraÃ§Ãµes.
- **Assinatura**: PadrÃ£o XMLDSIG (Sha256) executado server-side via API Route (`/api/fiscal/nfe/emitir`).
- **TransmissÃ£o**: mTLS (Mutual TLS) direto para os Web Services da SEFAZ utilizando o certificado do tenant.
- **UFs Atendidas no Backend**: `RS`, `SP`, `MG` e estados operados pela `SVRS` (`AC`, `AL`, `AP`, `DF`, `PB`, `PI`, `RJ`, `RN`, `RO`, `RR`, `SC`, `SE`, `TO`).
   - Colunas: id, cliente_id, valor_total, metodo, status, vendedor_id, valor_custo_total (CMV), criado_em, atualizado_em, **deleted_at**
   - Ãndices: idx_vendas_valor_total, idx_vendas_cliente, idx_vendas_status, idx_vendas_criado_em, idx_tenant_vendas_not_deleted

5. **vendas_itens** - Itens de venda
   - Colunas: id, venda_id, produto_id, quantidade, preco_unitario, subtotal, **deleted_at**

6. **financeiro** - TransaÃ§Ãµes financeiras
   - Colunas: id, tipo, descricao, valor, data_vencimento, status, categoria, conciliado (boolean), banco_transacao_id, banco_nome, data_conciliacao, criado_em, atualizado_em, **deleted_at**
   - Ãndices: idx_financeiro_tipo, idx_financeiro_status, idx_financeiro_criado_em, idx_financeiro_conciliado, idx_tenant_financeiro_not_deleted

7. **funcionarios** - FuncionÃ¡rios/RH
   - Colunas: id, nome, cargo, salario, status, criado_em, atualizado_em, **deleted_at**
   - Ãndices: idx_funcionarios_cargo, idx_funcionarios_status, idx_tenant_funcionarios_not_deleted

8. **ordens_servico** - Ordens de ServiÃ§o (OS)
   - Colunas: id, numero (BIGSERIAL), cliente_id, veiculo_equipamento, descricao_problema, colaborador_id, status, valor_orcamento, **tempo_total_minutos** (INTEGER), **timer_iniciado_em** (TIMESTAMPTZ), **valor_servico** (NUMERIC), criado_em, atualizado_em, **deleted_at**
   - Ãndices: idx_os_numero, idx_os_cliente, idx_os_status, idx_os_criado_em, idx_tenant_os_not_deleted

9. **ordens_servico_historico** - HistÃ³rico de OS
   - Colunas: id, os_id, acao, detalhes, criado_por, criado_em

10. **ordens_servico_itens** - PeÃ§as e ServiÃ§os da OS
    - Colunas: id, ordem_servico_id, produto_id, descricao, quantidade, preco_unitario, **valor_custo**, subtotal (generated), criado_em
    - Ãndices: idx_os_itens_os, idx_os_itens_produto

11. **obras** - Obras/Projetos
    - Colunas: id, nome, cliente_id, endereco, data_inicio, data_fim_prevista, orcamento_total, descricao, status, criado_em, atualizado_em, **deleted_at**
    - Ãndices: idx_obras_cliente, idx_obras_status, idx_obras_criado_em, idx_tenant_obras_not_deleted

12. **configuracoes** - ConfiguraÃ§Ãµes do tenant
    - Colunas: id, chave, valor, descricao, criado_em, atualizado_em, **deleted_at**
    - Ãndices: idx_configuracoes_chave

13. **role_permissions** - PermissÃµes por role (RBAC intra-tenant)
    - Colunas: id, role, resource, action, criado_em
    - Ãndices: idx_role_permissions_unique (role, resource, action)
    - Dados seed: tenant_admin (all), tenant_user (read-only)

14. **schema_migrations** - Versionamento de schema
    - Colunas: id, version, descricao, aplicado_em
    - Ãndices: idx_schema_migrations_version

15. **idempotency_control** - Controle de idempotÃªncia
    - Colunas: id, idempotency_key, operation_type, cached_result, criado_em
    - Ãndices: idx_idempotency_key (idempotency_key, operation_type), idx_idempotency_created_at

16. **audit_log** - Log de auditoria de operaÃ§Ãµes de negÃ³cio
    - Colunas: id, operation_type, resource, resource_id, user_id, details, status, criado_em
    - Ãndices: idx_audit_log_operation, idx_audit_log_resource, idx_audit_log_user, idx_audit_log_timestamp, idx_audit_log_status

17. **fechamentos_mensais** - Resumos de fechamento mensal do dashboard
    - Colunas: id, mes (VARCHAR(7), UNIQUE), faturamento, total_vendas, ticket_medio, visto, visto_em, criado_em
    - Ãndices: idx_fechamentos_mes (mes)

### RPCs do Schema Public

#### Provisionamento
- **provisionar_empresa(p_cnpj, p_razao_social, p_porte, p_segmento, p_modulos)** - Cria tenant completo
- **set_tenant_schema(p_user_id)** - Configura search_path para o schema do usuÃ¡rio
- **upgrade_all_tenants(p_target_version)** - Aplica migrations em todos os schemas tenant

#### GestÃ£o de Equipe (Multi-Tenant)
- **verificar_limite_usuarios(p_empresa_id)** - Valida limite de assentos baseado no plano
- **criar_usuario_tenant(p_empresa_id, p_email, p_nome, p_role)** - (OBSOLETO, delegada para API route `create/route.ts`)
- **remover_usuario_tenant(p_empresa_id, p_user_id)** - Executa soft delete (deleted_at) de um membro
- **atualizar_role_usuario_tenant(p_empresa_id, p_user_id, p_new_role)** - Promove ou rebaixa um membro

#### Dashboard
- **tenant_dashboard_kpis()** - Retorna KPIs agregados (faturamento, vendas, clientes, produtos, OS, obras em andamento, estoque baixo, saldo)
- **tenant_dashboard_kpis_por_mes(p_meses)** - Retorna sÃ©rie temporal JSONB de faturamento dos Ãºltimos N meses (faturamento, total_vendas, ticket_medio por mÃªs)
- **tenant_obter_fechamento_pendente()** - Detecta fechamento mensal pendente e retorna resumo do mÃªs anterior (faturamento, vendas, ticket mÃ©dio)
- **tenant_marcar_fechamento_visto(p_mes)** - Marca o fechamento de um mÃªs como visualizado pelo usuÃ¡rio
- **tenant_obter_sugestoes_nurturing()** - **Modelo HÃ­brido**: Detecta inatividade via tabela `vendas` OU via interaÃ§Ãµes de tipo `venda` (CRM-only).
- **tenant_obter_dre(p_data_inicio, p_data_fim)** - Motor de DRE que consolida Faturamento, CMV e Despesas Operacionais em tempo real.

### RPCs do Schema Tenant (DinÃ¢micas)

#### Listagem (todas com LIMIT padrÃ£o 1000 e SELECT explÃ­cito)
- **tenant_listar_clientes(p_limit, p_offset)** - Lista clientes
- **tenant_listar_produtos(p_limit, p_offset)** - Lista produtos
- **tenant_listar_estoque(p_limit, p_offset)** - Lista estoque
- **tenant_listar_vendas(p_limit, p_offset)** - Lista vendas
- **tenant_listar_financeiro(p_limit, p_offset)** - Lista transaÃ§Ãµes financeiras
- **tenant_listar_funcionarios(p_limit, p_offset)** - Lista funcionÃ¡rios
- **tenant_listar_ordens_servico(p_limit, p_offset)** - Lista OS
- **tenant_listar_obras(p_limit, p_offset)** - Lista obras
- **tenant_listar_comissoes(p_limit, p_offset)** - Lista comissÃµes

#### CriaÃ§Ã£o (todas com idempotÃªncia via p_idempotency_key)
- **tenant_criar_cliente(p_nome, p_telefone, p_email, p_endereco, p_funil_fase, p_status, p_idempotency_key)**
- **tenant_criar_produto(p_nome, p_descricao, p_tipo, p_preco_base, p_sku, p_qtd_inicial, p_qtd_minima, p_idempotency_key)**
- **tenant_criar_financeiro(p_tipo, p_descricao, p_valor, p_data_vencimento, p_status, p_categoria, p_idempotency_key)**
- **tenant_criar_os(p_cliente_id, p_colaborador_id, p_veiculo_equipamento, p_descricao_problema, p_status, p_valor_orcamento, p_idempotency_key)**
- **tenant_criar_obra(p_cliente_id, p_nome, p_descricao, p_endereco, p_data_inicio, p_data_fim_prevista, p_status, p_orcamento_total, p_idempotency_key)**
- **tenant_criar_interacao(p_cliente_id, p_tipo, p_titulo, p_descricao, p_data_interacao, p_duracao_minutos, p_usuario_id, p_metadata)** - Suporta tipo 'venda' para CRM-only
- **tenant_processar_venda(p_cliente_id, p_cliente_nome, p_itens, p_vendedor_id, p_metodo_pagamento, p_valor_total, p_desconto, p_emitir_nfe)** - RPC transacional que automatiza criaÃ§Ã£o de CMV e lanÃ§amento financeiro de receita.

#### ExclusÃ£o
- **tenant_excluir_cliente(p_cliente_id)**
- **tenant_excluir_produto(p_produto_id)**
- **tenant_excluir_financeiro(p_financeiro_id)**
- **tenant_excluir_os(p_os_id)**
- **tenant_excluir_obra(p_obra_id)**

---

## ðŸ—‚ï¸ ESTRUTURA DO FRONTEND (NEXT.JS)

### apps/web/src/utils/supabase/
- **client.ts** - Browser client Supabase
- **server.ts** - Server client Supabase SSR

### apps/web/src/lib/api.ts
- **Responsabilidade**: API client central para Supabase (usa RPCs - OpÃ§Ã£o A)
- **FunÃ§Ãµes implementadas**:
  - fetchVendas() â†’ supabase.rpc('tenant_listar_vendas', { p_limit: 100 })
  - fetchClientes() â†’ supabase.rpc('tenant_listar_clientes')
  - createCliente() â†’ supabase.rpc('tenant_criar_cliente')
  - deleteCliente() â†’ supabase.rpc('tenant_excluir_cliente')
  - fetchProdutos() â†’ supabase.rpc('tenant_listar_produtos')
  - createProduto() â†’ supabase.rpc('tenant_criar_produto')
  - deleteProduto() â†’ supabase.rpc('tenant_excluir_produto')
  - fetchOS() â†’ supabase.rpc('tenant_listar_ordens_servico')
  - createOS() â†’ supabase.rpc('tenant_criar_os')
  - deleteOS() â†’ supabase.rpc('tenant_excluir_os')
  - fetchObras() â†’ supabase.rpc('tenant_listar_obras')
  - createObra() â†’ supabase.rpc('tenant_criar_obra')
  - deleteObra() â†’ supabase.rpc('tenant_excluir_obra')
  - fetchEmpresa() â†’ supabase.from('empresas').select() (tabela public)
  - updateEmpresa() â†’ supabase.from('empresas').update() (tabela public)

### apps/web/src/lib/hooks/
- **use-clientes.ts** - React Query hooks para clientes
- **use-produtos.ts** - React Query hooks para produtos
- **use-vendas.ts** - React Query hooks para vendas
- **use-os.ts** - React Query hooks para OS
- **use-obras.ts** - React Query hooks para obras
- **use-dashboard.ts** - Hook para dashboard (chama tenant_dashboard_kpis)

### apps/web/src/middleware.ts
- **Responsabilidade**: Middleware Next.js para autenticaÃ§Ã£o, schema routing e feature flags
- **Funcionalidades**:
  1. Verifica env vars Supabase
  2. Valida autenticaÃ§Ã£o do usuÃ¡rio via Supabase Auth
  3. ObtÃ©m perfil do usuÃ¡rio (role, empresa_id)
  4. ConfiguraÃ§Ãµes do tenant via RPC `set_tenant_schema` (Roteamento de Schema)
  5. White-listing de mÃ³dulos core (Dashboard, ConfiguraÃ§Ãµes) para garantir acesso bÃ¡sico
  6. Valida acesso Ã  rota baseado em role
  7. Valida feature flags da empresa
  8. Redireciona conforme necessÃ¡rio

---

## ðŸ”„ FLUXO COMPLETO DA REQUISIÃ‡ÃƒO

### 1. UsuÃ¡rio Acessa Rota (ex: /tenant/crm)

### 2. Middleware Next.js Intercepta

```typescript
// apps/web/src/middleware.ts
export async function middleware(request: NextRequest) {
  // 2.1 Verifica env vars
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  
  // 2.2 Cria cliente Supabase SSR
  const supabase = createServerClient(...)
  
  // 2.3 ObtÃ©m usuÃ¡rio autenticado
  const { data: { user } } = await supabase.auth.getUser()
  
  // 2.4 Se nÃ£o autenticado, redireciona para /login
  if (!user && pathname.startsWith('/tenant')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // 2.5 ObtÃ©m perfil do usuÃ¡rio
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, empresa_id')
    .eq('user_id', user.id)
    .maybeSingle()
  
  // 2.6 Configura schema do tenant
  const { data: schema } = await supabase.rpc('set_tenant_schema', {
    p_user_id: user.id
  })
  
  // 2.7 Injeta schema no header
  supabaseResponse.headers.set('x-tenant-schema', schema || 'public')
  
  // 2.8 Valida feature flags
  const { data: modRow } = await supabase
    .from('v_empresa_modulos')
    .select('ativo')
    .eq('empresa_id', profile.empresa_id)
    .eq('modulo_key', 'crm')
    .maybeSingle()
  
  if (!modRow?.ativo) {
    return NextResponse.redirect(new URL('/tenant/sem-modulos', request.url))
  }
}
```

### 3. Componente React Carrega

```typescript
// apps/web/src/app/tenant/crm/page.tsx
export default function CRMPage() {
  // 3.1 Usa hook personalizado para buscar dados
  const { data: clientes = [], isLoading } = useClientes()
  
  // 3.2 Hook React Query chama funÃ§Ã£o API
  // useClientes() â†’ fetchClientes() â†’ supabase.rpc('tenant_listar_clientes')
}
```

### 4. Hook Personalizado Chama API

```typescript
// apps/web/src/lib/hooks/use-clientes.ts
export function useClientes() {
  return useQuery({
    queryKey: CLIENTES_KEY,
    queryFn: fetchClientes,
  })
}
```

### 5. FunÃ§Ã£o API Chama RPC do Supabase

```typescript
// apps/web/src/lib/api.ts
export async function fetchClientes() {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('tenant_listar_clientes', {
    p_limit: 1000,
    p_offset: 0
  })
  
  if (error) throw error
  return data
}
```

### 6. RPC Public Roteia para Schema Tenant

```sql
-- Schema: public
CREATE OR REPLACE FUNCTION public.tenant_listar_clientes(p_limit, p_offset)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema TEXT;
  v_result JSONB;
BEGIN
  -- 6.1 ObtÃ©m schema do tenant do usuÃ¡rio
  SELECT schema_name INTO v_tenant_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = auth.uid();
  
  -- 6.2 Executa RPC no schema do tenant
  EXECUTE format('SELECT %I.tenant_listar_clientes($1, $2)', v_tenant_schema)
  INTO v_result
  USING p_limit, p_offset;
  
  RETURN v_result;
END;
$$;
```

### 7. RPC Tenant Executa Query no Banco

```sql
-- Schema: tenant_62a495e1 (exemplo)
CREATE OR REPLACE FUNCTION tenant_listar_clientes(p_limit, p_offset)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 7.1 Executa SELECT na tabela do tenant
  SELECT jsonb_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT id, nome, telefone, email, endereco, funil_fase, status, criado_em, atualizado_em
    FROM clientes
    ORDER BY criado_em DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  
  RETURN v_result;
END;
$$;
```

### 8. Dados Retornam ao Frontend

```typescript
// Fluxo de retorno:
// PostgreSQL (tenant_62a495e1.clientes)
// â†’ RPC tenant (tenant_listar_clientes)
// â†’ RPC public (tenant_listar_clientes)
// â†’ Supabase API
// â†’ fetchClientes()
// â†’ React Query cache
// â†’ useClientes()
// â†’ Componente React
// â†’ RenderizaÃ§Ã£o na UI
```

### 9. Componente Renderiza Dados

```typescript
// apps/web/src/app/tenant/crm/page.tsx
return (
  <div>
    {clientes.map((cliente) => (
      <TableRow key={cliente.id}>
        <TableCell>{cliente.nome}</TableCell>
        <TableCell>{cliente.email}</TableCell>
        {/* ... */}
      </TableRow>
    ))}
  </div>
)
```

---

## ðŸ—ï¸ ARQUITETURA DETALHADA

### Frontend (Next.js 16.2.2)

**Estrutura de pastas:**
```
apps/web/src/
â”œâ”€â”€ app/                    # Rotas Next.js (App Router)
â”‚   â”œâ”€â”€ auth/              # Rotas de autenticaÃ§Ã£o
â”‚   â”œâ”€â”€ admin/             # Dashboard administrativo
â”‚   â”œâ”€â”€ mestre/            # Onboarding de tenants
â”‚   â”œâ”€â”€ tenant/            # Dashboard do tenant
â”‚   â”‚   â”œâ”€â”€ catalogo/      # MÃ³dulo CatÃ¡logo
â”‚   â”‚   â”œâ”€â”€ crm/           # MÃ³dulo CRM
â”‚   â”‚   â”œâ”€â”€ vendas/        # MÃ³dulo Vendas
â”‚   â”‚   â”œâ”€â”€ os/            # MÃ³dulo Ordens de ServiÃ§o
â”‚   â”‚   â”œâ”€â”€ obras/         # MÃ³dulo Obras
â”‚   â”‚   â”œâ”€â”€ financeiro/    # MÃ³dulo Financeiro
â”‚   â”‚   â”œâ”€â”€ rh/            # MÃ³dulo RH
â”‚   â”‚   â”œâ”€â”€ estoque/       # MÃ³dulo Estoque
â”‚   â”‚   â”œâ”€â”€ comissoes/     # MÃ³dulo ComissÃµes
â”‚   â”‚   â”œâ”€â”€ relatorios/    # MÃ³dulo RelatÃ³rios
â”‚   â”‚   â””â”€â”€ configuracoes/ # MÃ³dulo ConfiguraÃ§Ãµes
â”‚   â”œâ”€â”€ layout.tsx         # Layout raiz
â”‚   â””â”€â”€ page.tsx           # Landing page
â”œâ”€â”€ components/            # Componentes React
â”‚   â”œâ”€â”€ layout/           # Layouts globais
â”‚   â”œâ”€â”€ modules/          # Componentes de mÃ³dulos
â”‚   â”‚   â””â”€â”€ base/         # Componentes reutilizÃ¡veis
â”‚   â”‚       â”œâ”€â”€ KPICard.tsx
â”‚   â”‚       â”œâ”€â”€ StatusBadge.tsx
â”‚   â”‚       â”œâ”€â”€ Calculator.tsx
â”‚   â”‚       â”œâ”€â”€ Calendar.tsx
â”‚   â”‚       â”œâ”€â”€ GlobalSearch.tsx
â”‚   â”‚       â””â”€â”€ ActionCard.tsx
â”‚   â””â”€â”€ ui/               # Componentes shadcn/ui
â”‚       â”œâ”€â”€ Modal.tsx
â”‚       â”œâ”€â”€ Table.tsx
â”‚       â”œâ”€â”€ Toast.tsx
â”‚       â””â”€â”€ ConfirmModal.tsx
â”œâ”€â”€ lib/                  # LÃ³gica compartilhada
â”‚   â”œâ”€â”€ api.ts            # Interfaces TypeScript
â”‚   â”œâ”€â”€ hooks/            # Hooks React Query
â”‚   â””â”€â”€ utils/            # UtilitÃ¡rios
â””â”€â”€ utils/                # UtilitÃ¡rios do Supabase
    â”œâ”€â”€ client.ts         # Client browser
    â””â”€â”€ server.ts         # Client SSR
```

**ComponentizaÃ§Ã£o:**
- **KPICard:** Card para exibir KPIs (faturamento, vendas, etc.)
- **StatusBadge:** Badge colorido para status (aberta, concluida, etc.)
- **Calculator:** Calculadora flutuante global
- **Calendar:** Componente de calendÃ¡rio reutilizÃ¡vel
- **GlobalSearch:** Busca global em todo o sistema
- **ActionCard:** Card com aÃ§Ã£o principal
- **Modal:** Modal genÃ©rico
- **Table:** Tabela estilizada
- **Toast:** NotificaÃ§Ãµes toast
- **ConfirmModal:** Modal de confirmaÃ§Ã£o

**Hooks Personalizados:**
- **use-clientes:** CRUD de clientes
- **use-produtos:** CRUD de produtos
- **use-vendas:** CRUD de vendas
- **use-os:** CRUD de ordens de serviÃ§o
- **use-obras:** CRUD de obras
- **use-funcionarios:** CRUD de funcionÃ¡rios
- **use-financeiro:** CRUD de transaÃ§Ãµes financeiras
- **use-dashboard:** KPIs do dashboard
- **use-email:** Envio de e-mails via Resend
- **use-team:** GestÃ£o de equipe e mÃ³dulos permitidos
- **use-sidebar-data:** Estrutura e filtragem da navegaÃ§Ã£o lateral

**Interfaces TypeScript:**
```typescript
// apps/web/src/lib/api.ts
export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface ClienteCreate {
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

export interface ClienteUpdate {
  nome?: string;
  telefone?: string;
  email?: string;
}
```

---

## ðŸ—„ï¸ BANCO DE DADOS DETALHADO

### Estrutura de Schemas

**Schema `public` (Global):**
- `empresas` - Empresas/tenants
- `modulos_catalogo` - CatÃ¡logo de mÃ³dulos
- `empresa_modulos` - MÃ³dulos ativos por empresa
- `user_profiles` - Perfis de usuÃ¡rios
- `logs_provisionamento` - Logs de provisionamento
- `v_empresa_modulos` - View para mÃ³dulos ativos

**Schema `tenant_*` (Por empresa):**
- `clientes` - Clientes/CRM
- `produtos` - Produtos/Estoque
- `estoque` - MovimentaÃ§Ã£o de estoque
- `vendas` - Vendas
- `vendas_itens` - Itens de venda
- `financeiro` - TransaÃ§Ãµes financeiras
- `funcionarios` - FuncionÃ¡rios/RH
- `ordens_servico` - Ordens de ServiÃ§o
- `ordens_servico_historico` - HistÃ³rico de OS
- `obras` - Obras/Projetos
- `configuracoes` - ConfiguraÃ§Ãµes do tenant
- `role_permissions` - PermissÃµes por role
- `schema_migrations` - Versionamento de schema
- `idempotency_control` - Controle de idempotÃªncia
- `audit_log` - Log de auditoria

### Relacionamentos

**Clientes:**
- `vendas.cliente_id` â†’ `clientes.id`
- `ordens_servico.cliente_id` â†’ `clientes.id`
- `obras.cliente_id` â†’ `clientes.id`

**Produtos:**
- `vendas_itens.produto_id` â†’ `produtos.id`
- `estoque.produto_id` â†’ `produtos.id`

**Vendas:**
- `vendas_itens.venda_id` â†’ `vendas.id`
- `financeiro.venda_id` â†’ `vendas.id` (opcional)

**FuncionÃ¡rios:**
- `ordens_servico.colaborador_id` â†’ `funcionarios.id`

### Ãndices Principais

**Clientes:**
- `idx_clientes_telefone` (telefone)
- `idx_clientes_status` (status)
- `idx_clientes_funil_fase` (funil_fase)

**Produtos:**
- `idx_produtos_preco_base` (preco_base)
- `idx_produtos_sku` (sku)
- `idx_produtos_tipo` (tipo)

**Vendas:**
- `idx_vendas_valor_total` (valor_total)
- `idx_vendas_cliente` (cliente_id)
- `idx_vendas_status" (status)
- `idx_vendas_criado_em` (criado_em)

---

## ðŸ” SEGURANÃ‡A E AUTENTICAÃ‡ÃƒO

### Supabase Auth

**ConfiguraÃ§Ã£o:**
- Email/password authentication
- JWT tokens para sessÃµes
- Row Level Security (RLS) implementado
- Service role para operaÃ§Ãµes administrativas

**Middleware de SeguranÃ§a:**
```typescript
// apps/web/src/middleware.ts
// 1. Valida autenticaÃ§Ã£o em todas as rotas protegidas
if (!user && pathname.startsWith('/tenant')) {
  return NextResponse.redirect(new URL('/login', request.url))
}

// 2. Valida perfil do usuÃ¡rio
if (!profile) {
  return NextResponse.redirect(new URL('/login', request.url))
}

// 3. Valida role (master vs tenant)
if (isMaster && pathname.startsWith('/tenant')) {
  return NextResponse.redirect(new URL('/admin', request.url))
}

// 4. Valida feature flags
if (!modRow?.ativo) {
  return NextResponse.redirect(new URL('/tenant/sem-modulos', request.url))
}
```

### Schema Routing

**RPC set_tenant_schema:**
```sql
CREATE OR REPLACE FUNCTION public.set_tenant_schema(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema TEXT;
BEGIN
  SELECT e.schema_name INTO v_schema
  FROM public.user_profiles up
  JOIN public.empresas e ON e.id = up.empresa_id
  WHERE up.user_id = p_user_id;
  
  -- Configura search_path para o schema do tenant
  PERFORM set_config('search_path', v_schema || ', public', false);
  
  RETURN v_schema;
END;
$$;
```

### Row Level Security (RLS)

**PolÃ­ticas por schema:**
- RLS habilitado em todas as tabelas de tenant
- PolÃ­ticas permissivas (`USING (true)`) pois isolamento Ã© por schema routing
- Schema routing garante que cada requisiÃ§Ã£o acessa apenas o schema correto

### Roles e PermissÃµes

**Roles globais:**
- `master`: Acesso total ao sistema, pode criar tenants
- `tenant_admin`: Acesso administrativo do tenant
- `tenant_user`: Acesso restrito aos mÃ³dulos habilitados

**RBAC intra-tenant:**
- Tabela `role_permissions` define permissÃµes por role
- PadrÃ£o: `tenant_admin` tem todas as permissÃµes, `tenant_user` tem apenas leitura

---

## ðŸ“Š RESPONSABILIDADE DE CADA MÃ“DULO

### Dashboard
- **Responsabilidade:** VisÃ£o geral do negÃ³cio
- **KPIs:** Faturamento, vendas, clientes, produtos, OS pendentes, estoque baixo, saldo
- **GrÃ¡ficos:** Vendas por perÃ­odo, receitas vs despesas
- **AÃ§Ãµes:** Acesso rÃ¡pido a mÃ³dulos

### CRM (Clientes)
- **Responsabilidade:** GestÃ£o de clientes e funil de vendas
- **Funcionalidades:** CRUD clientes, funil de vendas, histÃ³rico
- **IntegraÃ§Ãµes:** Vendas, OS, Obras

### Vendas
- **Responsabilidade:** GestÃ£o de vendas e PDV
- **Funcionalidades:** PDV, gestÃ£o de vendas, relatÃ³rios
- **IntegraÃ§Ãµes:** Clientes, Produtos, Financeiro

### CatÃ¡logo (Produtos)
- **Responsabilidade:** GestÃ£o de catÃ¡logo de produtos
- **Funcionalidades:** CRUD produtos, controle de preÃ§os
- **IntegraÃ§Ãµes:** Vendas, Estoque

### Estoque
- **Responsabilidade:** Controle de estoque
- **Funcionalidades:** MovimentaÃ§Ã£o, alertas de estoque baixo
- **IntegraÃ§Ãµes:** Produtos, Vendas

### OS (Ordens de ServiÃ§o)
- **Responsabilidade:** GestÃ£o de ordens de serviÃ§o
- **Funcionalidades:** CRUD OS, status, calendÃ¡rio
- **IntegraÃ§Ãµes:** Clientes, FuncionÃ¡rios, Financeiro

### Obras
- **Responsabilidade:** GestÃ£o de projetos/obras
- **Funcionalidades:** CRUD obras, status, calendÃ¡rio
- **IntegraÃ§Ãµes:** Clientes, Financeiro

### Financeiro
- **Responsabilidade:** GestÃ£o financeira
- **Funcionalidades:** TransaÃ§Ãµes, fluxo de caixa, relatÃ³rios
- **IntegraÃ§Ãµes:** Vendas, OS, Obras

### RH
- **Responsabilidade:** GestÃ£o de funcionÃ¡rios
- **Funcionalidades:** CRUD funcionÃ¡rios, gestÃ£o de equipe
- **IntegraÃ§Ãµes:** OS, Obras, ComissÃµes

### ComissÃµes
- **Responsabilidade:** CÃ¡lculo de comissÃµes
- **Funcionalidades:** Regras de comissÃ£o, cÃ¡lculo automÃ¡tico
- **IntegraÃ§Ãµes:** Vendas, RH

### RelatÃ³rios
- **Responsabilidade:** VisÃ£o analÃ­tica avanÃ§ada sobre a operaÃ§Ã£o do tenant.
- **Funcionalidades:** RelatÃ³rios AnalÃ­ticos de Vendas, Performance de Equipe e **DRE Real**.
- **DRE (Demonstrativo de Resultados):** Consolida Faturamento Bruto, CMV (Custo de Mercadoria), Lucro Bruto, Despesas e Lucro LÃ­quido com cÃ¡lculo de margens automÃ¡ticas.
- **IntegraÃ§Ãµes:** Todos os mÃ³dulos, com foco em Vendas e Financeiro.

### ConciliaÃ§Ã£o BancÃ¡ria (MÃ³dulo Financeiro)
- **Responsabilidade:** Auditoria e batimento de saldos reais vs sistema.
- **Engine de Parse:** `ofx-parser.ts` (interpretador nativo para arquivos OFX).
- **Auto-matching:** Algoritmo que associa transaÃ§Ãµes bancÃ¡rias a lanÃ§amentos financeiros baseado em valor (margem 0.01) e data.
- **Rastreabilidade:** GravaÃ§Ã£o de IDs de transaÃ§Ã£o bancÃ¡ria em cada lanÃ§amento conciliado.

### ConfiguraÃ§Ãµes
- **Responsabilidade:** ConfiguraÃ§Ãµes do tenant
- **Funcionalidades:** ConfiguraÃ§Ãµes de mÃ³dulos, empresa
- **IntegraÃ§Ãµes:** Sistema global

---

## ðŸš€ DEPLOYMENT E CI/CD

> [!IMPORTANT]
> Todas as informaÃ§Ãµes de infraestrutura de deploy, histÃ³rico de incidentes e protocolos de atualizaÃ§Ã£o foram migrados para o documento mestre:
> **[docs/PLANO_PREVENCAO_DEPLOY.md](file:///c:/Users/VMORAES1/Documents/fluxoprod/docs/PLANO_PREVENCAO_DEPLOY.md)**
>
> Siga o walkthrough lÃ¡ descrito antes de qualquer alteraÃ§Ã£o estrutural no pipeline.

---

## ðŸ” SEGURANÃ‡A E GOVERNANÃ‡A

### Schema Routing (IMPLEMENTADO)
- **RPC**: `set_tenant_schema(p_user_id)` no schema public
- **Middleware**: Chama a RPC em cada request autenticada
- **Resultado**: search_path configurado para o schema do tenant
- **Header**: x-tenant-schema injetado no response

### RLS (Row Level Security)
- **EstratÃ©gia**: OPÃ‡ÃƒO A - Isolamento por schema routing
- **Policies**: Permissivas (USING (true)) pois isolamento Ã© por schema
- **Justificativa**: RLS real seria redundante com schema routing
- **DocumentaÃ§Ã£o**: ComentÃ¡rios inline em supabase_rpc.sql explicando a decisÃ£o

### RBAC Intra-Tenant (IMPLEMENTADO)
- **Tabela**: role_permissions no schema tenant
- **Roles padrÃ£o**:
  - tenant_admin: todas as permissÃµes (all)
  - tenant_user: apenas leitura (read)
- **PermissÃµes**: resource (clientes, produtos, vendas, etc) + action (create, read, update, delete)
- **RLS**: Policies em role_permissions para proteger permissÃµes

### IdempotÃªncia (IMPLEMENTADA)
- **Tabela**: idempotency_control no schema tenant
- **ParÃ¢metro**: p_idempotency_key em todas as RPCs de escrita
- **LÃ³gica**:
  1. Verifica se idempotency_key existe para operation_type
  2. Se existe, retorna resultado cacheado
  3. Se nÃ£o existe, executa operaÃ§Ã£o, cacheia resultado, retorna
- **BenefÃ­cio**: Reenvios de formulÃ¡rio nÃ£o criam duplicatas

### Versionamento de Schema (IMPLEMENTADO)
- **Tabela**: schema_migrations no schema tenant
- **Colunas**: version, descricao, aplicado_em
- **FunÃ§Ã£o**: upgrade_all_tenants(p_target_version) no schema public
- **LÃ³gica**: Aplica migrations sequencialmente em todos os schemas tenant

### Audit Log (IMPLEMENTADO)
- **Tabela**: audit_log no schema tenant
- **Colunas**: operation_type, resource, resource_id, user_id, details, status, criado_em
- **Ãndices**: operation_type, resource, user, timestamp, status
- **Uso**: Rastrear operaÃ§Ãµes de negÃ³cio para compliance e debugging

---

## ðŸ”„ FLUXOS DE DADOS

### Fluxo 1: Login e Schema Routing
1. UsuÃ¡rio entra email/senha em login/page.tsx
2. Supabase Auth autentica via signInWithPassword()
3. Frontend busca user_profiles.role
4. Redirect: master â†’ /admin, tenant â†’ /tenant/dashboard
5. Middleware intercepta request
6. Middleware busca user_profiles.role, empresa_id
7. Middleware chama set_tenant_schema(p_user_id)
8. search_path configurado para o schema do tenant
9. Feature flags validadas via v_empresa_modulos
10. Request prossegue com schema correto

### Fluxo 2: Provisionamento de Tenant
1. Wizard mestre/page.tsx coleta dados da empresa
2. Gera schema_name baseado no CNPJ
3. Chama RPC provisionar_empresa_master()
4. RPC cria schema, tabelas, Ã­ndices, RLS, policies
5. RPC insere dados seed (role_permissions, schema_migrations)
6. RPC ativa mÃ³dulos em empresa_modulos
7. Log em logs_provisionamento

### Fluxo 3: CriaÃ§Ã£o de Venda (PDV) - TRANSACIONAL
1. PDV carrega produtos via tenant_listar_estoque()
2. UsuÃ¡rio adiciona itens ao carrinho
3. UsuÃ¡rio finaliza pagamento
4. Frontend chama RPC tenant_processar_venda()
5. RPC verifica idempotency_key
6. RPC busca ou cria cliente dentro da transaÃ§Ã£o
7. RPC insere venda
8. RPC insere itens de venda
9. RPC atualiza estoque (decremento atÃ´mico)
10. RPC calcula comissÃ£o se vendedor selecionado
11. RPC registra em audit_log
12. Tudo em uma transaÃ§Ã£o atÃ´mica SQL
13. Frontend recebe resultado e atualiza UI

### Fluxo 4: Feature Flags e NavegaÃ§Ã£o
1. Sidebar carrega ao montar
2. ObtÃ©m usuÃ¡rio autenticado
3. Busca profile com role e empresa_id
4. Busca nome da empresa
5. Busca mÃ³dulos ativos em v_empresa_modulos
6. Filtra navegaÃ§Ã£o baseado em mÃ³dulos ativos
7. Renderiza apenas links de mÃ³dulos ativos

### Fluxo 5: Dashboard
1. Dashboard chama useDashboardData()
2. Hook chama RPC tenant_dashboard_kpis()
3. RPC calcula KPIs agregados no SQL
4. Hook chama RPC tenant_listar_vendas({ p_limit: 5 })
5. Frontend recebe dados e renderiza

---

## ðŸ“Š ÃNDICES IMPLEMENTADOS

### Schema Public
- idx_empresas_cnpj (cnpj)
- idx_empresas_schema_name (schema_name)
- idx_empresa_modulos_empresa_modulo (empresa_id, modulo_key)
- idx_user_profiles_user_id (user_id)
- idx_user_profiles_empresa_id (empresa_id)

### Schema Tenant
- idx_clientes_telefone (telefone)
- idx_clientes_status (status)
- idx_clientes_funil_fase (funil_fase)
- idx_produtos_preco_base (preco_base)
- idx_produtos_sku (sku)
- idx_produtos_tipo (tipo)
- idx_estoque_produto (produto_id)
- idx_estoque_criado_em (criado_em)
- idx_vendas_valor_total (valor_total)
- idx_vendas_cliente (cliente_id)
- idx_vendas_status (status)
- idx_vendas_criado_em (criado_em)
- idx_financeiro_tipo (tipo)
- idx_financeiro_status (status)
- idx_financeiro_criado_em (criado_em)
- idx_funcionarios_cargo (cargo)
- idx_funcionarios_status (status)
- idx_os_numero (numero)
- idx_os_cliente (cliente_id)
- idx_os_status (status)
- idx_os_criado_em (criado_em)
- idx_obras_cliente (cliente_id)
- idx_obras_status (status)
- idx_obras_criado_em (criado_em)
- idx_configuracoes_chave (chave)
- idx_role_permissions_unique (role, resource, action)
- idx_schema_migrations_version (version)
- idx_idempotency_key (idempotency_key, operation_type)
- idx_idempotency_created_at (criado_em)
- idx_audit_log_operation (operation_type)
- idx_audit_log_resource (resource)
- idx_audit_log_user (user_id)
- idx_audit_log_timestamp (criado_em)
- idx_audit_log_status (status)

---

## âš ï¸ PROBLEMAS IDENTIFICADOS NAS AUDITORIAS 9-12

### Auditoria 9 - Alinhamento Frontend â‡„ Ãndices SQL
**Severidade**: MÃ‰DIA
**Problemas**:
1. ORDER BY criado_em sem Ã­ndice em mÃºltiplas tabelas (vendas, financeiro, OS, obras)
2. ORDER BY nome sem Ã­ndice em produtos e funcionarios
3. **CRÃTICO**: PDV acessa tabela produtos diretamente em vez de usar RPC tenant_listar_estoque

**RecomendaÃ§Ãµes**:
1. IMEDIATO: Corrigir PDV para usar RPC
2. CURTO PRAZO: Adicionar Ã­ndices em criado_em para tabelas de alta volumetria
3. MÃ‰DIO PRAZO: Adicionar Ã­ndices em nome para produtos e funcionarios

### Auditoria 10 - Fluxo de Login, Role e Tenant
**Severidade**: BAIXA
**Problemas**: NENHUM - fluxo estÃ¡ robusto
**Status**: Schema routing, feature flags e validaÃ§Ã£o de role estÃ£o bem implementados

### Auditoria 11 - MÃ³dulos, Feature Flags e NavegaÃ§Ã£o
**Severidade**: BAIXA
**Problemas**:
1. MÃ³dulo "relatorios" nÃ£o existe em modulos_catalogo mas existe na sidebar
**RecomendaÃ§Ã£o**: Adicionar "relatorios" em modulos_catalogo ou remover da sidebar

### Auditoria 12 - BotÃµes, AÃ§Ãµes e Chamadas RPC
**Severidade**: CRÃTICA
**Problemas**:
1. **CRÃTICO**: PDV acessa tabela produtos diretamente (violaÃ§Ã£o OpÃ§Ã£o A)
2. **MÃ‰DIA**: OS e PDV acessam tabela funcionarios diretamente
3. **BAIXA**: BotÃµes de ediÃ§Ã£o sem handler onClick em vÃ¡rias pÃ¡ginas

**RecomendaÃ§Ãµes**:
1. IMEDIATO: Corrigir PDV para usar RPCs
2. CURTO PRAZO: Criar RPC para funcionarios ou usar existente
3. BAIXA PRIORIDADE: Implementar handlers para botÃµes de ediÃ§Ã£o ou removÃª-los

---

## ðŸ“‹ MELHORIAS FUTURAS OBRIGATÃ“RIAS

Documento detalhado em MELHORIAS_FUTURAS.md:

1. ModularizaÃ§Ã£o da funÃ§Ã£o provisionar_empresa (CURTO PRAZO)
2. AutomaÃ§Ã£o de VACUUM / ANALYZE para schemas tenant (MÃ‰DIO PRAZO)
3. Versionamento explÃ­cito de contratos de RPC (MÃ‰DIO PRAZO)
4. MÃ©tricas e observabilidade avanÃ§ada de negÃ³cio (CURTO PRAZO)
5. PadronizaÃ§Ã£o de paginaÃ§Ã£o avanÃ§ada (cursor-based) (LONGO PRAZO)
6. EstratÃ©gia de rollout seguro de mudanÃ§as estruturais (CURTO PRAZO)
7. Suite de Testes Automatizados (Vitest/Playwright) (PRIORIDADE ALTA)
8. Rate Limiting no Middleware Next.js (PRIORIDADE ALTA)

---

## ðŸš€ BOAS PRÃTICAS DE DEPLOY E BUILD (20/04/2026)

### ConfiguraÃ§Ã£o Netlify

**Arquivo Ãšnico de ConfiguraÃ§Ã£o:**
- Manter apenas UM arquivo `netlify.toml` na raiz do projeto
- NÃƒO criar arquivo `netlify.toml` em subdiretÃ³rios (ex: `apps/web/`)
- Conflito de arquivos causa falha no deploy automÃ¡tico

**ConfiguraÃ§Ã£o Correta (raiz/netlify.toml):**
```toml
[build]
  base = "apps/web"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "22.0.0"
  NPM_VERSION = "10.9.0"
  NEXT_TELEMETRY_DISABLED = "1"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Workflow GitHub Actions:**
- Localizado em `.github/workflows/deploy-netlify.yml`
- Requer secrets configuradas no GitHub:
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`
- Build command: `npm run build` em `apps/web`

### PrevenÃ§Ã£o de Erros de Build TypeScript

**SincronizaÃ§Ã£o de Interfaces:**
- Manter interfaces TypeScript em `apps/web/src/lib/api.ts` sempre sincronizadas com o cÃ³digo de uso
- Quando adicionar campos em componentes, atualizar interfaces correspondentes
- Exemplo: `ProdutoUpdate` deve ter todos os campos usados em forms de ediÃ§Ã£o

**Erros Comuns e SoluÃ§Ãµes:**

1. **Campo ausente em interface:**
   - Erro: `Property 'X' does not exist on type 'YUpdate'`
   - SoluÃ§Ã£o: Adicionar campo Ã  interface em `api.ts`

2. **Acesso incorreto a tipos compostos:**
   - Erro: `Property 'map' does not exist on type 'ClienteListResult'`
   - SoluÃ§Ã£o: Usar `clientes?.data?.map()` em vez de `clientes?.map()`
   - `ClienteListResult` has structure `{ data: Cliente[], next_cursor? }`

3. **Nome de campo incorreto:**
   - Erro: `Property 'data_prevista' does not exist on type 'ObraEtapa'`
   - SoluÃ§Ã£o: Verificar nome correto na interface (ex: `data_fim_prevista`)

**Checklist PrÃ©-Deploy:**
1. Executar `npm run build` localmente
2. Corrigir todos os erros de TypeScript
3. Verificar se hÃ¡ apenas um arquivo `netlify.toml` (na raiz)
4. Confirmar que secrets do GitHub estÃ£o configuradas
5. Fazer commit e push para branch `main`

---

## ðŸš€ IMPLEMENTAÃ‡Ã•ES RECENTES (18/04/2026)

### MÃ³dulo Estoque - ExpansÃ£o Completa
- **Alertas de Estoque**: Sistema completo de alertas com verificaÃ§Ã£o automÃ¡tica e resoluÃ§Ã£o
  - RPCs: `tenant_verificar_alertas_estoque`, `tenant_resolver_alerta_estoque`, `tenant_listar_alertas_estoque`
  - Componente: `AlertasEstoquePanel` com filtros e aÃ§Ãµes
  - Wrappers pÃºblicos criados para resolver erro 404

- **Kits de Produtos**: GestÃ£o de agrupamentos de produtos
  - RPCs: `tenant_criar_kit`, `tenant_listar_kits`, `tenant_atualizar_kit`, `tenant_remover_kit`
  - Componente: `KitsManager` com CRUD completo
  - IntegraÃ§Ã£o com movimentaÃ§Ã£o de estoque

- **TransferÃªncias entre Locais**: MovimentaÃ§Ã£o de estoque
  - RPCs: `tenant_criar_transferencia`, `tenant_listar_transferencias`, `tenant_concluir_transferencia`
  - Componente: `TransferenciasManager` com status tracking
  - ValidaÃ§Ã£o de disponibilidade e histÃ³rico

- **ValoraÃ§Ã£o de Estoque**: MÃºltiplos mÃ©todos de cÃ¡lculo
  - RPCs: `tenant_calcular_valor_estoque`, `tenant_listar_locais_estoque`
  - Componente: `ValorizacaoDashboard` com grÃ¡ficos e mÃ©tricas
  - MÃ©todos: FIFO, MÃ©dio, Custo

- **PrevisÃ£o de Demanda**: AnÃ¡lise preditiva baseada em histÃ³rico
  - RPCs: `tenant_gerar_previsao_demanda`, `tenant_listar_previsoes_demanda`, `tenant_atualizar_demanda_real`
  - Componente: `PrevisaoDemandaPanel` com geraÃ§Ã£o e atualizaÃ§Ã£o
  - Algoritmo baseado em mÃ©dia mÃ³vel

- **Scanner de CÃ³digos de Barras**: IntegraÃ§Ã£o mobile
  - Biblioteca: `html5-qrcode` instalada
  - Componente: `BarcodeScanner` com cÃ¢mera e QR code
  - Busca automÃ¡tica de produtos por cÃ³digo

### MÃ³dulo Obras - GestÃ£o AvanÃ§ada
- **Etapas de Obras**: Timeline completo com progresso
  - RPCs: `tenant_obras_etapas`, `tenant_atualizar_etapa`
  - Componente: `EtapasTimeline` com status visual
  - CÃ¡lculo automÃ¡tico de progresso fÃ­sico

- **Financeiro de Obras**: Custos previstos vs realizados
  - RPCs: `tenant_obras_financeiro`, `tenant_adicionar_custo`
  - Componente: `FinanceiroDashboard" com grÃ¡ficos comparativos
  - MÃ©tricas de ROI e desvios

- **Recursos de Obras**: GestÃ£o de materiais e mÃ£o de obra
  - RPCs: `tenant_obras_recursos`, `tenant_alocar_recurso`
  - Componente: `RecursosTabela` com alocaÃ§Ã£o e consumo
  - IntegraÃ§Ã£o futura com estoque

- **Documentos de Obras**: GestÃ£o de arquivos e anexos
  - RPCs: `tenant_obras_documentos`, `tenant_uploads_documento`
  - Componente: `DocumentosGaleria` com visualizaÃ§Ã£o
  - IntegraÃ§Ã£o com Supabase Storage

### CorreÃ§Ãµes CrÃ­ticas Aplicadas
- **Wrappers PÃºblicos RPC**: Resolvido erro 404 em mÃºltiplas RPCs
  - Causa: Wrappers iniciais usavam `current_setting('search_path')` invÃ¡lido
  - SoluÃ§Ã£o: Novos wrappers chamam `set_tenant_schema()` antes de cada RPC
  - Arquivos: `WRAPPERS_PUBLIC_FIX_SQL.sql`, `WRAPPERS_ALERTAS_SQL.sql`

- **Hydration Error**: Corrigido erro em FloatingParticles
  - Causa: `Math.random()` gerava valores diferentes no servidor vs cliente
  - SoluÃ§Ã£o: `useState` + `useEffect` para gerar valores apenas no cliente

- **TypeScript Safety**: Adicionadas verificaÃ§Ãµes null/undefined
  - Componente: `PrevisaoDemandaPanel` com `Array.isArray()` e validaÃ§Ãµes
  - PrevenÃ§Ã£o de erros de runtime em `.map()` e propriedades opcionais

## ðŸ“§ VALIDAÃ‡ÃƒO E VERIFICAÃ‡ÃƒO DE E-MAIL (27/04/2026)

### EstratÃ©gia de HigienizaÃ§Ã£o de Base
Para garantir que os novos usuÃ¡rios utilizem e-mails reais e operÃ¡veis (Gmail, Outlook, domÃ­nios corporativos), o sistema agora impÃµe:

1. **Bloqueio de DomÃ­nios FictÃ­cios (Client & Server side)**:
   - Implementado no Checkout (`apps/web/src/app/(auth)/checkout/page.tsx`) e na API de SessÃ£o (`apps/web/src/app/api/checkout/session/route.ts`).
   - Bloqueio explÃ­cito de domÃ­nios como `mailinator.com`, `tempmail.com`, `fake.com`, `teste.com`, `ficticio.com`, etc.
   - ValidaÃ§Ã£o de Regex RFC 5322 para garantir integridade sintÃ¡tica.

2. **Fluxo de ConfirmaÃ§Ã£o de E-mail (Supabase Auth)**:
   - O sistema agora forÃ§a a confirmaÃ§Ã£o de e-mail ao criar o usuÃ¡rio no webhook de pagamento (`email_confirm: false`).
   - O Supabase envia automaticamente um link de verificaÃ§Ã£o para o e-mail real fornecido no checkout.
   - O login na plataforma Ã© bloqueado atÃ© que o usuÃ¡rio clique no link de confirmaÃ§Ã£o.
   - A pÃ¡gina de login fornece feedback especÃ­fico caso o e-mail ainda nÃ£o tenha sido validado.

3. **Rastreabilidade**:
   - Todo e-mail utilizado em tentativas de checkout Ã© registrado em `public.checkout_vendas` para auditoria de comportamento e prevenÃ§Ã£o de spam.
   - O webhook realiza uma verificaÃ§Ã£o prÃ©via de duplicidade e higienizaÃ§Ã£o de domÃ­nios antes de tentar criar a conta.

---

## ðŸ“§ INTEGRAÃ‡ÃƒO RESEND (BOAS-VINDAS)

### Fluxo de Mensageria
O sistema utiliza o **Resend** para disparar e-mails transacionais de boas-vindas:

1.  **Checkout**: ApÃ³s a confirmaÃ§Ã£o de pagamento e provisionamento do tenant, o webhook dispara um e-mail para o novo cliente.
2.  **Painel Master**: Ao provisionar uma empresa manualmente via `/mestre`, o administrador master pode informar o e-mail do cliente para envio automÃ¡tico das boas-vindas.

### ImplementaÃ§Ã£o TÃ©cnica
*   **Utility**: `apps/web/src/lib/email.ts` (Utiliza `fetch` nativo para compatibilidade).
*   **Endpoint**: `/api/mestre/welcome` (Proxy para componentes client).
*   **Template**: HTML responsivo com branding Fluxoprod.

---

## ðŸŽ¯ RESUMO EXECUTIVO

### Estado Atual
O sistema FLUXO ERP estÃ¡ **PRODUCTION-READY** apÃ³s implementaÃ§Ãµes completas dos mÃ³dulos Estoque e Obras. A arquitetura OpÃ§Ã£o A (Supabase como backend real e fonte da verdade) estÃ¡ totalmente implementada com schema routing, wrappers pÃºblicos corrigidos, e funcionalidades avanÃ§adas de gestÃ£o.

### Riscos Principais
1. **VIOLAÃ‡ÃƒO CRÃTICA em PDV**: Acesso direto Ã  tabela produtos em vez de RPC (Auditoria 12)
2. **MÃ‰DIA**: ORDER BY criado_em sem Ã­ndice em tabelas de alta volumetria (Auditoria 9)
3. **BAIXA**: MÃ³dulo "relatorios" inconsistente (Auditoria 11)

### RecomendaÃ§Ã£o
**DEPLOYAR EM PRODUÃ‡ÃƒO** apÃ³s correÃ§Ã£o imediata do PDV (substituir acesso direto por RPC). As demais correÃ§Ãµes podem ser feitas post-deploy no ritmo correto.

### EsforÃ§o Estimado
- CorreÃ§Ã£o imediata (PDV): 1-2 horas
- Melhorias futuras: 8 semanas (conforme MELHORIAS_FUTURAS.md)

---
