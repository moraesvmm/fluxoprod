"use client";

import { AlertTriangle, Check, Eye, X } from "lucide-react";
import { useAlertasEstoque, useResolverAlertaEstoque, useVerificarAlertasEstoque } from "@/lib/hooks/use-alertas-estoque";
import { useToast, Toast } from "@/components/ui/toast";

export default function AlertasEstoquePanel() {
  const { data: alertas, isLoading, error } = useAlertasEstoque("pendente");
  const resolverMutation = useResolverAlertaEstoque();
  const verificarMutation = useVerificarAlertasEstoque();
  const { toasts, removeToast, success, error: toastError } = useToast();

  const handleResolver = async (alertaId: string, status: string) => {
    try {
      await resolverMutation.mutateAsync({ alertaId, status });
      success(status === "resolvido" ? "Alerta resolvido com sucesso!" : "Alerta visualizado!");
    } catch (err: any) {
      toastError("Erro ao resolver alerta: " + (err.message || "Tente novamente."));
    }
  };

  const handleVerificar = async () => {
    try {
      const result = await verificarMutation.mutateAsync();
      success(`${result.alertas_criados} alertas criados!`);
    } catch (err: any) {
      toastError("Erro ao verificar alertas: " + (err.message || "Tente novamente."));
    }
  };

  const alertasPendentes = alertas || [];

  return (
    <div className="space-y-4">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">Alertas de Estoque</h3>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            {alertasPendentes.length} pendentes
          </span>
        </div>
        <button
          onClick={handleVerificar}
          disabled={verificarMutation.isPending}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 h-8 px-3"
        >
          {verificarMutation.isPending ? "Verificando..." : "Verificar Alertas"}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Carregando alertas...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">Erro ao carregar alertas</div>
      ) : alertasPendentes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
          <AlertTriangle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm">Nenhum alerta pendente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertasPendentes.map((alerta) => (
            <div
              key={alerta.id}
              className={`p-4 rounded-lg border ${
                alerta.tipo_alerta === "sem_estoque"
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {alerta.tipo_alerta === "sem_estoque" ? (
                      <X className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="font-medium text-slate-900">{alerta.produto_nome}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{alerta.mensagem}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Estoque atual: <strong className={alerta.estoque_atual === 0 ? "text-red-600" : "text-amber-600"}>{alerta.estoque_atual}</strong></span>
                    <span>Mínimo: <strong>{alerta.estoque_minimo}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolver(alerta.id, "visualizado")}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 h-8 px-3"
                    title="Marcar como visualizado"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Visualizar
                  </button>
                  <button
                    onClick={() => handleResolver(alerta.id, "resolvido")}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-8 px-3"
                    title="Marcar como resolvido"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Resolver
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
