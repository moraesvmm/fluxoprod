# Estudo: fechamento diario de caixa e vendas por data

## Objetivo

Permitir que o operador veja primeiro as vendas do dia operacional corrente e conclua o caixa do dia com valores por forma de pagamento, diferencas informadas e uma fotografia auditavel do resultado.

## Diagnostico do estado atual

1. A tela de vendas usa `tenant_listar_vendas`, que ordena por `criado_em DESC`. A tela e o recibo tambem exibem `criado_em`.
2. A interface `Venda` ja admite `data_venda`, mas a RPC de listagem publica nao devolve esse campo.
3. A tabela base `vendas` criada pelo provisionamento possui `criado_em`, mas nao possui `data_venda`; portanto, uma venda lancada posteriormente para o dia anterior nao pode aparecer no dia contabil correto.
4. Existe `financeiro`, mas ele representa contas a pagar/receber e nao identifica caixa, sessao, forma de recebimento realizada ou estorno vinculado a uma venda.
5. Cancelar uma venda hoje recompoe o estoque, mas o fluxo nao garante um movimento financeiro compensatorio. Fechar o caixa somando apenas `vendas` levaria a divergencias quando houver cancelamento, devolucao ou ajuste.
6. Algumas migracoes legadas atualizam apenas schemas existentes. A nova funcionalidade deve usar o padrao atual de hook registrado, para que tenants novos tenham o mesmo schema e as mesmas RPCs.

## Decisoes de dominio recomendadas

### Data operacional

Adicionar `vendas.data_venda DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date`.

- `data_venda` e a data contabil/operacional, usada para filtros, relatorios e fechamento.
- `criado_em` permanece como instante tecnico de auditoria e ordenacao secundaria.
- O PDV deve preencher `data_venda` com a data local da empresa. Por padrao, a RPC usa a data de Sao Paulo ate existir uma configuracao de fuso horario por empresa.
- Para a listagem mais recente, ordenar por `data_venda DESC, criado_em DESC, id DESC`.
- A tela deve abrir em "Hoje", exibir a data operacional no filtro e permitir alternar para "Todas" ou escolher uma data. O filtro nao deve depender apenas do horario UTC do navegador.

### Caixa diario

Usar `locais_estoque` como cadastro de filial, pois ele ja possui os tipos `filial` e `loja`. Cada caixa pertence obrigatoriamente a uma filial; nao usar texto livre para representar a filial.

Modelar caixa como quatro entidades separadas:

| Entidade | Responsabilidade |
| --- | --- |
| `usuarios_filiais` | Lotacao e permissao do usuario em cada filial. |
| `caixas` | Terminal de caixa vinculado a uma unica filial. |
| `caixa_movimentos` | Livro imutavel de entradas, saidas, estornos e ajustes, com origem rastreavel. |
| `fechamentos_caixa` | Snapshot final por data operacional e caixa, incluindo total esperado, contado, diferenca e responsavel. |

Campos propostos para `usuarios_filiais`:

- `user_id UUID`, `filial_id UUID REFERENCES locais_estoque(id)`, `papel` (`operador`, `supervisor`, `gerente`), `ativo`, `criado_em`;
- chave primaria em `(user_id, filial_id)`;
- o perfil `admin` da empresa pode acessar todas as filiais; os demais somente as linhas ativas desta tabela.

Campos propostos para `caixas`:

- `id UUID`, `filial_id UUID NOT NULL REFERENCES locais_estoque(id)`, `codigo TEXT`, `nome TEXT`, `ativo`, `criado_em`;
- unicidade em `(filial_id, codigo)`;
- o caixa inicial `principal` deve ser criado para cada filial ativa.

Campos propostos para `caixa_movimentos`:

- `id UUID`, `caixa_id UUID NOT NULL REFERENCES caixas(id)`, `data_operacional DATE`, `tipo` (`entrada`, `saida`, `estorno`, `ajuste`), `valor NUMERIC(12,2)`, `forma_pagamento`;
- `origem_tipo` (`venda`, `devolucao`, `abertura`, `sangria`, `suprimento`, `ajuste`) e `origem_id UUID`;
- `descricao`, `criado_por`, `criado_em`;
- `cancelado_em` e `cancelado_por`, em vez de apagar registros.

Campos propostos para `fechamentos_caixa`:

- `id UUID`, `caixa_id UUID NOT NULL REFERENCES caixas(id)`, `data_operacional DATE`, `status` (`aberto`, `fechado`, `reaberto`);
- `valor_abertura`, `valor_esperado`, `valor_informado`, `diferenca`, `resumo_por_forma JSONB`;
- `fechado_por`, `fechado_em`, `observacao`, `reaberto_por`, `reaberto_em`, `motivo_reabertura`;
- unicidade em `(data_operacional, caixa_id)`.

