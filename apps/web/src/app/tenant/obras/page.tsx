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
import { Building2, Plus, Search, Eye, Edit, Calendar, MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type ObraStatus = "planejada" | "em_andamento" | "concluida" | "cancelada" | "paralisada";

export default function ObrasPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedObra, setSelectedObra] = useState<any>(null);
  const supabase = createClient();

  // Mock data - will be replaced with real data from Supabase
  const obras = [
    { id: 1, nome: "Reforma Residencial Silva", cliente: "João Silva", endereco: "Rua A, 123 - Centro", data_inicio: "01/03/2026", data_fim_prevista: "30/04/2026", status: "em_andamento" as ObraStatus, orcamento: "R$ 85.000,00" },
    { id: 2, nome: "Construção Galpão XPTO", cliente: "Empresa XPTO Ltda", endereco: "Av. Industrial, 500", data_inicio: "15/02/2026", data_fim_prevista: "15/06/2026", status: "em_andamento" as ObraStatus, orcamento: "R$ 250.000,00" },
    { id: 3, nome: "Pintura Comercial", cliente: "Maria Oliveira", endereco: "Rua B, 456", data_inicio: "10/04/2026", data_fim_prevista: "20/04/2026", status: "planejada" as ObraStatus, orcamento: "R$ 12.000,00" },
  ];

  const statusConfig = {
    planejada: { color: "text-slate-600", bg: "bg-slate-50", label: "Planejada" },
    em_andamento: { color: "text-blue-600", bg: "bg-blue-50", label: "Em Andamento" },
    concluida: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Concluída" },
    cancelada: { color: "text-red-600", bg: "bg-red-50", label: "Cancelada" },
    paralisada: { color: "text-amber-600", bg: "bg-amber-50", label: "Paralisada" },
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Obras e Projetos</h2>
          <p className="text-muted-foreground">Gestão de obras com integração com OS e vendas.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Obra
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Planejadas" value="5" icon={Calendar} className="border-slate-200 bg-slate-50/10" />
        <KPICard title="Em Andamento" value="8" icon={Building2} className="border-blue-200 bg-blue-50/10" />
        <KPICard title="Concluídas" value="23" icon={Building2} className="border-emerald-200 bg-emerald-50/10" />
        <KPICard title="Investimento Total" value="R$ 1.2M" icon={Building2} />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, cliente ou endereço..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Obra</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim Previsto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orçamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {obras.map((obra) => {
              const config = statusConfig[obra.status];
              return (
                <TableRow key={obra.id}>
                  <TableCell className="font-medium">{obra.nome}</TableCell>
                  <TableCell>{obra.cliente}</TableCell>
                  <TableCell className="text-muted-foreground text-sm flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {obra.endereco}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{obra.data_inicio}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{obra.data_fim_prevista}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border border-black/5 shadow-sm ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{obra.orcamento}</TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => setSelectedObra(obra)}
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

      {/* Modal de Nova Obra - Simplificado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Nova Obra</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Obra</label>
                <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Reforma Residencial Silva" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Selecione...</option>
                  <option>João Silva</option>
                  <option>Maria Oliveira</option>
                  <option>Empresa XPTO Ltda</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Rua A, 123 - Centro" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                  <input type="date" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim Prevista</label>
                  <input type="date" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Orçamento Total</label>
                <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="R$ 0,00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" rows={3} placeholder="Descrição detalhada da obra..." />
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
                Criar Obra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
