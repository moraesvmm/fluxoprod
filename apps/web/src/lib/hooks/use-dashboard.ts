"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useUserProfile } from "./use-user-profile";
import type { Database } from "@/types/database.types";
import type { Venda } from "@/lib/api";

// Cliente estrito — integra com o contrato Database
const supabase = createClient() as import('@supabase/supabase-js').SupabaseClient<Database>;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Tipos derivados dos retornos de RPC
interface DashboardKPI {
  faturamento_hoje?: number;
  qtd_vendas_hoje?: number;
  faturamento_mes?: number;
  cmv_mes?: number;
  lucro_bruto_mes?: number;
  qtd_vendas_mes?: number;
  total_vendas?: number;
  qtd_vendas?: number;
  qtd_clientes?: number;
  qtd_produtos?: number;
  qtd_os_abertas?: number;
  qtd_obras_em_andamento?: number;
  estoque_baixo?: number;
  saldo?: number;
  patrimonio_estoque?: number;
}

interface KPIPorMes {
  mes: string;
  faturamento: number;
  cmv?: number;
  lucro_bruto?: number;
  margem_bruta?: number;
  total_vendas: number;
  ticket_medio: number;
}

export interface FechamentoPendente {
  mes: string;
  pendente: boolean;
  faturamento: number;
  total_vendas: number;
  ticket_medio: number;
}

export function useActiveModules() {
  const { userId } = useUserProfile();

  return useQuery({
    queryKey: ["modulos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_empresa_modulos')
        .select('modulo_key')
        .eq('ativo', true);
      if (error) throw error;
      return data?.map(m => m.modulo_key) || [];
    },
    staleTime: 30 * 1000,
    retry: 2,
    enabled: !!userId,
  });
}

export function useDashboardData() {
  const { userId } = useUserProfile();
  const { data: modulosAtivos } = useActiveModules();

  const { data: kpisRaw, isLoading, error } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_dashboard_kpis');
      if (error) throw error;
      return (data as unknown as DashboardKPI[]) || [];
    },
    staleTime: 5 * 60_000,
    retry: 2,
    enabled: !!userId,
  });

  const { data: ultimasVendas, error: vendasError } = useQuery({
    queryKey: ["dashboard", "ultimas-vendas"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_listar_vendas', { p_limit: 5 });
      if (error) throw error;
      return (data as unknown as Venda[]) || [];
    },
    staleTime: 60_000,
    retry: 2,
    enabled: !!userId,
  });

  const { data: kpisPorMes, isLoading: isLoadingChart } = useQuery({
    queryKey: ["dashboard", "kpis-por-mes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_dashboard_kpis_por_mes', { p_meses: 6 });
      if (error) throw error;
      return (data as unknown as KPIPorMes[]) || [];
    },
    staleTime: 5 * 60_000,
    retry: 2,
    enabled: !!userId,
  });

  const kpis = kpisRaw?.[0];
  const faturamentoHoje = kpis?.faturamento_hoje ?? 0;
  const vendasHoje = kpis?.qtd_vendas_hoje ?? 0;
  const faturamentoMes = kpis?.faturamento_mes ?? 0;
  const cmvMes = kpis?.cmv_mes ?? 0;
  const lucroBrutoMes = kpis?.lucro_bruto_mes ?? (faturamentoMes - cmvMes);
  const margemBrutaMes = faturamentoMes > 0 ? (lucroBrutoMes / faturamentoMes) * 100 : 0;
  const vendasMes = kpis?.qtd_vendas_mes ?? 0;
  const ticketMedioMes = vendasMes > 0 ? faturamentoMes / vendasMes : 0;
  const totalClientes = kpis?.qtd_clientes || 0;
  const totalProdutos = kpis?.qtd_produtos || 0;
  const osAbertas = kpis?.qtd_os_abertas || 0;
  const obrasEmAndamento = kpis?.qtd_obras_em_andamento || 0;
  const estoqueBaixo = kpis?.estoque_baixo || 0;
  const saldo = kpis?.saldo || 0;
  const patrimonioEstoque = kpis?.patrimonio_estoque || 0;

  const chartData = (kpisPorMes || []).map(item => {
    const [, monthStr] = item.mes.split('-');
    const faturamento = item.faturamento ?? 0;
    const lucro = item.lucro_bruto ?? (faturamento - (item.cmv ?? 0));
    return {
      name: MESES[parseInt(monthStr, 10) - 1] ?? item.mes,
      mes: item.mes,
      total: faturamento,
      lucro,
      margem: item.margem_bruta ?? (faturamento > 0 ? (lucro / faturamento) * 100 : 0),
    };
  });

  return {
    isLoading: isLoading || !kpisRaw,
    isLoadingChart,
    error: error || vendasError,
    faturamentoHoje,
    vendasHoje,
    faturamentoMes,
    cmvMes,
    lucroBrutoMes,
    margemBrutaMes,
    vendasMes,
    ticketMedioMes,
    totalClientes,
    totalProdutos,
    osAbertas,
    obrasEmAndamento,
    estoqueBaixo,
    saldo,
    patrimonioEstoque,
    chartData,
    ultimasVendas: ultimasVendas || [],
    modulosAtivos: modulosAtivos || [],
  };
}

export function useFechamentoPendente() {
  const { userId } = useUserProfile();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["dashboard", "fechamento-pendente"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_obter_fechamento_pendente');
      if (error) throw error;
      return (data as unknown as FechamentoPendente | null);
    },
    enabled: !!userId,
    staleTime: 60 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (mes: string) => {
      const { error } = await supabase.rpc('tenant_marcar_fechamento_visto', { p_mes: mes });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", "fechamento-pendente"] });
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    marcarVisto: mutation.mutateAsync,
    isMarking: mutation.isPending
  };
}
