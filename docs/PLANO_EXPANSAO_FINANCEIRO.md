# Plano de Expansão: Módulo Financeiro (Fluxoprod SaaS)

Este documento registra as sugestões e prioridades de melhorias projetadas para elevar a maturidade do módulo Financeiro de um "registro simples" para uma solução robusta de "Gestão Financeira Empresarial". 

## 1. Implementação Funcional de Datas e Vencimentos (Contas a Pagar/Receber)
**Complexidade**: Baixa | **Prioridade**: Alta
- **Problema Atual**: O formulário grava a transação na data de registro automaticamente (`new Date().toISOString()`), sem permitir planejar fluxo futuro.
- **Implementação**: 
  - Adicionar input de *Data de Vencimento* e *Data de Pagamento*.
  - Alterar a lista para dar alerta visual (vermelho) baseado na data de vencimento vs dia atual.
  - O gestor passa a ter capacidade de separar "Dinheiro Previsto" de "Dinheiro Realizado no Caixa".

## 2. Busca e Filtros Inteligentes
**Complexidade**: Baixa | **Prioridade**: Alta
- **Problema Atual**: O campo de busca (ícone de lupa) na UI não despacha evento de filtro para exibir o que é digitado.
- **Implementação**: 
  - Adicionar controle de estado reactivo à input de busca (`onChange`).
  - Utilizar _Debounce_ de 300ms a 500ms para evitar spam de fetching. 
  - Enviar string de busca para a RPC via hook `useFinanceiro({ busca: '...' })`.

## 3. Plano de Contas Pré-Mapeado (Categorização DRE)
**Complexidade**: Intermediária | **Prioridade**: Intermediária
- **Problema Atual**: Cadastro de categoria da transação conta apenas com campo tipo TEXT. Gera inconsistência como as combinações ["Aluguel", "aluguel", "Alluguel"], impossibilitando relatórios de somatória gerencial.
- **Implementação**:
  - Conversão do input aberto de "Categoria" em um `Select/Autocomplete` ou em nova tabela `categorias_financeiras`.
  - Mapear categorias base da DRE empresarial (Custos Variáveis, Despesas Administrativas, Impostos, Folha de Pagamento).
  - Viabiliza Dashboards e relatórios por tipo de despesa ("Para onde meu dinheiro está indo?").

## 4. Integração OFX e Conciliação Bancária Expressa
**Complexidade**: Alta | **Prioridade**: Média/Alta
- **Problema Atual**: O atual botão de "Sincronizar Banco" projeta uma notificação de "simulação visual" ao invés de atuar. O cliente insere todos os custos manualmente ou não utiliza o fluxo de reconciliação real dos bancos brasileiros.
- **Implementação**:
  - Mecanismo de Upload na plataforma para leitura de arquivos padronizados bancários `.ofx`.
  - Parse dos dados no Backend permitindo que a importação jorrar dezenas de movimentações para uma interface UI "Aprovar ou Intervir".
  - Com cliques iterativos o dono da conta lança múltiplas despesas já consolidadas com seu extrato real das contas dos bancos.

## 5. Recorrência Automática
**Complexidade**: Média/Alta | **Prioridade**: Intermediária
- **Contexto**: Facilidade em marcar transações como "Parcelas" ou "Mensalidade". O backend do Supabase gera uma *crontab* contábil (Pg_cron) clonando e relançando os novos pagamentos para os próximos meses de forma passiva.

---
**Status da Proposta:** Sugestões armazenadas para futura Sprint de arquitetura base e Frontend UI. Módulo CRM prioridade finalizada na data de 23/04/2026.
