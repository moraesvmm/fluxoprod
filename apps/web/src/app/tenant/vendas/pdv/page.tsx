"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, ArrowLeft, CreditCard, Banknote, QrCode, AlertCircle } from "lucide-react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { createClient } from "@/utils/supabase/client";

interface ProdutoEstoque {
  id: string;
  nome: string;
  preco: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Carregar produtos do estoque
  useEffect(() => {
    const loadProdutos = async () => {
      try {
        setLoading(true);
        // TODO: Substituir pela query real do Supabase
        // const { data, error } = await supabase
        //   .from('estoque')
        //   .select('id, quantidade, quantidade_minima, produtos!inner(id, nome, preco_base)')
        //   .gte('quantidade', 1);
        
        // Mock data temporário - será substituído por dados reais do Supabase
        const mockProdutos: ProdutoEstoque[] = [
          { id: "1", nome: "Cabo USB-C Baseus 100W", preco: 45.90, quantidade: 15, quantidade_minima: 10, sku: "CB-USBC-100W" },
          { id: "2", nome: "Carregador Turbo 30W", preco: 89.00, quantidade: 8, quantidade_minima: 15, sku: "CHG-T30W" },
          { id: "3", nome: "Película de Vidro iPhone 15", preco: 35.00, quantidade: 42, quantidade_minima: 20, sku: "PEL-IP15" },
          { id: "4", nome: "Capa de Silicone Transparente", preco: 25.00, quantidade: 110, quantidade_minima: 30, sku: "CAP-SIL-IP15" },
          { id: "5", nome: "Fone Bluetooth Geonav", preco: 150.00, quantidade: 3, quantidade_minima: 5, sku: "FON-GEO-BT" },
        ];
        
        setProdutos(mockProdutos);
      } catch (err) {
        setError("Erro ao carregar produtos do estoque");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadProdutos();
  }, [supabase]);
  
  const addToCart = (produto: ProdutoEstoque) => {
    // Validação crítica: produto deve existir no estoque
    const produtoEstoque = produtos.find(p => p.id === produto.id);
    if (!produtoEstoque) {
      alert("Produto não encontrado no estoque");
      return;
    }
    
    // Validação crítica: quantidade disponível
    const itemNoCarrinho = cart.find(i => i.id === produto.id);
    const qtdNoCarrinho = itemNoCarrinho ? itemNoCarrinho.qtd : 0;
    
    if (qtdNoCarrinho >= produtoEstoque.quantidade) {
      alert(`Quantidade insuficiente no estoque. Disponível: ${produtoEstoque.quantidade}`);
      return;
    }
    
    setCart(prev => {
      const exists = prev.find(i => i.id === produto.id);
      if (exists) {
        return prev.map(i => {
          if (i.id === produto.id) {
            const novaQtd = i.qtd + 1;
            if (novaQtd > produtoEstoque.quantidade) {
              alert(`Quantidade insuficiente no estoque. Disponível: ${produtoEstoque.quantidade}`);
              return i;
            }
            return { ...i, qtd: novaQtd };
          }
          return i;
        });
      }
      return [...prev, { ...produto, qtd: 1, estoque_disponivel: produtoEstoque.quantidade }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const total = cart.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Esquerda: Catálogo */}
      <div className="flex-1 flex flex-col bg-slate-50/50 rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 bg-white border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tenant/vendas" className="text-slate-400 hover:text-slate-900 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h2 className="text-lg font-bold">Frente de Caixa (PDV)</h2>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
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
          ) : produtos.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">Nenhum produto disponível no estoque</div>
          ) : (
            produtos.map((item) => {
              const itemNoCarrinho = cart.find(i => i.id === item.id);
              const qtdNoCarrinho = itemNoCarrinho ? itemNoCarrinho.qtd : 0;
              const disponivel = item.quantidade - qtdNoCarrinho;
              const semEstoque = disponivel <= 0;
              const estoqueBaixo = disponivel <= item.quantidade_minima;
              
              return (
                <button
                  key={item.id}
                  onClick={() => !semEstoque && addToCart(item)}
                  disabled={semEstoque}
                  className={twMerge(
                    clsx(
                      "flex flex-col text-left p-4 rounded-xl border transition-all group",
                      semEstoque
                        ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                        : "border-border bg-white hover:border-primary/50 hover:shadow-md"
                    )
                  )}
                >
                  <span className="font-medium text-slate-800 line-clamp-2">{item.nome}</span>
                  <div className="mt-2 text-xs text-slate-500 font-mono">{item.sku}</div>
                  <div className="mt-4 flex items-center justify-between w-full">
                    <span className="text-primary font-bold">R$ {item.preco.toFixed(2)}</span>
                    <span className={twMerge(
                      clsx(
                        "text-xs px-2 py-1 rounded-md",
                        semEstoque
                          ? "bg-red-100 text-red-600"
                          : estoqueBaixo
                          ? "bg-amber-100 text-amber-600"
                          : "bg-slate-100 text-slate-500"
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
      <div className="w-96 flex flex-col bg-white rounded-xl border border-border shadow-lg">
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
                <div key={item.id} className="flex gap-3 justify-between items-center group bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.nome}</p>
                    <p className="text-xs text-slate-500">{item.qtd}x R$ {item.preco.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Disp: {item.estoque_disponivel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">R$ {(item.preco * item.qtd).toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-slate-50 rounded-b-xl">
          <div className="flex justify-between items-end mb-4">
            <span className="text-slate-500 font-medium">Total</span>
            <span className="text-3xl font-black text-slate-900">R$ {total.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <button className="flex flex-col items-center p-2 rounded border border-border bg-white hover:border-primary hover:text-primary transition-colors text-slate-600">
              <QrCode className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">PIX</span>
            </button>
            <button className="flex flex-col items-center p-2 rounded border border-primary bg-indigo-50 text-primary transition-colors">
              <CreditCard className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Cartão</span>
            </button>
            <button className="flex flex-col items-center p-2 rounded border border-border bg-white hover:border-primary hover:text-primary transition-colors text-slate-600">
              <Banknote className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Dinheiro</span>
            </button>
          </div>

          <button 
            disabled={cart.length === 0}
            className={twMerge(clsx(
              "w-full h-12 rounded-lg font-bold text-white transition-all",
              cart.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-lg shadow-indigo-500/25"
            ))}
          >
            Finalizar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}
