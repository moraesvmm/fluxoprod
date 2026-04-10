"use client";

import { useState, useEffect } from "react";
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
import { FileText, Download, Filter, Search, TrendingUp, Package, Users, DollarSign } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast, Toast } from "@/components/ui/toast";

type ReportType = "vendas" | "financeiro" | "estoque" | "crm" | "rh" | "comissoes";

interface ReportRow {
  [key: string]: any;
}

export default function RelatoriosPage() {
  const [reportType, setReportType] = useState<ReportType>("vendas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [kpis, setKpis] = useState<{ label: string; value: string; icon: any }[]>([]);
  const { toasts, removeToast, info, success, error: toastError } = useToast();
  const supabase = createClient();

  const reportHeaders: Record<ReportType, string[]> = {
    vendas: ["Data", "Cliente", "Vendedor", "Valor", "Método", "Status"],
    financeiro: ["Data", "Tipo", "Descrição", "Valor", "Categoria", "Status"],
    estoque: ["Produto", "SKU", "Categoria", "Est. Atual", "Est. Mínimo", "Preço Venda"],
    crm: ["Cliente", "Email", "Telefone", "Cadastro"],
    rh: ["Colaborador", "Cargo", "Email", "Telefone", "Salário"],
    comissoes: ["Colaborador", "Venda", "Valor Venda", "Comissão", "Status"],
  };

  const formatarMoeda = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const formatarData = (d: string) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const gerarRelatorio = async () => {
    setLoading(true);
    setRows([]);
    setKpis([]);

    try {
      switch (reportType) {
        case "vendas": {
          let query = supabase.from("vendas").select("*").order("criado_em", { ascending: false });
          if (dateFrom) query = query.gte("criado_em", new Date(dateFrom).toISOString());
          if (dateTo) query = query.lte("criado_em", new Date(dateTo + "T23:59:59").toISOString());
          const { data, error } = await query;
          if (error) throw error;
          const vendas = data || [];
          setRows(vendas);
          const total = vendas.reduce((s, v) => s + (v.valor || 0), 0);
          const ticket = vendas.length > 0 ? total / vendas.length : 0;
          setKpis([
            { label: "Total Vendas", value: formatarMoeda(total), icon: DollarSign },
            { label: "Transações", value: String(vendas.length), icon: TrendingUp },
            { label: "Ticket Médio", value: formatarMoeda(ticket), icon: TrendingUp },
          ]);
          break;
        }
        case "financeiro": {
          let query = supabase.from("transacoes_financeiras").select("*").order("criado_em", { ascending: false });
          if (dateFrom) query = query.gte("criado_em", new Date(dateFrom).toISOString());
          if (dateTo) query = query.lte("criado_em", new Date(dateTo + "T23:59:59").toISOString());
          const { data, error } = await query;
          if (error) throw error;
          const trans = data || [];
          setRows(trans);
          const receitas = trans.filter(t => t.tipo === "receita").reduce((s, t) => s + (t.valor || 0), 0);
          const despesas = trans.filter(t => t.tipo === "despesa").reduce((s, t) => s + (t.valor || 0), 0);
          setKpis([
            { label: "Receitas", value: formatarMoeda(receitas), icon: TrendingUp },
            { label: "Despesas", value: formatarMoeda(despesas), icon: DollarSign },
            { label: "Saldo", value: formatarMoeda(receitas - despesas), icon: DollarSign },
          ]);
          break;
        }
        case "estoque": {
          const { data, error } = await supabase.from("produtos").select("*").order("nome");
          if (error) throw error;
          const produtos = data || [];
          setRows(produtos);
          const valorEstoque = produtos.reduce((s, p) => s + ((p.preco_venda || 0) * (p.estoque_atual || 0)), 0);
          const baixoEstoque = produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length;
          setKpis([
            { label: "Produtos", value: String(produtos.length), icon: Package },
            { label: "Valor do Estoque", value: formatarMoeda(valorEstoque), icon: DollarSign },
            { label: "Estoque Baixo", value: String(baixoEstoque), icon: Package },
          ]);
          break;
        }
        case "crm": {
          const { data, error } = await supabase.from("clientes").select("*").order("criado_em", { ascending: false });
          if (error) throw error;
          const clientes = data || [];
          setRows(clientes);
          setKpis([
            { label: "Clientes Ativos", value: String(clientes.length), icon: Users },
          ]);
          break;
        }
        case "rh": {
          const { data, error } = await supabase.from("funcionarios").select("*").order("criado_em", { ascending: false });
          if (error) throw error;
          const funcs = data || [];
          setRows(funcs);
          const folha = funcs.reduce((s, f) => s + (f.salario || 0), 0);
          setKpis([
            { label: "Colaboradores", value: String(funcs.length), icon: Users },
            { label: "Folha Mensal", value: formatarMoeda(folha), icon: DollarSign },
          ]);
          break;
        }
        case "comissoes": {
          const { data, error } = await supabase.from("comissoes").select("*").order("criado_em", { ascending: false });
          if (error) throw error;
          const comissoes = data || [];
          setRows(comissoes);
          const totalComissoes = comissoes.reduce((s, c) => s + (c.valor_comissao || 0), 0);
          const pendentes = comissoes.filter(c => c.status === "pendente").reduce((s, c) => s + (c.valor_comissao || 0), 0);
          setKpis([
            { label: "Total Comissões", value: formatarMoeda(totalComissoes), icon: DollarSign },
            { label: "Pendentes", value: formatarMoeda(pendentes), icon: DollarSign },
          ]);
          break;
        }
      }
      success("Relatório gerado com sucesso!");
    } catch (err: any) {
      toastError("Erro ao gerar relatório: " + (err.message || "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  // Carregar automaticamente na primeira vez
  useEffect(() => {
    gerarRelatorio();
  }, []);

  const renderCellValue = (row: ReportRow, header: string): string => {
    switch (reportType) {
      case "vendas":
        if (header === "Data") return formatarData(row.criado_em);
        if (header === "Cliente") return row.cliente || "—";
        if (header === "Vendedor") return row.vendedor_nome || "—";
        if (header === "Valor") return formatarMoeda(row.valor);
        if (header === "Método") return row.metodo || "—";
        if (header === "Status") return row.status || "—";
        break;
      case "financeiro":
        if (header === "Data") return formatarData(row.criado_em);
        if (header === "Tipo") return row.tipo || "—";
        if (header === "Descrição") return row.descricao || "—";
        if (header === "Valor") return formatarMoeda(row.valor);
        if (header === "Categoria") return row.categoria || "—";
        if (header === "Status") return row.status || "—";
        break;
      case "estoque":
        if (header === "Produto") return row.nome || "—";
        if (header === "SKU") return row.sku || "—";
        if (header === "Categoria") return row.categoria || "—";
        if (header === "Est. Atual") return String(row.estoque_atual ?? 0);
        if (header === "Est. Mínimo") return String(row.estoque_minimo ?? 0);
        if (header === "Preço Venda") return formatarMoeda(row.preco_venda);
        break;
      case "crm":
        if (header === "Cliente") return row.nome || "—";
        if (header === "Email") return row.email || "—";
        if (header === "Telefone") return row.telefone || "—";
        if (header === "Cadastro") return formatarData(row.criado_em);
        break;
      case "rh":
        if (header === "Colaborador") return row.nome || "—";
        if (header === "Cargo") return row.cargo || "—";
        if (header === "Email") return row.email || "—";
        if (header === "Telefone") return row.telefone || "—";
        if (header === "Salário") return formatarMoeda(row.salario);
        break;
      case "comissoes":
        if (header === "Colaborador") return row.funcionario_nome || "—";
        if (header === "Venda") return row.venda_id ? row.venda_id.substring(0, 8) + "..." : "—";
        if (header === "Valor Venda") return formatarMoeda(row.valor_venda);
        if (header === "Comissão") return formatarMoeda(row.valor_comissao);
        if (header === "Status") return row.status || "—";
        break;
    }
    return "—";
  };

  const handleExport = (format: "csv" | "pdf") => {
    if (rows.length === 0) {
      info("Gere o relatório primeiro antes de exportar.");
      return;
    }

    if (format === "csv") {
      const headers = reportHeaders[reportType];
      const csvRows = [
        headers.join(","),
        ...rows.map(row => headers.map(h => `"${renderCellValue(row, h)}"`).join(","))
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success("CSV exportado com sucesso!");
    } else if (format === "pdf") {
      // Client-side PDF generation using print
      const headers = reportHeaders[reportType];
      const tableHtml = `
        <html><head><title>Relatório ${reportType}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f8f9fa; font-weight: 600; }
          .kpi { display: inline-block; margin-right: 24px; margin-bottom: 12px; }
          .kpi-label { font-size: 11px; color: #666; }
          .kpi-value { font-size: 16px; font-weight: bold; }
        </style></head><body>
        <h1>Relatório de ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}</h1>
        <p style="color:#666;font-size:12px;">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        <div style="margin-bottom:16px;">${kpis.map(k => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`).join("")}</div>
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(row => `<tr>${headers.map(h => `<td>${renderCellValue(row, h)}</td>`).join("")}</tr>`).join("")}</tbody></table>
        </body></html>`;
      const w = window.open("", "_blank");
      if (w) { w.document.write(tableHtml); w.document.close(); w.print(); }
      success("PDF gerado com sucesso!");
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Container */}
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

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
              <option value="crm">CRM / Clientes</option>
              <option value="rh">Recursos Humanos</option>
              <option value="comissoes">Comissões</option>
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
          <button
            onClick={gerarRelatorio}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2 disabled:opacity-50"
          >
            <Filter className="mr-2 h-4 w-4" />
            {loading ? "Gerando..." : "Filtrar"}
          </button>
        </div>
      </div>

      {/* KPIs dinâmicos */}
      {kpis.length > 0 && (
        <div className={`grid gap-4 sm:grid-cols-${Math.min(kpis.length, 4)}`}>
          {kpis.map((kpi, i) => (
            <KPICard key={i} title={kpi.label} value={kpi.value} icon={kpi.icon} />
          ))}
        </div>
      )}

      {/* Tabela com dados reais */}
      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {reportHeaders[reportType].map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={reportHeaders[reportType].length} className="text-center py-12">
                  <div className="text-slate-500">Carregando dados...</div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={reportHeaders[reportType].length} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">Nenhum dado disponível para o período selecionado.</p>
                    <p className="text-slate-400 text-xs">Ajuste os filtros e clique em Filtrar.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={row.id || idx}>
                  {reportHeaders[reportType].map((header) => (
                    <TableCell key={header} className="text-sm">
                      {header === "Status" ? (
                        <StatusBadge status={renderCellValue(row, header) as any} />
                      ) : (
                        renderCellValue(row, header)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {rows.length > 0 && (
          <div className="p-3 border-t border-border bg-slate-50/50 text-sm text-slate-500 text-right">
            {rows.length} registro(s) encontrado(s)
          </div>
        )}
      </div>
    </div>
  );
}
