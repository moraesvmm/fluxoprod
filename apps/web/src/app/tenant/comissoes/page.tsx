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
import { DollarSign, Plus, Search, Percent, Calculator, Calendar, Wallet } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type ComissaoStatus = "pendente" | "pago" | "cancelado";
type TipoCalculo = "percentual" | "valor_fixo";

export default function ComissoesPage() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"regras" | "historico">("regras");
  const supabase = createClient();

  // Mock data - will be replaced with real data from Supabase
  const regrasComissao = [
    { id: 1, colaborador: "Carlos Mecânico", tipo: "percentual" as TipoCalculo, valor: 10, ativo: true },
    { id: 2, colaborador: "Ana Eletricista", tipo: "percentual" as TipoCalculo, valor: 8, ativo: true },
    { id: 3, colaborador: "Pedro Pintor", tipo: "valor_fixo" as TipoCalculo, valor: 50, ativo: false },
  ];

  const historicoComissoes = [
    { id: 1, colaborador: "Carlos Mecânico", venda: "Venda #1025", valor_venda: "R$ 3.500,00", valor_comissao: "R$ 350,00", periodo: "Abr/2026", status: "pendente" as ComissaoStatus },
    { id: 2, colaborador: "Ana Eletricista", venda: "Venda #1024", valor_venda: "R$ 1.200,00", valor_comissao: "R$ 96,00", periodo: "Abr/2026", status: "pendente" as ComissaoStatus },
    { id: 3, colaborador: "Carlos Mecânico", venda: "Venda #1020", valor_venda: "R$ 2.800,00", valor_comissao: "R$ 280,00", periodo: "Mar/2026", status: "pago" as ComissaoStatus },
  ];

  const statusConfig = {
    pendente: { color: "text-amber-600", bg: "bg-amber-50", label: "Pendente" },
    pago: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Pago" },
    cancelado: { color: "text-red-600", bg: "bg-red-50", label: "Cancelado" },
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comissões</h2>
          <p className="text-muted-foreground">Regras de comissão e cálculo automático por colaborador.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Regra
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Total a Pagar" value="R$ 4.150,00" icon={Wallet} className="border-amber-200 bg-amber-50/10" />
        <KPICard title="Pago no Mês" value="R$ 12.300,00" icon={DollarSign} className="border-emerald-200 bg-emerald-50/10" />
        <KPICard title="Média por Colaborador" value="R$ 1.380,00" icon={Calculator} />
        <KPICard title="Colaboradores Ativos" value="8" icon={Percent} />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("regras")}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "regras" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Regras de Comissão
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "historico" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Histórico de Pagamentos
          </button>
        </nav>
      </div>

      {/* Tab: Regras */}
      {activeTab === "regras" && (
        <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-sm">Regras de Comissão Ativas</h3>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar colaborador..."
                className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo de Cálculo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regrasComissao.map((regra) => (
                <TableRow key={regra.id}>
                  <TableCell className="font-medium">{regra.colaborador}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {regra.tipo === "percentual" ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                      {regra.tipo === "percentual" ? "Percentual" : "Valor Fixo"}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {regra.tipo === "percentual" ? `${regra.valor}%` : `R$ ${regra.valor.toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={regra.ativo ? "success" : "warning"} label={regra.ativo ? "Ativa" : "Inativa"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <button className="text-slate-400 hover:text-primary p-1 transition-colors">Editar</button>
                    <button className="text-slate-400 hover:text-red-500 p-1 transition-colors ml-1">Desativar</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === "historico" && (
        <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar colaborador ou venda..."
                  className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>Todos os períodos</option>
                  <option>Abril 2026</option>
                  <option>Março 2026</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option>Todos os status</option>
                <option>Pendente</option>
                <option>Pago</option>
                <option>Cancelado</option>
              </select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Valor da Venda</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicoComissoes.map((comissao) => {
                const config = statusConfig[comissao.status];
                return (
                  <TableRow key={comissao.id}>
                    <TableCell className="font-medium">{comissao.colaborador}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{comissao.venda}</TableCell>
                    <TableCell className="font-medium">{comissao.valor_venda}</TableCell>
                    <TableCell className="font-bold text-emerald-600">{comissao.valor_comissao}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{comissao.periodo}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border border-black/5 shadow-sm ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {comissao.status === "pendente" && (
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Marcar Pago</button>
                      )}
                      {comissao.status === "pago" && (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal de Nova Regra - Simplificado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Nova Regra de Comissão</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Selecione...</option>
                  <option>Carlos Mecânico</option>
                  <option>Ana Eletricista</option>
                  <option>Pedro Pintor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cálculo</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="percentual">Percentual</option>
                  <option value="valor_fixo">Valor Fixo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: 10" />
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
                Criar Regra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
