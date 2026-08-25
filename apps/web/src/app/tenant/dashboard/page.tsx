"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
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
  ShoppingBag,
  ShoppingCart,
  ClipboardCheck,
  UserPlus,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";
import { useDashboardData } from "@/lib/hooks/use-dashboard";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import BoasVindasBanner from "@/components/modules/base/BoasVindasBanner";
import AlertasRH from "@/components/modules/rh/AlertasRH";
import { FechamentoMesModal } from "@/components/modules/base/FechamentoMesModal";
import { useQueryClient } from "@tanstack/react-query";
import { type Venda } from "@/lib/api";

type SeriePonto = { name: string; total: number; lucro: number; margem: number };

// Lazy load Recharts — carregado apenas quando há dados
const LazyAreaChart = dynamic(
  () => import("recharts").then((m) => {
    const { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = m;
    return function Chart({ data, formatarMoeda }: { data: SeriePonto[]; formatarMoeda: (v: number) => string }) {
      return (
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="1 4" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                borderRadius: '4px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                boxShadow: 'var(--shadow-md)',
                fontVariantNumeric: 'tabular-nums',
              }}
              formatter={(value, name) => [
                formatarMoeda(Number(value ?? 0)),
                name === 'total' ? 'Faturamento' : 'Lucro bruto',
              ]}
            />
            <Legend
              formatter={(value) => (
                <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>
                  {value === 'total' ? 'Faturamento' : 'Lucro bruto'}
                </span>
              )}
            />
            <Area type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={1.5} fill="var(--chart-1)" fillOpacity={0.08} />
            <Line type="monotone" dataKey="lucro" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    ),
  }
);

function ChartSkeleton() {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-xs text-muted-foreground">Carregando gráfico...</p>
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

  const hoje = new Date();
  const periodoLabel = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const emissaoLabel = hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const temVendas = dashboard.modulosAtivos?.includes("vendas");
  const temFinanceiro = dashboard.modulosAtivos?.includes("financeiro");

  // Comparativo mês corrente × mês anterior a partir da série (determinístico)
  const serie = dashboard.chartData;
  const mesAtual = serie[serie.length - 1];
  const mesAnterior = serie[serie.length - 2];
  const deltaFaturamento = mesAnterior && mesAnterior.total > 0
    ? ((mesAtual?.total ?? 0) - mesAnterior.total) / mesAnterior.total * 100
    : null;
  const deltaMargemPp = mesAnterior && mesAtual
    ? mesAtual.margem - mesAnterior.margem
    : null;

  const formatarPct = (v: number) =>
    `${v >= 0 ? "+" : "\u2212"}${Math.abs(v).toFixed(1).replace(".", ",")}%`;
  const formatarPp = (v: number) =>
    `${v >= 0 ? "+" : "\u2212"}${Math.abs(v).toFixed(1).replace(".", ",")} p.p.`;

  // Sumário executivo: frases declarativas derivadas do dado, sem adjetivos
  const teses: string[] = [];
  if (temVendas && !dashboard.isLoadingChart && mesAtual) {
    if (deltaFaturamento !== null) {
      teses.push(
        `O faturamento de ${periodoLabel} soma ${formatarMoeda(dashboard.faturamentoMes)}, variação de ${formatarPct(deltaFaturamento)} sobre o mês anterior.`
      );
    } else if (dashboard.faturamentoMes > 0) {
      teses.push(`O faturamento de ${periodoLabel} soma ${formatarMoeda(dashboard.faturamentoMes)}.`);
    }
    if (dashboard.faturamentoMes > 0) {
      const frase = `A margem bruta do mês é de ${dashboard.margemBrutaMes.toFixed(1).replace(".", ",")}%` +
        (deltaMargemPp !== null ? `, ${formatarPp(deltaMargemPp)} ante o mês anterior.` : ".");
      teses.push(frase);
    }
    if (dashboard.vendasMes > 0) {
      teses.push(
        `Foram ${dashboard.vendasMes} vendas no período, com tíquete médio de ${formatarMoeda(dashboard.ticketMedioMes)}.`
      );
    }
  }
  if (temFinanceiro && dashboard.saldo < 0) {
    teses.push(`O saldo de caixa está negativo em ${formatarMoeda(Math.abs(dashboard.saldo))}.`);
  }
  if (dashboard.estoqueBaixo > 0) {
    teses.push(
      `${dashboard.estoqueBaixo} ${dashboard.estoqueBaixo === 1 ? "produto opera" : "produtos operam"} abaixo do estoque mínimo.`
    );
  }

  return (
    <div className="space-y-10">
      <FechamentoMesModal />
      {!userProfile.loading && userProfile.nome && userProfile.userId && (
        <BoasVindasBanner
          nome={userProfile.nome}
          userId={userProfile.userId}
        />
      )}

      <AlertasRH />

      {/* Cabeçalho de documento */}
      <header className="border-b border-border pb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Relatório de gestão &middot; {periodoLabel}
            </p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Visão Geral</h2>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={handleRefresh}
              disabled={dashboard.isLoading}
              data-tour="dash-refresh"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${dashboard.isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <TutorialHelpButton moduleKey="dashboard" />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground tnum">
          Emitido em {emissaoLabel} &middot; Valores em BRL &middot; Regime de competência (data da venda)
        </p>
      </header>

      {/* Sumário executivo */}
      {!dashboard.isLoading && teses.length > 0 && (
        <section aria-label="Sumário executivo" className="max-w-[68ch]">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Sumário executivo
          </h3>
          <ul className="mt-3 space-y-2">
            {teses.map((tese, i) => (
              <li key={i} className="text-[15px] leading-relaxed text-foreground">
                {tese}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Os três números do período */}
      {dashboard.isLoading ? (
        <KPISkeleton />
      ) : (
        <section
          data-tour="kpi-cards"
          aria-label="Indicadores principais"
          className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          <div className="py-6 sm:pr-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Faturamento &middot; {periodoLabel}
            </p>
            <p className="figure-display mt-3 text-4xl text-foreground">
              {temVendas ? formatarMoeda(dashboard.faturamentoMes) : "\u2014"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground tnum">
              {temVendas
                ? deltaFaturamento !== null
                  ? <>
                      <span className={deltaFaturamento >= 0 ? "text-positive font-medium" : "text-negative font-medium"}>
                        {formatarPct(deltaFaturamento)}
                      </span>{" "}
                      sobre o mês anterior &middot; hoje: {formatarMoeda(dashboard.faturamentoHoje)}
                    </>
                  : <>hoje: {formatarMoeda(dashboard.faturamentoHoje)}</>
                : "Requer o módulo de Vendas"}
            </p>
          </div>
          <div className="py-6 sm:px-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Lucro bruto &middot; {periodoLabel}
            </p>
            <p className="figure-display mt-3 text-4xl text-foreground">
              {temVendas ? formatarMoeda(dashboard.lucroBrutoMes) : "\u2014"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground tnum">
              {temVendas
                ? <>margem bruta de {dashboard.margemBrutaMes.toFixed(1).replace(".", ",")}% &middot; CMV: {formatarMoeda(dashboard.cmvMes)}</>
                : "Requer o módulo de Vendas"}
            </p>
          </div>
          <div className="py-6 sm:pl-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Saldo de caixa
            </p>
            <p className={`figure-display mt-3 text-4xl ${dashboard.saldo < 0 ? "text-negative" : "text-foreground"}`}>
              {temFinanceiro ? formatarMoeda(dashboard.saldo) : "\u2014"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground tnum">
              {temFinanceiro
                ? "posição consolidada de lançamentos concluídos"
                : "Requer o módulo Financeiro"}
            </p>
          </div>
        </section>
      )}

      {/* Posição operacional — régua tipográfica, sem molduras */}
      {!dashboard.isLoading && (
        <section aria-label="Posição operacional" className="flex flex-wrap gap-x-10 gap-y-4">
          {[
            { rotulo: "Patrimônio em estoque", valor: formatarMoeda(dashboard.patrimonioEstoque), ativo: dashboard.modulosAtivos?.includes("estoque") },
            { rotulo: "Clientes", valor: String(dashboard.totalClientes), ativo: dashboard.modulosAtivos?.includes("crm") },
            { rotulo: "OS abertas", valor: String(dashboard.osAbertas), ativo: dashboard.modulosAtivos?.includes("os") },
            { rotulo: "Obras em andamento", valor: String(dashboard.obrasEmAndamento || 0), ativo: dashboard.modulosAtivos?.includes("obras") },
            { rotulo: "Produtos em estoque baixo", valor: String(dashboard.estoqueBaixo), ativo: dashboard.modulosAtivos?.includes("estoque") },
          ].filter((item) => item.ativo).map((item) => (
            <div key={item.rotulo}>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{item.rotulo}</p>
              <p className="mt-1 text-lg font-semibold tnum text-foreground">{item.valor}</p>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        {/* Gráfico: receita e lucro na mesma composição */}
        <div className="col-span-4 border-t border-border pt-6">
          <div className="mb-4">
            <h3 className="font-heading text-lg font-semibold tracking-tight">Faturamento e lucro bruto — últimos 6 meses</h3>
            <p className="text-sm text-muted-foreground">
              Lucro bruto após custo de mercadoria (CMV); despesas operacionais não incluídas.
            </p>
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
                <TrendingUp className="h-12 w-12 text-border" />
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Nenhum dado de faturamento</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Os dados aparecerão aqui conforme as vendas forem registradas.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vendas recentes */}
        <div className="col-span-3 border-t border-border pt-6 flex flex-col">
          <div className="mb-4">
            <h3 className="font-heading text-lg font-semibold tracking-tight">Vendas recentes</h3>
            <p className="text-sm text-muted-foreground">Últimas cinco transações registradas.</p>
          </div>
          <div className="flex-1 overflow-auto">
            {dashboard.ultimasVendas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.ultimasVendas.map((v: Venda) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{v.cliente}</span>
                          <span className="text-xs text-muted-foreground tnum">{formatarData(v.criado_em)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tnum">{formatarMoeda(v.valor)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={v.status === 'concluida' ? 'success' : v.status === 'cancelada' ? 'error' : v.status === 'pendente' ? 'warning' : 'info'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex-1 flex items-center justify-center py-8">
                <div className="text-center">
                  <ShoppingBag className="h-10 w-10 text-border mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma venda registrada</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">As vendas aparecerão aqui automaticamente.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operações — subordinado à leitura, não acima dela */}
      <div className="border-t border-border pt-6">
        <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Operações</h3>
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
              disabledMessage="Requer o módulo de Vendas."
            />
            <ActionCard 
              title="Conciliar Extrato" 
              description="Analise pendências do extrato bancário." 
              icon={ClipboardCheck} 
              href="/tenant/financeiro" 
              disabled={!dashboard.modulosAtivos?.includes('financeiro')}
              disabledMessage="Requer o módulo Financeiro."
            />
            <ActionCard 
              title="Cadastrar Cliente" 
              description="Adicione um novo cliente ao CRM." 
              icon={UserPlus} 
              href="/tenant/crm" 
              disabled={!dashboard.modulosAtivos?.includes('crm')}
              disabledMessage="Requer o módulo de CRM."
            />
          </div>
        )}
      </div>

      {/* Nota metodológica */}
      <footer className="border-t border-border pt-4 pb-2 max-w-[72ch]">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Notas — Faturamento: soma do valor total de vendas não canceladas, por data de emissão (regime de competência).
          Lucro bruto: faturamento menos custo de mercadoria vendida (CMV); não considera despesas operacionais.
          Saldo de caixa: lançamentos financeiros concluídos, todas as datas. Patrimônio em estoque: quantidade × preço de custo.
        </p>
      </footer>
    </div>
  );
}
