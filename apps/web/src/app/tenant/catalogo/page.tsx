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
import { Tags, Plus, Search, Edit, Trash2, Package, DollarSign } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast, Toast } from "@/components/ui/toast";

interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  sku?: string;
  preco_custo?: number;
  preco_venda?: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria?: string;
  criado_em: string;
}

export default function CatalogoPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    sku: '',
    preco_custo: '',
    preco_venda: '',
    estoque_atual: '0',
    estoque_minimo: '10',
    categoria: ''
  });
  const { toasts, removeToast, success, error: toastError } = useToast();
  const supabase = createClient();

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from("produtos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (dbError) throw dbError;
      setProdutos(data || []);
    } catch (err: any) {
      setError("Erro ao carregar produtos. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  const criarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    try {
      const payload: any = {
        nome: formData.nome,
        estoque_atual: parseInt(formData.estoque_atual) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo) || 10,
      };
      if (formData.descricao) payload.descricao = formData.descricao;
      if (formData.sku) payload.sku = formData.sku;
      if (formData.preco_custo) payload.preco_custo = parseFloat(formData.preco_custo);
      if (formData.preco_venda) payload.preco_venda = parseFloat(formData.preco_venda);
      if (formData.categoria) payload.categoria = formData.categoria;

      const { error: dbError } = await supabase
        .from("produtos")
        .insert(payload);

      if (dbError) throw dbError;

      setFormData({ nome: '', descricao: '', sku: '', preco_custo: '', preco_venda: '', estoque_atual: '0', estoque_minimo: '10', categoria: '' });
      setShowModal(false);
      await carregarProdutos();
      success("Produto cadastrado com sucesso!");
    } catch (err: any) {
      toastError("Erro ao cadastrar produto: " + (err.message || "Tente novamente."));
    }
  };

  const confirmarExclusao = async () => {
    if (!deleteId) return;
    try {
      const { error: dbError } = await supabase
        .from("produtos")
        .delete()
        .eq("id", deleteId);

      if (dbError) throw dbError;
      setProdutos(produtos.filter(p => p.id !== deleteId));
      success("Produto removido com sucesso!");
    } catch (err: any) {
      toastError("Erro ao remover produto: " + (err.message || "Tente novamente."));
    } finally {
      setDeleteId(null);
    }
  };

  const formatarMoeda = (valor?: number) => {
    if (valor === undefined || valor === null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
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
        title="Excluir produto"
        message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita e afetará o estoque e vendas."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Catálogo de Produtos</h2>
          <p className="text-muted-foreground">Gerencie produtos, variações e preços de venda.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Produto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Total de Produtos" value={produtos.length} icon={Package} />
        <KPICard title="Categorias" value={new Set(produtos.filter(p => p.categoria).map(p => p.categoria)).size} icon={Tags} />
        <KPICard
          title="Valor do Estoque"
          value={formatarMoeda(produtos.reduce((sum, p) => sum + ((p.preco_venda || 0) * p.estoque_atual), 0))}
          icon={DollarSign}
        />
        <KPICard
          title="Preço Médio"
          value={formatarMoeda(produtos.length > 0 ? produtos.reduce((sum, p) => sum + (p.preco_venda || 0), 0) / produtos.length : 0)}
          icon={DollarSign}
        />
      </div>

      {/* Tabela */}
      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, SKU ou categoria..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-slate-500">Carregando produtos...</div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-red-500">{error}</div>
                  <button onClick={carregarProdutos} className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline">
                    Tentar novamente
                  </button>
                </TableCell>
              </TableRow>
            ) : produtos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Tags className="h-10 w-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">Nenhum produto cadastrado</p>
                    <p className="text-slate-400 text-xs">Clique em &quot;Adicionar Produto&quot; para começar.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              produtos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{p.nome}</span>
                      {p.descricao && <span className="text-xs text-muted-foreground line-clamp-1">{p.descricao}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{p.sku || "—"}</TableCell>
                  <TableCell>
                    {p.categoria ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {p.categoria}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatarMoeda(p.preco_custo)}</TableCell>
                  <TableCell className="font-medium text-slate-900">{formatarMoeda(p.preco_venda)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.estoque_atual <= 0
                        ? "bg-red-100 text-red-700"
                        : p.estoque_atual <= p.estoque_minimo
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {p.estoque_atual} un
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Adicionar Produto ao Catálogo">
        <form onSubmit={criarProduto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Cabo USB-C 100W"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
              placeholder="Descrição detalhada do produto..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: CB-USBC-100W"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: Acessórios"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Custo</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco_custo}
                onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco_venda}
                onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="R$ 0,00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Inicial</label>
              <input
                type="number"
                value={formData.estoque_atual}
                onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Mínimo</label>
              <input
                type="number"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="10"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Cadastrar Produto
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
