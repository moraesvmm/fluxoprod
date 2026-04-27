"use client";

import { useEmpresa } from "@/lib/hooks/use-empresas";
import { CreditCard, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function AssinaturaPage() {
  const { data: empresa, isLoading } = useEmpresa();
  const [loading, setLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="p-8 text-center text-gray-400">
        Dados da empresa não encontrados.
      </div>
    );
  }

  const isExpired = empresa.subscription_status === 'TRIAL' && empresa.trial_ends_at && new Date(empresa.trial_ends_at) < new Date();
  const planName = empresa.plan_name || "Personalizado (A La Carte)";

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/checkout/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: empresa.id })
      });

      const data = await response.json();
      if (response.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert("Erro ao processar assinatura: " + (data.error || "Tente novamente."));
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Houve um problema. Por favor, tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Assinatura Fluxo ERP</h1>
        <p className="text-gray-400">Gerencie sua assinatura e garanta acesso contínuo à plataforma.</p>
      </div>

      {isExpired && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-red-300">Seu período de teste expirou!</h3>
            <p className="text-sm mt-1">Para continuar acessando o Fluxo ERP e não perder seus dados, efetue o pagamento da sua assinatura.</p>
          </div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121216] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <CreditCard className="w-48 h-48"/>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <CreditCard className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Plano Atual: {planName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  empresa.subscription_status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                  empresa.subscription_status === 'TRIAL' ? 'bg-indigo-500/20 text-indigo-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {empresa.subscription_status === 'ACTIVE' ? 'ATIVO' : empresa.subscription_status === 'TRIAL' ? 'EM TESTE' : 'PENDENTE'}
                </span>
                {empresa.trial_ends_at && empresa.subscription_status === 'TRIAL' && (
                  <span className="text-xs text-gray-500">Expira em: {new Date(empresa.trial_ends_at).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            </div>
          </div>

          {empresa.subscription_status === 'TRIAL' && (
             <div className="mt-8 pt-8 border-t border-white/5">
                <h3 className="text-lg font-semibold mb-4">Mude para a versão completa</h3>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Acesso ininterrupto a todos os módulos ativados
                  </li>
                  <li className="flex items-center gap-2 text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Suporte prioritário via WhatsApp
                  </li>
                  <li className="flex items-center gap-2 text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Backups diários seguros
                  </li>
                </ul>

                <button 
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  Assinar Agora via PIX
                </button>
             </div>
          )}

          {empresa.subscription_status === 'ACTIVE' && (
            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tudo Certo!</h3>
              <p className="text-gray-400">Sua assinatura está ativa e você tem acesso total ao Fluxo ERP.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
