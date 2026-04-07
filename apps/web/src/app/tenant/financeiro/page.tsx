"use client";

import { KPICard } from "@/components/modules/base/KPICard";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCcw, Search, ExternalLink } from "lucide-react";

const recons = [
  { id: "RC-101", data: "05 Abr 2026", descricao: "PIX - João Silva", valor: "R$ 3.500,00", status: "conciliado", tipo: "entrada" },
  { id: "RC-102", data: "05 Abr 2026", descricao: "Boleto - Fornecedor X", valor: "R$ 450,00", status: "conciliado", tipo: "saida" },
  { id: "RC-103", data: "06 Abr 2026", descricao: "Cartão de Crédito - Compra não identificada", valor: "R$ 80,00", status: "pendente", tipo: "entrada" },
];

export default function FinanceiroPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financeiro & Conciliação</h2>
          <p className="text-muted-foreground">Gestão de caixa e reconciliação bancária.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-border hover:bg-slate-50 text-slate-700 h-10 px-4 py-2">
            Ver Fluxo de Caixa
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Sincronizar Banco
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Entradas (Mês)" value="R$ 45.200,00" icon={ArrowDownToLine} className="border-emerald-200" trend={{ value: 12, label: "vs mês ant", isPositive: true }} />
        <KPICard title="Saídas (Mês)" value="R$ 15.350,00" icon={ArrowUpFromLine} className="border-red-200" trend={{ value: 4, label: "vs mês ant", isPositive: false }} />
        <KPICard title="Transações Pendentes" value="14" icon={RefreshCcw} className="border-amber-200 bg-amber-50/10" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar histórico bancário..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição (Extrato)</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status Conciliação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recons.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground text-sm">{item.data}</TableCell>
                <TableCell className="font-medium text-slate-900">{item.descricao}</TableCell>
                <TableCell>
                  <span className={item.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}>
                    {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                </TableCell>
                <TableCell className={item.tipo === 'entrada' ? 'font-medium text-emerald-600' : 'font-medium text-red-600'}>
                  {item.valor}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status === 'conciliado' ? 'success' : 'warning'} label={item.status} className="capitalize" />
                </TableCell>
                <TableCell className="text-right">
                  <button className="text-slate-400 hover:text-primary p-1" title="Ver Detalhes">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
