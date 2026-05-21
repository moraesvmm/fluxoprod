"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

export default function DanfePage() {
  const { id } = useParams();
  const [xml, setXml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNfe = async () => {
      try {
        const res = await fetch(`/api/fiscal/nfe/${id}/xml`, { cache: "no-store" });
        if (!res.ok) throw new Error("NFe não encontrada.");

        const text = await res.text();
        setXml(text);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar NFe.");
      } finally {
        setLoading(false);
      }
    };
    loadNfe();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando DANFE...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Erro: {error}</div>;

  return (
    <div className="min-h-screen bg-muted p-4 sm:p-8 no-print">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <Link href="/tenant/vendas" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-md"
          >
            <Printer className="h-4 w-4" /> Imprimir DANFE
          </button>
        </div>
      </div>

      <div className="bg-card shadow-2xl mx-auto p-8 border border-border print:shadow-none print:border-none print:p-0" id="danfe-content">
        <div className="border-2 border-black p-2 mb-4">
          <div className="flex justify-between items-start">
            <div className="w-1/2 border-r-2 border-black pr-2">
              <h1 className="font-bold text-lg uppercase">DANFE</h1>
              <p className="text-xs">Documento Auxiliar da Nota Fiscal Eletrônica</p>
              <div className="mt-4 grid grid-cols-2 text-[10px]">
                <div>0 - ENTRADA<br />1 - SAÍDA</div>
                <div className="border-2 border-black text-center font-bold text-lg">1</div>
              </div>
            </div>
            <div className="w-1/2 pl-2 text-[10px]">
              <p className="font-bold">CHAVE DE ACESSO</p>
              <p className="text-xs tracking-tighter">CONSULTA DE AUTENTICIDADE NO PORTAL NACIONAL DA NF-E</p>
              <div className="mt-4 border-2 border-black p-1 text-center font-mono">
                3524 0412 3456 7800 0190 5500 1000 0012 3412 3456 7890
              </div>
            </div>
          </div>
        </div>

        <div className="text-center py-20 border-2 border-dashed border-border rounded-lg text-slate-400">
          <p className="font-medium">Visualizador de DANFE Premium</p>
          <p className="text-sm mt-2">Os dados serão extraídos automaticamente do XML {id?.toString().substring(0, 8)}</p>
          {xml && <p className="text-xs mt-3 text-muted-foreground">XML fiscal carregado com sucesso para esta venda.</p>}
        </div>

        <div className="mt-8 text-[9px] text-slate-400">
          <p>Fluxo ERP - Sistema de Gestão Inteligente</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #danfe-content { width: 100% !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
