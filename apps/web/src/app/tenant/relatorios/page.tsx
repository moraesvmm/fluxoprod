"use client";

import { useEffect, useState } from "react";
import { DollarSign, Download, FileText, Package, TrendingUp, Users } from "lucide-react";

import { KPICard } from "@/components/modules/base/KPICard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toast, useToast } from "@/components/ui/toast";
import {
  fetchClientes,
  fetchComissoes,
  fetchFinanceiro,
  fetchFuncionarios,
  fetchProdutos,
  fetchVendas,
} from "@/lib/api";

type ReportType = "vendas" | "financeiro" | "estoque" | "crm" | "rh" | "comissoes";
type ReportRow = Record<string, any>;

const REPORT_HEADERS: Record<ReportType, string[]> = {
  vendas: ["Data", "Cliente", "Valor", "Método", "Status"],
  financeiro: ["Data", "Tipo", "Descrição", "Valor", "Status"],
  estoque: ["Produto", "SKU", "Categoria", "Est. Atual", "Est. Mínimo", "Preço Venda"],
  crm: ["Cliente", "Email", "Telefone", "Cadastro"],
  rh: ["Colaborador", "Cargo", "Salário", "Cadastro"],
  comissoes: ["Colaborador", "Venda", "Valor Venda", "Comissão", "Status"],
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarData(data?: string) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function RelatoriosPage() {
  const [reportType, setReportType] = useState<ReportType>("vendas");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [kpis, setKpis] = useState<{ label: string; value: string; icon: any }[]>([]);
  const { toasts, removeToast, info, success, error: toastError } = useToast();

  const gerarRelatorio = async (tipo: ReportType = reportType) => {
    setLoading(true);
    setRows([]);
    setKpis([]);

    try {
      switch (tipo) {
        case "vendas": {
          const vendas = await fetchVendas();
          setRows(vendas);
          const total = vendas.reduce((sum, venda) => sum + (venda.valor || 0), 0);
          const ticket = vendas.length > 0 ? total / vendas.length : 0;
          setKpis([
            { label: "Total Vendas", value: formatarMoeda(total), icon: DollarSign },
            { label: "Transações", value: String(vendas.length), icon: TrendingUp },
            { label: "Ticket Médio", value: formatarMoeda(ticket), icon: TrendingUp },
          ]);
          break;
        }
        case "financeiro": {
          const transacoes = await fetchFinanceiro();
          setRows(transacoes);
          const receitas = transacoes
            .filter((item) => item.tipo === "receber" || item.tipo === "receita")
            .reduce((sum, item) => sum + (item.valor || 0), 0);
          const despesas = transacoes
            .filter((item) => item.tipo === "pagar" || item.tipo === "despesa")
            .reduce((sum, item) => sum + (item.valor || 0), 0);
          setKpis([
            { label: "Receitas", value: formatarMoeda(receitas), icon: TrendingUp },
            { label: "Despesas", value: formatarMoeda(despesas), icon: DollarSign },
            { label: "Saldo", value: formatarMoeda(receitas - despesas), icon: DollarSign },
          ]);
          break;
        }
        case "estoque": {
          const produtos = await fetchProdutos();
          setRows(produtos);
          const valorEstoque = produtos.reduce(
            (sum, produto) => sum + ((produto.preco_venda || 0) * (produto.estoque_atual || 0)),
            0
          );
          const baixoEstoque = produtos.filter(
            (produto) => (produto.estoque_atual || 0) <= (produto.estoque_minimo || 0)
          ).length;
          setKpis([
            { label: "Produtos", value: String(produtos.length), icon: Package },
            { label: "Valor do Estoque", value: formatarMoeda(valorEstoque), icon: DollarSign },
            { label: "Estoque Baixo", value: String(baixoEstoque), icon: Package },
          ]);
          break;
        }
        case "crm": {
          const clientesResult = await fetchClientes({ limit: 100 });
          const clientes = clientesResult.data;
          setRows(clientes);
          setKpis([{ label: "Clientes Ativos", value: String(clientes.length), icon: Users }]);
          break;
        }
        case "rh": {
          const funcionarios = await fetchFuncionarios();
          setRows(funcionarios);
          const folha = funcionarios.reduce((sum, item) => sum + (item.salario || 0), 0);
          setKpis([
            { label: "Colaboradores", value: String(funcionarios.length), icon: Users },
            { label: "Folha Mensal", value: formatarMoeda(folha), icon: DollarSign },
          ]);
          break;
        }
        case "comissoes": {
          const comissoes = await fetchComissoes();
          setRows(comissoes);
          const totalComissoes = comissoes.reduce(
            (sum, item) => sum + (item.valor_comissao || 0),
            0
          );
          const pendentes = comissoes
            .filter((item) => item.status_pagamento === "pendente")
            .reduce((sum, item) => sum + (item.valor_comissao || 0), 0);
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

  useEffect(() => {
    void gerarRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  const renderCellValue = (row: ReportRow, header: string) => {
    switch (reportType) {
      case "vendas":
        if (header === "Data") return formatarData(row.criado_em);
        if (header === "Cliente") return row.cliente || "—";
        if (header === "Valor") return formatarMoeda(row.valor || row.valor_total || 0);
        if (header === "Método") return row.metodo || row.metodo_pagamento || "—";
        if (header === "Status") return row.status || "—";
        break;
      case "financeiro":
        if (header === "Data") return formatarData(row.criado_em);
        if (header === "Tipo") return row.tipo || "—";
        if (header === "Descrição") return row.descricao || "—";
        if (header === "Valor") return formatarMoeda(row.valor || 0);
        if (header === "Status") return row.status || "—";
        break;
      case "estoque":
        if (header === "Produto") return row.nome || "—";
        if (header === "SKU") return row.sku || "—";
        if (header === "Categoria") return row.categoria || "—";
        if (header === "Est. Atual") return String(row.estoque_atual ?? 0);
        if (header === "Est. Mínimo") return String(row.estoque_minimo ?? 0);
        if (header === "Preço Venda") return formatarMoeda(row.preco_venda || 0);
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
        if (header === "Salário") return formatarMoeda(row.salario || 0);
        if (header === "Cadastro") return formatarData(row.criado_em);
        break;
      case "comissoes":
        if (header === "Colaborador") return row.colaborador_id || "—";
        if (header === "Venda") return row.venda_id ? `${row.venda_id}`.slice(0, 8) + "..." : "—";
        if (header === "Valor Venda") return formatarMoeda(row.valor_venda || 0);
        if (header === "Comissão") return formatarMoeda(row.valor_comissao || 0);
        if (header === "Status") return row.status_pagamento || "—";
        break;
    }

    return "—";
  };

  const handleExport = (format: "csv" | "pdf") => {
    if (rows.length === 0) {
      info("Gere o relatório primeiro antes de exportar.");
      return;
    }

    const headers = REPORT_HEADERS[reportType];
    if (format === "csv") {
      const csvRows = [
        headers.join(","),
        ...rows.map((row) => headers.map((header) => `"${renderCellValue(row, header)}"`).join(",")),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `relatorio_${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      success("CSV exportado com sucesso!");
      return;
    }

    const tableHtml = `
      <html><head><title>Relatório ${reportType}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f8f9fa; font-weight: 600; }
      </style></head><body>
      <h1>Relatório de ${reportType}</h1>
      <table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map(
          (row) =>
            `<tr>${headers
              .map((header) => `<td>${renderCellValue(row, header)}</td>`)
              .join("")}</tr>`
        )
        .join("")}</tbody></table>
      </body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(tableHtml);
      printWindow.document.close();
      printWindow.print();
      success("PDF gerado com sucesso!");
    }
  };

  return (
    <div className="space-y-8">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">Consolidação e exportação de dados via camada RPC.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} title={kpi.label} value={kpi.value} icon={kpi.icon} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["vendas", "financeiro", "estoque", "crm", "rh", "comissoes"] as ReportType[]).map(
          (type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                reportType === type
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {type}
            </button>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {REPORT_HEADERS[reportType].map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={REPORT_HEADERS[reportType].length} className="py-8 text-center">
                  Carregando relatório...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={REPORT_HEADERS[reportType].length} className="py-8 text-center">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id || index}>
                  {REPORT_HEADERS[reportType].map((header) => (
                    <TableCell key={header}>{renderCellValue(row, header)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
