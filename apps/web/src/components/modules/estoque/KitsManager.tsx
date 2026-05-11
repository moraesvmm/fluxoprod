"use client";

import { useState } from "react";
import { Package, Plus, Trash2, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import { useKits, useCriarKit, useExcluirKit, useVenderKit } from "@/lib/hooks/use-kits";
import { useProdutos } from "@/lib/hooks/use-produtos";
import { useToast, Toast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function KitsManager() {
  const { data: kits = [], isLoading } = useKits();
  const { data: produtos = [] } = useProdutos();
  const criarMutation = useCriarKit();
  const excluirMutation = useExcluirKit();
  const venderMutation = useVenderKit();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [venderId, setVenderId] = useState<string | null>(null);
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    produto_id: "",
    nome: "",
    descricao: "",
    itens: [] as { produto_id: string; quantidade: number }[]
  });
  const [venderQuantidade, setVenderQuantidade] = useState(1);
  const { toasts, removeToast, success, error: toastError } = useToast();

  const toggleExpand = (kitId: string) => {
    setExpandedKits(prev => {
      const next = new Set(prev);
      if (next.has(kitId)) {
        next.delete(kitId);
      } else {
        next.add(kitId);
      }
      return next;
    });
  };

  const handleAdicionarItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { produto_id: "", quantidade: 1 }]
    }));
  };

  const handleRemoverItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const handleSalvarKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.produto_id || !formData.nome.trim() || formData.itens.length === 0) return;
    
    const itensValidos = formData.itens.filter(item => item.produto_id && item.quantidade > 0);
    if (itensValidos.length === 0) return;

    try {
      await criarMutation.mutateAsync({
        produto_id: formData.produto_id,
        nome: formData.nome,
        descricao: formData.descricao,
        itens: itensValidos
      });
      success("Kit criado com sucesso!");
      setIsModalOpen(false);
      setFormData({ produto_id: "", nome: "", descricao: "", itens: [] });
    } catch (err: unknown) {
      toastError("Erro ao criar kit: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
    }
  };

  const handleExcluirKit = async () => {
    if (!deleteId) return;
    try {
      await excluirMutation.mutateAsync(deleteId);
      success("Kit excluÃ­do com sucesso!");
    } catch {
      toastError("Erro ao excluir kit. Tente novamente.");
    } finally {
      setDeleteId(null);
    }
  };

  const handleVenderKit = async () => {
    if (!venderId) return;
    try {
      await venderMutation.mutateAsync({ kitId: venderId, quantidade: venderQuantidade });
      success(`Kit vendido (${venderQuantidade}x) com sucesso!`);
    } catch (err: unknown) {
      toastError("Erro ao vender kit: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Tente novamente."));
    } finally {
      setVenderId(null);
      setVenderQuantidade(1);
    }
  };

  return (
    <div className="space-y-4">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Kits e Bundles</h3>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {kits.length} ativos
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600 h-8 px-3"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Kit
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Carregando kits...</div>
      ) : kits.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
          <Package className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm">Nenhum kit cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {kits.map((kit) => (
            <div key={kit.id} className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => toggleExpand(kit.id)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      {expandedKits.has(kit.id) ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                    <span className="font-medium text-slate-900">{kit.nome}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{kit.descricao || "Sem descriÃ§Ã£o"}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Produto pai: <strong>{kit.produto_nome}</strong></span>
                    <span>Itens: <strong>{kit.itens.length}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setVenderId(kit.id); setVenderQuantidade(1); }}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-8 px-3"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" /> Vender
                  </button>
                  <button
                    onClick={() => setDeleteId(kit.id)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 h-8 px-3"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </button>
                </div>
              </div>

              {expandedKits.has(kit.id) && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Itens do Kit</h4>
                  <div className="space-y-1">
                    {kit.itens.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded">
                        <span className="text-slate-700">{item.produto_nome}</span>
                        <span className="font-medium text-slate-900">Qtd: {item.quantidade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Kit */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Kit">
        <form onSubmit={handleSalvarKit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Produto Pai</label>
            <select
              value={formData.produto_id}
              onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um produto</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Kit</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">DescriÃ§Ã£o</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Itens do Kit</label>
            {formData.itens.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={item.produto_id}
                  onChange={(e) => {
                    const novosItens = [...formData.itens];
                    novosItens[index].produto_id = e.target.value;
                    setFormData({ ...formData, itens: novosItens });
                  }}
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={(e) => {
                    const novosItens = [...formData.itens];
                    novosItens[index].quantidade = parseInt(e.target.value) || 1;
                    setFormData({ ...formData, itens: novosItens });
                  }}
                  className="w-24 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoverItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAdicionarItem}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar Item
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criarMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {criarMutation.isPending ? "Criando..." : "Criar Kit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar ExclusÃ£o */}
      <ConfirmModal
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleExcluirKit}
        title="Excluir Kit"
        message="Tem certeza que deseja excluir este kit? Esta aÃ§Ã£o nÃ£o pode ser desfeita."
        variant="danger"
      />

      {/* Modal Vender Kit */}
      <Modal isOpen={!!venderId} onClose={() => setVenderId(null)} title="Vender Kit">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
            <input
              type="number"
              min="1"
              value={venderQuantidade}
              onChange={(e) => setVenderQuantidade(parseInt(e.target.value) || 1)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setVenderId(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Cancelar
            </button>
            <button
              onClick={handleVenderKit}
              disabled={venderMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
            >
              {venderMutation.isPending ? "Vendendo..." : "Confirmar Venda"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
