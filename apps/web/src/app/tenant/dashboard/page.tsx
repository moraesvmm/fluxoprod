"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { KPICard } from "@/components/modules/base/KPICard";
import { ActionCard } from "@/components/modules/base/ActionCard";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import { KPISkeleton } from "@/components/modules/base/KPISkeleton";
import { CardSkeleton } from "@/components/modules/base/CardSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  ShoppingBag,
  BarChart,
  BadgeCheck,
  ShoppingCart,
  ClipboardCheck,
  UserPlus,
  TrendingUp,
  RefreshCw,
  ArrowDown,
  DollarSign,
  Wrench,
  Building2,
  Package,
} from "lucide-react";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";
import { useDashboardData } from "@/lib/hooks/use-dashboard";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import BoasVindasBanner from "@/components/modules/base/BoasVindasBanner";
import AlertasRH from "@/components/modules/rh/AlertasRH";
import { FechamentoMesModal } from "@/components/modules/base/FechamentoMesModal";
import { useQueryClient } from "@tanstack/react-query";

// Lazy load Recharts — only loaded when chart data exists
const LazyAreaChart = dynamic(
  () => import("recharts").then((m) => {
    const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = m;
    return function Chart({ data, formatarMoeda }: { data: { name: string; total: number }[]; formatarMoeda: (v: number) => string }) {
      return (
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [formatarMoeda(Number(value ?? 0)), 'Faturamento']} />
            <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      </div>
    ),
  }
);

function ChartSkeleton() {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
        <p className="text-xs text-slate-400">Carregando gráfico...</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dashboard = useDashboardData();
  const userProfile = useUserProfile();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const formatarData = (dataStr: string) =>
    new Date(dataStr).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-8">
      <FechamentoMesModal />
      {/* Banner de Boas-Vindas */}
      {!userProfile.loading && userProfile.nome && userProfile.userId && (
        <BoasVindasBanner
          nome={userProfile.nome}
          userId={userProfile.userId}
        />
      )}

      <AlertasRH />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
          <p className="text-muted-foreground">Acompanhe os principais indicadores da sua empresa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={dashboard.isLoading}
            data-tour="dash-refresh"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${dashboard.isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <TutorialHelpButton moduleKey="dashboard" />
        </div>
      </div>

      {/* KPI Cards */}
      {dashboard.isLoading ? (
        <KPISkeleton />
      ) : (
        <div 
          data-tour="kpi-cards"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
        >
          <KPICard 
            title="Faturamento (Hoje)" 
            value={formatarMoeda(dashboard.faturamentoHoje)} 
            icon={Banknote} 
            disabled={!dashboard.modulosAtivos?.includes('vendas')}
            disabledMessage="Para acompanhar seu faturamento em tempo real, adquira o módulo de Vendas."
          />
          <KPICard 
            title="Vendas (Hoje)" 
            value={String(dashboard.vendasHoje)} 
            icon={ShoppingBag} 
            disabled={!dashboard.modulosAtivos?.includes('vendas')}
            disabledMessage="Para acompanhar suas transações diárias, adquira o módulo de Vendas."
          />
          <KPICard 
            title="Ticket Médio" 
            value={formatarMoeda(dashboard.ticketMedio)} 
            icon={BarChart} 
            disabled={!dashboard.modulosAtivos?.includes('vendas')}
            disabledMessage="Para calcular seu ticket médio automático, adquira o módulo de Vendas."
          />
          <KPICard 
            title="Patrimônio em Estoque" 
            value={formatarMoeda(dashboard.patrimonioEstoque)} 
            icon={Package} 
            className="border-indigo-500/20 bg-indigo-500/5" 
            disabled={!dashboard.modulosAtivos?.includes('estoque')}
            disabledMessage="Para gerir seu capital imobilizado, adquira o módulo de Estoque."
          />
          <KPICard 
            title="Clientes" 
            value={String(dashboard.totalClientes)} 
            icon={BadgeCheck} 
            disabled={!dashboard.modulosAtivos?.includes('crm')}
            disabledMessage="Para gerir sua base de clientes, adquira o módulo de CRM."
          />
          <KPICard 
            title="OS Abertas" 
            value={String(dashboard.osAbertas)} 
            icon={Wrench} 
            className="border-amber-500/20 bg-amber-500/5" 
            disabled={!dashboard.modulosAtivos?.includes('os')}
            disabledMessage="Para gerir suas ordens de serviço, adquira o módulo de OS."
          />
          <KPICard 
            title="Obras em Andamento" 
            value={String(dashboard.obrasEmAndamento || 0)} 
            icon={Building2} 
            className="border-blue-500/20 bg-blue-500/5" 
            disabled={!dashboard.modulosAtivos?.includes('obras')}
            disabledMessage="Para gerir seus projetos e obras, adquira o módulo de Obras."
          />
        </div>
      )}

      {/* Action Cards */}
      <div>
        <h3 className="mb-4 text-lg font-medium tracking-tight">Ações Rápidas</h3>
        {dashboard.isLoading ? (
          <CardSkeleton count={3} />
        ) : (
          <div data-tour="dash-actions" className="grid gap-4 sm:grid-cols-3">
            <ActionCard 
              title="Nova Venda" 
              description="Abra o PDV para registrar uma nova transação." 
              icon={ShoppingCart} 
              href="/tenant/vendas/pdv" 
              disabled={!dashboard.modulosAtivos?.includes('vendas')}
              disabledMessage="Adquira o módulo de Vendas para utilizar o PDV Nativo."
            />
            <ActionCard 
              title="Conciliar Extrato" 
              description="Analise pendências do extrato bancário." 
              icon={ClipboardCheck} 
              href="/tenant/financeiro" 
              disabled={!dashboard.modulosAtivos?.includes('financeiro')}
              disabledMessage="Adquira o módulo Financeiro para utilizar a conciliação bancária."
            />
            <ActionCard 
              title="Cadastrar Cliente" 
              description="Adicione um novo cliente ao CRM." 
              icon={UserPlus} 
              href="/tenant/crm" 
              disabled={!dashboard.modulosAtivos?.includes('crm')}
              disabledMessage="Adquira o módulo CRM para gerir sua base de clientes."
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <div className="col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold tracking-tight">Faturamento (Últimos 6 Meses)</h3>
            <p className="text-sm text-muted-foreground">Evolução de receitas.</p>
          </div>
          <div className="h-[300px] w-full min-h-[300px] flex items-center justify-center">
            {dashboard.isLoadingChart ? (
              <ChartSkeleton />
            ) : Array.isArray(dashboard.chartData) && dashboard.chartData.some((d) => d.total > 0) ? (
              <Suspense fallback={<ChartSkeleton />}>
                <LazyAreaChart data={dashboard.chartData} formatarMoeda={formatarMoeda} />
              </Suspense>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <TrendingUp className="h-12 w-12 text-slate-200" />
                <div>
                  <p className="text-sm text-slate-500 font-medium">Nenhum dado de faturamento</p>
                  <p className="text-xs text-slate-400 mt-0.5">Os dados aparecerão aqui conforme as vendas forem registradas.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Latest Sales */}
        <div className="col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold tracking-tight">Últimas Vendas</h3>
              <p className="text-sm text-muted-foreground">Movimentações recentes.</p>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {dashboard.ultimasVendas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.ultimasVendas.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{v.cliente}</span>
                          <span className="text-xs text-muted-foreground">{formatarData(v.criado_em)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatarMoeda(v.valor)}</TableCell>
                      <TableCell>
                        <StatusBadge status={v.status as any} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex-1 flex items-center justify-center py-8">
                <div className="text-center">
                  <ShoppingBag className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Nenhuma venda registrada</p>
                  <p className="text-xs text-slate-400 mt-0.5">As vendas aparecerão aqui automaticamente.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
