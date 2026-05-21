"use client";

import { useState } from "react";
import { QrCode, Search, Plus, CheckCircle } from "lucide-react";
import { useProdutos } from "@/lib/hooks/use-produtos";
import { useGerarCodigoBarras, useBuscarProdutoPorCodigo } from "@/lib/hooks/use-valoracao";
import { useToast, Toast } from "@/components/ui/toast";
import type { Produto, ProdutoLookupResult } from "@/lib/api";

function isLookupError(result: ProdutoLookupResult): result is { error: string } {
  return typeof result === "object" && result !== null && "error" in result;
}

// Para scanner físico, integrar com biblioteca html5-qrcode ou react-qr-reader na Sessão 6 (integração final)

export default function CodigosPanel() {
  const { data: produtos = [] } = useProdutos();
  const gerarCodigoMutation = useGerarCodigoBarras();
  const buscarProdutoMutation = useBuscarProdutoPorCodigo();
  const { toasts, removeToast, success, error: toastError } = useToast();
  
  const [codigoBusca, setCodigoBusca] = useState("");
  const [produtoEncontrado, setProdutoEncontrado] = useState<Produto | null>(null);

  const handleGerarCodigo = async (produtoId: string) => {
    try {
      await gerarCodigoMutation.mutateAsync(produtoId);
      success("Código de barras gerado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao gerar código: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
    }
  };

  const handleBuscarPorCodigo = async () => {
    if (!codigoBusca.trim()) return;

    try {
      const result = await buscarProdutoMutation.mutateAsync(codigoBusca);
      if (isLookupError(result)) {
        toastError(result.error);
        setProdutoEncontrado(null);
      } else if (result) {
        setProdutoEncontrado(result);
        success("Produto encontrado!");
      } else {
        toastError("Produto nao encontrado.");
        setProdutoEncontrado(null);
      }
    } catch (err: unknown) {
      toastError("Erro ao buscar produto: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
      setProdutoEncontrado(null);
    }
  };

  return (
    <div className="space-y-6">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-semibold">Códigos de Barras e QR</h3>
        </div>
      </div>

      {/* Busca por código */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={codigoBusca}
            onChange={(e) => setCodigoBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscarPorCodigo()}
            placeholder="Digite o código de barras ou QR..."
            className="flex-1 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleBuscarPorCodigo}
            disabled={buscarProdutoMutation.isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 h-8 px-3 disabled:opacity-50"
          >
            Buscar
          </button>
        </div>

        {produtoEncontrado && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">{produtoEncontrado.nome}</h4>
                <p className="text-sm text-green-700 mt-1">
                  Código: {produtoEncontrado.codigo_barras || produtoEncontrado.codigo_qr || "-"}
                </p>
                <p className="text-sm text-green-700">
                  Preço: R$ {produtoEncontrado.preco_base?.toFixed(2) || "0,00"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de produtos com códigos */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted">
          <h4 className="font-medium text-foreground">Códigos por Produto</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left p-3 font-medium text-foreground">Produto</th>
                <th className="text-left p-3 font-medium text-foreground">Código de Barras</th>
                <th className="text-left p-3 font-medium text-foreground">QR Code</th>
                <th className="text-left p-3 font-medium text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id} className="border-b border-slate-100 hover:bg-muted">
                  <td className="p-3 font-medium text-foreground">{produto.nome}</td>
                  <td className="p-3">
                    {produto.codigo_barras ? (
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                        {produto.codigo_barras}
                      </code>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    {produto.codigo_qr ? (
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-indigo-500" />
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {produto.codigo_qr}
                        </code>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    {!produto.codigo_barras ? (
                      <button
                        onClick={() => handleGerarCodigo(produto.id)}
                        disabled={gerarCodigoMutation.isPending}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 h-7 px-2 disabled:opacity-50"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Gerar Código
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Código gerado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
