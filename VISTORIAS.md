PENDENTE VISTORIA (21/08/2026): Integração WhatsApp Cloud API da Meta preparada:
- Criada a migração apps/api/migrations/whatsapp_meta.sql para configuração por empresa e persistência de mensagens.
- Criadas rotas /api/whatsapp/meta/config e /api/whatsapp/meta/webhook.
- Status, envio, conversas, mensagens e mídia usam Graph API quando o tenant possui configuração Meta; nesse cenário não chamam Baileys.
- Token Meta é cifrado no backend e nunca retorna ao navegador. A mídia exige autenticação do tenant.
- Secret global obrigatório: WHATSAPP_META_TOKEN_SECRET (mínimo 32 caracteres), usado apenas para cifrar credenciais dos tenants; WHATSAPP_META_GRAPH_VERSION é opcional.
- App Secret e Verify Token são dedicados por empresa e cadastrados junto com o Phone Number ID, WABA ID e Access Token na tela do tenant.
- A migração complementar whatsapp_meta_per_tenant_secrets.sql ainda precisa ser aplicada no Supabase e o webhook configurado no Meta Business antes do teste de produção.
Prioridade: ALTA - aplicar migração, configurar secrets e testar conexão, envio, webhook e recebimento.

PENDENTE VISTORIA (21/08/2026): Divida tecnica residual apos a rodada de estabilizacao:
- Tipagem insegura: a rodada atual reduziu os erros de `any` de 61 para 48; ainda existem usos em APIs, testes e componentes. Nao bloqueia o uso atual, mas pode permitir dados invalidos e esconder erros em fluxos de API, estoque e checkout.
- Lint residual: os erros globais foram reduzidos de 121 para 107 e os avisos de 161 para 151. Ainda ha regras de hooks, tipagem e entidades nao escapadas; isso reduz a capacidade de detectar regresssoes.
- Imagens: loading, cabecalho, QR Code e galeria de produtos foram migrados para `next/image`; ainda ha imagens dinamicas no WhatsApp e galerias de documentos a revisar.
- Cobertura: os 36 testes existentes seguem verdes, mas faltam cenarios de interface e importacao de arquivos para proteger esses fluxos contra regresssoes.
Prioridade: MEDIA-ALTA - tratar na proxima sprint; nao e bloqueadora imediata de producao.

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

PENDENTE VISTORIA (22/08/2026): Correção do link de confirmação de e-mail no cadastro Trial:
- BUG CRÍTICO: O link "ATIVAR MINHA CONTA AGORA" no e-mail de boas-vindas redirecionava para o Supabase com erro {"error":"requested path is invalid"}. O redirect_to gerado estava como "seufluxoerp.com.br" (sem https:// e sem /login?confirmed=true).
- CAUSA RAIZ: A lógica de construção do `origin` baseada em request.headers (origin/host) era frágil e produzia URLs inválidas dependendo do proxy/CDN. Além disso, o `action_link` gerado pelo Supabase usava o Site URL do dashboard (possivelmente mal configurado) em vez do redirectTo passado nas options.
- CORREÇÃO: (1) Substituída derivação dinâmica de origin por NEXT_PUBLIC_APP_URL com fallback fixo para https://seufluxoerp.com.br em register-trial/route.ts e resend-confirmation/route.ts. (2) Adicionada lógica de reescrita do redirect_to dentro do action_link gerado pelo Supabase para garantir que aponta sempre para ${origin}/login?confirmed=true.
- AÇÃO MANUAL NECESSÁRIA: Configurar no Supabase Dashboard (Auth → URL Configuration): Site URL = https://seufluxoerp.com.br, Redirect URLs = https://seufluxoerp.com.br/**, https://fluxoprod.vercel.app/**
Prioridade: CRÍTICA - vistoriar e testar fluxo completo de cadastro trial com confirmação de e-mail.

## PENDENTE VISTORIA (22/08/2026)
**Arquivos Afetados:** > 50 arquivos (src/app/tenant/* e src/components/*)
**O que foi feito:**
- Refatoração massiva de todo o sistema para corrigir problemas de contraste no Dark Mode.
- Substituição de classes tailwind hardcoded (`bg-white`, `bg-gray-*`, `bg-slate-*`, `text-gray-*`) por variáveis nativas do tema (`bg-card`, `bg-muted`, `text-foreground`, `border-border`).
- Ajustes específicos de grids e tooltips na lib Recharts no Dashboard.
- Ajuste das opacidades de containers e alertas (`bg-amber-50`, `bg-red-50`, `bg-muted/50`) para ficarem legíveis e destacarem no fundo dark mode sem perder a característica light.
**Motivo:** As variáveis fixas e as transparências ruins causavam textos não legíveis e elementos que sumiam no modo escuro.
**Como testar:**
- Navegar nas telas principais (Dashboard, Vendas, Estoque, etc) alterando o tema do sistema para Dark Mode e garantindo legibilidade e boa distinção de borders e backgrounds.
- Verificar o componente de gráficos (Recharts) no Dashboard.
