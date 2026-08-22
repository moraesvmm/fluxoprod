"use client";

import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/modules/base/KPICard";
import { TableSkeleton } from "@/components/modules/base/TableSkeleton";
import { DollarSign, TrendingDown, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { fetchCRMDashboardMetricas, type CRMDashboardMetricas } from "@/lib/api";
import { useUserProfile } from "@/lib/hooks/use-user-profile";

const EMPTY_METRICAS: CRMDashboardMetricas = {
  total_clientes: 0,
  clientes_ativos: 0,
  clientes_inativos_30d: 0,
  ltv_medio: 0,
  churn_rate: 0,
  funil_counts: { lead: 0, qualificado: 0, proposta: 0, negociacao: 0, fechado: 0, perdido: 0 },
  taxa_conversao: { lead_to_qualificado: 0, qualificado_to_proposta: 0, proposta_to_negociacao: 0, negociacao_to_fechado: 0 },
  velocidade_media: 0,
};

export default function DashboardKPIs() {
  const { userId } = useUserProfile();

  const { data: metricas, isLoading, error } = useQuery({
    queryKey: ['dashboard-metricas'],
    queryFn: fetchCRMDashboardMetricas,
    enabled: !!userId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <TableSkeleton rows={1} columns={1} />
        <TableSkeleton rows={1} columns={1} />
        <TableSkeleton rows={1} columns={1} />
      </div>
    );
  }

  // Fallback seguro em caso de erro da RPC
  if (error) {
    console.warn('[CRM Dashboard] RPC failed, using fallback:', error);
  }

  const m = metricas || EMPTY_METRICAS;

  const formatCurrency = (value?: number | null) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatPercent = (value?: number | null) => `${(value || 0).toFixed(1)}%`;

  const formatDays = (value?: number | null) => `${(value || 0).toFixed(0)} dias`;

  const funilCounts = m.funil_counts || EMPTY_METRICAS.funil_counts;
  const maxCount = Math.max(...Object.values(funilCounts), 1);
  const barWidth = (count: number) => (count / maxCount) * 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          title="LTV Médio"
          value={formatCurrency(m.ltv_medio)}
          icon={DollarSign}
          className="border-emerald-200 bg-emerald-50/10"
        />
        <KPICard
          title="Churn Rate (30d)"
          value={formatPercent(m.churn_rate)}
          icon={TrendingDown}
          className={(m.churn_rate ?? 0) > 10 ? 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10/10' : 'border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10/10'}
        />
        <KPICard
          title="Velocidade Pipeline"
          value={formatDays(m.velocidade_media)}
          icon={Clock}
          className="border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10/10"
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Funil de Vendas
        </h3>
        
        <div className="space-y-3">
          {Object.entries(funilCounts).map(([fase, count]) => (
            <div key={fase} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize text-foreground">{fase}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-500"
                  style={{ width: `${barWidth(count)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Taxa de Conversão
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Lead → Qualificado</div>
            <div className="text-2xl font-bold text-violet-600">
              {formatPercent(m.taxa_conversao?.lead_to_qualificado)}
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Qualificado → Proposta</div>
            <div className="text-2xl font-bold text-violet-600">
              {formatPercent(m.taxa_conversao?.qualificado_to_proposta)}
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Proposta → Negociação</div>
            <div className="text-2xl font-bold text-violet-600">
              {formatPercent(m.taxa_conversao?.proposta_to_negociacao)}
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Negociação → Fechado</div>
            <div className="text-2xl font-bold text-violet-600">
              {formatPercent(m.taxa_conversao?.negociacao_to_fechado)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
