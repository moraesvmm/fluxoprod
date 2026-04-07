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
import { Users, UserX, AlertCircle, Plus, Search, MessageCircle } from "lucide-react";

// Mock Data
const clientes = [
  { id: 1, nome: "João Silva", telefone: "(11) 98765-4321", email: "joao.silva@email.com", utlima_compra: "Há 2 dias", status: "ativo" },
  { id: 2, nome: "Maria Oliveira", telefone: "(11) 91234-5678", email: "maria@email.com", utlima_compra: "Há 35 dias", status: "inativo" },
  { id: 3, nome: "Empresa XPTO Ltda", telefone: "(11) 3214-5566", email: "contato@xpto.com.br", utlima_compra: "Há 65 dias", status: "risco" },
];

export default function CRMPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clientes & CRM</h2>
          <p className="text-muted-foreground">Gestão de relacionamento e campanhas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2">
            <MessageCircle className="mr-2 h-4 w-4" />
            Campanha em Massa
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Clientes Ativos" value="245" icon={Users} trend={{ value: 12, label: "vs mês ant", isPositive: true }} />
        <KPICard title="Inativos (30D+)" value="32" icon={UserX} className="border-amber-200 bg-amber-50/10" />
        <KPICard title="Em Risco (60D+)" value="8" icon={AlertCircle} className="border-red-200 bg-red-50/10" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, telefone ou email..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Última Compra</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-slate-900">{item.nome}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{item.telefone}</span>
                    <span className="text-xs text-muted-foreground">{item.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-500">{item.utlima_compra}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status === 'ativo' ? 'success' : item.status === 'inativo' ? 'warning' : 'error'} label={item.status} className="capitalize" />
                </TableCell>
                <TableCell className="text-right">
                  <button className="text-emerald-600 hover:text-emerald-700 p-1" title="WhatsApp">
                    <MessageCircle className="h-4 w-4" />
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
