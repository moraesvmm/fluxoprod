"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Download } from "lucide-react";
import Link from "next/link";
import { XMLParser } from "fast-xml-parser";

interface DanfeItem {
  nItem: string;
  xProd: string;
  cProd: string;
  ncm: string;
  cfop: string;
  qCom: string;
  vUnCom: string;
  vProd: string;
}

interface DanfeData {
  chave: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  ambiente: string;
  natOp: string;
  emitNome: string;
  emitCnpj: string;
  emitIe: string;
  emitEndereco: string;
  destNome: string;
  destDoc: string;
  itens: DanfeItem[];
  vProd: string;
  vDesc: string;
  vNF: string;
}

function apenasNumeros(valor: string) {
  return (valor || "").replace(/\D/g, "");
}

function formatarCnpjCpf(valor: string) {
  const digitos = apenasNumeros(valor);
  if (digitos.length === 14) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return valor;
}

function formatarChaveAcesso(chave: string) {
  return apenasNumeros(chave).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function parseDanfeXml(xml: string): DanfeData {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const infNFe = doc?.NFe?.infNFe;
  if (!infNFe) throw new Error("XML fiscal em formato inesperado.");

  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const dest = infNFe.dest || {};
  const total = infNFe.total?.ICMSTot || {};
  const detsRaw = infNFe.det;
  const dets = Array.isArray(detsRaw) ? detsRaw : detsRaw ? [detsRaw] : [];

  const enderEmit = emit.enderEmit || {};
  const emitEndereco = [enderEmit.xLgr, enderEmit.nro, enderEmit.xBairro, enderEmit.xMun, enderEmit.UF]
    .filter(Boolean)
    .join(", ");

  const chave = String(infNFe["@_Id"] || "").replace(/^NFe/, "");

  return {
    chave,
    numero: String(ide.nNF ?? ""),
    serie: String(ide.serie ?? ""),
    dataEmissao: ide.dhEmi ? new Date(String(ide.dhEmi)).toLocaleString("pt-BR") : "",
    ambiente: String(ide.tpAmb) === "1" ? "Produção" : "Homologação (sem valor fiscal)",
    natOp: String(ide.natOp || ""),
    emitNome: String(emit.xNome || ""),
    emitCnpj: formatarCnpjCpf(String(emit.CNPJ || "")),
    emitIe: String(emit.IE || ""),
    emitEndereco,
    destNome: String(dest.xNome || ""),
    destDoc: formatarCnpjCpf(String(dest.CPF || dest.CNPJ || "")),
    itens: dets.map((det: Record<string, unknown>) => {
      const prod = (det.prod || {}) as Record<string, unknown>;
      return {
        nItem: String((det as Record<string, unknown>)["@_nItem"] ?? ""),
        xProd: String(prod.xProd ?? ""),
        cProd: String(prod.cProd ?? ""),
        ncm: String(prod.NCM ?? ""),
        cfop: String(prod.CFOP ?? ""),
        qCom: String(prod.qCom ?? ""),
        vUnCom: String(prod.vUnCom ?? ""),
        vProd: String(prod.vProd ?? ""),
      };
    }),
    vProd: String(total.vProd ?? "0.00"),
    vDesc: String(total.vDesc ?? "0.00"),
    vNF: String(total.vNF ?? "0.00"),
  };
}

export default function DanfePage() {
  const { id } = useParams();
  const [danfe, setDanfe] = useState<DanfeData | null>(null);
  const [xmlBruto, setXmlBruto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNfe = async () => {
      try {
        const res = await fetch(`/api/fiscal/nfe/${id}/xml`, { cache: "no-store" });
        if (!res.ok) throw new Error("NFe não encontrada.");

        const text = await res.text();
        setXmlBruto(text);
        setDanfe(parseDanfeXml(text));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar NFe.");
      } finally {
        setLoading(false);
      }
    };
    loadNfe();
  }, [id]);

  const baixarXml = () => {
    if (!xmlBruto) return;
    const blob = new Blob([xmlBruto], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NFe_${danfe?.chave || id}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando DANFE...</div>;
  if (error || !danfe) return <div className="p-8 text-center text-red-500">Erro: {error || "Não foi possível ler os dados fiscais."}</div>;

  return (
    <div className="min-h-screen bg-muted p-4 sm:p-8">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center no-print">
        <Link href="/tenant/vendas" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex gap-3">
          <button
            onClick={baixarXml}
            className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg hover:bg-muted transition-all shadow-sm"
          >
            <Download className="h-4 w-4" /> Baixar XML
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-md"
          >
            <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      <div className="bg-card shadow-2xl mx-auto p-8 border border-border print:shadow-none print:border-none print:p-0 text-black" id="danfe-content">
        <div className="border-2 border-black p-2 mb-4">
          <div className="flex justify-between items-start gap-4">
            <div className="w-1/2 border-r-2 border-black pr-2">
              <h1 className="font-bold text-lg uppercase">DANFE</h1>
              <p className="text-xs">Documento Auxiliar da Nota Fiscal Eletrônica</p>
              <p className="text-xs mt-1">{danfe.natOp}</p>
              <div className="mt-4 grid grid-cols-2 text-[10px] items-center">
                <div>0 - ENTRADA<br />1 - SAÍDA</div>
                <div className="border-2 border-black text-center font-bold text-lg">1</div>
              </div>
              <p className="text-xs mt-2">Nº {danfe.numero} &nbsp; Série {danfe.serie}</p>
              <p className="text-xs">{danfe.dataEmissao}</p>
              {danfe.ambiente !== "Produção" && (
                <p className="text-xs font-bold text-red-600 mt-1">{danfe.ambiente}</p>
              )}
            </div>
            <div className="w-1/2 pl-2 text-[10px]">
              <p className="font-bold">CHAVE DE ACESSO</p>
              <p className="text-xs tracking-tighter">CONSULTA DE AUTENTICIDADE NO PORTAL NACIONAL DA NF-E</p>
              <div className="mt-4 border-2 border-black p-1 text-center font-mono break-all">
                {formatarChaveAcesso(danfe.chave)}
              </div>
            </div>
          </div>
        </div>

        <div className="border-2 border-black p-2 mb-4 text-xs">
          <p className="font-bold text-[10px] mb-1">EMITENTE</p>
          <p className="font-semibold">{danfe.emitNome}</p>
          <p>{danfe.emitEndereco}</p>
          <p>CNPJ: {danfe.emitCnpj} {danfe.emitIe && `- IE: ${danfe.emitIe}`}</p>
        </div>

        <div className="border-2 border-black p-2 mb-4 text-xs">
          <p className="font-bold text-[10px] mb-1">DESTINATÁRIO</p>
          <p className="font-semibold">{danfe.destNome}</p>
          <p>CPF/CNPJ: {danfe.destDoc}</p>
        </div>

        <table className="w-full border-2 border-black text-[10px] mb-4">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="border-r border-black p-1 text-left">Cód.</th>
              <th className="border-r border-black p-1 text-left">Descrição</th>
              <th className="border-r border-black p-1 text-left">NCM</th>
              <th className="border-r border-black p-1 text-left">CFOP</th>
              <th className="border-r border-black p-1 text-right">Qtd.</th>
              <th className="border-r border-black p-1 text-right">Vl. Unit.</th>
              <th className="p-1 text-right">Vl. Total</th>
            </tr>
          </thead>
          <tbody>
            {danfe.itens.map((item) => (
              <tr key={item.nItem} className="border-b border-black">
                <td className="border-r border-black p-1">{item.cProd}</td>
                <td className="border-r border-black p-1">{item.xProd}</td>
                <td className="border-r border-black p-1">{item.ncm}</td>
                <td className="border-r border-black p-1">{item.cfop}</td>
                <td className="border-r border-black p-1 text-right">{Number(item.qCom).toLocaleString("pt-BR")}</td>
                <td className="border-r border-black p-1 text-right">{Number(item.vUnCom).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="p-1 text-right">{Number(item.vProd).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-2 border-black p-2 mb-4 text-xs flex justify-end gap-6">
          <p>Valor Produtos: <strong>{Number(danfe.vProd).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p>
          <p>Desconto: <strong>{Number(danfe.vDesc).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p>
          <p>Valor Total da NF-e: <strong>{Number(danfe.vNF).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p>
        </div>

        <div className="mt-8 text-[9px] text-muted-foreground">
          <p>Fluxo ERP - Sistema de Gestão Inteligente</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #danfe-content { width: 100% !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}

