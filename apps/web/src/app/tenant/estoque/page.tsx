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
import { PackageOpen, AlertTriangle, Boxes, Plus, Search, Filter } from "lucide-react";

// Mock Data
const estoque = [
  { id: 1, sku: "CB-USBC-100W", nome: "Cabo USB-C Baseus 100W", qtd: 15, min: 10, preco: "R$ 45,90", status: "normal" },
  { id: 2, sku: "CHG-T30W", nome: "Carregador Turbo 30W", qtd: 8, min: 15, preco: "R$ 89,00", status: "baixo" },
  { id: 3, sku: "PEL-IP15", nome: "Película de Vidro iPhone 15", qtd: 42, min: 20, preco: "R$ 35,00", status: "normal" },
  { id: 4, sku: "CAP-SIL-IP15", nome: "Capa de Silicone Transparente", qtd: 110, min: 30, preco: "R$ 25,00", status: "normal" },
  { id: 5, sku: "FON-GEO-BT", nome: "Fone Bluetooth Geonav", qtd: 2, min: 5, preco: "R$ 150,00", status: "critico" },
];

export default function EstoquePage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Estoque Inteligente</h2>
          <p className="text-muted-foreground">Controle de inventário e alertas de reposição.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-border hover:bg-slate-50 text-slate-700 h-10 px-4 py-2">
            Importar/Exportar
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Total SKUs" value="458" icon={Boxes} />
        <KPICard title="Estoque Baixo" value="12" icon={AlertTriangle} className="border-amber-200 bg-amber-50/10" />
        <KPICard title="Itens Críticos" value="3" icon={PackageOpen} className="border-red-200 bg-red-50/10" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar SKU ou nome do produto..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-md bg-white">
              <Filter className="h-4 w-4" /> Filtros
            </button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Qtd. Atual</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Preço</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estoque.map((item) => (
              <TableRow key={item.id} className="group">
                <TableCell>
                  <StatusBadge status={item.status as any} />
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                <TableCell className="font-medium text-slate-900">{item.nome}</TableCell>
                <TableCell className="text-right font-bold text-slate-700">
                  <span className={item.qtd <= item.min ? "text-red-600" : ""}>{item.qtd}</span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{item.min}</TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">{item.preco}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
