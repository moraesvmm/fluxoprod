"use client";

import { useEffect, useState, useMemo } from "react";
import { CalendarDays, DollarSign, Download, FileText, Package, TrendingUp, Users, Wrench, Building2, Lock, type LucideIcon } from "lucide-react";

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
  fetchDRE,
  fetchOS,
  fetchObras,
  type DREData
} from "@/lib/api";
import { useSidebarData } from "@/lib/hooks/use-sidebar-data";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";
import { DREWaterfall } from "@/components/financeiro/DREWaterfall";

type ReportType = "vendas" | "financeiro" | "estoque" | "crm" | "rh" | "comissoes" | "dre" | "os" | "obras";
type ReportRow = Record<string, unknown>;
type AtalhoPeriodo = "hoje" | "mes" | null;

const REPORT_HEADERS: Record<ReportType, string[]> = {
  vendas: ["Data", "Cliente", "Valor", "Método", "Status"],
  financeiro: ["Data", "Tipo", "Descrição", "Valor", "Status"],
  estoque: ["Produto", "SKU", "Categoria", "Est. Atual", "Est. Mínimo", "Preço Venda"],
  crm: ["Cliente", "Email", "Telefone", "Cadastro"],
  rh: ["Colaborador", "Cargo", "Salário", "Cadastro"],
  comissoes: ["Colaborador", "Venda", "Valor Venda", "Comissão", "Status"],
  dre: ["Indicador", "Valor", "Margem (%)"],
  os: ["Número", "Cliente", "Equipamento", "Série/IMEI", "Status", "Valor Orçamento", "Laudo", "Criado em"],
  obras: ["Obra", "Cliente", "Orçamento", "Status", "Início", "Previsão Fim"],
};

