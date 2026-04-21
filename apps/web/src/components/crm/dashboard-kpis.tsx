"use client";

import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/modules/base/KPICard";
import { TableSkeleton } from "@/components/modules/base/TableSkeleton";
import { DollarSign, TrendingDown, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useUserProfile } from "@/lib/hooks/use-user-profile";

interface DashboardMetricas {
  total_clientes: number;
  clientes_ativos: number;
  clientes_inativos_30d: number;
  ltv_medio: number;
  churn_rate: number;
  funil_counts: {
    lead: number;
    qualificado: number;
    proposta: number;
    negociacao: number;
    fechado: number;
    perdido: number;
  };
  taxa_conversao: {
    lead_to_qualificado: number;
    qualificado_to_proposta: number;
    proposta_to_negociacao: number;
    negociacao_to_fechado: number;
  };
  velocidade_media: number;
}

async function fetchDashboardMetricas(): Promise<DashboardMetricas> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_dashboard_metricas');
  if (error) throw new Error(error.message);
  return data as DashboardMetricas;
}

export default function DashboardKPIs() {
  // Obter userId do auth para usar como guard
  const { userId } = useUserProfile();

  const { data: metricas, isLoading, error } = useQuery({
    queryKey: ['dashboard-metricas'],
    queryFn: fetchDashboardMetricas,
    enabled: !!userId, // Só executar se usuário estiver autenticado
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

  if (error) {
    return <div className="text-red-500 text-sm">Erro ao carregar métricas</div>;
  }

  if (!metricas) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const formatDays = (value: number) => `${value.toFixed(0)} dias`;

  // Gráfico de barras do funil SVG
  const maxCount = Math.max(...Object.values(metricas.funil_counts));
  const barWidth = (count: number) => (count / maxCount) * 100;

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          title="LTV Médio"
          value={formatCurrency(metricas.ltv_medio)}
          icon={DollarSign}
          className="border-emerald-200 bg-emerald-50/10"
        />
        <KPICard
          title="Churn Rate (30d)"
          value={formatPercent(metricas.churn_rate)}
          icon={TrendingDown}
          className={metricas.churn_rate > 10 ? 'border-red-200 bg-red-50/10' : 'border-green-200 bg-green-50/10'}
        />
        <KPICard
          title="Velocidade Pipeline"
          value={formatDays(metricas.velocidade_media)}
          icon={Clock}
          className="border-blue-200 bg-blue-50/10"
        />
      </div>

      {/* Gráfico de barras do funil */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Funil de Vendas
        </h3>
        
        <div className="space-y-3">
          {Object.entries(metricas.funil_counts).map(([fase, count]) => (
            <div key={fase} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize text-slate-700">{fase}</span>
                <span className="text-slate-500">{count}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-500"
                  style={{ width: `${barWidth(count)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Taxa de conversão por fase */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Taxa de Conversão
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Lead → Qualificado</div>
            <div className="text-2xl font-bold text-violet-600">
              {formatPercent(metricas.taxa_conversao.lead_to_qualificado)}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Qualificado → Proposta</div>
            <div className="text-2xl font-bold text-violet-600">
              {formatPercent(metricas.taxa_conversao.qualificado_to_proposta)}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Proposta → Negociação</div>
            <div className="text-2xl font-bold text-violet-600">
              {formatPercent(metricas.taxa_conversao.proposta_to_negociacao)}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Negociação → Fechado</div>
            <div className="text-2xl font-bold text-violet-600">
              {formatPercent(metricas.taxa_conversao.negociacao_to_fechado)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
