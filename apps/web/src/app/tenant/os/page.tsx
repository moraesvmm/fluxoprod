"use client";

import { useState } from "react";
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
import { Wrench, Plus, Search, Eye, Edit, Clock, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type OSStatus = "aberta" | "em_execucao" | "concluida" | "cancelada";

export default function OSPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<any>(null);
  const supabase = createClient();

  // Mock data - will be replaced with real data from Supabase
  const ordensServico = [
    { id: 1, numero: "OS-001", cliente: "João Silva", veiculo: "Honda Civic 2020", problema: "Barulho no motor", status: "aberta" as OSStatus, valor: "R$ 0,00", criado_em: "06 Abr 2026" },
    { id: 2, numero: "OS-002", cliente: "Maria Oliveira", veiculo: "Toyota Corolla 2019", problema: "Troca de óleo", status: "em_execucao" as OSStatus, valor: "R$ 350,00", criado_em: "05 Abr 2026" },
    { id: 3, numero: "OS-003", cliente: "Empresa XPTO", veiculo: "Fiat Fiorino", problema: "Freio traseiro", status: "concluida" as OSStatus, valor: "R$ 1.200,00", criado_em: "04 Abr 2026" },
  ];

  const statusConfig = {
    aberta: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    em_execucao: { icon: Wrench, color: "text-blue-600", bg: "bg-blue-50" },
    concluida: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    cancelada: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h2>
          <p className="text-muted-foreground">Gestão de ordens de serviço e histórico.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova OS
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Abertas" value="12" icon={Clock} className="border-amber-200 bg-amber-50/10" />
        <KPICard title="Em Execução" value="8" icon={Wrench} className="border-blue-200 bg-blue-50/10" />
        <KPICard title="Concluídas" value="45" icon={CheckCircle} className="border-emerald-200 bg-emerald-50/10" />
        <KPICard title="Canceladas" value="3" icon={XCircle} className="border-red-200 bg-red-50/10" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por cliente, veículo ou número..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Veículo/Equipamento</TableHead>
              <TableHead>Problema</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordensServico.map((os) => {
              const config = statusConfig[os.status];
              const Icon = config.icon;
              return (
                <TableRow key={os.id}>
                  <TableCell className="font-medium">{os.numero}</TableCell>
                  <TableCell>{os.cliente}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{os.veiculo}</TableCell>
                  <TableCell className="text-sm">{os.problema}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border border-black/5 shadow-sm ${config.bg} ${config.color}`}>
                      <Icon className="h-3 w-3" />
                      {os.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{os.valor}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{os.criado_em}</TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => setSelectedOS(os)}
                      className="text-slate-400 hover:text-primary p-1 transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-slate-400 hover:text-primary p-1 transition-colors ml-1" title="Editar">
                      <Edit className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Nova OS - Simplificado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Nova Ordem de Serviço</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Selecione...</option>
                  <option>João Silva</option>
                  <option>Maria Oliveira</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Veículo/Equipamento</label>
                <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Honda Civic 2020" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Problema</label>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" rows={3} placeholder="Descreva o problema..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador Responsável</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Selecione...</option>
                  <option>Carlos Mecânico</option>
                  <option>Ana Eletricista</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                Criar OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
