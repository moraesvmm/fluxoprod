"use client";

import { useState } from "react";
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { usePrevisoesDemanda, useGerarPrevisaoDemanda, useAtualizarDemandaReal } from "@/lib/hooks/use-previsao-demanda";
import { useProdutos } from "@/lib/hooks/use-produtos";
import { useToast, Toast } from "@/components/ui/toast";

export default function PrevisaoDemandaPanel() {
  const { data: previsoes = [], isLoading, refetch } = usePrevisoesDemanda();
  const { data: produtos = [] } = useProdutos();
  const gerarPrevisaoMutation = useGerarPrevisaoDemanda();
  const atualizarDemandaMutation = useAtualizarDemandaReal();
  const { toasts, removeToast, success, error: toastError } = useToast();
  
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [diasAnalise, setDiasAnalise] = useState(30);
  const [diasPrevisao, setDiasPrevisao] = useState(30);
  const [ultimaPrevisao, setUltimaPrevisao] = useState<any>(null);
  const [editandoDemandaReal, setEditandoDemandaReal] = useState<{ [key: string]: number }>({});

  const handleGerarPrevisao = async () => {
    if (!produtoSelecionado) {
      toastError("Selecione um produto");
      return;
    }

    try {
      const result = await gerarPrevisaoMutation.mutateAsync({
        produtoId: produtoSelecionado,
        diasAnalise,
        diasPrevisao
      });
      setUltimaPrevisao(result);
      success("Previsão gerada com sucesso!");
      refetch();
    } catch (err: any) {
      toastError("Erro ao gerar previsão: " + (err.message || "Tente novamente."));
    }
  };

  const handleSalvarDemandaReal = async (previsaoId: string) => {
    const demandaReal = editandoDemandaReal[previsaoId];
    if (demandaReal === undefined) return;

    try {
      await atualizarDemandaMutation.mutateAsync({ previsaoId, demandaReal });
      success("Demanda real atualizada!");
      setEditandoDemandaReal(prev => {
        const { [previsaoId]: _, ...rest } = prev;
        return rest;
      });
      refetch();
    } catch (err: any) {
      toastError("Erro ao atualizar demanda: " + (err.message || "Tente novamente."));
    }
  };

  const getPrecisaoColor = (precisao?: number) => {
    if (!precisao) return "text-slate-500";
    if (precisao >= 80) return "text-green-600";
    if (precisao >= 60) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-500" />
          <h3 className="text-lg font-semibold">Previsão de Demanda</h3>
        </div>
      </div>

      {/* Gerador de Previsão */}
      <div className="p-4 rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Produto</label>
            <select
              value={produtoSelecionado}
              onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dias de Análise</label>
            <input
              type="number"
              value={diasAnalise}
              onChange={(e) => setDiasAnalise(parseInt(e.target.value) || 30)}
              min="1"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dias de Previsão</label>
            <input
              type="number"
              value={diasPrevisao}
              onChange={(e) => setDiasPrevisao(parseInt(e.target.value) || 30)}
              min="1"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGerarPrevisao}
              disabled={gerarPrevisaoMutation.isPending}
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-teal-600 text-white hover:bg-teal-700 h-9 disabled:opacity-50"
            >
              <TrendingUp className="mr-2 h-4 w-4" /> Gerar Previsão
            </button>
          </div>
        </div>

        {ultimaPrevisao && (
          <div className={`mt-4 p-4 rounded-lg ${ultimaPrevisao.dias_para_zerar !== null && ultimaPrevisao.dias_para_zerar < diasPrevisao ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-start gap-3">
              {ultimaPrevisao.dias_para_zerar !== null && ultimaPrevisao.dias_para_zerar < diasPrevisao ? (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              )}
              <div>
                <h4 className="font-medium text-slate-900">Previsão Gerada</h4>
                <p className="text-sm text-slate-700 mt-1">
                  Demanda prevista: <strong>{ultimaPrevisao.demanda_prevista}</strong> unidades
                </p>
                <p className="text-sm text-slate-700">
                  Média diária: <strong>{ultimaPrevisao.media_venda_diaria.toFixed(2)}</strong> unidades/dia
                </p>
                {ultimaPrevisao.dias_para_zerar !== null && ultimaPrevisao.dias_para_zerar < diasPrevisao && (
                  <p className="text-sm text-red-700 mt-2 font-medium">
                    ⚠️ Reposição urgente necessária (estoque zera em {ultimaPrevisao.dias_para_zerar} dias)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Previsões */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h4 className="font-medium text-slate-900">Histórico de Previsões</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left p-3 font-medium text-slate-700">Produto</th>
                <th className="text-left p-3 font-medium text-slate-700">Período</th>
                <th className="text-left p-3 font-medium text-slate-700">Previsto</th>
                <th className="text-left p-3 font-medium text-slate-700">Real</th>
                <th className="text-left p-3 font-medium text-slate-700">Precisão</th>
                <th className="text-left p-3 font-medium text-slate-700">Dias p/ Zerar</th>
                <th className="text-left p-3 font-medium text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(previsoes) && previsoes.map((previsao) => (
                <tr key={previsao.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{previsao.produto_nome}</td>
                  <td className="p-3 text-slate-600">
                    {new Date(previsao.periodo_inicio).toLocaleDateString('pt-BR')} - {new Date(previsao.periodo_fim).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 text-slate-900 font-medium">{previsao.demanda_prevista}</td>
                  <td className="p-3">
                    {editandoDemandaReal[previsao.id] !== undefined ? (
                      <input
                        type="number"
                        value={editandoDemandaReal[previsao.id]}
                        onChange={(e) => setEditandoDemandaReal(prev => ({ ...prev, [previsao.id]: parseInt(e.target.value) || 0 }))}
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    ) : (
                      <span className={previsao.demanda_real ? "text-slate-900" : "text-slate-400"}>
                        {previsao.demanda_real ?? "-"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {previsao.precisao !== null && previsao.precisao !== undefined ? (
                      <span className={getPrecisaoColor(previsao.precisao)}>
                        {previsao.precisao.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td className={`p-3 font-medium ${previsao.dias_para_zerar !== null && previsao.dias_para_zerar !== undefined && previsao.dias_para_zerar < 30 ? "text-red-600" : "text-slate-700"}`}>
                    {previsao.dias_para_zerar !== null && previsao.dias_para_zerar !== undefined ? previsao.dias_para_zerar : '-'}
                  </td>
                  <td className="p-3">
                    {editandoDemandaReal[previsao.id] !== undefined ? (
                      <button
                        onClick={() => handleSalvarDemandaReal(previsao.id)}
                        disabled={atualizarDemandaMutation.isPending}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-7 px-2 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditandoDemandaReal(prev => ({ ...prev, [previsao.id]: previsao.demanda_real || 0 }))}
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
    </div>
  );
}
