"use client";

import { useState } from "react";
import { FileText, X, AlertCircle, ExternalLink, HelpCircle, ShieldCheck, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FiscalGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.div 
        drag 
        dragMomentum={false}
        dragConstraints={{ left: -1200, right: 20, top: -800, bottom: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full bg-primary text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-110 transition-all group"
          title="Guia de Configuração Fiscal"
        >
          <HelpCircle className="h-6 w-6" />
          <span className="absolute right-14 bg-card text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold uppercase tracking-wider">
            Guia Fiscal
          </span>
        </button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-card/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden border border-border"
            >
              {/* Header */}
              <div className="bg-primary p-6 text-white relative">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-card/20 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Guia de Automação Fiscal</h3>
                    <p className="text-white/80 text-xs">Transforme seu Fluxo em uma potência de vendas</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 rounded-xl bg-muted border border-border">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-1">Por que o Fluxo pede Certificado A1?</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Diferente de portais manuais do governo, o Fluxo é um ERP de alta performance. O Certificado A1 é o "combustível" que permite ao sistema assinar e emitir notas sem você precisar sair da tela de venda.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-sm font-bold text-foreground">Passo 1: O Certificado Digital</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Você precisa do modelo **A1 (arquivo .pfx)**. Ele tem validade de 1 ano e é o único que permite automação total.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a href="https://www.serasa.com.br/certificados-digitais/" target="_blank" className="text-[10px] bg-muted hover:bg-muted px-2 py-1 rounded flex items-center gap-1 font-medium text-muted-foreground">
                          Serasa <ExternalLink className="h-2 w-2" />
                        </a>
                        <a href="https://www.certisign.com.br/" target="_blank" className="text-[10px] bg-muted hover:bg-muted px-2 py-1 rounded flex items-center gap-1 font-medium text-muted-foreground">
                          Certisign <ExternalLink className="h-2 w-2" />
                        </a>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-sm font-bold text-foreground">Passo 2: Credenciamento SEFAZ</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Peça ao seu contador para habilitar o seu CNPJ para **"Emissão via Software de Terceiros"**. Sem isso, a SEFAZ recusará as notas do sistema.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 p-4 rounded-xl flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-900 mb-1">Escopo Atual da Emissão Nativa</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-500 leading-tight">
                      Hoje o Fluxo emite NF-e nativa somente para empresas do <strong>Simples Nacional</strong>. As UFs mapeadas no backend são <strong>RS, SP, MG</strong> e os estados atendidos pela <strong>SVRS</strong> (AC, AL, AP, DF, PB, PI, RJ, RN, RO, RR, SC, SE e TO).
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-muted border-t border-border flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-card text-white rounded-lg text-sm font-bold hover:bg-card transition-all shadow-lg shadow-slate-900/20"
                >
                  Entendi, vamos lá!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
