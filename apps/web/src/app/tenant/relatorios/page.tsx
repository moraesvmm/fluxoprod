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
import { FileText, Download, Filter, Calendar, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type ReportType = "vendas" | "financeiro" | "estoque" | "crm";

export default function RelatoriosPage() {
  const [reportType, setReportType] = useState<ReportType>("vendas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Mock data - will be replaced with real data from Supabase views
  const reportData = {
    vendas: [
      { id: 1, data: "06 Abr 2026", cliente: "João Silva", valor: "R$ 3.500,00", metodo: "PIX", status: "concluido" },
      { id: 2, data: "05 Abr 2026", cliente: "Empresa XPTO", valor: "R$ 1.200,00", metodo: "Boleto", status: "concluido" },
      { id: 3, data: "05 Abr 2026", cliente: "Maria Oliveira", valor: "R$ 450,00", metodo: "Cartão", status: "pendente" },
    ],
    financeiro: [
      { id: 1, data: "05 Abr 2026", tipo: "receber", descricao: "PIX - João Silva", valor: "R$ 3.500,00", vencimento: "05/04/2026", status: "conciliado" },
      { id: 2, data: "05 Abr 2026", tipo: "pagar", descricao: "Fornecedor X", valor: "R$ 450,00", vencimento: "10/04/2026", status: "pendente" },
    ],
    estoque: [
      { id: 1, sku: "CB-USBC-100W", produto: "Cabo USB-C Baseus 100W", qtd: 15, min: 10, status: "normal" },
      { id: 2, sku: "CHG-T30W", produto: "Carregador Turbo 30W", qtd: 8, min: 15, status: "baixo" },
      { id: 3, sku: "FON-GEO-BT", produto: "Fone Bluetooth Geonav", qtd: 2, min: 5, status: "critico" },
    ],
    crm: [
      { id: 1, nome: "João Silva", email: "joao@email.com", telefone: "(11) 98765-4321", fase: "cliente", status: "ativo" },
      { id: 2, nome: "Maria Oliveira", email: "maria@email.com", telefone: "(11) 91234-5678", fase: "lead", status: "inativo" },
    ],
  };

  const handleExport = (format: "csv" | "pdf") => {
    // TODO: Implement export functionality
    console.log(`Exporting ${reportType} as ${format}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">Consolidação e exportação de dados.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-border hover:bg-slate-50 text-slate-700 h-10 px-4 py-2"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Relatório</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="vendas">Vendas</option>
              <option value="financeiro">Financeiro</option>
              <option value="estoque">Estoque</option>
              <option value="crm">CRM</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2">
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </button>
        </div>
      </div>

      {/* KPIs por tipo de relatório */}
      {reportType === "vendas" && (
        <div className="grid gap-4 sm:grid-cols-4">
          <KPICard title="Total Vendas" value="R$ 15.150,00" icon={FileText} />
          <KPICard title="Transações" value="156" icon={FileText} />
          <KPICard title="Ticket Médio" value="R$ 97,12" icon={FileText} />
          <KPICard title="Conversão" value="78%" icon={FileText} />
        </div>
      )}

      {/* Tabela de dados */}
      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {reportType === "vendas" && (
                <>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                </>
              )}
              {reportType === "financeiro" && (
                <>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </>
              )}
              {reportType === "estoque" && (
                <>
                  <TableHead>Status</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                </>
              )}
              {reportType === "crm" && (
                <>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Fase do Funil</TableHead>
                  <TableHead>Status</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData[reportType].map((item: any) => (
              <TableRow key={item.id}>
                {reportType === "vendas" && (
                  <>
                    <TableCell className="text-muted-foreground text-sm">{item.data}</TableCell>
                    <TableCell className="font-medium">{item.cliente}</TableCell>
                    <TableCell className="font-medium">{item.valor}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.metodo}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status as any} />
                    </TableCell>
                  </>
                )}
                {reportType === "financeiro" && (
                  <>
                    <TableCell className="text-muted-foreground text-sm">{item.data}</TableCell>
                    <TableCell>
                      <span className={item.tipo === "receber" ? "text-emerald-600" : "text-red-600"}>
                        {item.tipo === "receber" ? "Entrada" : "Saída"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{item.descricao}</TableCell>
                    <TableCell className={item.tipo === "receber" ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                      {item.valor}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.vencimento}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status === "conciliado" ? "success" : "warning"} label={item.status} className="capitalize" />
                    </TableCell>
                  </>
                )}
                {reportType === "estoque" && (
                  <>
                    <TableCell>
                      <StatusBadge status={item.status === "normal" ? "success" : item.status === "baixo" ? "warning" : "error"} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.produto}</TableCell>
                    <TableCell className="text-right font-bold">{item.qtd}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.min}</TableCell>
                  </>
                )}
                {reportType === "crm" && (
                  <>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.telefone}</TableCell>
                    <TableCell className="capitalize">{item.fase}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status === "ativo" ? "success" : "warning"} />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
