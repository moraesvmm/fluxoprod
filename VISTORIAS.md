PENDENTE VISTORIA: Modulo de Producao implementado. Foram feitas as alteracoes na API, criacao das telas Kanban e Fichas Tecnicas, e adicionado o modulo na Loja.

PENDENTE VISTORIA (21/05/2026): Correcoes criticas pos-auditoria do modulo de Producao (MRP):
- BUG CRITICO corrigido: insumos nao eram enviados para a RPC (array vazio hardcoded). Agora o frontend calcula os insumos a partir das Fichas Tecnicas antes de chamar tenant_concluir_ordem_producao.
- RPC tenant_concluir_ordem_producao_local atualizada em todos os schemas de tenant: agora e auto-suficiente e busca a Ficha Tecnica internamente caso p_insumos chegar vazio (defesa em profundidade).
- Filtro de produto na abertura de OP corrigido: aceita apenas tipo_item = produto_acabado (com fallback para legados).
- VALID_MODULE_KEYS em register-trial atualizado para incluir 'producao'.
- database.types.ts regenerado com supabase gen types (149.714 bytes).
- api-producao.ts atualizado para usar cliente tipado (Database).
- Modal de conclusao de OP agora exibe preview dos insumos que serao descontados em tempo real.
- Aviso visual quando produto nao tem Ficha Tecnica cadastrada.
Prioridade: ALTA - vistoriar assim que possivel.

PENDENTE VISTORIA (21/05/2026): Correcoes Visuais Dark Mode:
- Alterados 6 módulos (estoque, obras, os, financeiro, comissoes, catalogo) substituindo classes fixas bg-white por bg-card/bg-background para resolver problemas de contraste no tema escuro.
- Adicionado passo no tutorial de boas vindas para ensinar como trocar o tema.
Prioridade: MEDIA - vistoriar e testar layout no dark mode e light mode.

PENDENTE VISTORIA (27/07/2026): Correção crítica na RPC mestre_prorrogar_trial_empresa:
- BUG CRÍTICO: A RPC atualizava apenas `data_vencimento` mas NÃO atualizava `trial_ends_at`. Todo o frontend (TenantLayout, SubscriptionBanner, assinatura/page) usa `trial_ends_at` para verificar expiração do trial, fazendo com que a prorrogação (incluindo "Permanente") não tivesse efeito prático.
- Corrigido: RPC agora atualiza ambos `data_vencimento` E `trial_ends_at` simultaneamente.
- RPC re-implantada no banco de dados Supabase.
- Registro da empresa "Vitor Moraes" corrigido manualmente (trial_ends_at sincronizado com data_vencimento = 2099-12-31).
Prioridade: ALTA - vistoriar e confirmar que o trial estendido funciona corretamente ao acessar a conta.

PENDENTE VISTORIA (28/07/2026): Correções e melhorias de múltiplos módulos:
- ESTOQUE: Substituído botões de ação invisíveis (opacity-0 com hover-only) por um dropdown menu visível com ícone MoreVertical (⋮). Adicionada opção "Ver Detalhes" que abre modal completo com informações do produto (nome, SKU, categoria, tipo, estoque, preço, custo, margem). Corrige bug em que clicar na coluna "Ações" causava overlay opaco sem conteúdo visível (especialmente em dispositivos touch).
- CALCULADORA: Corrigido bug de posicionamento no FloatingCalculator — transform translate(-24px, -24px) era aplicado junto com right/bottom no estado inicial, empurrando o botão para fora da viewport. Agora usa posição fixa (right/bottom) no estado padrão e transform somente após drag.
- DEMO ACCOUNT: Conta "Suplementos Demo LTDA" (tenant_suplementos_257cc9) alimentada com dados robustos: 38 produtos, 38 SKUs, 30+ clientes/leads, 45 vendas distribuídas em 6 meses, financeiro completo (receitas + despesas).
- BANCO DE DADOS: Criadas RPCs faltando no schema demo (tenant_dashboard_kpis_por_mes, tenant_obter_sugestoes_nurturing, tenant_finalizar_alerta_nurturing, tenant_listar_ordens_producao, tenant_listar_fichas_tecnicas). Adicionada coluna unidade_medida em produtos. Criada tabela ordens_producao. Corrigida RPC pública tenant_obter_fechamento_pendente com SECURITY DEFINER.
- TUTORIAIS: Reset completo dos tutoriais da conta demo para experiência de primeiro acesso.
Prioridade: ALTA - vistoriar dropdown de ações no estoque, calculadora e tutoriais da conta demo.
