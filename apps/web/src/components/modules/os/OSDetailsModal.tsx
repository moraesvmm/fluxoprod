"use client";

import { useState, useEffect } from "react";
import { OrdemServico, OSLucro, fetchOSLucro, gerenciarTimerOS } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Play, Pause, Package, DollarSign, TrendingUp, FileText, ChevronRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OSDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  os: OrdemServico;
  onUpdate: () => void;
}

export function OSDetailsModal({ isOpen, onClose, os, onUpdate }: OSDetailsModalProps) {
  const [lucro, setLucro] = useState<OSLucro | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'pecas' | 'historico'>('geral');
  const [isTimerLoading, setIsTimerLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLucro();
    }
  }, [isOpen, os.id]);

  const loadLucro = async () => {
    try {
      const data = await fetchOSLucro(os.id);
      setLucro(data);
    } catch (error) {
      console.error("Erro ao carregar lucro:", error);
    }
  };

  const toggleTimer = async () => {
    setIsTimerLoading(true);
    try {
      const acao = os.timer_iniciado_em ? 'parar' : 'iniciar';
      await gerenciarTimerOS(os.id, acao);
      onUpdate();
    } catch (error) {
      console.error("Erro no timer:", error);
    } finally {
      setIsTimerLoading(false);
    }
  };

  const handlePrintPDF = () => {
    // Implementação simplificada de impressão profissional
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`OS #${os.numero} - ${os.veiculo_equipamento}`} size="xl">
      <div className="flex flex-col gap-6">
        {/* Header de Status e Timer */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${os.timer_iniciado_em ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Tempo Decorrido</p>
              <h3 className="text-xl font-mono font-bold text-slate-700">
                {Math.floor((os.tempo_total_minutos || 0) / 60)}h {(os.tempo_total_minutos || 0) % 60}m
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimer}
              disabled={isTimerLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm active:scale-95 ${
                os.timer_iniciado_em 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {os.timer_iniciado_em ? <><Pause className="w-4 h-4 fill-current" /> Pausar</> : <><Play className="w-4 h-4 fill-current" /> Iniciar</>}
            </button>
            <button 
              onClick={handlePrintPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        {/* Dashboard de Lucro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Valor Total</span>
            </div>
            <p className="text-xl font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro?.total_venda || os.valor)}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Custo Peças</span>
            </div>
            <p className="text-xl font-bold text-red-600">
              - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro?.total_custo || 0)}
            </p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Lucro Estimado</span>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro?.lucro || os.valor)}
            </p>
          </div>
        </div>

        {/* Tabs de Detalhes */}
        <div className="border-b border-slate-100">
          <div className="flex gap-6">
            {(['geral', 'pecas', 'historico'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${
                  activeTab === tab ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[200px]">
          {activeTab === 'geral' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Descrição do Problema</label>
                <p className="mt-1 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  {os.descricao_problema || "Nenhuma descrição informada."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Cliente</label>
                  <p className="font-medium text-slate-900">{os.cliente?.nome || "Não informado"}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Responsável</label>
                  <p className="font-medium text-slate-900">{os.colaborador?.nome || "Não alocado"}</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'pecas' && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 animate-in zoom-in-95">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Gestão de peças em desenvolvimento.</p>
              <button className="mt-4 text-xs font-bold text-violet-600 hover:underline">Adicionar Peça do Estoque</button>
            </div>
          )}
          {activeTab === 'historico' && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">Logs de mudança de status aparecerão aqui.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
