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
    const formatarMoeda = (valor: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    };

    const formatarData = (data?: string) => {
      if (!data) return "—";
      return new Date(data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const printHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Orçamento OS #${os.numero}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          
          body { 
            font-family: 'Inter', sans-serif; 
            padding: 40px; 
            color: #1e293b;
            line-height: 1.5;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand {
            color: #4f46e5;
            font-size: 24px;
            font-weight: 800;
          }
          .os-info {
            text-align: right;
          }
          .os-number {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
          }
          .section {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 10px;
            letter-spacing: 0.05em;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .label {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
          }
          .value {
            font-size: 14px;
            font-weight: 600;
            color: #334155;
          }
          .description-box {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 14px;
            color: #475569;
            white-space: pre-wrap;
          }
          .total-section {
            margin-top: 40px;
            padding: 25px;
            background: #4f46e5;
            color: white;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-label {
            font-size: 16px;
            font-weight: 600;
          }
          .total-value {
            font-size: 32px;
            font-weight: 800;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }
          @media print {
            body { padding: 0; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Fluxo ERP</div>
            <div style="font-size: 12px; color: #64748b;">Orçamento de Prestação de Serviços</div>
          </div>
          <div class="os-info">
            <div class="os-number">OS #${os.numero}</div>
            <div style="font-size: 12px; color: #64748b;">Emitido em: ${formatarData(new Date().toISOString())}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Dados do Cliente</div>
          <div class="grid">
            <div>
              <div class="label">Nome / Razão Social</div>
              <div class="value">${os.cliente?.nome || '—'}</div>
            </div>
            <div>
              <div class="label">Documento</div>
              <div class="value">${os.cliente?.documento || '—'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Dados do Equipamento</div>
          <div class="grid">
            <div>
              <div class="label">Modelo / Descrição</div>
              <div class="value">${os.veiculo_equipamento || '—'}</div>
            </div>
            <div>
              <div class="label">Série / IMEI</div>
              <div class="value">${os.equipamento_serial || '—'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Descrição do Problema</div>
          <div class="description-box">${os.descricao_problema || 'Nenhuma descrição informada.'}</div>
        </div>

        ${os.laudo_tecnico ? `
          <div class="section" style="border-left: 4px solid #4f46e5;">
            <div class="section-title" style="color: #4f46e5;">Diagnóstico Técnico</div>
            <div class="description-box">${os.laudo_tecnico}</div>
          </div>
        ` : ''}

        <div class="total-section">
          <div class="total-label">Valor Total do Orçamento</div>
          <div class="total-value">${formatarMoeda(os.valor_orcamento)}</div>
        </div>

        <div class="footer">
          Este documento é uma proposta comercial válida por 5 dias.<br/>
          <strong>Fluxo ERP - Tecnologia em Gestão</strong>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`OS #${os.numero} - ${os.veiculo_equipamento}`}>
      <div className="flex flex-col gap-6">
        {/* Header de Status e Timer */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted rounded-xl border border-border shadow-inner">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${os.timer_iniciado_em ? 'bg-amber-100 text-amber-600 dark:text-amber-500 animate-pulse' : 'bg-muted text-muted-foreground'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Tempo Decorrido</p>
              <h3 className="text-xl font-mono font-bold text-foreground">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-card text-foreground border border-border rounded-lg font-bold text-sm hover:bg-muted transition-all shadow-sm"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        {/* Dashboard de Lucro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Valor Total</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro?.total_venda || os.valor_orcamento)}
            </p>
          </div>
          <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Custo Peças</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-500">
              - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro?.total_custo || 0)}
            </p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Lucro Estimado</span>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro?.lucro || os.valor_orcamento)}
            </p>
          </div>
        </div>

        {/* Tabs de Detalhes */}
        <div className="border-b border-border">
          <div className="flex gap-6">
            {(['geral', 'pecas', 'historico'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${
                  activeTab === tab ? 'border-violet-600 text-violet-600' : 'border-transparent text-muted-foreground hover:text-muted-foreground'
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
                <label className="text-xs font-bold text-muted-foreground uppercase">Descrição do Problema</label>
                <p className="mt-1 text-foreground bg-muted p-3 rounded-lg border border-border italic">
                  {os.descricao_problema || "Nenhuma descrição informada."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Cliente</label>
                  <p className="font-medium text-foreground">{os.cliente?.nome || "Não informado"}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Responsável</label>
                  <p className="font-medium text-foreground">{os.colaborador?.nome || "Não alocado"}</p>
                </div>
              </div>

              {os.equipamento_serial && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Série/IMEI</label>
                  <p className="font-medium text-foreground bg-muted p-2 rounded border border-dashed border-border">
                    {os.equipamento_serial}
                  </p>
                </div>
              )}

              {os.laudo_tecnico && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Laudo Técnico (Diagnóstico)</label>
                  <div className="mt-1 text-sm text-foreground bg-violet-50/30 p-4 rounded-lg border border-violet-100/50 whitespace-pre-wrap">
                    {os.laudo_tecnico}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'pecas' && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-in zoom-in-95">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Gestão de peças em desenvolvimento.</p>
              <button className="mt-4 text-xs font-bold text-violet-600 hover:underline">Adicionar Peça do Estoque</button>
            </div>
          )}
          {activeTab === 'historico' && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Logs de mudança de status aparecerão aqui.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
