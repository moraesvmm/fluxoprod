"use client";

import { useState, useEffect } from "react";
import { KPICard } from "@/components/modules/base/KPICard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Briefcase, UserPlus, Search, Edit, Trash2, Users, Mail, Phone, Download, Settings, AlertCircle, CheckCircle, FolderOpen } from "lucide-react";
import { FloatingCalculator } from "@/components/modules/base/Calculator";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast, Toast } from "@/components/ui/toast";
import { useFuncionarios, useCreateFuncionario, useDeleteFuncionario, useUpdateFuncionario, usePagarFuncionario, usePagarTodosFuncionarios } from "@/lib/hooks/use-funcionarios";
import { useRHConfig, useUpdateRHConfig } from "@/lib/hooks/use-rh-config";
import { exportToCSV } from "@/lib/utils/export";
import { DocumentosModal } from "@/components/modules/rh/DocumentosModal";
import { type Funcionario, type FuncionarioCreate, type FuncionarioUpdate } from "@/lib/api";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";


export default function RHPage() {
  const { data: funcionarios, isLoading, error } = useFuncionarios();
  const createFuncionario = useCreateFuncionario();
  const deleteFuncionario = useDeleteFuncionario();
  const updateFuncionario = useUpdateFuncionario();
  const pagarFuncionario = usePagarFuncionario();
  const pagarTodos = usePagarTodosFuncionarios();
  const { data: config, isLoading: configLoading } = useRHConfig();
  const updateConfig = useUpdateRHConfig();

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [diaPagamento, setDiaPagamento] = useState<string>('');
  const [docFuncionario, setDocFuncionario] = useState<Funcionario | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cargo: '',
    email: '',
    telefone: '',
    salario: '',
    dia_pagamento: ''
  });
  
  const { toasts, removeToast, success, error: toastError } = useToast();

  useEffect(() => {
    if (config?.dia) setDiaPagamento(String(config.dia));
  }, [config?.dia]);

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const diaAtual = hoje.getDate();

  const criarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.cargo.trim()) return;

    try {
      const payload: FuncionarioCreate = {
        nome: formData.nome,
        cargo: formData.cargo,
      };
      if (formData.email) payload.email = formData.email;
      if (formData.telefone) payload.telefone = formData.telefone;
      if (formData.salario) payload.salario = parseFloat(formData.salario);
      if (formData.dia_pagamento) payload.dia_pagamento = parseInt(formData.dia_pagamento);

      await createFuncionario.mutateAsync(payload);

      setFormData({ nome: '', cargo: '', email: '', telefone: '', salario: '', dia_pagamento: '' });
      setShowModal(false);
      success("Colaborador cadastrado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao cadastrar colaborador: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const confirmarExclusao = async () => {
    if (!deleteId) return;
    try {
      await deleteFuncionario.mutateAsync(deleteId);
      success("Colaborador removido com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao remover colaborador: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setDeleteId(null);
    }
  };

  const abrirEdicao = (funcionario: Funcionario) => {
    setEditId(funcionario.id);
    setFormData({
      nome: funcionario.nome,
      cargo: funcionario.cargo || '',
      email: funcionario.email || '',
      telefone: funcionario.telefone || '',
      salario: funcionario.salario ? String(funcionario.salario) : '',
      dia_pagamento: funcionario.dia_pagamento ? String(funcionario.dia_pagamento) : ''
    });
    setShowEditModal(true);
  };

  const editarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !formData.nome.trim() || !formData.cargo.trim()) return;

    try {
      const payload: FuncionarioUpdate = {
        nome: formData.nome,
        cargo: formData.cargo,
      };
      if (formData.email) payload.email = formData.email;
      if (formData.telefone) payload.telefone = formData.telefone;
      if (formData.salario) payload.salario = parseFloat(formData.salario);
      if (formData.dia_pagamento) payload.dia_pagamento = parseInt(formData.dia_pagamento);

      await updateFuncionario.mutateAsync({ id: editId, funcionario: payload });

      setFormData({ nome: '', cargo: '', email: '', telefone: '', salario: '', dia_pagamento: '' });
      setShowEditModal(false);
      setEditId(null);
      success("Colaborador atualizado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao atualizar colaborador: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const salvarConfiguracao = async () => {
    const dia = parseInt(diaPagamento, 10);
    if (isNaN(dia) || dia < 1 || dia > 31) {
      toastError("Dia inválido. Digite um número de 1 a 31.");
      return;
    }
    try {
      await updateConfig.mutateAsync(dia);
      success("Dia de pagamento configurado com sucesso!");
      setShowConfig(false);
    } catch (err: unknown) {
      toastError("Erro ao salvar configuração: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const registrarPagamento = async (id: string) => {
    try {
      await pagarFuncionario.mutateAsync({ id, mes: mesAtual });
      success("Pagamento registrado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao registrar pagamento: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const registrarTodosPagamentos = async () => {
    try {
      await pagarTodos.mutateAsync(mesAtual);
      success("Todos os pagamentos foram registrados com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao registrar pagamentos em lote: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const formatarMoeda = (valor?: number) => {
    if (valor === undefined || valor === null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const exportarFuncionarios = () => {
    if (!funcionarios || funcionarios.length === 0) {
      toastError("Nenhum funcionário para exportar");
      return;
    }

    try {
      exportToCSV({
        filename: `funcionarios_${new Date().toISOString().split('T')[0]}`,
        data: funcionarios,
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'cargo', label: 'Cargo' },
          { key: 'email', label: 'Email' },
          { key: 'telefone', label: 'Telefone' },
          { key: 'salario', label: 'Salário' },
          { key: 'criado_em', label: 'Data de Cadastro' }
        ]
      });
      success("Funcionários exportados com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao exportar funcionários: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-border bg-card text-foreground hover:bg-muted/50 h-10 px-4 py-2 shadow-sm"
          >
            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
            Configurações
          </button>
          <TutorialHelpButton moduleKey="rh" />
          <button
            onClick={() => setShowModal(true)}
            data-tour="rh-novo"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar Colaborador
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Colaboradores Ativos" value={funcionarios?.length || 0} icon={Users} />
        <KPICard title="Cargos Distintos" value={new Set(funcionarios?.map(f => f.cargo) || []).size} icon={Briefcase} />
        <div data-tour="rh-desempenho">
          <KPICard
            title="Folha Estimada"
            value={formatarMoeda(funcionarios?.reduce((sum, f) => sum + (f.salario || 0), 0) || 0)}
            icon={Briefcase}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, cargo ou email..."
              className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-3">
            {funcionarios?.some(f => !f.ultimo_mes_pago || f.ultimo_mes_pago !== mesAtual) && (
              <button
                onClick={registrarTodosPagamentos}
                disabled={pagarTodos.isPending}
                className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                {pagarTodos.isPending ? "Registrando..." : "Todos pagos"}
              </button>
            )}
            <button
              onClick={exportarFuncionarios}
              className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors font-medium"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
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
                  <div className="text-muted-foreground">Carregando colaboradores...</div>
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
                    <Users className="h-10 w-10 text-muted/30" />
                    <p className="text-foreground/60 text-sm font-medium">Nenhum colaborador cadastrado</p>
                    <p className="text-muted-foreground text-xs">Clique em &quot;Adicionar Colaborador&quot; para começar.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              funcionarios?.map((f) => {
                const diaEfetivo = f.dia_pagamento || (config?.dia ? parseInt(String(config.dia)) : null);
                const pendente = !f.ultimo_mes_pago || f.ultimo_mes_pago !== mesAtual;
                const atrasado = diaEfetivo && diaAtual > diaEfetivo;

                return (
                  <TableRow key={f.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {f.nome}
                        {pendente && diaEfetivo && diaAtual >= diaEfetivo && (
                          <div className="group relative flex items-center">
                            <AlertCircle className={`h-4 w-4 ${atrasado ? 'text-rose-500' : 'text-amber-500'}`} />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                              {atrasado ? `Atrasado em ${diaAtual - diaEfetivo} dia(s)` : "Pagamento vence hoje"}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
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
                        {pendente && (
                          <button
                            onClick={() => registrarPagamento(f.id)}
                            disabled={pagarFuncionario.isPending}
                            className="text-slate-400 hover:text-emerald-600 p-1 transition-colors"
                            title="Marcar como pago"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDocFuncionario(f)}
                          className="text-slate-400 hover:text-purple-600 p-1 transition-colors"
                          title="Documentos"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </button>
                        <button onClick={() => abrirEdicao(f)} className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Editar">
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Configuração de Pagamento */}
      <Modal isOpen={showConfig} onClose={() => setShowConfig(false)} title="Configurações de Pagamento">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Defina o dia do mês em que os pagamentos da equipe são realizados para receber alertas no dashboard e visualizar pendências.</p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Dia de Pagamento Padrão (1 a 31)</label>
            <input
              type="number"
              min="1"
              max="31"
              value={diaPagamento}
              onChange={(e) => setDiaPagamento(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: 5"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={salvarConfiguracao}
              disabled={updateConfig.isPending}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {updateConfig.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="flex-1 bg-muted text-foreground/80 px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Cadastro */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Adicionar Colaborador">
        <form onSubmit={criarFuncionario} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Nome Completo *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Cargo *</label>
              <input
                type="text"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: Vendedor"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Telefone</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Salário Mensal</label>
              <input
                type="number"
                step="0.01"
                value={formData.salario}
                onChange={(e) => setFormData({ ...formData, salario: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: 2500.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Dia de Pagamento Individual</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dia_pagamento}
                onChange={(e) => setFormData({ ...formData, dia_pagamento: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: 10 (Opcional)"
              />
            </div>
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
              className="flex-1 bg-muted text-foreground/80 px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Colaborador">
        <form onSubmit={editarFuncionario} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Nome Completo *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Cargo *</label>
              <input
                type="text"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: Vendedor"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Telefone</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Salário Mensal</label>
              <input
                type="number"
                step="0.01"
                value={formData.salario}
                onChange={(e) => setFormData({ ...formData, salario: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: 2500.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Dia de Pagamento Individual</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dia_pagamento}
                onChange={(e) => setFormData({ ...formData, dia_pagamento: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: 10 (Opcional)"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Documentos */}
      <DocumentosModal
        isOpen={!!docFuncionario}
        onClose={() => setDocFuncionario(null)}
        funcionario={docFuncionario}
        onToast={(msg, type) => type === 'success' ? success(msg) : toastError(msg)}
      />

      {/* Calculadora Flutuante */}
      <FloatingCalculator isOpen={showCalculator} onToggle={() => setShowCalculator(!showCalculator)} />
    </div>
  );
}
