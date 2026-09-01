"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { ArrowDownToLine, ArrowUpFromLine, RefreshCcw, Search, ExternalLink, Plus, Edit, Trash2 } from "lucide-react";
import { FloatingCalculator } from "@/components/modules/base/Calculator";
import { useToast, Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useFinanceiro, useCreateFinanceiro, useDeleteFinanceiro, useUpdateFinanceiro } from "@/lib/hooks/use-financeiro";
import { type FinanceiroUpdate } from "@/lib/api";
import { ConciliacaoModal } from "@/components/financeiro/ConciliacaoModal";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";
import { useContextosCaixa } from "@/lib/hooks/use-caixa";
import { useUserProfile } from "@/lib/hooks/use-user-profile";

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria?: string;
  status: string;
  criado_em: string;
  data_vencimento?: string;
  filial_id?: string;
}

export default function FinanceiroPage() {
  const { data: contextos = [] } = useContextosCaixa();
  const { role } = useUserProfile();
  const [filialId, setFilialId] = useState<string | null>(null);
  useEffect(() => { if (role !== 'tenant_admin' && !filialId && contextos[0]) setFilialId(contextos[0].filial_id); }, [contextos, filialId, role]);
  const { data: transacoes, isLoading, error, refetch } = useFinanceiro(filialId);
  const createFinanceiro = useCreateFinanceiro();
  const deleteFinanceiro = useDeleteFinanceiro();
  const updateFinanceiro = useUpdateFinanceiro();
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransacao, setSelectedTransacao] = useState<Transacao | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transacao | null>(null);
  const [editFilialId, setEditFilialId] = useState<string | null>(null);
  const [syncConfirm, setSyncConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showConciliacao, setShowConciliacao] = useState(false);
  const [busca, setBusca] = useState('');
  const syncBtnRef = useRef<HTMLButtonElement>(null);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'receber',
    categoria: '',
    status: 'pendente',
    data_vencimento: new Date().toISOString().split('T')[0]
  });
  const { toasts, showToast, removeToast, success, error: toastError, info } = useToast();

  const criarTransacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim() || !formData.valor) return;

    try {
      await createFinanceiro.mutateAsync({
        filial_id: filialId ?? undefined,
        tipo: formData.tipo,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_vencimento: new Date(formData.data_vencimento).toISOString(),
        status: 'pendente',
        categoria: formData.categoria
      });

      setFormData({ 
        descricao: '', 
        valor: '', 
        tipo: 'receber', 
        categoria: '', 
        status: 'pendente',
        data_vencimento: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      success("Transação criada com sucesso!");
    } catch (err: unknown) {
      console.error("Erro ao criar transação:", err);
      toastError("Erro ao criar transação.");
    }
  };

  const confirmDeleteTransacao = async () => {
    if (!deleteTarget?.filial_id) {
      toastError('Não foi possível identificar a filial deste lançamento.');
      return;
    }
    try {
      await deleteFinanceiro.mutateAsync({ id: deleteTarget.id, filialId: deleteTarget.filial_id });
      success("Transação excluída com sucesso!");
    } catch (err: unknown) {
      console.error("Erro ao excluir transação:", err);
      toastError("Erro ao excluir transação.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const abrirEdicao = (transacao: Transacao) => {
    setEditId(transacao.id);
    setEditFilialId(transacao.filial_id ?? null);
    setFormData({
      descricao: transacao.descricao,
      valor: String(transacao.valor),
      tipo: transacao.tipo,
      categoria: transacao.categoria || '',
      status: transacao.status,
      data_vencimento: transacao.data_vencimento ? new Date(transacao.data_vencimento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  const abrirDetalhes = (transacao: Transacao) => {
    setSelectedTransacao(transacao);
    setShowDetailModal(true);
  };

  const editarTransacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editFilialId || !formData.descricao.trim() || !formData.valor) {
      toastError('Não foi possível identificar a filial deste lançamento.');
      return;
    }

    try {
      const payload: FinanceiroUpdate = {
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        status: formData.status,
        data_vencimento: new Date(formData.data_vencimento).toISOString()
      };
      if (formData.categoria) payload.categoria = formData.categoria;

      await updateFinanceiro.mutateAsync({ id: editId, filialId: editFilialId, financeiro: payload });

      setFormData({ 
        descricao: '', 
        valor: '', 
        tipo: 'receber', 
        categoria: '', 
        status: 'pendente',
        data_vencimento: new Date().toISOString().split('T')[0]
      });
      setShowEditModal(false);
      setEditId(null);
      setEditFilialId(null);
      success("Transação atualizada com sucesso!");
    } catch (err: unknown) {
      console.error("Erro ao atualizar transação:", err);
      toastError("Erro ao atualizar transação.");
    }
  };

  const confirmSyncBanco = async () => {
    if (!filialId) {
      toastError('Selecione uma filial antes de importar um extrato.');
      return;
    }
    setSyncConfirm(false);
    setShowConciliacao(true);
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return '-';
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return '-';
    return data.toLocaleDateString('pt-BR');
  };

  const verFluxoCaixa = () => {
    const entradas = transacoes?.filter(t => t.tipo === 'receber' || t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0) || 0;
    const saidas = transacoes?.filter(t => t.tipo === 'pagar' || t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0) || 0;
    const saldo = entradas - saidas;

    const mensagem = `Entradas: ${formatarValor(entradas)} | Saídas: ${formatarValor(saidas)} | Saldo: ${formatarValor(saldo)} | Transações: ${transacoes?.length || 0}`;

    info(mensagem);
  };

  // KPIs dinâmicos
  const totalEntradas = transacoes?.filter(t => t.tipo === 'receber' || t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0) || 0;
  const totalSaidas = transacoes?.filter(t => t.tipo === 'pagar' || t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0) || 0;
  const pendentes = transacoes?.filter(t => t.status === 'pendente').length || 0;
  const transacoesFiltradas = (transacoes || []).filter((transacao) => transacao.descricao.toLowerCase().includes(busca.toLowerCase()) || (transacao.categoria || '').toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-8">
      {/* Toast Container */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onConfirm={confirmDeleteTransacao}
        onCancel={() => setDeleteTarget(null)}
        title="Excluir transação"
        message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmModal
        isOpen={syncConfirm}
        onConfirm={confirmSyncBanco}
        onCancel={() => setSyncConfirm(false)}
        title="Sincronizar com o banco"
        message="Deseja sincronizar com o banco? Isso irá atualizar as transações bancárias."
        confirmText="Sincronizar"
        cancelText="Cancelar"
      />

      {/* Detalhes Modal (Simulado) */}
      <ConfirmModal
        isOpen={showDetailModal}
        onConfirm={() => setShowDetailModal(false)}
        onCancel={() => setShowDetailModal(false)}
        title="Detalhes da Transação"
        message={`
          Descrição: ${selectedTransacao?.descricao}
          Valor: ${formatarValor(selectedTransacao?.valor || 0)}
          Tipo: ${selectedTransacao?.tipo === 'receber' ? 'Receita' : 'Despesa'}
          Status: ${selectedTransacao?.status}
          Data: ${formatarData(selectedTransacao?.criado_em || '')}
        `}
        confirmText="Fechar"
        cancelText=""
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financeiro & Conciliação</h2>
          <p className="text-muted-foreground">Gestão de caixa e reconciliação bancária.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filialId ?? ''} onChange={(event) => setFilialId(event.target.value || null)} className="h-10 max-w-48 rounded-md border border-border bg-background px-3 text-sm" aria-label="Filial financeira">
            {role === 'tenant_admin' && <option value="">Todas as filiais</option>}
            {contextos.filter((contexto, index, items) => items.findIndex((item) => item.filial_id === contexto.filial_id) === index).map((contexto) => <option key={contexto.filial_id} value={contexto.filial_id}>{contexto.filial_nome}</option>)}
          </select>
          <button 
            onClick={verFluxoCaixa}
            data-tour="fin-dre"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-card border border-border hover:bg-muted text-foreground h-10 px-4 py-2 shadow-sm"
          >
            Ver Fluxo de Caixa
          </button>
          <button 
            onClick={() => {
              setFormData({
                descricao: '',
                valor: '',
                tipo: 'receber',
                categoria: '',
                status: 'pendente',
                data_vencimento: new Date().toISOString().split('T')[0]
              });
              setShowForm(!showForm);
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2"
            data-tour="fin-nova"
            disabled={!filialId}
            title={!filialId ? 'Selecione uma filial para criar um lançamento.' : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </button>
          <button 
            ref={syncBtnRef}
            onClick={() => setSyncConfirm(true)}
            disabled={syncing}
            data-tour="fin-ofx"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Importando...' : 'Importar Extrato OFX'}
          </button>
          <TutorialHelpButton moduleKey="financeiro" />
        </div>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Nova Transação</h3>
          <form onSubmit={criarTransacao} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Descrição *</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground placeholder:text-muted-foreground"
                  placeholder="Ex: Venda de produtos, pagamento de fornecedor"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({...formData, valor: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground placeholder:text-muted-foreground"
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
                  required
                >
                  <option value="receber">Receita (a receber)</option>
                  <option value="pagar">Despesa (a pagar)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Categoria</label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground placeholder:text-muted-foreground"
                  placeholder="Ex: Vendas, Aluguel, Marketing"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Salvar Transação
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-muted text-foreground/80 px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Editar Transação</h3>
          <form onSubmit={editarTransacao} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descrição *</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Venda de produtos, pagamento de fornecedor"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({...formData, valor: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="receber">Receita (a receber)</option>
                  <option value="pagar">Despesa (a pagar)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Vendas, Aluguel, Marketing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="pendente">Pendente</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Atualizar Transação
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="bg-muted text-foreground/80 px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Entradas (Total)" value={formatarValor(totalEntradas)} icon={ArrowDownToLine} className="border-emerald-500/20 bg-emerald-500/5" />
        <KPICard title="Saídas (Total)" value={formatarValor(totalSaidas)} icon={ArrowUpFromLine} className="border-red-500/20 bg-red-500/5" />
        <KPICard title="Transações Pendentes" value={String(pendentes)} icon={RefreshCcw} className="border-amber-500/20 bg-amber-500/5" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar histórico bancário..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição (Extrato)</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status Conciliação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <div className="text-muted-foreground">Carregando transações...</div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <div className="text-red-500">{error.message}</div>
                </TableCell>
              </TableRow>
            ) : transacoesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <div className="text-muted-foreground">Nenhuma transação encontrada</div>
                </TableCell>
              </TableRow>
            ) : (
              transacoesFiltradas.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground text-sm">{formatarData(item.criado_em)}</TableCell>
                  <TableCell className="font-medium text-foreground">{item.descricao}</TableCell>
                  <TableCell>
                    <span className={item.tipo === 'receber' ? 'text-emerald-600' : 'text-red-600 dark:text-red-500'}>
                      {item.tipo === 'receber' ? 'Receita' : 'Despesa'}
                    </span>
                  </TableCell>
                  <TableCell className={item.tipo === 'receber' ? 'font-medium text-emerald-600' : 'font-medium text-red-600 dark:text-red-500'}>
                    {formatarValor(item.valor)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status === 'concluido' ? 'success' : 'warning'} label={item.status} className="capitalize" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEdicao(item)} className="text-muted-foreground hover:text-blue-600 dark:text-blue-500 p-1" title="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteTarget(item)}
                        className="text-muted-foreground hover:text-red-600 dark:text-red-500 p-1" 
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => abrirDetalhes(item)} className="text-muted-foreground hover:text-primary p-1" title="Ver Detalhes">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Calculadora Flutuante */}
      <FloatingCalculator isOpen={showCalculator} onToggle={() => setShowCalculator(!showCalculator)} />

      {/* Modal de Conciliação */}
      <ConciliacaoModal 
        isOpen={showConciliacao}
        onClose={() => setShowConciliacao(false)}
        onSuccess={() => {
          success("Conciliação bancária realizada com sucesso!");
          void refetch();
        }}
        onError={toastError}
        existingTransactions={transacoes || []}
        filialId={filialId}
      />
    </div>
  );
}
