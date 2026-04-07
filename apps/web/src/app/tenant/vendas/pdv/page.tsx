"use client";

import { useState } from "react";
import { Search, ShoppingCart, Trash2, ArrowLeft, CreditCard, Banknote, QrCode, Check } from "lucide-react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { apiClient } from "@/lib/api";

const catalogoBase = [
  { id: 1, nome: "Cabo USB-C Baseus 100W", preco: 45.90, estoque: 15 },
  { id: 2, nome: "Carregador Turbo 30W", preco: 89.00, estoque: 8 },
  { id: 3, nome: "Película de Vidro iPhone 15", preco: 35.00, estoque: 42 },
  { id: 4, nome: "Capa de Silicone Transparente", preco: 25.00, estoque: 110 },
  { id: 5, nome: "Fone Bluetooth Geonav", preco: 150.00, estoque: 3 },
];

export default function PDVPage() {
  const [cart, setCart] = useState<{ id: number; nome: string; preco: number; qtd: number }[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState<string>('cartao');
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState('Cliente Avulso');
  
  const addToCart = (produto: any) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === produto.id);
      if (exists) {
        return prev.map(i => i.id === produto.id ? { ...i, qtd: i.qtd + 1 } : i);
      }
      return [...prev, { ...produto, qtd: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const finalizarPagamento = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    try {
      // Criar venda para cada item no carrinho
      for (const item of cart) {
        await apiClient.createVenda({
          cliente: cliente,
          valor: item.preco * item.qtd,
          metodo: metodoPagamento,
          status: 'concluido'
        });
      }
      
      // Limpar carrinho após sucesso
      setCart([]);
      alert('Pagamento realizado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao finalizar pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
          {catalogoBase.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="flex flex-col text-left p-4 rounded-xl border border-border bg-white hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <span className="font-medium text-slate-800 line-clamp-2">{item.nome}</span>
              <div className="mt-4 flex items-center justify-between w-full">
                <span className="text-primary font-bold">R$ {item.preco.toFixed(2)}</span>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-md">{item.estoque} un</span>
              </div>
            </button>
          ))}
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Nome do cliente"
            />
          </div>

          <div className="flex justify-between items-end mb-4">
            <span className="text-slate-500 font-medium">Total</span>
            <span className="text-3xl font-black text-slate-900">R$ {total.toFixed(2)}</span>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Método de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setMetodoPagamento('pix')}
                className={twMerge(clsx(
                  "flex flex-col items-center p-2 rounded border transition-colors",
                  metodoPagamento === 'pix' 
                    ? "border-primary bg-indigo-50 text-primary" 
                    : "border-border bg-white hover:border-primary hover:text-primary text-slate-600"
                ))}
              >
                <QrCode className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">PIX</span>
                {metodoPagamento === 'pix' && <Check className="h-3 w-3 text-primary" />}
              </button>
              <button 
                onClick={() => setMetodoPagamento('cartao')}
                className={twMerge(clsx(
                  "flex flex-col items-center p-2 rounded border transition-colors",
                  metodoPagamento === 'cartao' 
                    ? "border-primary bg-indigo-50 text-primary" 
                    : "border-border bg-white hover:border-primary hover:text-primary text-slate-600"
                ))}
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Cartão</span>
                {metodoPagamento === 'cartao' && <Check className="h-3 w-3 text-primary" />}
              </button>
              <button 
                onClick={() => setMetodoPagamento('dinheiro')}
                className={twMerge(clsx(
                  "flex flex-col items-center p-2 rounded border transition-colors",
                  metodoPagamento === 'dinheiro' 
                    ? "border-primary bg-indigo-50 text-primary" 
                    : "border-border bg-white hover:border-primary hover:text-primary text-slate-600"
                ))}
              >
                <Banknote className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Dinheiro</span>
                {metodoPagamento === 'dinheiro' && <Check className="h-3 w-3 text-primary" />}
              </button>
            </div>
          </div>

          <button 
            onClick={finalizarPagamento}
            disabled={cart.length === 0 || loading}
            className={twMerge(clsx(
              "w-full h-12 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2",
              cart.length === 0 || loading 
                ? "bg-slate-300 cursor-not-allowed" 
                : "bg-primary hover:bg-primary/90 shadow-lg shadow-indigo-500/25"
            ))}
          >
            {loading ? (
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
