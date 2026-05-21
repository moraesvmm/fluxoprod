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


PENDENTE VISTORIA (21/05/2026): Varredura Global de Cores (Dark Mode):
- Foram varridos e atualizados cerca de 65 arquivos (páginas e subcomponentes da pasta modules).
- Substituição massiva de bg-white para bg-card.
- Substituição massiva de text-slate-900/800/700 para text-foreground.
- Substituição massiva de text-slate-600/500 para text-muted-foreground.
- Prioridade: ALTA - Garantir que nenhuma quebra visual de ícones brancos em fundos brancos tenha ocorrido no Light Mode. O Dark Mode agora deve estar operando de forma perfeita em todos os módulos (Estoque, CRM, Obras, etc.).

