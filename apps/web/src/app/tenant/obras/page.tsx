"use client";

import { useState } from "react";
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
import { Building2, Plus, Search, Calendar, MapPin, Trash2, Edit, LayoutGrid } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/modules/base/Calendar";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast, Toast } from "@/components/ui/toast";
import { useObras, useCreateObra, useDeleteObra, useUpdateObra } from "@/lib/hooks/use-obras";
import { useClientes } from "@/lib/hooks/use-clientes";

export default function ObrasPage() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [formData, setFormData] = useState({
    nome: "",
    cliente_id: "",
    endereco: "",
    data_inicio: "",
    data_fim_prevista: "",
    orcamento: "",
    descricao: "",
  });

  const { toasts, removeToast, success, error: toastError } = useToast();

  const { data: obras, isLoading: loadingObras } = useObras();
  const { data: clientes, isLoading: loadingClientes } = useClientes();
  const createMutation = useCreateObra();
  const deleteMutation = useDeleteObra();
  const updateMutation = useUpdateObra();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    try {
      await createMutation.mutateAsync({
        nome: formData.nome,
        cliente_id: formData.cliente_id || undefined,
        endereco: formData.endereco,
        data_inicio: formData.data_inicio || undefined,
        data_fim_prevista: formData.data_fim_prevista || undefined,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : 0,
        descricao: formData.descricao,
        status: "planejada",
      });
      success("Obra criada com sucesso!");
      setShowModal(false);
      setFormData({
        nome: "",
        cliente_id: "",
        endereco: "",
        data_inicio: "",
        data_fim_prevista: "",
        orcamento: "",
        descricao: "",
      });
    } catch (err: any) {
      toastError("Erro ao criar Obra: " + (err.message || "Tente novamente"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      success("Obra excluída com sucesso!");
    } catch (err: any) {
      toastError("Erro ao excluir Obra: " + (err.message || "Tente novamente"));
    } finally {
      setDeleteId(null);
    }
  };

  const formatarValor = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const formatarData = (dataString?: string) => {
    if (!dataString) return "—";
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const transformarObrasParaCalendario = () => {
    return obras?.filter(obra => obra.data_inicio).map(obra => ({
      id: obra.id,
      title: obra.nome,
      date: obra.data_inicio!,
      endDate: obra.data_fim_prevista,
      status: obra.status,
      type: 'obra' as const,
      description: obra.endereco || obra.descricao,
    })) || [];
  };

  const formatarMoeda = (v?: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const abrirEdicao = (obra: any) => {
    setEditId(obra.id);
    setFormData({
      nome: obra.nome || '',
      cliente_id: obra.cliente_id || '',
      endereco: obra.endereco || '',
      data_inicio: obra.data_inicio || '',
      data_fim_prevista: obra.data_fim_prevista || '',
      orcamento: obra.orcamento ? String(obra.orcamento) : '',
      descricao: obra.descricao || '',
    });
    setShowEditModal(true);
  };

  const editarObra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !formData.nome) return;

    try {
      const payload: any = {
        nome: formData.nome,
        cliente_id: formData.cliente_id || undefined,
        endereco: formData.endereco,
        data_inicio: formData.data_inicio || undefined,
        data_fim_prevista: formData.data_fim_prevista || undefined,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : undefined,
        descricao: formData.descricao,
      };

      await updateMutation.mutateAsync({ id: editId, obra: payload });

      setFormData({ nome: '', cliente_id: '', endereco: '', data_inicio: '', data_fim_prevista: '', orcamento: '', descricao: '' });
      setShowEditModal(false);
      setEditId(null);
      success("Obra atualizada com sucesso!");
    } catch (err: any) {
      toastError("Erro ao atualizar obra: " + (err.message || "Tente novamente."));
    }
  };

  const planejadas = obras?.filter(o => o.status === "planejada").length || 0;
  const andamento = obras?.filter(o => o.status === "andamento").length || 0;
  const concluidas = obras?.filter(o => o.status === "concluida").length || 0;
  const investimentoTotal = obras?.reduce((acc, o) => acc + (o.orcamento || 0), 0) || 0;

  return (
    <div className="space-y-8">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <ConfirmModal
        isOpen={!!deleteId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        title="Excluir Obra"
        message="Tem certeza que deseja excluir esta Obra e todo o seu histórico?"
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Obras e Projetos</h2>
          <p className="text-muted-foreground">Gestão de obras com integração com OS e vendas.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Obra
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Planejadas" value={planejadas} icon={Calendar} className="border-slate-200 bg-slate-50/10" />
        <KPICard title="Em Andamento" value={andamento} icon={Building2} className="border-blue-200 bg-blue-50/10" />
        <KPICard title="Concluídas" value={concluidas} icon={Building2} className="border-emerald-200 bg-emerald-50/10" />
        <KPICard title="Investimento Total" value={formatarMoeda(investimentoTotal)} icon={Building2} />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, cliente ou endereço..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-border rounded-md hover:bg-slate-50 transition-colors"
          >
            {viewMode === 'table' ? (
              <>
                <Calendar className="h-4 w-4" />
                Calendário
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" />
                Tabela
              </>
            )}
          </button>
        </div>

        {viewMode === 'table' ? (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Obra</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim Previsto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orçamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {loadingObras ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Carregando obras...
                </TableCell>
              </TableRow>
            ) : obras?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-10 w-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">Nenhuma obra encontrada</p>
                    <p className="text-slate-400 text-xs">Clique em &quot;Nova Obra&quot; para criar a primeira.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
                obras?.map((obra) => (
                  <TableRow key={obra.id}>
                    <TableCell className="font-medium text-slate-900">{obra.nome}</TableCell>
                    <TableCell>{obra.cliente?.nome || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-slate-500 text-sm">
                         <MapPin className="h-3 w-3 mr-1"/>
                         <span className="truncate max-w-[150px]">{obra.endereco || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatarData(obra.data_inicio)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatarData(obra.data_fim_prevista)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={obra.status === 'planejada' ? 'warning' : obra.status === 'concluida' ? 'success' : 'info'}
                        label={obra.status === 'planejada' ? 'Planejada' : obra.status === 'concluida' ? 'Concluída' : 'Em Andamento'}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-emerald-700">{formatarMoeda(obra.orcamento)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => abrirEdicao(obra)} className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Editar">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(obra.id)} className="text-slate-400 hover:text-red-600 p-1 transition-colors" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        ) : (
          <div className="p-4">
            <CalendarComponent
              events={transformarObrasParaCalendario()}
              title="Calendário de Obras"
              onEventClick={(event) => {
                // Abrir modal de edição quando clicar em um evento
                const obra = obras?.find(o => o.id === event.id);
                if (obra) abrirEdicao(obra);
              }}
            />
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Obra">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Obra *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Reforma Residencial Silva"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <select
               value={formData.cliente_id}
               onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
               className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {clientes?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
            <input
               type="text"
               value={formData.endereco}
               onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
               className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
               placeholder="Ex: Rua A, 123 - Centro"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
              <input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim Prevista</label>
              <input
                type="date"
                value={formData.data_fim_prevista}
                onChange={(e) => setFormData({ ...formData, data_fim_prevista: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Orçamento Total</label>
            <input
              type="number"
              step="0.01"
              value={formData.orcamento}
              onChange={(e) => setFormData({ ...formData, orcamento: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Descrição detalhada da obra..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
               type="submit"
               disabled={createMutation.isPending}
               className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Salvando..." : "Criar Obra"}
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

      {/* Modal de Edição */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Obra">
        <form onSubmit={editarObra} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Obra *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Reforma Residencial Silva"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <select
               value={formData.cliente_id}
               onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
               className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {clientes?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
            <input
               type="text"
               value={formData.endereco}
               onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
               className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
               placeholder="Ex: Rua A, 123 - Centro"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
              <input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim Prevista</label>
              <input
                type="date"
                value={formData.data_fim_prevista}
                onChange={(e) => setFormData({ ...formData, data_fim_prevista: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Orçamento Total</label>
            <input
              type="number"
              step="0.01"
              value={formData.orcamento}
              onChange={(e) => setFormData({ ...formData, orcamento: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Descrição detalhada da obra..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
               type="submit"
               disabled={updateMutation.isPending}
               className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? "Salvando..." : "Atualizar Obra"}
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
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
