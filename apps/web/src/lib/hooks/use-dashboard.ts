"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useUserProfile } from "./use-user-profile";

const supabase = createClient();
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function useDashboardData() {
  // Obter userId do auth para usar como guard
  const { userId } = useUserProfile();

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
    enabled: !!userId, // Só executar se usuário estiver autenticado
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
    enabled: !!userId, // Só executar se usuário estiver autenticado
  });

  // Buscar módulos ativos para validar feature flags
  const { data: modulosAtivos } = useQuery({
    queryKey: ["modulos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_empresa_modulos')
        .select('modulo_key')
        .eq('ativo', true);
      if (error) throw error;
      return data?.map(m => m.modulo_key) || [];
    },
    staleTime: 10 * 60_000,
    retry: 2,
    enabled: !!userId, // Só executar se usuário estiver autenticado
  });

  // Série temporal real: faturamento dos últimos 6 meses por mês
  const { data: kpisPorMes, isLoading: isLoadingChart } = useQuery({
    queryKey: ["dashboard", "kpis-por-mes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_dashboard_kpis_por_mes', { p_meses: 6 });
      if (error) throw error;
      // Normalização defensiva: garantir que sempre retorne array
      const normalized = Array.isArray(data) ? data : (data?.data ?? data?.kpis ?? []);
      return (normalized as Array<{ mes: string; faturamento: number; total_vendas: number; ticket_medio: number }>) || [];
    },
    staleTime: 5 * 60_000,
    retry: 2,
    enabled: !!userId, // Só executar se usuário estiver autenticado
  });

  // Derive KPIs a partir do resultado da RPC
  const faturamentoHoje = kpis?.[0]?.total_vendas || 0;
  const vendasHoje = kpis?.[0]?.qtd_vendas || 0;
  const ticketMedio = vendasHoje > 0 ? faturamentoHoje / vendasHoje : 0;
  const totalClientes = kpis?.[0]?.qtd_clientes || 0;
  const totalProdutos = kpis?.[0]?.qtd_produtos || 0;
  const osAbertas = kpis?.[0]?.qtd_os_abertas || 0;
  const obrasEmAndamento = kpis?.[0]?.qtd_obras_em_andamento || 0;
  const estoqueBaixo = kpis?.[0]?.estoque_baixo || 0;
  const saldo = kpis?.[0]?.saldo || 0;

  // Dados do gráfico a partir da RPC de série temporal (sem Math.random)
  const chartData = (kpisPorMes || []).map(item => {
    const [, monthStr] = item.mes.split('-');
    return {
      name: MESES[parseInt(monthStr, 10) - 1] ?? item.mes,
      total: item.faturamento ?? 0,
    };
  });

  return {
    isLoading: isLoading || !kpis,
    isLoadingChart,
    error: error || vendasError,
    faturamentoHoje,
    vendasHoje,
    ticketMedio,
    totalClientes,
    totalProdutos,
    osAbertas,
    obrasEmAndamento,
    estoqueBaixo,
    saldo,
    chartData,
    ultimasVendas: ultimasVendas || [],
    modulosAtivos: modulosAtivos || [],
  };
}
