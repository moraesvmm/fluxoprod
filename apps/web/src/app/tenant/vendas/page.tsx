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
import { Banknote, ShoppingBag, BarChart, CreditCard, Plus, Search, FileText } from "lucide-react";
import Link from "next/link";

const transacoes = [
  { id: "TRX-1025", cliente: "Cliente Avulso", data: "06 Abr 2026, 14:30", valor: "R$ 450,00", status: "concluido", metodo: "PIX" },
  { id: "TRX-1024", cliente: "Empresa XPTO Ltda", data: "06 Abr 2026, 11:15", valor: "R$ 1.200,00", status: "concluido", metodo: "Boleto" },
  { id: "TRX-1023", cliente: "Maria Oliveira", data: "06 Abr 2026, 09:45", valor: "R$ 80,00", status: "pendente", metodo: "Cartão de Crédito" },
  { id: "TRX-1022", cliente: "João Silva", data: "05 Abr 2026, 16:20", valor: "R$ 3.500,00", status: "concluido", metodo: "PIX" },
  { id: "TRX-1021", cliente: "Cliente Avulso", data: "05 Abr 2026, 14:10", valor: "R$ 210,00", status: "concluido", metodo: "Dinheiro" },
];

export default function VendasPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Histórico de Vendas</h2>
          <p className="text-muted-foreground">Listagem de todas as transações e emissão de notas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tenant/vendas/pdv"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda (PDV)
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Vendas (Hoje)" value="R$ 5.750,00" icon={Banknote} trend={{ value: 8, label: "vs ont", isPositive: true }} />
        <KPICard title="Transações" value="12" icon={ShoppingBag} trend={{ value: 2, label: "vs ont", isPositive: false }} />
        <KPICard title="Ticket Médio" value="R$ 479,16" icon={BarChart} trend={{ value: 5, label: "vs ont", isPositive: true }} />
        <KPICard title="Método Favorito" value="PIX (65%)" icon={CreditCard} />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar recibo, cliente ou data..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-md bg-white">
            Filtrar
          </button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transação</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transacoes.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.cliente}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.data}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.metodo}</TableCell>
                <TableCell className="font-medium text-slate-900">{item.valor}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status as any} />
                </TableCell>
                <TableCell className="text-right">
                  <button className="text-slate-400 hover:text-primary transition-colors p-1" title="Gerar Recibo PDF">
                    <FileText className="h-4 w-4" />
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
