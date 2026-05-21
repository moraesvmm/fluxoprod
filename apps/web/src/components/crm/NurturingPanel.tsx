'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, MessageCircle, Check, ArrowRight, Clock, ShoppingBag, X } from 'lucide-react';
import { obterSugestoesNurturing, finalizarAlertaNurturing } from '@/lib/api';
import { useToast, Toast } from '@/components/ui/toast';

import type { NurturingSuggestion as Sugestao } from '@/lib/api';

export function NurturingPanel() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, success: toastSuccess, error: toastError, removeToast } = useToast();

  useEffect(() => {
    loadSugestoes();
  }, []);

  const loadSugestoes = async () => {
    try {
      setLoading(true);
      const data = await obterSugestoesNurturing();
      setSugestoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = async (sugestao: Sugestao) => {
    const num = sugestao.cliente_telefone.replace(/\D/g, '');
    const msg = sugestao.mensagem_sugerida || `Olá ${sugestao.cliente_nome}! Tudo bem?`;

    // Tentar verificar status do microsserviço
    try {
      const statusRes = await fetch('/api/whatsapp/status');
      const statusData = await statusRes.json();

      if (!statusData.serviceDown) {
        // Se o serviço não estiver fora do ar, abrir o chat interno (mesmo se apenas desconectado/sem qrcode)
        window.dispatchEvent(new CustomEvent('open-whatsapp-chat', { 
          detail: { phone: `55${num}`, name: sugestao.cliente_nome, message: msg } 
        }));
        return;
      }
    } catch {
      // Silenciar
    }

    // Fallback absoluto: só cai aqui se o backend Node / microsserviço estiver totalmente fora do ar
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(msg)}`, '_blank');
    toastSuccess('WhatsApp Web aberto para ' + sugestao.cliente_nome);
  };

  const handleFinalizar = async (id: string | null, clienteNome?: string) => {
    try {
      if (id) {
        await finalizarAlertaNurturing(id);
        setSugestoes(prev => prev.filter(s => s.id !== id));
      } else {
        // Se for uma sugestão dinâmica (sem ID no banco), apenas removemos da lista local
        setSugestoes(prev => prev.filter(s => s.cliente_nome !== clienteNome));
      }
      toastSuccess("Sugestão removida com sucesso!");
    } catch (err) {
      toastError("Erro ao remover sugestão.");
    }
  };

  const getBadgeConfig = (tipo: string) => {
    if (tipo === 'RECOMPRA') {
      return { 
        icon: <ShoppingBag className="w-3 h-3" />, 
        label: 'Recompra', 
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' 
      };
    }
    return { 
      icon: <Clock className="w-3 h-3" />, 
      label: 'Recuperação', 
      color: 'bg-amber-100 text-amber-700 border-amber-200' 
    };
  };

  const getDiasDesde = (dataString: string | null) => {
    if (!dataString) return null;
    const dias = Math.floor((Date.now() - new Date(dataString).getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const getDescricaoContextual = (item: Sugestao) => {
    if (item.categoria === 'recompra') {
      return item.produto_servico 
        ? `Possível momento de recompra de "${item.produto_servico}".`
        : 'Momento ideal para oferecer novos produtos.';
    }
    const dias = getDiasDesde(item.data_alerta);
    if (dias !== null) {
      return `Sem interação há ${dias} ${dias === 1 ? 'dia' : 'dias'}. Hora de reengajar!`;
    }
    return 'Cliente inativo. Hora de reengajar!';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (sugestoes.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-foreground">Sugestões de Reengajamento</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sugestoes.map((item, idx) => {
          const config = getBadgeConfig(item.tipo);
          return (
            <div 
              key={item.id || idx}
              className={`relative overflow-hidden group p-4 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${
                item.categoria === 'recompra' ? 'border-emerald-100' : 'border-amber-100'
              }`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 rounded-full transition-transform group-hover:scale-110 ${
                item.categoria === 'recompra' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />

              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg ${
                  item.categoria === 'recompra' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {config.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${config.color}`}>
                    {config.label}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFinalizar(item.id, item.cliente_nome);
                    }}
                    className="p-1 text-slate-400 hover:text-muted-foreground hover:bg-muted rounded-full transition-all"
                    title="Descartar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-foreground truncate" title={item.cliente_nome}>
                  {item.cliente_nome || 'Cliente sem nome'}
                </h3>
                {item.cliente_telefone && (
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.cliente_telefone}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {getDescricaoContextual(item)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-auto">
                <button 
                  onClick={() => handleWhatsApp(item)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Falar agora
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {toasts.map(t => (
        <Toast 
          key={t.id} 
          message={t.message} 
          type={t.type} 
          onClose={() => removeToast(t.id)} 
        />
      ))}
    </div>
  );
}
