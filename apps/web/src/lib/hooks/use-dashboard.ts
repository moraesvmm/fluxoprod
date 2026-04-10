"use client";

import { useQueries } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getHojeRange() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();
  return { inicio, fim };
}

function get6MonthsRange() {
  const d = new Date();
  d.setMonth(d.getMonth() - 5);
  const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  const fim = new Date().toISOString();
  return { inicio, fim };
}

export function useDashboardData() {
  const { inicio: inicioHoje, fim: fimHoje } = getHojeRange();
  const { inicio: inicio6m } = get6MonthsRange();

  const results = useQueries({
    queries: [
      // Query 1: Vendas de hoje (KPIs)
      {
        queryKey: ["dashboard", "vendas-hoje", inicioHoje],
        queryFn: async () => {
          const { data } = await supabase
            .from("vendas")
            .select("id, valor")
            .gte("criado_em", inicioHoje)
            .lte("criado_em", fimHoje);
          return data || [];
        },
        staleTime: 60_000,
      },
      // Query 2: Total clientes
      {
        queryKey: ["dashboard", "total-clientes"],
        queryFn: async () => {
          const { count } = await supabase
            .from("clientes")
            .select("id", { count: "exact", head: true });
          return count || 0;
        },
        staleTime: 5 * 60_000,
      },
      // Query 3: ALL vendas last 6 months (single query, group client-side)
      {
        queryKey: ["dashboard", "vendas-6m", inicio6m],
        queryFn: async () => {
          const { data } = await supabase
            .from("vendas")
            .select("valor, criado_em")
            .gte("criado_em", inicio6m)
            .order("criado_em", { ascending: true });
          return data || [];
        },
        staleTime: 5 * 60_000,
      },
      // Query 4: Últimas 5 vendas
      {
        queryKey: ["dashboard", "ultimas-vendas"],
        queryFn: async () => {
          const { data } = await supabase
            .from("vendas")
            .select("id, cliente, valor, metodo, status, criado_em")
            .order("criado_em", { ascending: false })
            .limit(5);
          return data || [];
        },
        staleTime: 60_000,
      },
    ],
  });

  const [vendasHojeQ, clientesQ, vendas6mQ, ultimasQ] = results;
  const isLoading = results.some((r) => r.isLoading);

  // Derive KPIs
  const vendasHoje = vendasHojeQ.data || [];
  const faturamentoHoje = vendasHoje.reduce((s: number, v: any) => s + (v.valor || 0), 0);
  const totalVendasHoje = vendasHoje.length;
  const ticketMedio = totalVendasHoje > 0 ? faturamentoHoje / totalVendasHoje : 0;
  const totalClientes = clientesQ.data || 0;

  // Group 6-month data client-side (replaces 6 sequential queries)
  const vendas6m = vendas6mQ.data || [];
  const chartData = (() => {
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets[key] = 0;
    }
    for (const v of vendas6m) {
      const d = new Date(v.criado_em);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in buckets) buckets[key] += v.valor || 0;
    }
    return Object.entries(buckets).map(([key, total]) => {
      const [, month] = key.split("-");
      return { name: MESES[parseInt(month)], total };
    });
  })();

  return {
    isLoading,
    faturamentoHoje,
    vendasHoje: totalVendasHoje,
    ticketMedio,
    totalClientes,
    chartData,
    ultimasVendas: ultimasQ.data || [],
  };
}
