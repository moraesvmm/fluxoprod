"use client";

import { useState } from "react";
import { Calculator, DollarSign, AlertTriangle } from "lucide-react";
import { useValorizacaoEstoque, useAtualizarCustoProduto } from "@/lib/hooks/use-valoracao";
import { useProdutos } from "@/lib/hooks/use-produtos";
import { useToast, Toast } from "@/components/ui/toast";

export default function ValorizacaoDashboard() {
  const [metodo, setMetodo] = useState("custo_medio");
  const { data: valorizacao, isLoading, refetch } = useValorizacaoEstoque(metodo);
  const { data: produtos = [] } = useProdutos();
  const atualizarCustoMutation = useAtualizarCustoProduto();
  const { toasts, removeToast, success, error: toastError } = useToast();
  
  const [editingCusto, setEditingCusto] = useState<{ [key: string]: number }>({});

  const handleCalcular = () => {
    refetch();
  };

  const handleCustoChange = (produtoId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setEditingCusto(prev => ({ ...prev, [produtoId]: numValue }));
    }
  };

  const handleSalvarCusto = async (produtoId: string, metodo: string) => {
    const novoCusto = editingCusto[produtoId];
    if (novoCusto === undefined) return;

    try {
      await atualizarCustoMutation.mutateAsync({
        produtoId,
        custo: novoCusto,
        metodo
      });
      success("Custo atualizado com sucesso!");
      setEditingCusto(prev => {
        const { [produtoId]: _, ...rest } = prev;
        return rest;
      });
      refetch();
    } catch (err: unknown) {
      toastError("Erro ao atualizar custo: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  return (
    <div className="space-y-6">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold">Valoração de Estoque</h3>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="custo_medio">Custo Médio</option>
            <option value="fifo">FIFO</option>
            <option value="lifo">LIFO</option>
          </select>
          <button
            onClick={handleCalcular}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 h-8 px-3"
          >
            <Calculator className="mr-2 h-4 w-4" /> Calcular
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Calculando valoração...</div>
      ) : valorizacao ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-sm text-slate-600">Valor Total do Estoque</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                R$ {valorizacao.valor_total?.toFixed(2) || "0,00"}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-slate-600">Método de Valoração</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2 capitalize">
                {valorizacao.metodo?.replace("_", " ") || "custo médio"}
              </p>
            </div>
            {valorizacao.produtos_sem_custo > 0 && (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-amber-700">Produtos Sem Custo</span>
                </div>
                <p className="text-2xl font-bold text-amber-700 mt-2">
                  {valorizacao.produtos_sem_custo}
                </p>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h4 className="font-medium text-slate-900">Custo Unitário por Produto</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left p-3 font-medium text-slate-700">Produto</th>
                    <th className="text-left p-3 font-medium text-slate-700">Categoria</th>
                    <th className="text-left p-3 font-medium text-slate-700">Custo Unitário</th>
                    <th className="text-left p-3 font-medium text-slate-700">Método</th>
                    <th className="text-left p-3 font-medium text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((produto) => (
                    <tr key={produto.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{produto.nome}</td>
                      <td className="p-3 text-slate-600">{produto.categoria || "-"}</td>
                      <td className="p-3">
                        {editingCusto[produto.id] !== undefined ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingCusto[produto.id]}
                            onChange={(e) => handleCustoChange(produto.id, e.target.value)}
                            className="w-24 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        ) : (
                          <span className={produto.custo_unitario === null ? "text-red-500" : "text-slate-900"}>
                            R$ {produto.custo_unitario?.toFixed(2) || "0,00"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 capitalize">{produto.metodo_valoracao?.replace("_", " ") || "custo médio"}</td>
                      <td className="p-3">
                        {editingCusto[produto.id] !== undefined ? (
                          <button
                            onClick={() => handleSalvarCusto(produto.id, produto.metodo_valoracao || "custo_medio")}
                            disabled={atualizarCustoMutation.isPending}
                            className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-7 px-2 disabled:opacity-50"
                          >
                            Salvar
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingCusto(prev => ({ ...prev, [produto.id]: produto.custo_unitario || 0 }))}
                            className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 h-7 px-2"
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
          <Calculator className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm">Clique em "Calcular" para ver a valoração do estoque</p>
        </div>
      )}
    </div>
  );
}
