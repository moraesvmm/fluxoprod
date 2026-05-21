"use client";

import { useEffect, useState } from "react";
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
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast, Toast } from "@/components/ui/toast";
import { useProdutos, useCreateProduto, useDeleteProduto, useUpdateProduto } from "@/lib/hooks/use-produtos";
import { type ProdutoCreate, type ProdutoUpdate } from "@/lib/api";

interface FiscalItem {
  id: string;
  ncm?: string;
  cfop_padrao?: string;
  origem?: number;
}

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
  ncm?: string;
  cfop_padrao?: string;
  origem?: number;
  tipo_item?: string;
}

export default function CatalogoPage() {
  const { data: produtos, isLoading, error } = useProdutos();
  const createProduto = useCreateProduto();
  const deleteProduto = useDeleteProduto();
  const updateProduto = useUpdateProduto();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fiscalByProduct, setFiscalByProduct] = useState<Record<string, { ncm?: string; cfop_padrao?: string; origem?: number }>>({});
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    sku: "",
    preco_custo: "",
    preco_venda: "",
    estoque_atual: "0",
    estoque_minimo: "10",
    categoria: "",
    ncm: "",
    cfop_padrao: "",
    origem: "0",
  });
  const { toasts, removeToast, success, error: toastError } = useToast();
  const produtosComFiscal: Produto[] = (produtos || []).map((produto) => ({
    ...produto,
    ...(fiscalByProduct[produto.id] || {}),
  }));

  useEffect(() => {
    const loadFiscalData = async () => {
      try {
        const response = await fetch("/api/tenant/catalogo/fiscal", {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Falha ao carregar dados fiscais.");
        }

        const nextMap = Object.fromEntries(
          (payload.data || []).map((item: FiscalItem) => [
            item.id,
            {
              ncm: item.ncm || "",
              cfop_padrao: item.cfop_padrao || "",
              origem: typeof item.origem === "number" ? item.origem : 0,
            },
          ])
        );
        setFiscalByProduct(nextMap);
      } catch (err: unknown) {
        toastError("Erro ao carregar dados fiscais do catálogo: " + (err instanceof Error ? err.message : "Tente novamente."));
      }
    };

    loadFiscalData();
  }, [toastError]);

  const salvarDadosFiscaisProduto = async (produtoId: string) => {
    const fiscalResponse = await fetch("/api/tenant/catalogo/fiscal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        produtoId,
        ncm: formData.ncm,
        cfop_padrao: formData.cfop_padrao,
        origem: parseInt(formData.origem, 10) || 0,
      }),
    });
    const fiscalPayload = await fiscalResponse.json();
    if (!fiscalResponse.ok || !fiscalPayload.success) {
      throw new Error(fiscalPayload.error || "Falha ao salvar dados fiscais do produto.");
    }

    setFiscalByProduct((current) => ({
      ...current,
      [produtoId]: {
        ncm: formData.ncm,
        cfop_padrao: formData.cfop_padrao,
        origem: parseInt(formData.origem, 10) || 0,
      },
    }));
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      sku: "",
      preco_custo: "",
      preco_venda: "",
      estoque_atual: "0",
      estoque_minimo: "10",
      categoria: "",
      ncm: "",
      cfop_padrao: "",
      origem: "0",
    });
  };

  const criarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    try {
      const payload: ProdutoCreate = {
        nome: formData.nome,
        estoque_atual: parseInt(formData.estoque_atual, 10) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo, 10) || 10,
      };
      if (formData.descricao) payload.descricao = formData.descricao;
      if (formData.sku) payload.sku = formData.sku;
      if (formData.preco_custo) payload.preco_custo = parseFloat(formData.preco_custo);
      if (formData.preco_venda) payload.preco_venda = parseFloat(formData.preco_venda);
      if (formData.categoria) payload.categoria = formData.categoria;

      const created = await createProduto.mutateAsync(payload);
      await salvarDadosFiscaisProduto(created.id);

      resetForm();
      setShowModal(false);
      success("Produto cadastrado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao cadastrar produto: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const confirmarExclusao = async () => {
    if (!deleteId) return;
    try {
      await deleteProduto.mutateAsync(deleteId);
      setFiscalByProduct((current) => {
        const next = { ...current };
        delete next[deleteId];
        return next;
      });
      success("Produto removido com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao remover produto: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setDeleteId(null);
    }
  };

  const abrirEdicao = (produto: Produto) => {
    setEditId(produto.id);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || "",
      sku: produto.sku || "",
      preco_custo: produto.preco_custo ? String(produto.preco_custo) : "",
      preco_venda: produto.preco_venda ? String(produto.preco_venda) : "",
      estoque_atual: String(produto.estoque_atual),
      estoque_minimo: String(produto.estoque_minimo),
      categoria: produto.categoria || "",
      ncm: produto.ncm || "",
      cfop_padrao: produto.cfop_padrao || "",
      origem: String(produto.origem || 0),
    });
    setShowEditModal(true);
  };

  const editarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !formData.nome.trim()) return;

    try {
      const payload: ProdutoUpdate = {
        nome: formData.nome,
      };
      if (formData.descricao) payload.descricao = formData.descricao;
      if (formData.sku) payload.sku = formData.sku;
      if (formData.preco_custo) payload.preco_custo = parseFloat(formData.preco_custo);
      if (formData.categoria) payload.categoria = formData.categoria;

      await updateProduto.mutateAsync({ id: editId, produto: payload });
      await salvarDadosFiscaisProduto(editId);

      resetForm();
      setShowEditModal(false);
      setEditId(null);
      success("Produto atualizado com sucesso!");
    } catch (err: unknown) {
      toastError("Erro ao atualizar produto: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  const formatarMoeda = (valor?: number) => {
    if (valor === undefined || valor === null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  };

  return (
    <div className="space-y-8">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

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

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Total de Produtos" value={produtosComFiscal.length || 0} icon={Package} />
        <KPICard title="Categorias" value={new Set(produtosComFiscal.filter((p) => p.categoria).map((p) => p.categoria) || []).size} icon={Tags} />
        <KPICard
          title="Valor do Estoque"
          value={formatarMoeda(produtosComFiscal.reduce((sum, p) => sum + ((p.preco_venda || 0) * p.estoque_atual), 0) || 0)}
          icon={DollarSign}
        />
        <KPICard
          title="Preço Médio"
          value={formatarMoeda((produtosComFiscal.length || 0) > 0 ? (produtosComFiscal.reduce((sum, p) => sum + (p.preco_venda || 0), 0) || 0) / (produtosComFiscal.length || 1) : 0)}
          icon={DollarSign}
        />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por nome, SKU ou categoria..."
              className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-slate-500">Carregando produtos...</div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-red-500">{error.message}</div>
                </TableCell>
              </TableRow>
            ) : produtosComFiscal.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-10 w-10 text-muted/30" />
                    <p className="text-foreground/60 text-sm font-medium">Nenhum produto cadastrado</p>
                    <p className="text-muted-foreground text-xs">Clique em &quot;Adicionar Produto&quot; para começar.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              produtosComFiscal.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{p.nome}</span>
                        {p.tipo_item === 'produto_acabado' && (
                          <span className="inline-flex items-center rounded-sm bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border border-indigo-500/20">
                            Produto Acabado
                          </span>
                        )}
                      </div>
                      {p.descricao && <span className="text-xs text-muted-foreground line-clamp-1">{p.descricao}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || "—"}</TableCell>
                  <TableCell>
                    {p.categoria ? (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                        {p.categoria}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatarMoeda(p.preco_custo)}</TableCell>
                  <TableCell className="font-medium text-foreground">{formatarMoeda(p.preco_venda)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.estoque_atual <= 0
                          ? "bg-red-100 text-red-700"
                          : p.estoque_atual <= p.estoque_minimo
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {p.estoque_atual} un
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEdicao(p)} className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Editar">
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Adicionar Produto ao Catálogo">
        <form onSubmit={criarProduto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Nome do Produto *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              placeholder="Ex: Cabo USB-C 100W"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              rows={2}
              placeholder="Descrição detalhada do produto..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: CB-USBC-100W"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Categoria</label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: Acessórios"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Preço de Custo</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco_custo}
                onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Preço de Venda</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco_venda}
                onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="R$ 0,00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Estoque Inicial</label>
              <input
                type="number"
                value={formData.estoque_atual}
                onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Estoque Mínimo</label>
              <input
                type="number"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                placeholder="10"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Informações Fiscais (NFe)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">NCM</label>
                <input
                  type="text"
                  maxLength={8}
                  value={formData.ncm}
                  onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  placeholder="Ex: 85444200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">CFOP Padrão</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.cfop_padrao}
                  onChange={(e) => setFormData({ ...formData, cfop_padrao: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  placeholder="Ex: 5102"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-1">Origem da Mercadoria</label>
              <select
                value={formData.origem}
                onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-card text-card-foreground"
              >
                <option value="0">0 - Nacional</option>
                <option value="1">1 - Estrangeira (Importação Direta)</option>
                <option value="2">2 - Estrangeira (Adquirida no Mercado Interno)</option>
                <option value="3">3 - Nacional (Conteúdo Importação {'>'} 40%)</option>
                <option value="4">4 - Nacional (Produção Básica)</option>
                <option value="5">5 - Nacional (Conteúdo Importação {'<='} 40%)</option>
                <option value="6">6 - Estrangeira (Importação Direta, sem similar nacional)</option>
                <option value="7">7 - Estrangeira (Mercado Interno, sem similar nacional)</option>
                <option value="8">8 - Nacional (Conteúdo de Importação superior a 70%)</option>
              </select>
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
              className="flex-1 bg-muted text-foreground/80 px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Produto">
        <form onSubmit={editarProduto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Nome do Produto *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              placeholder="Ex: Cabo USB-C 100W"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              rows={2}
              placeholder="Descrição detalhada do produto..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: CB-USBC-100W"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ex: Acessórios"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Preço de Custo</label>
            <input
              type="number"
              step="0.01"
              value={formData.preco_custo}
              onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="R$ 0,00"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informações Fiscais (NFe)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">NCM</label>
                <input
                  type="text"
                  maxLength={8}
                  value={formData.ncm}
                  onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: 85444200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">CFOP Padrão</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.cfop_padrao}
                  onChange={(e) => setFormData({ ...formData, cfop_padrao: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: 5102"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-1">Origem da Mercadoria</label>
              <select
                value={formData.origem}
                onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-card text-card-foreground"
              >
                <option value="0">0 - Nacional</option>
                <option value="1">1 - Estrangeira (Importação Direta)</option>
                <option value="2">2 - Estrangeira (Adquirida no Mercado Interno)</option>
                <option value="3">3 - Nacional (Conteúdo Importação {'>'} 40%)</option>
                <option value="4">4 - Nacional (Produção Básica)</option>
                <option value="5">5 - Nacional (Conteúdo Importação {'<='} 40%)</option>
                <option value="6">6 - Estrangeira (Importação Direta, sem similar nacional)</option>
                <option value="7">7 - Estrangeira (Mercado Interno, sem similar nacional)</option>
                <option value="8">8 - Nacional (Conteúdo de Importação superior a 70%)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Atualizar Produto
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 bg-slate-100 text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
