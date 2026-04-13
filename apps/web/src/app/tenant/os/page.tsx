"use client";

import { useState, useEffect } from "react";
import { KPICard } from "@/components/modules/base/KPICard";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wrench, Plus, Search, Eye, Edit, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast, Toast } from "@/components/ui/toast";
import { useOS, useCreateOS, useDeleteOS } from "@/lib/hooks/use-os";
import { useClientes } from "@/lib/hooks/use-clientes";

interface Funcionario {
  id: string;
  nome: string;
}

export default function OSPage() {
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [formData, setFormData] = useState({
    cliente_id: "",
    veiculo_equipamento: "",
    descricao_problema: "",
    colaborador_id: "",
    valor: "",
  });

  const { toasts, removeToast, success, error: toastError } = useToast();
  const supabase = createClient();

  const { data: ordens, isLoading: loadingOS } = useOS();
  const { data: clientes, isLoading: loadingClientes } = useClientes();
  const createMutation = useCreateOS();
  const deleteMutation = useDeleteOS();

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const carregarFuncionarios = async () => {
    const { data } = await supabase.rpc('tenant_listar_funcionarios');
    if (data) setFuncionarios(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.veiculo_equipamento || !formData.cliente_id) return;

    try {
      await createMutation.mutateAsync({
        cliente_id: formData.cliente_id,
        veiculo_equipamento: formData.veiculo_equipamento,
        descricao_problema: formData.descricao_problema,
        colaborador_id: formData.colaborador_id || undefined,
        valor: formData.valor ? parseFloat(formData.valor) : 0,
        status: "aberta",
      });
      success("OS criada com sucesso!");
      setShowModal(false);
      setFormData({
        cliente_id: "",
        veiculo_equipamento: "",
        descricao_problema: "",
        colaborador_id: "",
        valor: "",
      });
    } catch (err: any) {
      toastError("Erro ao criar OS: " + (err.message || "Tente novamente"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      success("OS excluída com sucesso!");
    } catch (err: any) {
      toastError("Erro ao excluir OS");
    } finally {
      setDeleteId(null);
    }
  };

  const formatarMoeda = (v?: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const formatarData = (d: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  const abertas = ordens?.filter(o => o.status === "aberta").length || 0;
  const execucao = ordens?.filter(o => o.status === "execucao").length || 0;
  const concluidas = ordens?.filter(o => o.status === "concluida").length || 0;
  const canceladas = ordens?.filter(o => o.status === "cancelada").length || 0;

  return (
    <div className="space-y-8">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <ConfirmModal
        isOpen={!!deleteId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        title="Excluir OS"
        message="Tem certeza que deseja excluir esta Ordem de Serviço?"
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h2>
          <p className="text-muted-foreground">Gestão de ordens de serviço e histórico.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova OS
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Abertas" value={abertas} icon={Clock} className="border-amber-200 bg-amber-50/10" />
        <KPICard title="Em Execução" value={execucao} icon={Wrench} className="border-blue-200 bg-blue-50/10" />
        <KPICard title="Concluídas" value={concluidas} icon={CheckCircle} className="border-emerald-200 bg-emerald-50/10" />
        <KPICard title="Canceladas" value={canceladas} icon={XCircle} className="border-red-200 bg-red-50/10" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por cliente, veículo ou número..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Veículo/Equipamento</TableHead>
              <TableHead>Problema</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingOS ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Carregando ordens de serviço...
                </TableCell>
              </TableRow>
            ) : ordens?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="h-10 w-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">Nenhuma ordem de serviço encontrada</p>
                    <p className="text-slate-400 text-xs">Clique em &quot;Nova OS&quot; para criar a primeira.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              ordens?.map((os) => (
                <TableRow key={os.id}>
                  <TableCell className="font-mono text-slate-500">#{os.numero}</TableCell>
                  <TableCell className="font-medium">{os.cliente?.nome || "—"}</TableCell>
                  <TableCell>{os.veiculo_equipamento}</TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{os.descricao_problema || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={os.status === 'aberta' ? 'warning' : os.status === 'concluida' ? 'success' : os.status === 'cancelada' ? 'error' : 'info'}
                      label={os.status === 'aberta' ? 'Aberta' : os.status === 'concluida' ? 'Concluída' : os.status === 'cancelada' ? 'Cancelada' : 'Em Execução'}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-emerald-700">{formatarMoeda(os.valor)}</TableCell>
                  <TableCell className="text-sm text-slate-500">{formatarData(os.criado_em)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDeleteId(os.id)} className="text-slate-400 hover:text-red-600 p-1 transition-colors" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Ordem de Serviço">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
            <select
              value={formData.cliente_id}
              onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Selecione...</option>
              {clientes?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Veículo/Equipamento *</label>
            <input
              type="text"
              value={formData.veiculo_equipamento}
              onChange={(e) => setFormData({ ...formData, veiculo_equipamento: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Honda Civic 2020"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Problema</label>
            <textarea
              value={formData.descricao_problema}
              onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Descreva o problema..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
              <select
                value={formData.colaborador_id}
                onChange={(e) => setFormData({ ...formData, colaborador_id: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado</label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Criando..." : "Criar OS"}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