const REPORT_CONFIG: Record<ReportType, { module: string; label: string }> = {
  vendas: { module: "vendas", label: "Vendas" },
  financeiro: { module: "financeiro", label: "Financeiro" },
  dre: { module: "financeiro", label: "DRE" },
  estoque: { module: "estoque", label: "Estoque" },
  crm: { module: "crm", label: "CRM" },
  rh: { module: "rh", label: "RH" },
  comissoes: { module: "comissoes", label: "Comissões" },
  os: { module: "os", label: "Ordens de Serviço" },
  obras: { module: "obras", label: "Obras" },
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

function dataLocal(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function filtrarPorPeriodo<T extends object>(dados: T[], dataInicio: string, dataFim: string): T[] {
  return dados.filter((item) => {
    const row = item as Record<string, unknown>;
    const valor = row.data_venda ?? row.data_vencimento ?? row.data_inicio ?? row.criado_em ?? row.data_cadastro;
    const data = typeof valor === "string" ? valor.slice(0, 10) : null;
    return data !== null && data >= dataInicio && data <= dataFim;
  });
}

export default function RelatoriosPage() {
  const { data: sidebarData, isLoading: loadingModules } = useSidebarData();
  const activeKeys = useMemo(() => sidebarData?.activeKeys || [], [sidebarData]);

  const [reportType, setReportType] = useState<ReportType>("vendas");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [kpis, setKpis] = useState<{ label: string; value: string; icon: LucideIcon }[]>([]);
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [dataInicio, setDataInicio] = useState(() => dataLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [dataFim, setDataFim] = useState(() => dataLocal(new Date()));
  const [atalhoPeriodo, setAtalhoPeriodo] = useState<AtalhoPeriodo>("mes");
  const { toasts, removeToast, info, success, error: toastError } = useToast();

  const isModuleActive = (type: ReportType) => {
    const config = REPORT_CONFIG[type];
    return activeKeys.includes(config.module);
  };

  const gerarRelatorio = async (tipo: ReportType = reportType) => {
    if (dataInicio > dataFim) {
      toastError("A data inicial não pode ser posterior à data final.");
      return;
    }
    if (!isModuleActive(tipo)) {
      // Se não for ativo, não permitimos gerar
      return;
    }

    setLoading(true);
    setRows([]);
    setKpis([]);
    setDreData(null);

    try {
      switch (tipo) {
        case "vendas": {
          const vendas = filtrarPorPeriodo(await fetchVendas(), dataInicio, dataFim);
          setRows(vendas as unknown as ReportRow[]);
          const total = vendas.reduce((sum, venda) => sum + (venda.valor || venda.valor_total || venda.total || 0), 0);
          const ticket = vendas.length > 0 ? total / vendas.length : 0;
          setKpis([
            { label: "Total Vendas", value: formatarMoeda(total), icon: DollarSign },
            { label: "Transações", value: String(vendas.length), icon: TrendingUp },
            { label: "Ticket Médio", value: formatarMoeda(ticket), icon: TrendingUp },
          ]);
          break;
        }
        case "financeiro": {
          const transacoes = filtrarPorPeriodo(await fetchFinanceiro(), dataInicio, dataFim);
          setRows(transacoes as unknown as ReportRow[]);
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
          setRows(produtos as unknown as ReportRow[]);
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
          const clientes = filtrarPorPeriodo(clientesResult.data, dataInicio, dataFim);
          setRows(clientes as unknown as ReportRow[]);
          setKpis([{ label: "Clientes Ativos", value: String(clientes.length), icon: Users }]);
          break;
        }
        case "rh": {
          const funcionarios = filtrarPorPeriodo(await fetchFuncionarios(), dataInicio, dataFim);
          setRows(funcionarios as unknown as ReportRow[]);
          const folha = funcionarios.reduce((sum, item) => sum + (item.salario || 0), 0);
          setKpis([
            { label: "Colaboradores", value: String(funcionarios.length), icon: Users },
            { label: "Folha Mensal", value: formatarMoeda(folha), icon: DollarSign },
          ]);
          break;
        }
        case "comissoes": {
          const comissoes = filtrarPorPeriodo(await fetchComissoes(), dataInicio, dataFim);
          setRows(comissoes as unknown as ReportRow[]);
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
        case "dre": {
          const dre = await fetchDRE(`${dataInicio}T00:00:00`, `${dataFim}T23:59:59`);
          setDreData(dre);

          setRows([
            { indicador: "Faturamento Bruto", valor: dre.faturamento, margem: 100 },
            { indicador: "(-) Custo de Mercadoria (CMV)", valor: -dre.cmv, margem: dre.margem_bruta - 100 },
            { indicador: "= LUCRO BRUTO", valor: dre.lucro_bruto, margem: dre.margem_bruta },
            { indicador: "(-) Despesas Operacionais", valor: -dre.despesas, margem: dre.margem_liquida - dre.margem_bruta },
            { indicador: "= LUCRO LÍQUIDO", valor: dre.lucro_liquido, margem: dre.margem_liquida },
          ]);

          setKpis([
            { label: "Receita Líquida", value: formatarMoeda(dre.faturamento), icon: TrendingUp },
            { label: "Margem Bruta", value: `${dre.margem_bruta}%`, icon: DollarSign },
            { label: "Lucro Real", value: formatarMoeda(dre.lucro_liquido), icon: DollarSign },
          ]);
          break;
        }
        case "os": {
          const ordens = filtrarPorPeriodo(await fetchOS(), dataInicio, dataFim);
          setRows(ordens as unknown as ReportRow[]);
          const totalOrcado = ordens.reduce((sum, os) => sum + (os.valor_orcamento || 0), 0);
          const abertas = ordens.filter(os => os.status !== 'concluida' && os.status !== 'cancelada').length;
          setKpis([
            { label: "Total de OS", value: String(ordens.length), icon: Wrench },
            { label: "Valor Orçado", value: formatarMoeda(totalOrcado), icon: DollarSign },
            { label: "OS em Aberto", value: String(abertas), icon: TrendingUp },
          ]);
          break;
        }
        case "obras": {
          const obras = filtrarPorPeriodo(await fetchObras(), dataInicio, dataFim);
          setRows(obras as unknown as ReportRow[]);
          const orcamentoTotal = obras.reduce((sum, obra) => sum + (obra.orcamento || 0), 0);
          const emAndamento = obras.filter(obra => obra.status === 'em_andamento').length;
          setKpis([
            { label: "Total de Obras", value: String(obras.length), icon: Building2 },
            { label: "Orçamentos", value: formatarMoeda(orcamentoTotal), icon: DollarSign },
            { label: "Em Andamento", value: String(emAndamento), icon: TrendingUp },
          ]);
          break;
        }
      }

      success("Relatório gerado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao gerar relatório: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };


  const renderCellValue = (row: ReportRow, header: string): string => {
    const get = <T,>(key: string): T => row[key] as T;
    switch (reportType) {
      case "vendas":
        if (header === "Data") return formatarData(get<string>("criado_em"));
        if (header === "Cliente") return get<string>("cliente") || "—";
        if (header === "Valor") return formatarMoeda(get<number>("valor") || get<number>("valor_total") || get<number>("total") || 0);
        if (header === "Método") return get<string>("metodo") || get<string>("metodo_pagamento") || "—";
        if (header === "Status") return get<string>("status") || "—";
        break;
      case "financeiro":
        if (header === "Data") return formatarData(get<string>("criado_em"));
        if (header === "Tipo") return get<string>("tipo") || "—";
        if (header === "Descrição") return get<string>("descricao") || "—";
        if (header === "Valor") return formatarMoeda(get<number>("valor") || 0);
        if (header === "Status") return get<string>("status") || "—";
        break;
      case "estoque":
        if (header === "Produto") return get<string>("nome") || "—";
        if (header === "SKU") return get<string>("sku") || "—";
        if (header === "Categoria") return get<string>("categoria") || "—";
        if (header === "Est. Atual") return String(get<number>("estoque_atual") ?? 0);
        if (header === "Est. Mínimo") return String(get<number>("estoque_minimo") ?? 0);
        if (header === "Preço Venda") return formatarMoeda(get<number>("preco_venda") || 0);
        break;
      case "crm":
        if (header === "Cliente") return get<string>("nome") || "—";
        if (header === "Email") return get<string>("email") || "—";
        if (header === "Telefone") return get<string>("telefone") || "—";
        if (header === "Cadastro") return formatarData(get<string>("criado_em"));
        break;
      case "rh":
        if (header === "Colaborador") return get<string>("nome") || "—";
        if (header === "Cargo") return get<string>("cargo") || "—";
        if (header === "Salário") return formatarMoeda(get<number>("salario") || 0);
        if (header === "Cadastro") return formatarData(get<string>("criado_em"));
        break;
      case "comissoes":
        if (header === "Colaborador") return get<string>("colaborador_id") || "—";
        if (header === "Venda") return get<string>("venda_id") ? `${get<string>("venda_id")}`.slice(0, 8) + "..." : "—";
        if (header === "Valor Venda") return formatarMoeda(get<number>("valor_venda") || 0);
        if (header === "Comissão") return formatarMoeda(get<number>("valor_comissao") || 0);
        if (header === "Status") return get<string>("status_pagamento") || "—";
        break;
      case "dre":
        if (header === "Indicador") return get<string>("indicador");
        if (header === "Valor") return formatarMoeda(get<number>("valor"));
        if (header === "Margem (%)") return `${(get<number>("margem") || 0).toFixed(2)}%`;
        break;
      case "os":
        if (header === "Número") return String(get<number>("numero") || "—");
        if (header === "Cliente") { const c = get<{ nome?: string }>("cliente"); return (c && c.nome) || get<string>("cliente") || "—"; }
        if (header === "Equipamento") return get<string>("veiculo_equipamento") || "—";
        if (header === "Série/IMEI") return get<string>("equipamento_serial") || "—";
        if (header === "Status") return get<string>("status") || "—";
        if (header === "Valor Orçamento") return formatarMoeda(get<number>("valor_orcamento") || get<number>("valor_orcado") || 0);
        if (header === "Laudo") return get<string>("laudo_tecnico") || get<string>("laudo") || "—";
        if (header === "Criado em") return formatarData(get<string>("criado_em") || get<string>("data_criacao"));
        break;
      case "obras":
        if (header === "Obra") return get<string>("nome") || "—";
        if (header === "Cliente") { const c = get<{ nome?: string }>("cliente"); return (c && c.nome) || get<string>("cliente") || "—"; }
        if (header === "Orçamento") return formatarMoeda(get<number>("orcamento") || 0);
        if (header === "Status") return get<string>("status") || "—";
        if (header === "Início") return formatarData(get<string>("data_inicio"));
        if (header === "Previsão Fim") return formatarData(get<string>("data_fim_prevista"));
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
    const relatorioNome = REPORT_CONFIG[reportType].label;
    
    if (format === "csv") {
      const escapeCsv = (value: string | number | boolean | null | undefined) => {
        const str = String(value).replace(/"/g, '""');
        return `"${str}"`;
      };
      
      const csvRows = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) => headers.map((header) => escapeCsv(renderCellValue(row, header))).join(",")),
      ];
      
      // Adicionar BOM (\uFEFF) para Excel ler UTF-8 corretamente (acentos, cedilha)
      const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Fluxo_Relatorio_${relatorioNome}_${new Date().toISOString().split("T")[0]}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      success("CSV exportado com sucesso!");
      return;
    }

    const agora = new Date();
    const dataEmissao = agora.toLocaleDateString("pt-BR");
    const horaEmissao = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const kpisHtml = kpis.length > 0 ? `
      <div class="figures">
        ${kpis.map(kpi => `
          <div class="figure">
            <div class="figure-label">${kpi.label}</div>
            <div class="figure-value">${kpi.value}</div>
          </div>
        `).join('')}
      </div>
    ` : '';

    const tableHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório de ${relatorioNome} — Fluxo</title>
        <style>
          :root {
            --ink: #1a2233;
            --ink-soft: #4a5468;
            --ink-faint: #8892a6;
            --rule: #d4d9e2;
            --rule-strong: #1a2233;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Georgia, 'Times New Roman', serif;
            color: var(--ink);
            margin: 0 auto;
            padding: 48px 56px;
            max-width: 960px;
            font-size: 13px;
            line-height: 1.5;
          }
          .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 2px solid var(--rule-strong);
            padding-bottom: 16px;
          }
          .doc-kicker {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 10px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--ink-faint);
            margin: 0 0 6px;
          }
          .doc-header h1 {
            font-size: 26px;
            font-weight: 600;
            letter-spacing: -0.01em;
            margin: 0;
          }
          .doc-meta {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            color: var(--ink-soft);
            text-align: right;
          }
          .doc-meta strong {
            display: block;
            font-family: Georgia, serif;
            font-size: 16px;
            color: var(--ink);
            letter-spacing: -0.01em;
          }
          .figures {
            display: flex;
            margin: 28px 0 8px;
            border-top: 1px solid var(--rule);
            border-bottom: 1px solid var(--rule);
          }
          .figure {
            flex: 1;
            padding: 14px 20px 16px 0;
          }
          .figure + .figure {
            border-left: 1px solid var(--rule);
            padding-left: 20px;
          }
          .figure-label {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 9.5px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--ink-faint);
          }
          .figure-value {
            font-size: 21px;
            font-weight: 600;
            letter-spacing: -0.01em;
            margin-top: 6px;
            font-variant-numeric: tabular-nums lining-nums;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
          }
          thead { display: table-header-group; }
          th {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 9.5px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 600;
            color: var(--ink-soft);
            text-align: left;
            padding: 8px 10px;
            border-bottom: 1.5px solid var(--rule-strong);
          }
          td {
            padding: 7px 10px;
            border-bottom: 0.5px solid var(--rule);
            font-variant-numeric: tabular-nums lining-nums;
          }
          tr { page-break-inside: avoid; }
          tbody tr:last-child td { border-bottom: 1.5px solid var(--rule-strong); }
          .doc-footer {
            margin-top: 36px;
            padding-top: 12px;
            border-top: 1px solid var(--rule);
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 9.5px;
            color: var(--ink-faint);
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            @page {
              margin: 2cm 1.8cm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <header class="doc-header">
          <div>
            <p class="doc-kicker">Relatório de gestão &middot; Confidencial</p>
            <h1>${relatorioNome}</h1>
          </div>
          <div class="doc-meta">
            <strong>Fluxo</strong>
            Emitido em ${dataEmissao}, ${horaEmissao}<br/>
            Valores em BRL
          </div>
        </header>

        ${kpisHtml}

        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${headers.map((header) => `<td>${renderCellValue(row, header)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>

        <footer class="doc-footer">
          <span>Fluxo &middot; Relatório de ${relatorioNome}</span>
          <span>Documento gerado pelo sistema em ${dataEmissao}. Uso interno.</span>
        </footer>
      </body>
      </html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(tableHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        success("PDF gerado com sucesso!");
      }, 250);
    } else {
      toastError("Pop-up bloqueado. Permita pop-ups para gerar o PDF.");
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Se o módulo padrão (vendas) não estiver ativo, tentar o primeiro ativo
    if (sidebarData?.activeKeys && sidebarData.activeKeys.length > 0 && !sidebarData.activeKeys.includes("vendas")) {
       const firstActive = (Object.keys(REPORT_CONFIG) as ReportType[]).find(type => sidebarData.activeKeys.includes(REPORT_CONFIG[type].module));
       if (firstActive) setReportType(firstActive);
    }
  }, [sidebarData?.activeKeys]);

  useEffect(() => {
    if (mounted && isModuleActive(reportType)) {
      void gerarRelatorio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, mounted]);

  if (!mounted || loadingModules) {
    return (
      <div className="space-y-8 animate-pulse p-4 text-center text-muted-foreground">
        Carregando interface de relatórios...
      </div>
    );
  }

  const reportTypes: ReportType[] = ["vendas", "financeiro", "dre", "estoque", "crm", "rh", "comissoes", "os", "obras"];

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
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">Demonstrativos consolidados por módulo, com exportação em CSV e PDF.</p>
        </div>
        <div className="flex items-center gap-2" data-tour="relatorios-gerar">
          <TutorialHelpButton moduleKey="relatorios" />
          <button
            onClick={() => handleExport("csv")}
            disabled={rows.length === 0}
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="mr-2 h-4 w-4 text-muted-foreground" />
            CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={rows.length === 0}
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} title={kpi.label} value={kpi.value} icon={kpi.icon} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2" data-tour="relatorios-personalizar">
        {reportTypes.map(
          (type) => {
            const active = isModuleActive(type);
            const config = REPORT_CONFIG[type];
            
            return (
              <button
                key={type}
                onClick={() => active && setReportType(type)}
                title={!active ? `Para ter acesso a esse relatório, adquira o módulo ${config.label}` : undefined}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  !active 
                    ? "bg-muted text-muted-foreground/50 border border-dashed border-border cursor-not-allowed opacity-70"
                    : reportType === type
                      ? "bg-primary text-primary-foreground shadow-primary/20"
                      : "border border-border bg-card text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
              >
                {!active && <Lock className="h-3 w-3" />}
                {config.label}
              </button>
            );
          }
        )}
      </div>

      <section className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>Período do relatório</span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-muted-foreground">De
            <input type="date" value={dataInicio} max={dataFim} onChange={(event) => { setDataInicio(event.target.value); setAtalhoPeriodo(null); }} className="mt-1 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">Até
            <input type="date" value={dataFim} min={dataInicio} max={dataLocal(new Date())} onChange={(event) => { setDataFim(event.target.value); setAtalhoPeriodo(null); }} className="mt-1 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground" />
          </label>
          <button type="button" onClick={() => { const hoje = new Date(); setDataInicio(dataLocal(hoje)); setDataFim(dataLocal(hoje)); setAtalhoPeriodo("hoje"); }} className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors ${atalhoPeriodo === "hoje" ? "border-primary bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30" : "border-border hover:bg-muted"}`}>Hoje</button>
          <button type="button" onClick={() => { const hoje = new Date(); setDataInicio(dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1))); setDataFim(dataLocal(hoje)); setAtalhoPeriodo("mes"); }} className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors ${atalhoPeriodo === "mes" ? "border-primary bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30" : "border-border hover:bg-muted"}`}>Este mês</button>
          <button type="button" onClick={() => void gerarRelatorio()} disabled={loading} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Aplicar</button>
        </div>
      </section>

      {/* Cascata de resultado — peça central do DRE */}
      {reportType === "dre" && dreData && !loading && (
        <section aria-label="Cascata de resultado" className="border-y border-border py-6">
          <h3 className="font-heading text-lg font-semibold tracking-tight">Formação do resultado no mês corrente</h3>
          <p className="mb-6 text-sm text-muted-foreground">Do faturamento bruto ao lucro líquido.</p>
          <DREWaterfall dre={dreData} />
        </section>
      )}

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20">
              {REPORT_HEADERS[reportType].map((header) => (
                <TableHead key={header} className="text-foreground/70 font-semibold py-4">{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={REPORT_HEADERS[reportType].length} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-muted-foreground text-sm">Carregando relatório...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={REPORT_HEADERS[reportType].length} className="py-12 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={String(row.id ?? index)} className="hover:bg-muted/30 border-border">
                  {REPORT_HEADERS[reportType].map((header) => (
                    <TableCell key={header} className="text-foreground/80 py-4 font-medium">{renderCellValue(row, header)}</TableCell>
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
