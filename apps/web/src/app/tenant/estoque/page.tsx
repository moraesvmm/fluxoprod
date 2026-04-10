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
import { PackageOpen, AlertTriangle, Boxes, Plus, Search, Filter, Edit, Trash2 } from "lucide-react";
import { useProdutos, useCreateProduto, useDeleteProduto } from "@/lib/hooks/use-produtos";
import { useToast, Toast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function EstoquePage() {
  const { data: produtos = [], isLoading: loading, error: queryError } = useProdutos();
  const createMutation = useCreateProduto();
  const deleteMutation = useDeleteProduto();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportConfirm, setExportConfirm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '', descricao: '', sku: '', preco_custo: '', preco_venda: '',
    estoque_atual: '0', estoque_minimo: '10', categoria: ''
  });
  const { toasts, removeToast, success, error: toastError } = useToast();

  const excluirProduto = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      success("Produto excluído com sucesso!");
    } catch {
      toastError("Erro ao excluir produto. Tente novamente.");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;
    try {
      await createMutation.mutateAsync({
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        sku: formData.sku || undefined,
        preco_custo: formData.preco_custo ? parseFloat(formData.preco_custo) : undefined,
        preco_venda: formData.preco_venda ? parseFloat(formData.preco_venda) : undefined,
        estoque_atual: parseInt(formData.estoque_atual) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo) || 10,
        categoria: formData.categoria || undefined
      });
      success("Produto adicionado com sucesso!");
      setIsModalOpen(false);
      resetForm();
    } catch {
      toastError("Erro ao adicionar produto. Tente novamente.");
    }
  };

  const resetForm = () => setFormData({
    nome: '', descricao: '', sku: '', preco_custo: '', preco_venda: '',
    estoque_atual: '0', estoque_minimo: '10', categoria: ''
  });

  const handleFecharModal = () => { setIsModalOpen(false); resetForm(); };

  const getStatus = (qtd: number, min: number) => {
    if (qtd === 0) return 'error';
    if (qtd <= min) return 'warning';
    return 'success';
  };

  const formatarPreco = (preco?: number) =>
    !preco ? '-' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco);

  const totalSKUs = produtos.length;
  const estoqueBaixo = produtos.filter(p => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo).length;
  const itensCriticos = produtos.filter(p => p.estoque_atual === 0).length;

  const error = queryError ? "Erro ao carregar produtos. Tente novamente." : null;

  return (
    <div className="space-y-8">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <ConfirmModal isOpen={!!deleteId} onConfirm={excluirProduto} onCancel={() => setDeleteId(null)}
        title="Excluir produto" message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        confirmText="Excluir" cancelText="Cancelar" variant="danger" />

      <ConfirmModal isOpen={exportConfirm}
        onConfirm={() => { success(`Relatório exportado com sucesso! ${produtos.length} produtos incluídos`); setExportConfirm(false); }}
        onCancel={() => setExportConfirm(false)}
        title="Exportar relatório" message={`Deseja exportar relatório atual? (${produtos.length} produtos)`}
        confirmText="Exportar" cancelText="Cancelar" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Estoque Inteligente</h2>
          <p className="text-muted-foreground">Controle de inventário e alertas de reposição.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExportConfirm(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-border hover:bg-slate-50 text-slate-700 h-10 px-4 py-2">
            Importar/Exportar
          </button>
          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Total SKUs" value={String(totalSKUs)} icon={Boxes} />
        <KPICard title="Estoque Baixo" value={String(estoqueBaixo)} icon={AlertTriangle} className="border-amber-200 bg-amber-50/10" />
        <KPICard title="Itens Críticos" value={String(itensCriticos)} icon={PackageOpen} className="border-red-200 bg-red-50/10" />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="search" placeholder="Buscar SKU ou nome do produto..." className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-md bg-white">
              <Filter className="h-4 w-4" /> Filtros
            </button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead><TableHead>SKU</TableHead><TableHead>Produto</TableHead>
              <TableHead className="text-right">Qtd. Atual</TableHead><TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Preço</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6">
                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
                  Carregando produtos...
                </div>
              </TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6"><div className="text-red-500">{error}</div></TableCell></TableRow>
            ) : produtos.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6"><div className="text-slate-500">Nenhum produto encontrado</div></TableCell></TableRow>
            ) : (
              produtos.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell><StatusBadge status={getStatus(item.estoque_atual, item.estoque_minimo) as any} /></TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{item.sku || '-'}</TableCell>
                  <TableCell className="font-medium text-slate-900">{item.nome}</TableCell>
                  <TableCell className="text-right font-bold text-slate-700">
                    <span className={item.estoque_atual <= item.estoque_minimo ? "text-red-600" : ""}>{item.estoque_atual}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.estoque_minimo}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">{formatarPreco(item.preco_venda)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-slate-400 hover:text-blue-600 p-1" title="Editar"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(item.id)} className="text-slate-400 hover:text-red-600 p-1" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleFecharModal} title="Novo Produto">
        <form onSubmit={handleSalvarProduto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do produto *</label>
            <input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Cabo USB-C 100W" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Descrição detalhada do produto" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
              <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: USB-C-100W" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <input type="text" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Cabos" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Custo</label>
              <input type="number" step="0.01" value={formData.preco_custo} onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda</label>
              <input type="number" step="0.01" value={formData.preco_venda} onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0,00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade Atual *</label>
              <input type="number" value={formData.estoque_atual} onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade Mínima *</label>
              <input type="number" value={formData.estoque_minimo} onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="10" required />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {createMutation.isPending ? "Salvando..." : "Salvar Produto"}
            </button>
            <button type="button" onClick={handleFecharModal} className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
