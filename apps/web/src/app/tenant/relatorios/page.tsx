"use client";

import { useEffect, useState, useMemo } from "react";
import { DollarSign, Download, FileText, Package, TrendingUp, Users, Wrench, Building2, Lock, type LucideIcon } from "lucide-react";

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

type ReportType = "vendas" | "financeiro" | "estoque" | "crm" | "rh" | "comissoes" | "dre" | "os" | "obras";
type ReportRow = Record<string, unknown>;

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

export default function RelatoriosPage() {
  const { data: sidebarData, isLoading: loadingModules } = useSidebarData();
  const activeKeys = useMemo(() => sidebarData?.activeKeys || [], [sidebarData]);

  const [reportType, setReportType] = useState<ReportType>("vendas");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [kpis, setKpis] = useState<{ label: string; value: string; icon: LucideIcon }[]>([]);
  const { toasts, removeToast, info, success, error: toastError } = useToast();

  const isModuleActive = (type: ReportType) => {
    const config = REPORT_CONFIG[type];
    return activeKeys.includes(config.module);
  };

  const gerarRelatorio = async (tipo: ReportType = reportType) => {
    if (!isModuleActive(tipo)) {
      // Se não for ativo, não permitimos gerar
      return;
    }

    setLoading(true);
    setRows([]);
    setKpis([]);

    try {
      switch (tipo) {
        case "vendas": {
          const vendas = await fetchVendas();
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
          const transacoes = await fetchFinanceiro();
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
          const clientes = clientesResult.data;
          setRows(clientes as unknown as ReportRow[]);
          setKpis([{ label: "Clientes Ativos", value: String(clientes.length), icon: Users }]);
          break;
        }
        case "rh": {
          const funcionarios = await fetchFuncionarios();
          setRows(funcionarios as unknown as ReportRow[]);
          const folha = funcionarios.reduce((sum, item) => sum + (item.salario || 0), 0);
          setKpis([
            { label: "Colaboradores", value: String(funcionarios.length), icon: Users },
            { label: "Folha Mensal", value: formatarMoeda(folha), icon: DollarSign },
          ]);
          break;
        }
        case "comissoes": {
          const comissoes = await fetchComissoes();
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
          const hoje = new Date();
          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
          const fimMes = hoje.toISOString();
          const dre = await fetchDRE(inicioMes, fimMes);
          
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
          const ordens = await fetchOS();
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
          const obras = await fetchObras();
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

    const kpisHtml = kpis.length > 0 ? `
      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        ${kpis.map(kpi => `
          <div style="flex: 1; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">${kpi.label}</div>
            <div style="font-size: 20px; font-weight: 600; color: #0f172a;">${kpi.value}</div>
          </div>
        `).join('')}
      </div>
    ` : '';

    const tableHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório - ${relatorioNome}</title>
        <style>
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            padding: 40px; 
            color: #0f172a;
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          .header h1 { 
            font-size: 28px; 
            margin: 0; 
            font-weight: 700;
            color: #1e1b4b;
          }
          .header .brand {
            font-size: 14px;
            color: #64748b;
            text-align: right;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
          }
          th, td { 
            padding: 12px 16px; 
            text-align: left; 
            font-size: 13px; 
          }
          th { 
            background-color: #f8fafc; 
            font-weight: 600; 
            color: #475569;
            border-bottom: 2px solid #e2e8f0;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
          }
          td {
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          tr:last-child td {
            border-bottom: 2px solid #e2e8f0;
          }
          tr:nth-child(even) td {
            background-color: #fcfcfd;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 1.5cm; }
            .header { border-bottom-color: #cbd5e1; }
            th { border-bottom-color: #cbd5e1; }
            tr:last-child td { border-bottom-color: #cbd5e1; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Relatório de ${relatorioNome}</h1>
            <div style="margin-top: 4px; color: #64748b; font-size: 14px;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
          </div>
          <div class="brand">
            <strong style="color: #4f46e5; font-size: 18px;">Fluxo</strong><br/>
            Gestão Empresarial
          </div>
        </div>

        ${kpisHtml}

        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${headers.map((header) => `<td>${renderCellValue(row, header)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>

        <div class="footer">
          Documento gerado automaticamente pelo sistema Fluxo ERP.
        </div>
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
          <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">Consolidação e exportação de dados via camada RPC.</p>
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
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all shadow-sm ${
                  !active 
                    ? "bg-muted text-muted-foreground/50 border border-dashed border-border cursor-not-allowed opacity-70"
                    : reportType === type
                      ? "bg-primary text-primary-foreground shadow-primary/20"
                      : "border border-border bg-card text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
              >
                {!active && <Lock className="h-3 w-3" />}
                {type.toUpperCase()}
              </button>
            );
          }
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
