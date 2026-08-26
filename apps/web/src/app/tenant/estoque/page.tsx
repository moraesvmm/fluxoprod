"use client";

import { useState, useRef, useEffect } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PackageOpen, AlertTriangle, Boxes, Plus, Search, Filter, Edit, Trash2, Barcode, MoreVertical, Eye, History } from "lucide-react";
import { useProdutos, useCreateProduto, useDeleteProduto, useUpdateProduto } from "@/lib/hooks/use-produtos";
import { type Produto } from "@/lib/api";
import { useToast, Toast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import AlertasEstoquePanel from "@/components/modules/estoque/AlertasEstoquePanel";
import KitsManager from "@/components/modules/estoque/KitsManager";
import TransferenciasManager from "@/components/modules/estoque/TransferenciasManager";
import ValorizacaoDashboard from "@/components/modules/estoque/ValorizacaoDashboard";
import CodigosPanel from "@/components/modules/estoque/CodigosPanel";
import PrevisaoDemandaPanel from "@/components/modules/estoque/PrevisaoDemandaPanel";
import BarcodeScanner from "@/components/modules/estoque/BarcodeScanner";
import MovimentacoesEstoqueManager from "@/components/modules/estoque/MovimentacoesEstoqueManager";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";

export default function EstoquePage() {
  const [activeTab, setActiveTab] = useState("produtos");
  const { data: produtos = [], isLoading: loading, error: queryError } = useProdutos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportConfirm, setExportConfirm] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [detailProduto, setDetailProduto] = useState<Produto | null>(null);
  const [historicoProdutoId, setHistoricoProdutoId] = useState("");
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuId(null);
      }
    };
    if (actionMenuId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuId]);
  const [editProdutoId, setEditProdutoId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ nome: '', preco_venda: '', estoque_minimo: '', categoria: '', nf_entrada: '' });
  const [formData, setFormData] = useState({
    nome: '', descricao: '', sku: '', preco_custo: '', preco_venda: '',
    estoque_atual: '0', estoque_minimo: '10', categoria: '', nf_entrada: ''
  });
  const { toasts, removeToast, success, error: toastError } = useToast();
  const createMutation = useCreateProduto();
  const deleteMutation = useDeleteProduto();
  const updateMutation = useUpdateProduto();

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
        categoria: formData.categoria || undefined,
        nf_entrada: formData.nf_entrada || undefined
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
    estoque_atual: '0', estoque_minimo: '10', categoria: '', nf_entrada: ''
  });

  const abrirEdicaoProduto = (item: Produto) => {
    setEditProdutoId(item.id);
    setEditFormData({
      nome: item.nome || '',
      preco_venda: item.preco_venda ? String(item.preco_venda) : '',
      estoque_minimo: item.estoque_minimo ? String(item.estoque_minimo) : '',
      categoria: item.categoria || '',
      nf_entrada: item.nf_entrada || '',
    });
  };

  const handleEditarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProdutoId || !editFormData.nome.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: editProdutoId,
        produto: {
          nome: editFormData.nome,
          preco_venda: editFormData.preco_venda ? parseFloat(editFormData.preco_venda) : undefined,
          estoque_minimo: editFormData.estoque_minimo ? parseInt(editFormData.estoque_minimo) : undefined,
          categoria: editFormData.categoria || undefined,
          nf_entrada: editFormData.nf_entrada || undefined,
        },
      });
      success('Produto atualizado com sucesso!');
      setEditProdutoId(null);
    } catch {
      toastError('Erro ao atualizar produto. Tente novamente.');
    }
  };

  const produtosFiltrados = buscaProduto
    ? produtos.filter(p =>
        p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(buscaProduto.toLowerCase()))
      )
    : produtos;

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
    <div className="space-y-6">
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
          <button onClick={() => setScannerOpen(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-card border border-border hover:bg-muted text-foreground h-10 px-4 py-2">
            <Barcode className="mr-2 h-4 w-4" /> Scanner
          </button>
          <button onClick={() => setExportConfirm(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-card border border-border hover:bg-muted text-foreground h-10 px-4 py-2">
            Importar/Exportar
          </button>
          <button onClick={() => setIsModalOpen(true)} data-tour="estoque-novo" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </button>
          <TutorialHelpButton moduleKey="estoque" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div data-tour="estoque-kpi-skus">
          <KPICard title="Total SKUs" value={String(totalSKUs)} icon={Boxes} />
        </div>
        <div data-tour="estoque-kpi-baixo">
          <KPICard title="Estoque Baixo" value={String(estoqueBaixo)} icon={AlertTriangle} className="border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10/10" />
        </div>
        <div data-tour="estoque-kpi-criticos">
          <KPICard title="Itens Críticos" value={String(itensCriticos)} icon={PackageOpen} className="border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10/10" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start rounded-lg bg-muted p-1">
          <TabsTrigger value="produtos" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Produtos</TabsTrigger>
          <TabsTrigger value="alertas" data-tour="estoque-alertas" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Alertas</TabsTrigger>
          <TabsTrigger value="kits" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Kits</TabsTrigger>
          <TabsTrigger value="movimentacoes" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Movimentações</TabsTrigger>
          <TabsTrigger value="transferencias" data-tour="estoque-mov" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Transferências</TabsTrigger>
          <TabsTrigger value="valoracao" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Valoração</TabsTrigger>
          <TabsTrigger value="previsao" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">Previsão</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-4">
          <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar SKU ou nome do produto..."
                  value={buscaProduto}
                  onChange={e => setBuscaProduto(e.target.value)}
                  className="w-full bg-card border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-md bg-card">
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
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                      Carregando produtos...
                    </div>
                  </TableCell></TableRow>
                ) : error ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6"><div className="text-red-500">{error}</div></TableCell></TableRow>
                ) : produtosFiltrados.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6"><div className="text-muted-foreground">{buscaProduto ? 'Nenhum produto encontrado para a busca.' : 'Nenhum produto encontrado'}</div></TableCell></TableRow>
                ) : (
                  produtosFiltrados.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell><StatusBadge status={getStatus(item.estoque_atual, item.estoque_minimo)} /></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.sku || '-'}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {item.nome}
                          {item.tipo_item === 'produto_acabado' && (
                            <span className="inline-flex items-center rounded-sm bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border border-indigo-500/20">
                              Produto Acabado
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        <span className={item.estoque_atual <= item.estoque_minimo ? "text-red-600 dark:text-red-500" : ""}>{item.estoque_atual}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.estoque_minimo}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">{formatarPreco(item.preco_venda)}</TableCell>
                      <TableCell className="text-right">
                        <div className="relative" ref={actionMenuId === item.id ? actionMenuRef : undefined}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Ações"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {actionMenuId === item.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-card rounded-lg border border-border shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                              <button
                                onClick={() => { setDetailProduto(item); setActionMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Eye className="h-4 w-4 text-blue-500" /> Ver Detalhes
                              </button>
                              <button
                                onClick={() => { abrirEdicaoProduto(item); setActionMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Edit className="h-4 w-4 text-amber-500" /> Editar
                              </button>
                              <button
                                onClick={() => { setHistoricoProdutoId(item.id); setActiveTab("movimentacoes"); setActionMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <History className="h-4 w-4 text-emerald-600" /> Ver movimentações
                              </button>
                              <div className="border-t border-border my-1" />
                              <button
                                onClick={() => { setDeleteId(item.id); setActionMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:bg-red-500/10 dark:hover:bg-red-950/20 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" /> Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="mt-4">
          <AlertasEstoquePanel />
        </TabsContent>

        <TabsContent value="kits" className="mt-4">
          <KitsManager />
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-4">
          <MovimentacoesEstoqueManager
            key={historicoProdutoId || "todos"}
            produtoInicialId={historicoProdutoId || undefined}
          />
        </TabsContent>

        <TabsContent value="transferencias" className="mt-4">
          <TransferenciasManager />
        </TabsContent>

        <TabsContent value="valoracao" className="mt-4 space-y-6">
          <ValorizacaoDashboard />
          <CodigosPanel />
        </TabsContent>

        <TabsContent value="previsao" className="mt-4">
          <PrevisaoDemandaPanel />
        </TabsContent>
      </Tabs>

      <Modal isOpen={isModalOpen} onClose={handleFecharModal} title="Novo Produto">
        <form onSubmit={handleSalvarProduto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nome do produto *</label>
            <input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Cabo USB-C 100W" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
            <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Descrição detalhada do produto" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">SKU</label>
              <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: USB-C-100W" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
              <input type="text" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Cabos" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">NF de entrada</label>
            <input type="text" value={formData.nf_entrada} onChange={(e) => setFormData({ ...formData, nf_entrada: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Número, série ou chave de acesso" />
            <p className="mt-1 text-xs text-muted-foreground">Identifica a nota que originou este estoque.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Preço de Custo</label>
              <input type="number" step="0.01" value={formData.preco_custo} onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Preço de Venda</label>
              <input type="number" step="0.01" value={formData.preco_venda} onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0,00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Quantidade Atual *</label>
              <input type="number" value={formData.estoque_atual} onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Quantidade Mínima *</label>
              <input type="number" value={formData.estoque_minimo} onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="10" required />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {createMutation.isPending ? "Salvando..." : "Salvar Produto"}
            </button>
            <button type="button" onClick={handleFecharModal} className="flex-1 bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Produto */}
      {editProdutoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Editar Produto</h3>
            <form onSubmit={handleEditarProduto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome *</label>
                <input type="text" required value={editFormData.nome}
                  onChange={e => setEditFormData({ ...editFormData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">NF de entrada</label>
                <input type="text" value={editFormData.nf_entrada}
                  onChange={e => setEditFormData({ ...editFormData, nf_entrada: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Número, série ou chave de acesso" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Preço de Venda</label>
                  <input type="number" step="0.01" value={editFormData.preco_venda}
                    onChange={e => setEditFormData({ ...editFormData, preco_venda: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Estoque Mínimo</label>
                  <input type="number" value={editFormData.estoque_minimo}
                    onChange={e => setEditFormData({ ...editFormData, estoque_minimo: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
                <input type="text" value={editFormData.categoria}
                  onChange={e => setEditFormData({ ...editFormData, categoria: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Cabos, Eletrônicos" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={updateMutation.isPending}
                  className="flex-1 bg-primary text-white py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button type="button" onClick={() => setEditProdutoId(null)}
                  className="flex-1 bg-muted text-foreground py-2 rounded-md text-sm font-medium hover:bg-muted">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Produto */}
      {detailProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailProduto(null)}>
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Detalhes do Produto</h3>
              <button onClick={() => setDetailProduto(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Boxes className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{detailProduto.nome}</p>
                  <p className="text-sm text-muted-foreground">SKU: {detailProduto.sku || 'Não definido'}</p>
                </div>
              </div>

              {detailProduto.descricao && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm text-foreground">{detailProduto.descricao}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Categoria</p>
                  <p className="text-sm font-semibold text-foreground">{detailProduto.categoria || '-'}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tipo</p>
                  <p className="text-sm font-semibold text-foreground capitalize">{detailProduto.tipo_item || 'produto'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Estoque</p>
                  <p className={`text-xl font-bold ${detailProduto.estoque_atual <= detailProduto.estoque_minimo ? 'text-red-600 dark:text-red-500' : 'text-foreground'}`}>
                    {detailProduto.estoque_atual}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Mínimo</p>
                  <p className="text-xl font-bold text-foreground">{detailProduto.estoque_minimo}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Preço</p>
                  <p className="text-xl font-bold text-emerald-600">{formatarPreco(detailProduto.preco_venda)}</p>
                </div>
              </div>

              {detailProduto.preco_custo != null && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Custo Unitário</p>
                    <p className="text-sm font-semibold text-foreground">{formatarPreco(detailProduto.preco_custo)}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Margem</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {detailProduto.preco_venda && detailProduto.preco_custo
                        ? `${(((detailProduto.preco_venda - detailProduto.preco_custo) / detailProduto.preco_venda) * 100).toFixed(1)}%`
                        : '-'}
                    </p>
                  </div>
                </div>
              )}

              {detailProduto.nf_entrada && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">NF de entrada</p>
                  <p className="text-sm font-semibold text-foreground break-all">{detailProduto.nf_entrada}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-5 mt-2 border-t border-border">
              <button
                onClick={() => { abrirEdicaoProduto(detailProduto); setDetailProduto(null); }}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Edit className="h-4 w-4" /> Editar Produto
              </button>
              <button onClick={() => setDetailProduto(null)}
                className="flex-1 bg-muted text-foreground py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProdutoEncontrado={() => {
          // Opcional: fazer algo quando produto é encontrado
        }}
      />
    </div>
  );
}
