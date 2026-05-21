"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, ArrowLeft, CreditCard, Banknote, QrCode, Check, AlertCircle, User, FileText } from "lucide-react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { createClient } from "@/utils/supabase/client";
import { useToast, Toast } from "@/components/ui/toast";

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
}



interface ProdutoEstoque {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  sku: string;
}

interface EstoqueRPCItem {
  id: string;
  produto_nome: string;
  produto_preco_base: number;
  quantidade: number;
  quantidade_minima: number;
  sku: string;
}

interface CartItem {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
  estoque_disponivel: number;
}

export default function PDVPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<string>('cartao_credito');
  const [cliente, setCliente] = useState('Cliente Avulso');
  const [vendedorId, setVendedorId] = useState('');
  const [userEmpresaId, setUserEmpresaId] = useState('');
  const [busca, setBusca] = useState('');
  const [desconto, setDesconto] = useState<number>(0);
  const [lembrarDias, setLembrarDias] = useState<number | null>(null);
  const [emitirNfe, setEmitirNfe] = useState(false);
  const supabase = createClient();
  const { toasts, removeToast, success, error: toastError, warning } = useToast();

  // Carregar produtos REAIS do Supabase via RPC (Opção A)
  useEffect(() => {
    const loadProdutos = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: dbError } = await supabase
          .rpc('tenant_listar_estoque');

        if (dbError) throw dbError;

        // Mapear dados da RPC para o formato esperado pelo PDV
        const produtosMapeados = (data || []).map((item: EstoqueRPCItem) => ({
          id: item.id,
          nome: item.produto_nome,
          preco_venda: item.produto_preco_base,
          estoque_atual: item.quantidade,
          estoque_minimo: item.quantidade_minima,
          sku: item.sku
        }));

        setProdutos(produtosMapeados);
      } catch (err: unknown) {
        setError("Erro ao carregar produtos do estoque. Verifique a conexão.");
      } finally {
        setLoading(false);
      }
    };

    loadProdutos();

    // Carregar funcionários para select de vendedor via RPC (Opção A)
    const loadData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("empresa_id")
          .eq("user_id", userData.user.id)
          .single();
        if (profile?.empresa_id) {
          setUserEmpresaId(profile.empresa_id);
        }
      }

      const { data } = await supabase.rpc('tenant_listar_funcionarios');
      setFuncionarios(data || []);
    };
    loadData();
  }, []);

  // Filtrar produtos por busca
  const produtosFiltrados = produtos.filter(p =>
    (p.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(busca.toLowerCase()))
  );

  const addToCart = (produto: ProdutoEstoque) => {
    if (!produto.preco_venda || produto.preco_venda <= 0) {
      warning("Produto sem preço de venda definido. Atualize no Catálogo.");
      return;
    }

    const itemNoCarrinho = cart.find(i => i.id === produto.id);
    const qtdNoCarrinho = itemNoCarrinho ? itemNoCarrinho.qtd : 0;

    if (qtdNoCarrinho >= produto.estoque_atual) {
      warning(`Quantidade insuficiente no estoque. Disponível: ${produto.estoque_atual}`);
      return;
    }

    setCart(prev => {
      const exists = prev.find(i => i.id === produto.id);
      if (exists) {
        return prev.map(i => {
          if (i.id === produto.id) {
            const novaQtd = i.qtd + 1;
            if (novaQtd > produto.estoque_atual) {
              warning(`Quantidade insuficiente no estoque. Disponível: ${produto.estoque_atual}`);
              return i;
            }
            return { ...i, qtd: novaQtd };
          }
          return i;
        });
      }
      return [...prev, {
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco_venda,
        qtd: 1,
        estoque_disponivel: produto.estoque_atual
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateCartQtd = (id: string, newQtdStr: string) => {
    const qtd = parseInt(newQtdStr, 10);
    if (isNaN(qtd)) return;
    
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        if (qtd > item.estoque_disponivel) {
          warning(`Quantidade máxima disponível: ${item.estoque_disponivel}`);
          return { ...item, qtd: item.estoque_disponivel };
        }
        return { ...item, qtd: qtd < 1 ? 1 : qtd };
      }
      return item;
    }));
  };

  const finalizarPagamento = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      // Preparar payload para RPC transacional
      const itens = cart.map(item => ({
        produto_id: item.id,
        qtd: item.qtd,
        preco: item.preco
      }));

      // Chamar RPC transacional com dados do cliente
      // A RPC agora cria ou busca o cliente automaticamente dentro da transação
      // Buscar nome do vendedor selecionado
      const vendedorSelecionado = funcionarios.find(f => f.id === vendedorId);
      
      const { data, error } = await supabase.rpc('tenant_processar_venda', {
        p_cliente_id: null,
        p_cliente_nome: cliente && cliente !== 'Cliente Avulso' ? cliente : 'Cliente Avulso',
        p_itens: itens,
        p_vendedor_id: vendedorId || null,
        p_vendedor_nome: vendedorSelecionado?.nome || null,
        p_metodo_pagamento: metodoPagamento,
        p_valor_total: total,
        p_desconto: desconto,
        p_emitir_nfe: emitirNfe
      });

      if (error) throw error;

      const resultado = data as { success: boolean; venda_id?: string; total?: number; error?: string };

      if (!resultado?.success) {
        throw new Error(resultado?.error || 'Erro ao processar venda');
      }

      success('Pagamento realizado com sucesso!');

      // Gatilho de NFe
      if (emitirNfe && resultado.venda_id) {
        try {
          const response = await fetch('/api/fiscal/nfe/emitir', {
            method: 'POST',
            body: JSON.stringify({ vendaId: resultado.venda_id }),
            headers: { 'Content-Type': 'application/json' }
          });
          const nfeResult = await response.json();
          if (nfeResult.success) {
            success('NFe emitida e autorizada com sucesso!');
          } else {
            warning('Venda concluída, mas houve erro na NFe: ' + nfeResult.error);
          }
        } catch (nfeErr) {
          warning('Venda concluída, mas não foi possível disparar a NFe.');
        }
      }

      setCart([]);
      setCliente('Cliente Avulso');
      setVendedorId('');
      setDesconto(0);
      setLembrarDias(null);
      setEmitirNfe(false);

      // Recarregar produtos com estoque atualizado via RPC
      const { data: produtosAtualizados } = await supabase
        .rpc('tenant_listar_estoque');

      const produtosMapeados = (produtosAtualizados || []).map((item: EstoqueRPCItem) => ({
        id: item.id,
        nome: item.produto_nome,
        preco_venda: item.produto_preco_base,
        estoque_atual: item.quantidade,
        estoque_minimo: item.quantidade_minima,
        sku: item.sku
      }));

      setProdutos(produtosMapeados);
    } catch (err: unknown) {
      toastError('Erro ao processar pagamento: ' + (err instanceof Error ? err.message : 'Tente novamente.'));
      throw err; // Propagar erro (não silencioso)
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
  const total = Math.max(0, subtotal - desconto);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Toast Container */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Esquerda: Catálogo */}
      <div className="flex-1 flex flex-col bg-slate-50/50 rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 bg-card border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tenant/vendas" className="text-slate-400 hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h2 className="text-lg font-bold">Frente de Caixa (PDV)</h2>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="w-full bg-slate-100/50 border border-transparent rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto content-start">
          {loading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">Carregando produtos do estoque...</div>
          ) : error ? (
            <div className="col-span-full text-center py-8 text-red-600 flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <ShoppingCart className="h-10 w-10 text-slate-200" />
                <p className="text-muted-foreground text-sm">
                  {produtos.length === 0
                    ? "Nenhum produto cadastrado. Cadastre produtos no Catálogo primeiro."
                    : "Nenhum produto encontrado para essa busca."}
                </p>
                {produtos.length === 0 && (
                  <Link
                    href="/tenant/catalogo"
                    className="text-sm text-primary hover:text-primary/80 underline mt-1"
                  >
                    Ir para Catálogo
                  </Link>
                )}
              </div>
            </div>
          ) : (
            produtosFiltrados.map((item) => {
              const itemNoCarrinho = cart.find(i => i.id === item.id);
              const qtdNoCarrinho = itemNoCarrinho ? itemNoCarrinho.qtd : 0;
              const disponivel = item.estoque_atual - qtdNoCarrinho;
              const semEstoque = disponivel <= 0;
              const estoqueBaixo = disponivel <= item.estoque_minimo;

              return (
                <button
                  key={item.id}
                  onClick={() => !semEstoque && addToCart(item)}
                  disabled={semEstoque}
                  className={twMerge(
                    clsx(
                      "flex flex-col text-left p-4 rounded-xl border transition-all group",
                      semEstoque
                        ? "border-border bg-muted opacity-50 cursor-not-allowed"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                    )
                  )}
                >
                  <span className="font-medium text-foreground line-clamp-2">{item.nome}</span>
                  <div className="mt-2 text-xs text-muted-foreground font-mono">{item.sku || "—"}</div>
                  <div className="mt-4 flex items-center justify-between w-full">
                    <span className="text-primary font-bold">
                      {item.preco_venda
                        ? `R$ ${item.preco_venda.toFixed(2)}`
                        : "Sem preço"}
                    </span>
                    <span className={twMerge(
                      clsx(
                        "text-xs px-2 py-1 rounded-md",
                        semEstoque
                          ? "bg-red-100 text-red-600"
                          : estoqueBaixo
                          ? "bg-amber-100 text-amber-600"
                          : "bg-muted text-muted-foreground"
                      )
                    )}>
                      {semEstoque ? "Esgotado" : `${disponivel} un`}
                    </span>
                  </div>
                  {semEstoque && (
                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Produto indisponível
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Direita: Carrinho */}
      <div className="w-96 flex flex-col bg-card rounded-xl border border-border shadow-lg">
        <div className="p-4 border-b border-border bg-slate-900 text-white rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h3 className="font-semibold">Carrinho</h3>
          </div>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{cart.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p className="text-sm">Carrinho vazio</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 justify-between items-center group bg-muted p-2 rounded-lg border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="number" 
                        min="1" 
                        max={item.estoque_disponivel}
                        value={item.qtd || ""} 
                        onChange={(e) => updateCartQtd(item.id, e.target.value)}
                        className="w-16 px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-center"
                      />
                      <span className="text-xs text-muted-foreground">x R$ {item.preco.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Disp: {item.estoque_disponivel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">R$ {(item.preco * item.qtd).toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted rounded-b-xl">
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Cliente</label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Nome do cliente"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Vendedor</span>
            </label>
            <select
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Sem vendedor (avulso)</option>
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>
              ))}
            </select>
            {funcionarios.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">Cadastre colaboradores no RH para vincular vendedor.</p>
            )}
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-sm">Subtotal</span>
            <span className="text-foreground font-medium text-sm">R$ {subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
            <span className="text-muted-foreground text-sm">Desconto (R$)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={desconto || ''}
              onChange={(e) => setDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 px-2 py-1 border border-border rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
            <span className="text-muted-foreground text-sm">Lembrar em (dias)</span>
            <input
              type="number"
              min="0"
              value={lembrarDias || ''}
              onChange={(e) => setLembrarDias(parseInt(e.target.value) || null)}
              className="w-24 px-2 py-1 border border-border rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: 30"
            />
          </div>

          <div className="flex justify-between items-end mb-4">
            <span className="text-muted-foreground font-medium">Total</span>
            <span className="text-3xl font-black text-foreground">R$ {total.toFixed(2)}</span>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Método de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMetodoPagamento('pix')}
                className={twMerge(clsx(
                  "flex flex-col items-center p-2 rounded border transition-colors",
                  metodoPagamento === 'pix'
                    ? "border-primary bg-indigo-50 text-primary"
                    : "border-border bg-card hover:border-primary hover:text-primary text-muted-foreground"
                ))}
              >
                <QrCode className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">PIX</span>
                {metodoPagamento === 'pix' && <Check className="h-3 w-3 text-primary" />}
              </button>
              <button
                onClick={() => setMetodoPagamento('cartao_credito')}
                className={twMerge(clsx(
                  "flex flex-col items-center p-2 rounded border transition-colors",
                  metodoPagamento === 'cartao_credito'
                    ? "border-primary bg-indigo-50 text-primary"
                    : "border-border bg-card hover:border-primary hover:text-primary text-muted-foreground"
                ))}
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Cartão</span>
                {metodoPagamento === 'cartao_credito' && <Check className="h-3 w-3 text-primary" />}
              </button>
              <button
                onClick={() => setMetodoPagamento('dinheiro')}
                className={twMerge(clsx(
                  "flex flex-col items-center p-2 rounded border transition-colors",
                  metodoPagamento === 'dinheiro'
                    ? "border-primary bg-indigo-50 text-primary"
                    : "border-border bg-card hover:border-primary hover:text-primary text-muted-foreground"
                ))}
              >
                <Banknote className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Dinheiro</span>
                {metodoPagamento === 'dinheiro' && <Check className="h-3 w-3 text-primary" />}
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between bg-indigo-50/50 p-2 rounded-md border border-indigo-100">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Emitir NFe automaticamente</span>
            </div>
            <button
              onClick={() => setEmitirNfe(!emitirNfe)}
              className={twMerge(clsx(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                emitirNfe ? "bg-primary" : "bg-slate-200"
              ))}
            >
              <span
                className={twMerge(clsx(
                  "inline-block h-4 w-4 transform rounded-full bg-card transition-transform",
                  emitirNfe ? "translate-x-4" : "translate-x-1"
                ))}
              />
            </button>
          </div>

          <button
            onClick={finalizarPagamento}
            disabled={cart.length === 0 || submitting}
            className={twMerge(clsx(
              "w-full h-12 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2",
              cart.length === 0 || submitting
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 shadow-lg shadow-indigo-500/25"
            ))}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando...
              </>
            ) : (
              'Finalizar Pagamento'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
