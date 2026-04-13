"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { createClient } from "@/utils/supabase/client";
import { useToast, Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria?: string;
  status: string;
  criado_em: string;
}

export default function FinanceiroPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [syncConfirm, setSyncConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncBtnRef = useRef<HTMLButtonElement>(null);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'receita',
    categoria: '',
    status: 'pendente'
  });
  const { toasts, showToast, removeToast, success, error: toastError, info } = useToast();
  const supabase = createClient();

  useEffect(() => {
    carregarTransacoes();
  }, []);

  const carregarTransacoes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .rpc('tenant_listar_financeiro');

      if (fetchError) throw fetchError;
      setTransacoes(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar transações:", err);
      setError("Erro ao carregar transações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const criarTransacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim() || !formData.valor) return;

    try {
      const { error: insertError } = await supabase
        .rpc('tenant_criar_financeiro', {
          p_tipo: formData.tipo,
          p_descricao: formData.descricao,
          p_valor: parseFloat(formData.valor),
          p_data_vencimento: null,
          p_status: 'pendente'
        });

      if (insertError) throw insertError;

      setFormData({ descricao: '', valor: '', tipo: 'receita', categoria: '', status: 'pendente' });
      setShowForm(false);
      await carregarTransacoes();

      success("Transação criada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao criar transação:", err);
      toastError("Erro ao criar transação. Verifique se as tabelas foram criadas no Supabase.");
    }
  };

  const confirmDeleteTransacao = async () => {
    if (!deleteId) return;
    try {
      const { error: deleteError } = await supabase
        .rpc('tenant_excluir_financeiro', { p_financeiro_id: deleteId });

      if (deleteError) throw deleteError;

      setTransacoes(transacoes.filter(t => t.id !== deleteId));
      success("Transação excluída com sucesso!");
    } catch (err: any) {
      console.error("Erro ao excluir transação:", err);
      toastError("Erro ao excluir transação. Tente novamente.");
    } finally {
      setDeleteId(null);
    }
  };

  const confirmSyncBanco = async () => {
    setSyncConfirm(false);
    setSyncing(true);
    try {
      await carregarTransacoes();
      success('Sincronização concluída com sucesso!');
    } catch (err) {
      toastError('Erro ao sincronizar com o banco. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };

  const verFluxoCaixa = () => {
    const entradas = transacoes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0);
    const saidas = transacoes.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);
    const saldo = entradas - saidas;

    const mensagem = `Entradas: ${formatarValor(entradas)} | Saídas: ${formatarValor(saidas)} | Saldo: ${formatarValor(saldo)} | Transações: ${transacoes.length}`;

    info(mensagem);
  };

  // KPIs dinâmicos
  const totalEntradas = transacoes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0);
  const totalSaidas = transacoes.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);
  const pendentes = transacoes.filter(t => t.status === 'pendente').length;

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
        isOpen={!!deleteId}
        onConfirm={confirmDeleteTransacao}
        onCancel={() => setDeleteId(null)}
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financeiro & Conciliação</h2>
          <p className="text-muted-foreground">Gestão de caixa e reconciliação bancária.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={verFluxoCaixa}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-border hover:bg-slate-50 text-slate-700 h-10 px-4 py-2"
          >
            Ver Fluxo de Caixa
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </button>
          <button 
            ref={syncBtnRef}
            onClick={() => setSyncConfirm(true)}
            disabled={syncing}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Banco'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Nova Transação</h3>
          <form onSubmit={criarTransacao} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor *</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Entradas (Total)" value={formatarValor(totalEntradas)} icon={ArrowDownToLine} className="border-emerald-200" />
        <KPICard title="Saídas (Total)" value={formatarValor(totalSaidas)} icon={ArrowUpFromLine} className="border-red-200" />
        <KPICard title="Transações Pendentes" value={String(pendentes)} icon={RefreshCcw} className="border-amber-200 bg-amber-50/10" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar histórico bancário..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <div className="text-slate-500">Carregando transações...</div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <div className="text-red-500">{error}</div>
                  <button 
                    onClick={carregarTransacoes}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Tentar novamente
                  </button>
                </TableCell>
              </TableRow>
            ) : transacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <div className="text-slate-500">Nenhuma transação encontrada</div>
                </TableCell>
              </TableRow>
            ) : (
              transacoes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground text-sm">{formatarData(item.criado_em)}</TableCell>
                  <TableCell className="font-medium text-slate-900">{item.descricao}</TableCell>
                  <TableCell>
                    <span className={item.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}>
                      {item.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </TableCell>
                  <TableCell className={item.tipo === 'receita' ? 'font-medium text-emerald-600' : 'font-medium text-red-600'}>
                    {formatarValor(item.valor)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status === 'concluido' ? 'success' : 'warning'} label={item.status} className="capitalize" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="text-slate-400 hover:text-blue-600 p-1" title="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1" 
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="text-slate-400 hover:text-primary p-1" title="Ver Detalhes">
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
    </div>
  );
}
