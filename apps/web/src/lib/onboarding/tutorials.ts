import { LucideIcon, LayoutDashboard, Users, ShoppingCart, Package } from "lucide-react";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: LucideIcon;
}

export interface Tutorial {
  key: string;
  moduleName: string;
  steps: TutorialStep[];
}

export const TUTORIAL_DATA: Record<string, Tutorial> = {
  dashboard: {
    key: 'dashboard',
    moduleName: 'Dashboard',
    steps: [
      {
        id: 'dash-welcome',
        title: 'O Cockpit de Comando',
        description: 'O Dashboard do Fluxo é o seu cockpit. Aqui, a inteligência encontra a agilidade.',
        placement: 'center',
        icon: LayoutDashboard
      },
      {
        id: 'dash-theme',
        title: 'Personalize o Tema',
        description: 'Prefere um visual mais claro? Clique no ícone de Sol/Lua no topo direito para alternar entre os modos Claro e Escuro a qualquer momento.',
        placement: 'center'
      },
      {
        id: 'dash-refresh',
        title: 'Dados em Tempo Real',
        description: 'Sincronize faturamento e ticket médio em tempo real com um clique.',
        targetSelector: '[data-tour="dash-refresh"]',
        placement: 'left'
      },
      {
        id: 'dash-actions',
        title: 'Ações Rápidas',
        description: 'Precisa de velocidade? Use as Ações Rápidas: Nova Venda, Conciliar ou Novo Cliente.',
        targetSelector: '[data-tour="dash-actions"]',
        placement: 'top'
      }
    ]
  },
  crm: {
    key: 'crm',
    moduleName: 'CRM & Clientes',
    steps: [
      {
        id: 'crm-welcome',
        title: 'Foco em Conversão',
        description: 'Transforme leads em lucros. O CRM que trabalha por você.',
        placement: 'center',
        icon: Users
      },
      {
        id: 'crm-novo',
        title: 'Novo Cliente',
        description: 'Sua porta de entrada para novos negócios e relacionamentos.',
        targetSelector: '[data-tour="crm-novo"]',
        placement: 'bottom'
      },
      {
        id: 'crm-funnel',
        title: 'Pipeline Visual',
        description: 'Arraste oportunidades visualmente até o fechamento da venda.',
        targetSelector: '[data-tour="crm-funnel"]',
        placement: 'top'
      },
      {
        id: 'crm-campanha',
        title: 'Campanha em Massa',
        description: 'Quer escala? Dispare WhatsApp ou E-mail para toda a base com um clique.',
        targetSelector: '[data-tour="crm-campanha"]',
        placement: 'bottom'
      },
      {
        id: 'crm-nurturing',
        title: 'Painel de Nurturing',
        description: 'O segredo da conversão: saiba exatamente quem você deve reengajar agora.',
        targetSelector: '[data-tour="crm-nurturing"]',
        placement: 'bottom'
      }
    ]
  },
  vendas: {
    key: 'vendas',
    moduleName: 'Vendas & PDV',
    steps: [
      {
        id: 'vendas-welcome',
        title: 'Alta Performance',
        description: 'Venda em segundos com o PDV mais rápido do mercado. Venda mais, complique menos.',
        placement: 'center',
        icon: ShoppingCart
      },
      {
        id: 'vendas-novo',
        title: 'Nova Venda',
        description: 'Acesse a interface rápida para registrar produtos e pagamentos.',
        targetSelector: '[data-tour="vendas-novo"]',
        placement: 'bottom'
      },
      {
        id: 'vendas-historico',
        title: 'Histórico',
        description: 'Audite cada transação com precisão cirúrgica.',
        targetSelector: '[data-tour="vendas-historico"]',
        placement: 'top'
      },
      {
        id: 'vendas-nfe',
        title: 'Emissão Fiscal',
        description: 'A mágica fiscal: resolva a burocracia em segundos, com custo zero.',
        targetSelector: '[data-tour="vendas-nfe"]',
        placement: 'bottom'
      }
    ]
  },
  estoque: {
    key: 'estoque',
    moduleName: 'Catálogo & Estoque',
    steps: [
      {
        id: 'estoque-welcome',
        title: 'Gestão Patrimonial',
        description: 'Domine seu patrimônio. Organize, controle e lucre.',
        placement: 'center',
        icon: Package
      },
      {
        id: 'estoque-novo',
        title: 'Novo Produto',
        description: 'Cadastre SKUs com fotos, códigos e preços base.',
        targetSelector: '[data-tour="estoque-novo"]',
        placement: 'bottom'
      },
      {
        id: 'estoque-mov',
        title: 'Movimentação',
        description: 'Registre entradas e saídas com rastreabilidade total.',
        targetSelector: '[data-tour="estoque-mov"]',
        placement: 'top'
      },
      {
        id: 'estoque-alertas',
        title: 'Alertas de Estoque',
        description: 'Garantimos que você nunca fique sem produto para vender.',
        targetSelector: '[data-tour="estoque-alertas"]',
        placement: 'bottom'
      }
    ]
  },
  os: {
    key: 'os',
    moduleName: 'Ordens de Serviço',
    steps: [
      {
        id: 'os-welcome',
        title: 'Excelência Técnica',
        description: 'Profissionalismo absoluto para prestadores de serviço.',
        placement: 'center'
      },
      {
        id: 'os-nova',
        title: 'Nova OS',
        description: 'Inicie o diagnóstico técnico com clareza: defina cliente, equipamento e problema.',
        targetSelector: '[data-tour="os-nova"]',
        placement: 'bottom'
      },
      {
        id: 'os-kanban',
        title: 'Visão Kanban',
        description: 'Arraste as OS entre colunas conforme o andamento: Aberta → Em Execução → Concluída.',
        targetSelector: '[data-tour="os-kanban"]',
        placement: 'bottom'
      },
      {
        id: 'os-tabela',
        title: 'Histórico de Ordens',
        description: 'Filtre, edite e consulte todas as OS em lista com status, orçamento e datas.',
        targetSelector: '[data-tour="os-tabela"]',
        placement: 'top'
      }
    ]
  },
  obras: {
    key: 'obras',
    moduleName: 'Obras & Projetos',
    steps: [
      {
        id: 'obras-welcome',
        title: 'Gestão de Canteiro',
        description: 'Controle suas obras do início ao fim. O Fluxo é a engenharia da sua gestão.',
        placement: 'center'
      },
      {
        id: 'obras-nova',
        title: 'Nova Obra',
        description: 'Defina endereços, orçamentos e informações base do projeto.',
        targetSelector: '[data-tour="obras-nova"]',
        placement: 'bottom'
      },
      {
        id: 'obras-cronograma',
        title: 'Cronograma',
        description: 'Acompanhe marcos de entrega para garantir o prazo.',
        targetSelector: '[data-tour="obras-cronograma"]',
        placement: 'top'
      },
      {
        id: 'obras-financeiro',
        title: 'Saúde Financeira',
        description: 'Garanta que o projeto está no azul e evite desperdícios.',
        targetSelector: '[data-tour="obras-financeiro"]',
        placement: 'bottom'
      }
    ]
  },
  financeiro: {
    key: 'financeiro',
    moduleName: 'Financeiro',
    steps: [
      {
        id: 'fin-welcome',
        title: 'Fluxo de Caixa Blindado',
        description: 'Saiba para onde vai cada centavo. Saúde financeira é prioridade.',
        placement: 'center'
      },
      {
        id: 'fin-nova',
        title: 'Nova Transação',
        description: 'Registre receitas e despesas instantaneamente.',
        targetSelector: '[data-tour="fin-nova"]',
        placement: 'bottom'
      },
      {
        id: 'fin-ofx',
        title: 'Conciliação OFX',
        description: 'Importe extratos bancários e limpe pendências em minutos.',
        targetSelector: '[data-tour="fin-ofx"]',
        placement: 'top'
      },
      {
        id: 'fin-dre',
        title: 'Análise DRE',
        description: 'Acesse o faturamento versus custos em tempo real.',
        targetSelector: '[data-tour="fin-dre"]',
        placement: 'bottom'
      }
    ]
  },
  rh: {
    key: 'rh',
    moduleName: 'RH & Equipe',
    steps: [
      {
        id: 'rh-welcome',
        title: 'Gestão Humana',
        description: 'Pessoas geram valor. Sua equipe organizada é sua maior força.',
        placement: 'center'
      },
      {
        id: 'rh-novo',
        title: 'Novo Colaborador',
        description: 'Centralize documentos, dados e estrutura salarial.',
        targetSelector: '[data-tour="rh-novo"]',
        placement: 'bottom'
      },
      {
        id: 'rh-desempenho',
        title: 'Desempenho',
        description: 'Identifique quem mais entrega resultados no time.',
        targetSelector: '[data-tour="rh-desempenho"]',
        placement: 'top'
      }
    ]
  },
  comissoes: {
    key: 'comissoes',
    moduleName: 'Comissões',
    steps: [
      {
        id: 'com-welcome',
        title: 'Meritocracia Automática',
        description: 'Comissão justa, equipe engajada. Chega de planilhas e erros manuais.',
        placement: 'center'
      },
      {
        id: 'comissoes-regras',
        title: 'Nova Regra de Comissão',
        description: 'Defina percentuais por produto, vendedor ou categoria.',
        targetSelector: '[data-tour="comissoes-regras"]',
        placement: 'bottom'
      },
      {
        id: 'comissoes-apurar',
        title: 'Histórico de Pagamentos',
        description: 'Veja todas as comissões apuradas e marque individualmente como pagas.',
        targetSelector: '[data-tour="comissoes-apurar"]',
        placement: 'top'
      }
    ]
  },
  relatorios: {
    key: 'relatorios',
    moduleName: 'Relatórios Analíticos',
    steps: [
      {
        id: 'rel-welcome',
        title: 'Inteligência Analítica',
        description: 'O futuro da sua empresa está nos seus dados. A estratégia que você precisa.',
        placement: 'center'
      },
      {
        id: 'relatorios-personalizar',
        title: 'Escolha seu Relatório',
        description: 'Filtre por módulo: Vendas, DRE, Estoque, RH e muito mais.',
        targetSelector: '[data-tour="relatorios-personalizar"]',
        placement: 'bottom'
      },
      {
        id: 'relatorios-gerar',
        title: 'Exportar em PDF ou CSV',
        description: 'Leve seus dados para reuniões exportando em PDF ou CSV com um clique.',
        targetSelector: '[data-tour="relatorios-gerar"]',
        placement: 'left'
      }
    ]
  },
  producao: {
    key: 'producao',
    moduleName: 'Produção (MRP)',
    steps: [
      {
        id: 'prod-welcome',
        title: 'Bem-vindo à Fábrica',
        description: 'Esse é o nosso mais novo módulo focado para produção! Transforme matérias-primas em produtos acabados de forma ágil, rastreável e inteligente.',
        placement: 'center',
        icon: Package
      },
      {
        id: 'prod-pre-req',
        title: 'Regra de Ouro (Pré-requisito)',
        description: 'Para criar uma receita (Ficha), você precisa ter cadastrado no Estoque pelo menos 1 Produto Final e 1 Matéria-Prima. Não importa se a quantidade física deles no estoque for zero, o sistema permite criar a receita mesmo assim!',
        placement: 'center'
      },
      {
        id: 'prod-fichas',
        title: 'Fichas Técnicas (BOM)',
        description: 'Crie suas receitas de produção. Defina quais e quantas matérias-primas cada produto final consome.',
        targetSelector: '[data-tour="prod-fichas"]',
        placement: 'bottom'
      },
      {
        id: 'prod-ops',
        title: 'Ordens de Produção (OP)',
        description: 'Gerencie o chão de fábrica controlando o que está em andamento e acompanhando as conclusões.',
        targetSelector: '[data-tour="prod-ops"]',
        placement: 'top'
      },
      {
        id: 'prod-concluir',
        title: 'Conclusão e Baixa',
        description: 'Ao apontar conclusão, o sistema automaticamente dá baixa nas matérias-primas e credita o produto acabado no seu estoque.',
        targetSelector: '[data-tour="prod-concluir"]',
        placement: 'bottom'
      }
    ]
  }
};

