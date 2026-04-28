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
        title: 'Bem-vindo ao Dashboard!',
        description: 'Aqui você tem uma visão completa da saúde financeira e operacional do seu negócio em tempo real.',
        placement: 'center',
        icon: LayoutDashboard
      },
      {
        id: 'dash-kpis',
        title: 'Indicadores de Performance',
        description: 'Acompanhe seu faturamento, ticket médio e volume de vendas de forma consolidada.',
        targetSelector: '[data-tour="kpi-cards"]',
        placement: 'bottom'
      },
      {
        id: 'dash-search',
        title: 'Busca Inteligente',
        description: 'Precisa encontrar algo rápido? Use a nossa busca global para localizar clientes, produtos ou vendas.',
        targetSelector: '[data-tour="global-search"]',
        placement: 'bottom'
      }
    ]
  },
  crm: {
    key: 'crm',
    moduleName: 'CRM & Clientes',
    steps: [
      {
        id: 'crm-welcome',
        title: 'Gestão de Clientes',
        description: 'Organize seus contatos, acompanhe o histórico de interações e nunca perca uma oportunidade.',
        placement: 'center',
        icon: Users
      },
      {
        id: 'crm-funnel',
        title: 'Funil de Vendas',
        description: 'Mova seus clientes entre as etapas do funil para visualizar o progresso de cada negociação.',
        targetSelector: '[data-tour="crm-funnel"]',
        placement: 'top'
      }
    ]
  },
  vendas: {
    key: 'vendas',
    moduleName: 'Vendas & PDV',
    steps: [
      {
        id: 'vendas-welcome',
        title: 'Central de Vendas',
        description: 'Realize vendas de forma rápida e segura, com integração total ao seu financeiro e estoque.',
        placement: 'center',
        icon: ShoppingCart
      }
    ]
  },
  estoque: {
    key: 'estoque',
    moduleName: 'Estoque',
    steps: [
      {
        id: 'estoque-welcome',
        title: 'Controle de Produtos',
        description: 'Gerencie seu inventário, receba alertas de estoque baixo e mantenha seu catálogo sempre atualizado.',
        placement: 'center',
        icon: Package
      }
    ]
  }
};
