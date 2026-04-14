"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function useDashboardData() {
  // Usar RPC tenant_dashboard_kpis para obter todos os KPIs calculados no banco
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_dashboard_kpis');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
    retry: 2,
  });

  // Buscar últimas vendas separadamente (já existe RPC para isso)
  const { data: ultimasVendas, error: vendasError } = useQuery({
    queryKey: ["dashboard", "ultimas-vendas"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_listar_vendas', { p_limit: 5 });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
    retry: 2,
  });

  // Derive KPIs a partir do resultado da RPC
  const faturamentoHoje = kpis?.[0]?.total_vendas || 0;
  const vendasHoje = kpis?.[0]?.qtd_vendas || 0;
  const ticketMedio = vendasHoje > 0 ? faturamentoHoje / vendasHoje : 0;
  const totalClientes = kpis?.[0]?.qtd_clientes || 0;
  const totalProdutos = kpis?.[0]?.qtd_produtos || 0;
  const osAbertas = kpis?.[0]?.qtd_os_abertas || 0;
  const estoqueBaixo = kpis?.[0]?.estoque_baixo || 0;
  const saldo = kpis?.[0]?.saldo || 0;

  // Gerar dados do gráfico (simplificado - apenas dados agregados)
  const chartData = (() => {
    // Como a RPC retorna dados agregados dos últimos 6 meses,
    // vamos gerar dados dummy para o gráfico por enquanto
    // Em uma implementação completa, a RPC deveria retornar dados mensais
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      // Distribuir o faturamento total dos últimos 6 meses
      buckets[key] = (faturamentoHoje / 6) * (1 + Math.random() * 0.5);
    }
    return Object.entries(buckets).map(([key, total]) => {
      const [, month] = key.split("-");
      return { name: MESES[parseInt(month)], total };
    });
  })();

  return {
    isLoading: isLoading || !kpis,
    error: error || vendasError,
    faturamentoHoje,
    vendasHoje,
    ticketMedio,
    totalClientes,
    totalProdutos,
    osAbertas,
    estoqueBaixo,
    saldo,
    chartData,
    ultimasVendas: ultimasVendas || [],
  };
}