Essa separacao suporta multiplos terminais por filial e mantem o fechamento inequivocamente atribuido a uma unidade.

### Isolamento obrigatorio por filial

O isolamento deve ser aplicado dentro das RPCs; restringir a tela ou ocultar o seletor de filial nao e controle de seguranca.

1. Toda venda recebe `filial_id` e `caixa_id` na criacao. A RPC valida que o caixa pertence a filial informada e que o usuario esta lotado nela.
2. As RPCs de listar vendas, obter resumo, registrar movimento e fechar caixa derivam ou recebem `p_filial_id`, validam `auth.uid()` em `usuarios_filiais` e aplicam a clausula da filial em todas as consultas.
3. Um operador so fecha caixas de sua filial. Um supervisor pode fechar os caixas daquela filial. Apenas administrador/gerente explicitamente lotado pode consultar ou fechar mais de uma filial.
4. A tentativa de informar `caixa_id` de outra filial retorna erro JSONB `Acesso negado a filial`; nunca retorna dados parciais e nunca tenta trocar automaticamente a filial do usuario.
5. O seletor de filial da interface mostra apenas filiais autorizadas. Para operador comum, a filial ativa e fixa; para gestor multi-filial, a troca exige escolha explicita e atualiza todas as consultas da pagina.

## Regras transacionais

1. `tenant_processar_venda` cria a venda e o movimento de entrada na mesma transacao, com `data_operacional = data_venda`, filial e caixa autorizados e a forma de pagamento recebida.
2. `tenant_cancelar_venda` cria um estorno ligado a venda; nao apaga nem altera o movimento original. Devolucoes parciais criam estorno proporcional.
3. Sangria, suprimento e ajuste entram por RPCs especificas, sempre exigindo motivo e usuario autenticado.
4. `tenant_obter_resumo_caixa` soma apenas movimentos ativos, retornando total geral e total por forma de pagamento. A origem e o identificador da venda devem ser retornados para conciliacao.
5. `tenant_fechar_caixa` primeiro valida acesso a filial, bloqueia o resumo do dia (`FOR UPDATE` nas linhas envolvidas ou bloqueio consultivo por empresa/filial/data/caixa), rejeita um segundo fechamento e grava o snapshot num unico comando transacional.
6. Depois de fechado, movimentos retroativos para aquele caixa devem ser rejeitados. A excecao e uma RPC de reabertura com permissao de gerente/admin, motivo obrigatorio e trilha de auditoria.

Nao e recomendado gerar fechamento automaticamente a meia-noite: o operador precisa conferir dinheiro fisico e pode haver turno que atravesse a virada. O dia e fechado por acao explicita.

## RPCs e permissao

Publicar uma unica assinatura por funcao no schema `public`, sempre com `SECURITY DEFINER SET search_path = public, pg_temp` e encaminhamento ao schema do usuario autenticado:

- `tenant_listar_vendas(p_filial_id UUID, p_data DATE DEFAULT NULL, p_busca TEXT DEFAULT NULL, p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)`;
- `tenant_obter_resumo_caixa(p_filial_id UUID, p_caixa_id UUID, p_data DATE DEFAULT NULL)`;
- `tenant_fechar_caixa(p_filial_id UUID, p_caixa_id UUID, p_data DATE, p_valores_contados JSONB, p_observacao TEXT DEFAULT NULL)`;
- `tenant_registrar_movimento_caixa(p_filial_id UUID, p_caixa_id UUID, p_tipo TEXT, p_valor NUMERIC, p_forma_pagamento TEXT, p_motivo TEXT, p_data DATE DEFAULT NULL)`;
- `tenant_reabrir_caixa(p_fechamento_id UUID, p_motivo TEXT)`, restrita a gerente/admin.

As chamadas de leitura e o fechamento ficam para `authenticated`; funcoes locais/cross-tenant nao devem ser expostas. Ao final da migracao, revogar de `PUBLIC` e `anon` e conceder apenas as permissoes acima. O frontend deve continuar validando `data.error`, pois as RPCs retornam erro em JSONB com HTTP 200.

## Interface proposta

### Historico de vendas

- Inserir controle segmentado `Hoje | Todas` e seletor de data quando "Hoje" nao for suficiente.
- Mostrar a data operacional como coluna principal e o horario de criacao apenas em detalhe/tooltip quando diferir.
- KPI da tela deve refletir o mesmo filtro aplicado a lista; canceladas e devolvidas nao compoem o faturamento liquido.
- Na primeira carga, requisitar `p_data` igual a hoje. A tabela permanece ordenada por data e horario decrescentes.

### Fechamento de caixa

