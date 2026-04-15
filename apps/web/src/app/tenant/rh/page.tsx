"use client";

import { useState } from "react";
import { KPICard } from "@/components/modules/base/KPICard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Briefcase, UserPlus, Search, Edit, Trash2, Users, Mail, Phone } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast, Toast } from "@/components/ui/toast";
import { useFuncionarios, useCreateFuncionario, useDeleteFuncionario } from "@/lib/hooks/use-funcionarios";

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  email?: string;
  telefone?: string;
  salario?: number;
  criado_em: string;
}

export default function RHPage() {
  const { data: funcionarios, isLoading, error } = useFuncionarios();
  const createFuncionario = useCreateFuncionario();
  const deleteFuncionario = useDeleteFuncionario();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cargo: '',
    email: '',
    telefone: '',
    salario: ''
  });
  const { toasts, removeToast, success, error: toastError } = useToast();

  const criarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.cargo.trim()) return;

    try {
      const payload: any = {
        nome: formData.nome,
        cargo: formData.cargo,
      };
      if (formData.email) payload.email = formData.email;
      if (formData.telefone) payload.telefone = formData.telefone;
      if (formData.salario) payload.salario = parseFloat(formData.salario);

      await createFuncionario.mutateAsync(payload);

      setFormData({ nome: '', cargo: '', email: '', telefone: '', salario: '' });
      setShowModal(false);
      success("Colaborador cadastrado com sucesso!");
    } catch (err: any) {
      toastError("Erro ao cadastrar colaborador: " + (err.message || "Tente novamente."));
    }
  };

  const confirmarExclusao = async () => {
    if (!deleteId) return;
    try {
      await deleteFuncionario.mutateAsync(deleteId);
      success("Colaborador removido com sucesso!");
    } catch (err: any) {
      toastError("Erro ao remover colaborador: " + (err.message || "Tente novamente."));
    } finally {
      setDeleteId(null);
    }
  };

  const formatarMoeda = (valor?: number) => {
    if (valor === undefined || valor === null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-8">
      {/* Toasts */}
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onConfirm={confirmarExclusao}
        onCancel={() => setDeleteId(null)}
        title="Excluir colaborador"
        message="Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recursos Humanos (RH)</h2>
          <p className="text-muted-foreground">Controle de equipe, permissões e escalas (RBAC).</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Colaborador
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Colaboradores Ativos" value={funcionarios?.length || 0} icon={Users} />
        <KPICard title="Cargos Distintos" value={new Set(funcionarios?.map(f => f.cargo) || []).size} icon={Briefcase} />
        <KPICard
          title="Folha Estimada"
          value={formatarMoeda(funcionarios?.reduce((sum, f) => sum + (f.salario || 0), 0) || 0)}
          icon={Briefcase}
        />
      </div>

      {/* Tabela */}
      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, cargo ou email..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Salário</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-slate-500">Carregando colaboradores...</div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-red-500">{error.message}</div>
                </TableCell>
              </TableRow>
            ) : !funcionarios || funcionarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Briefcase className="h-10 w-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">Nenhum colaborador cadastrado</p>
                    <p className="text-slate-400 text-xs">Clique em &quot;Adicionar Colaborador&quot; para começar.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              funcionarios?.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-slate-900">{f.nome}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {f.cargo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {f.email && (
                        <span className="text-sm flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {f.email}
                        </span>
                      )}
                      {f.telefone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {f.telefone}
                        </span>
                      )}
                      {!f.email && !f.telefone && <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatarMoeda(f.salario)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatarData(f.criado_em)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(f.id)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        title="Excluir"
                      >
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

      {/* Modal de Cadastro */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Adicionar Colaborador">
        <form onSubmit={criarFuncionario} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cargo *</label>
              <input
                type="text"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: Vendedor"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salário Mensal</label>
            <input
              type="number"
              step="0.01"
              value={formData.salario}
              onChange={(e) => setFormData({ ...formData, salario: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: 2500.00"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Cadastrar
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
