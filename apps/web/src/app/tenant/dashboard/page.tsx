"use client";

import { KPICard } from "@/components/modules/base/KPICard";
import { ActionCard } from "@/components/modules/base/ActionCard";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Banknote,
  ShoppingBag,
  BarChart,
  BadgeCheck,
  ShoppingCart,
  ClipboardCheck,
  UserPlus,
} from "lucide-react";

// Dados mockados para o gráfico
const data = [
  { name: "Jan", total: 45000 },
  { name: "Fev", total: 52000 },
  { name: "Mar", total: 48000 },
  { name: "Abr", total: 61000 },
  { name: "Mai", total: 59000 },
  { name: "Jun", total: 67000 },
  { name: "Jul", total: 72000 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
        <p className="text-muted-foreground">
          Acompanhe os principais indicadores da sua empresa.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Faturamento (Hoje)"
          value="R$ 4.520,00"
          icon={Banknote}
          trend={{ value: 12, label: "vs ont", isPositive: true }}
        />
        <KPICard
          title="Vendas"
          value="45"
          icon={ShoppingBag}
          trend={{ value: 5, label: "vs ont", isPositive: true }}
        />
        <KPICard
          title="Ticket Médio"
          value="R$ 100,44"
          icon={BarChart}
          trend={{ value: 2, label: "vs ont", isPositive: false }}
        />
        <KPICard
          title="Conciliação Bancária"
          value="98%"
          icon={BadgeCheck}
          trend={{ value: 1, label: "este mês", isPositive: true }}
        />
      </div>

      {/* Action Cards */}
      <div>
        <h3 className="mb-4 text-lg font-medium tracking-tight">Ações Rápidas</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard
            title="Nova Venda"
            description="Abra o PDV para registrar uma nova transação."
            icon={ShoppingCart}
            href="/tenant/vendas/pdv"
          />
          <ActionCard
            title="Conciliar Extrato"
            description="Analise pendências do extrato bancário."
            icon={ClipboardCheck}
            href="/tenant/financeiro/reconciliacao"
          />
          <ActionCard
            title="Cadastrar Cliente"
            description="Adicione um novo cliente ao CRM."
            icon={UserPlus}
            href="/tenant/crm/novo"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Gráfico */}
        <div className="col-span-4 rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold tracking-tight">Faturamento (Histórico Mensal)</h3>
            <p className="text-sm text-muted-foreground">Evolução de receitas nos últimos 7 meses.</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `R$${(value / 1000)}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Faturamento']}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Últimas Transações */}
        <div className="col-span-3 rounded-xl border border-border bg-white p-6 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold tracking-tight">Últimas Transações</h3>
              <p className="text-sm text-muted-foreground">Movimentações de hoje.</p>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: "TRX-001", val: "R$ 450,00", status: "concluido" },
                  { id: "TRX-002", val: "R$ 1.200,00", status: "concluido" },
                  { id: "TRX-003", val: "R$ 80,00", status: "pendente" },
                  { id: "TRX-004", val: "R$ 3.500,00", status: "concluido" },
                  { id: "TRX-005", val: "R$ 210,00", status: "concluido" },
                ].map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-700">{item.id}</TableCell>
                    <TableCell>{item.val}</TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={item.status as any} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