- Disponibilizar acao na tela de Vendas/PDV, visivel para os perfis permitidos.
- Exibir a filial ativa de forma destacada. Operadores nao conseguem altera-la; gestores veem somente filiais em que possuem lotacao ativa.
- Antes de confirmar, mostrar vendas e ajustes do dia agrupados por dinheiro, PIX, credito, debito e demais formas, com total esperado.
- Para dinheiro, pedir o total contado; para os demais meios, permitir confirmacao ou valor conciliado. Exibir a diferenca antes do comando final.
- Apos fechar, apresentar comprovante com data, responsavel, horario, totais e diferenca. Reabertura exige modal com motivo.

## Especificacao de UI/UX do fechamento

### Navegacao e contexto permanente

O acesso deve ficar no modulo Vendas como item `Caixa`, ao lado de `Historico` e `PDV`. O cabecalho de todas as telas do modulo mostra, de forma compacta:

- filial ativa e caixa ativo, por exemplo `Filial Centro | Caixa 1`;
- data operacional;
- estado do caixa: `Aberto`, `Fechado` ou `Reaberto`;
- nome do operador responsavel quando houver sessao aberta.

O operador ve somente sua filial e seus caixas autorizados, sem seletor. Gestor de varias filiais recebe um seletor de filial no cabecalho; ao trocar a filial, a pagina recarrega o contexto, os totais e as permissoes. O seletor nao pode oferecer filial sem lotacao ativa.

### Tela Caixa: sessao aberta

Esta e a visao de trabalho diaria, nao uma tela de relatorio. O primeiro bloco mostra o status `Caixa aberto`, hora de abertura, operador e fundo de troco. Ao lado, ficam dois comandos principais:

- `Sangria` para retirar dinheiro do caixa;
- `Suprimento` para incluir troco ou outro valor autorizado.

Ambos abrem um modal curto com valor, forma de pagamento, motivo obrigatorio e confirmacao. Um ajuste manual fica em menu secundario e exige permissao de supervisor/gerente.

A area central apresenta uma tabela de conferencia por forma de pagamento:

| Forma | Entradas | Estornos | Saidas | Esperado |
| --- | ---: | ---: | ---: | ---: |
| Dinheiro | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 |
| PIX | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 |
| Credito | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 |
| Debito | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 |

Abaixo, uma lista cronologica de movimentos apresenta hora, origem, descricao, forma, valor e responsavel. Cada venda abre seu detalhe; sangrias e suprimentos mostram o motivo. Itens de outras filiais jamais aparecem nesta lista.

No rodape fixo da visao existe o total esperado e o comando destacado `Conferir e fechar caixa`. Ele so aparece habilitado para quem puder fechar aquele caixa; para os demais, a tela informa que o caixa esta sob responsabilidade do operador ou gestor atual, sem revelar controles administrativos.

### Fluxo de conferencia e fechamento

O fechamento ocorre em uma tela lateral ou pagina dedicada, em tres etapas curtas, para nao transformar a operacao de balcao em formulario extenso.

1. **Conferir movimentos**: mostra totais calculados, quantidade de vendas, cancelamentos, devolucoes, sangrias e suprimentos. O usuario pode abrir qualquer grupo para investigar uma divergencia antes de continuar.
2. **Informar contagem**: dinheiro usa campo de valor contado e, quando desejado, contador por cedula/moeda. PIX, credito e debito mostram o esperado e aceitam valor conciliado. A diferenca por forma e o total geral sao atualizados imediatamente.
3. **Confirmar fechamento**: apresenta filial, caixa, data, operador, total esperado, informado e diferenca. Diferenca diferente de zero pede observacao obrigatoria. O botao final e `Fechar caixa`; apos a confirmacao, a operacao e irreversivel para o operador.

O sistema deve avisar claramente quando a diferenca for positiva ou negativa, mas nunca bloquear o fechamento apenas por haver diferenca. Bloquear geraria caixa informal; registrar a diferenca e exigir justificativa preserva a realidade operacional.

### Caixa fechado e comprovante

Depois de fechar, a mesma rota mostra estado `Fechado` e um comprovante de leitura com:

- filial, caixa, data operacional, horario e responsavel;
- abertura, entradas, estornos, saidas, total esperado, total contado e diferenca;
- resumo por forma de pagamento;
- observacao e identificador do fechamento;
- acoes `Imprimir comprovante` e `Exportar CSV`.

O comando `Reabrir caixa` fica disponivel apenas para gerente/admin autorizado naquela filial. O modal pede motivo obrigatorio, exibe o responsavel pelo fechamento original e alerta que novos movimentos serao auditados. A reabertura nao remove o comprovante anterior; cria uma nova versao na linha do tempo.

