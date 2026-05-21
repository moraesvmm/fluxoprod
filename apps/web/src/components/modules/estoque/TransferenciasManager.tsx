"use client";

import { useState } from "react";
import { Building2, Plus, Trash2, ArrowRight, CheckCircle, XCircle, Clock, Package } from "lucide-react";
import { useLocaisEstoque, useCriarLocalEstoque, useDesativarLocalEstoque } from "@/lib/hooks/use-locais-estoque";
import { useTransferencias, useCriarTransferencia, useConcluirTransferencia, useCancelarTransferencia } from "@/lib/hooks/use-transferencias";
import { useProdutos } from "@/lib/hooks/use-produtos";
import { useToast, Toast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function TransferenciasManager() {
  const { data: locais = [], isLoading: loadingLocais } = useLocaisEstoque();
  const { data: produtos = [] } = useProdutos();
  const { data: transferencias = [], isLoading: loadingTransferencias } = useTransferencias();
  const criarLocalMutation = useCriarLocalEstoque();
  const desativarLocalMutation = useDesativarLocalEstoque();
  const criarTransferenciaMutation = useCriarTransferencia();
  const concluirTransferenciaMutation = useConcluirTransferencia();
  const cancelarTransferenciaMutation = useCancelarTransferencia();
  
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isTransferenciaModalOpen, setIsTransferenciaModalOpen] = useState(false);
  const [deleteLocalId, setDeleteLocalId] = useState<string | null>(null);
  const [concluirTransferenciaId, setConcluirTransferenciaId] = useState<string | null>(null);
  const [cancelarTransferenciaId, setCancelarTransferenciaId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  const [localFormData, setLocalFormData] = useState({
    nome: "",
    tipo: "filial",
    endereco: ""
  });
  
  const [transferenciaFormData, setTransferenciaFormData] = useState({
    produto_id: "",
    local_origem_id: "",
    local_destino_id: "",
    quantidade: 1,
    observacao: ""
  });
  
  const { toasts, removeToast, success, error: toastError } = useToast();

  const handleSalvarLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localFormData.nome.trim() || !localFormData.tipo) return;
    
    try {
      await criarLocalMutation.mutateAsync(localFormData);
      success("Local criado com sucesso!");
      setIsLocalModalOpen(false);
      setLocalFormData({ nome: "", tipo: "filial", endereco: "" });
    } catch (err: unknown) {
      toastError("Erro ao criar local: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
    }
  };

  const handleDesativarLocal = async () => {
    if (!deleteLocalId) return;
    try {
      await desativarLocalMutation.mutateAsync(deleteLocalId);
      success("Local desativado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao desativar local: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
    } finally {
      setDeleteLocalId(null);
    }
  };

  const handleCriarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferenciaFormData.produto_id || !transferenciaFormData.local_origem_id || 
        !transferenciaFormData.local_destino_id || transferenciaFormData.quantidade <= 0) return;
    
    try {
      await criarTransferenciaMutation.mutateAsync({
        ...transferenciaFormData,
        quantidade: transferenciaFormData.quantidade,
        criado_por: "current_user" // TODO: get from auth
      });
      success("Transferência criada com sucesso!");
      setIsTransferenciaModalOpen(false);
      setTransferenciaFormData({
        produto_id: "",
        local_origem_id: "",
        local_destino_id: "",
        quantidade: 1,
        observacao: ""
      });
    } catch (err: unknown) {
      toastError("Erro ao criar transferência: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
    }
  };

  const handleConcluirTransferencia = async () => {
    if (!concluirTransferenciaId) return;
    try {
      await concluirTransferenciaMutation.mutateAsync(concluirTransferenciaId);
      success("Transferência concluída com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao concluir transferência: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
    } finally {
      setConcluirTransferenciaId(null);
    }
  };

  const handleCancelarTransferencia = async () => {
    if (!cancelarTransferenciaId) return;
    try {
      await cancelarTransferenciaMutation.mutateAsync(cancelarTransferenciaId);
      success("Transferência cancelada com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao cancelar transferência: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
    } finally {
      setCancelarTransferenciaId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pendente: "bg-amber-100 text-amber-800",
      em_transito: "bg-blue-100 text-blue-800",
      concluida: "bg-green-100 text-green-800",
      cancelada: "bg-red-100 text-red-800"
    };
    const icons = {
      pendente: Clock,
      em_transito: ArrowRight,
      concluida: CheckCircle,
      cancelada: XCircle
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status as keyof typeof styles] || styles.pendente}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const filteredTransferencias = statusFilter 
    ? transferencias.filter(t => t.status === statusFilter)
    : transferencias;

  return (
    <div className="space-y-6">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      {/* Seção de Locais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Locais de Estoque</h3>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {locais.length} ativos
            </span>
          </div>
          <button
            onClick={() => setIsLocalModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600 h-8 px-3"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Local
          </button>
        </div>

        {loadingLocais ? (
          <div className="text-center py-8 text-muted-foreground">Carregando locais...</div>
        ) : locais.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted rounded-lg border border-border">
            <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">Nenhum local cadastrado</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {locais.map((local) => (
              <div key={local.id} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="inline-block text-xs font-medium text-muted-foreground uppercase mb-1">
                      {local.tipo}
                    </span>
                    <h4 className="font-medium text-foreground">{local.nome}</h4>
                    {local.endereco && (
                      <p className="text-sm text-muted-foreground mt-1">{local.endereco}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteLocalId(local.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção de Transferências */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold">Transferências de Estoque</h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="em_transito">Em Trânsito</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <button
              onClick={() => setIsTransferenciaModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-8 px-3"
            >
              <Plus className="mr-2 h-4 w-4" /> Nova Transferência
            </button>
          </div>
        </div>

        {loadingTransferencias ? (
          <div className="text-center py-8 text-muted-foreground">Carregando transferências...</div>
        ) : filteredTransferencias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted rounded-lg border border-border">
            <ArrowRight className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">Nenhuma transferência encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-3 font-medium text-foreground">Produto</th>
                  <th className="text-left p-3 font-medium text-foreground">Origem</th>
                  <th className="text-left p-3 font-medium text-foreground">Destino</th>
                  <th className="text-left p-3 font-medium text-foreground">Quantidade</th>
                  <th className="text-left p-3 font-medium text-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransferencias.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-muted">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-foreground">{t.produto_nome}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{t.local_origem_nome}</td>
                    <td className="p-3 text-muted-foreground">{t.local_destino_nome}</td>
                    <td className="p-3 font-medium text-foreground">{t.quantidade}</td>
                    <td className="p-3">{getStatusBadge(t.status)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {t.status === "pendente" && (
                          <>
                            <button
                              onClick={() => setConcluirTransferenciaId(t.id)}
                              className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-7 px-2"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Concluir
                            </button>
                            <button
                              onClick={() => setCancelarTransferenciaId(t.id)}
                              className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 h-7 px-2"
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Novo Local */}
      <Modal isOpen={isLocalModalOpen} onClose={() => setIsLocalModalOpen(false)} title="Novo Local de Estoque">
        <form onSubmit={handleSalvarLocal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
            <input
              type="text"
              value={localFormData.nome}
              onChange={(e) => setLocalFormData({ ...localFormData, nome: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
            <select
              value={localFormData.tipo}
              onChange={(e) => setLocalFormData({ ...localFormData, tipo: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="filial">Filial</option>
              <option value="deposito">Depósito</option>
              <option value="loja">Loja</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
            <textarea
              value={localFormData.endereco}
              onChange={(e) => setLocalFormData({ ...localFormData, endereco: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsLocalModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criarLocalMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {criarLocalMutation.isPending ? "Criando..." : "Criar Local"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Nova Transferência */}
      <Modal isOpen={isTransferenciaModalOpen} onClose={() => setIsTransferenciaModalOpen(false)} title="Nova Transferência">
        <form onSubmit={handleCriarTransferencia} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Produto</label>
            <select
              value={transferenciaFormData.produto_id}
              onChange={(e) => setTransferenciaFormData({ ...transferenciaFormData, produto_id: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um produto</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Origem</label>
              <select
                value={transferenciaFormData.local_origem_id}
                onChange={(e) => setTransferenciaFormData({ ...transferenciaFormData, local_origem_id: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Selecione</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Destino</label>
              <select
                value={transferenciaFormData.local_destino_id}
                onChange={(e) => setTransferenciaFormData({ ...transferenciaFormData, local_destino_id: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Selecione</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Quantidade</label>
            <input
              type="number"
              min="1"
              value={transferenciaFormData.quantidade}
              onChange={(e) => setTransferenciaFormData({ ...transferenciaFormData, quantidade: parseInt(e.target.value) || 1 })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Observação</label>
            <textarea
              value={transferenciaFormData.observacao}
              onChange={(e) => setTransferenciaFormData({ ...transferenciaFormData, observacao: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsTransferenciaModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criarTransferenciaMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
            >
              {criarTransferenciaMutation.isPending ? "Criando..." : "Criar Transferência"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Desativação */}
      <ConfirmModal
        isOpen={!!deleteLocalId}
        onCancel={() => setDeleteLocalId(null)}
        onConfirm={handleDesativarLocal}
        title="Desativar Local"
        message="Tem certeza que deseja desativar este local? Esta ação não pode ser desfeita."
        variant="danger"
      />

      {/* Modal Confirmar Conclusão */}
      <ConfirmModal
        isOpen={!!concluirTransferenciaId}
        onCancel={() => setConcluirTransferenciaId(null)}
        onConfirm={handleConcluirTransferencia}
        title="Concluir Transferência"
        message="Tem certeza que deseja concluir esta transferência? O estoque será adicionado ao destino."
        variant="default"
      />

      {/* Modal Confirmar Cancelamento */}
      <ConfirmModal
        isOpen={!!cancelarTransferenciaId}
        onCancel={() => setCancelarTransferenciaId(null)}
        onConfirm={handleCancelarTransferencia}
        title="Cancelar Transferência"
        message="Tem certeza que deseja cancelar esta transferência? O estoque será devolvido Ã  origem."
        variant="danger"
      />
    </div>
  );
}