### Estados e mensagens operacionais

- Sem caixa configurado na filial: mostrar estado vazio e acao para gestor criar o primeiro caixa; operador recebe orientacao para procurar o gestor.
- Caixa ainda nao aberto: permitir `Abrir caixa` com fundo de troco, somente para usuario lotado na filial e autorizado para o caixa.
- Caixa aberto por outro operador: permitir consulta conforme permissao, mas bloquear movimentos e fechamento para quem nao for responsavel/supervisor.
- Fechamento em andamento: desabilitar duplo envio e manter o resumo bloqueado ate receber sucesso ou erro da RPC.
- Sem vendas no dia: permitir fechar somente se houve abertura, sangria, suprimento ou se a politica da empresa permitir fechamento zerado.
- Acesso negado: informar apenas que o usuario nao possui acesso a filial selecionada e retornar ao ultimo contexto autorizado.

### Criterios de produto

O usuario deve conseguir saber em poucos segundos: em qual filial esta, qual caixa esta operando, se esta aberto, quanto deveria haver por forma de pagamento e qual acao e permitida. O sistema deve privilegiar conferencia antes de acao destrutiva, manter a trilha de auditoria visivel e impedir que erro de navegacao resulte em fechamento da filial errada.

## Plano de migracao

Criar uma unica migracao versionada em `apps/api/migrations/` com as tres etapas obrigatorias do repositorio:

1. `public.provisionar_hook_caixa_diario(p_schema TEXT)` idempotente: adiciona `data_venda`, `filial_id` e `caixa_id` em vendas, cria indices, lotacoes, caixas, movimentos e RPCs locais com `IF NOT EXISTS`/`CREATE OR REPLACE`.
2. Registro em `public.provisionamento_hooks`, com ordem posterior ao hook de vendas/processamento.
3. Loop em `public.empresas` para aplicar o hook aos tenants existentes.

Indices minimos:

- `vendas (data_venda DESC, criado_em DESC) WHERE deleted_at IS NULL`;
- `vendas (filial_id, data_venda DESC, criado_em DESC) WHERE deleted_at IS NULL`;
- `caixa_movimentos (caixa_id, data_operacional, forma_pagamento) WHERE cancelado_em IS NULL`;
- chave unica de `fechamentos_caixa (data_operacional, caixa_id)`.

Antes de criar as novas assinaturas publicas, executar `DROP FUNCTION IF EXISTS` com todos os tipos das assinaturas legadas. Isto e necessario porque ja ha historico de variantes de `tenant_processar_venda` e `tenant_listar_vendas`; o PostgREST pode tornar uma chamada ambigua quando um parametro opcional nao e enviado.

Atualizar `apps/api/testes_provisionamento_hooks.sql` para exigir as novas tabelas, colunas, indices, hooks e assinaturas no tenant criado durante o smoke test. Regenerar `apps/web/src/types/database.types.ts` apos aplicar a migracao.

## Validacao de aceite

Executar em transacao com `ROLLBACK`:

1. Criar venda com data de hoje e confirmar que ela aparece no topo da lista filtrada por hoje.
2. Criar uma venda retroativa e confirmar que ela aparece no dia retroativo, sem mudar `criado_em`.
3. Confirmar venda em dinheiro e PIX, aplicar sangria e cancelar uma venda; conferir o resumo por forma e o total liquido.
4. Fechar o caixa com valor contado divergente e confirmar que a diferenca e preservada no snapshot.
5. Tentar fechar novamente e inserir movimento retroativo: ambos devem falhar enquanto o caixa estiver fechado.
6. Reabrir como gerente com motivo, inserir ajuste e fechar novamente, mantendo a trilha de auditoria.
7. Criar dois usuarios lotados em filiais diferentes e confirmar que cada um nao lista, movimenta ou fecha o caixa da outra filial, inclusive chamando a RPC diretamente.
8. Rodar `apps/api/testes_provisionamento_hooks.sql` e validar um tenant novo provisionado do zero.
9. Rodar `scripts/export_db_map.py` e garantir que nao surgiram assinaturas duplicadas, divergencias entre tenants ou permissoes para `anon`.

## Ordem de implementacao

1. Consolidar a assinatura efetiva de `tenant_processar_venda` e de `tenant_listar_vendas` no provisionamento atual.
2. Criar a migracao/hook de data operacional, movimentos e fechamento.
3. Integrar criacao, cancelamento e devolucao de venda ao livro de movimentos.
4. Expor as RPCs no tipo gerado e criar os hooks React Query correspondentes.
5. Ajustar a listagem de vendas para iniciar em hoje e criar o fluxo de conferencia/fechamento.
6. Executar os testes transacionais, smoke de provisionamento e auditoria de drift.