"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, LayoutGrid, Building2, ChevronRight, Loader2, Tag } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import dynamic from "next/dynamic";

const PricingPanel = dynamic(() => import("./PricingPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  ),
});

/* ─── TABS ─── */
const TABS = [
  { id: "provisionar", label: "Provisionar", icon: Building2 },
  { id: "precos", label: "Preços", icon: Tag },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MestrePage() {
  const [activeTab, setActiveTab] = useState<TabId>("provisionar");

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 font-sans selection:bg-purple-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      <div className="w-full max-w-lg bg-[#121216] border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Tab Bar */}
        <div className="flex border-b border-white/5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === "provisionar" && (
              <motion.div key="prov" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <ProvisioningWizard />
              </motion.div>
            )}
            {activeTab === "precos" && (
              <motion.div key="precos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PricingPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}

/* ════════════════════════════════════════════════
   PROVISIONING WIZARD (código existente preservado)
   ════════════════════════════════════════════════ */
function ProvisioningWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState("");
  const [errorDetail, setErrorDetail] = useState("");

  const [formData, setFormData] = useState({
    cnpj: "", razao_social: "", porte: "MPE", segmento: "", modules: [] as string[],
  });

  const availableModules = [
    { id: "dashboard", name: "Dashboard Analytics", icon: "📊" },
    { id: "crm", name: "CRM & Clientes", icon: "🤝" },
    { id: "vendas", name: "Vendas & PDV", icon: "🛒" },
    { id: "financeiro", name: "Gestão Financeira", icon: "💰" },
    { id: "estoque", name: "Controle de Estoque", icon: "📦" },
    { id: "catalogo", name: "Catálogo", icon: "📋" },
    { id: "rh", name: "RH & Pessoal", icon: "👥" },
    { id: "relatorios", name: "Relatórios", icon: "📄" },
    { id: "os", name: "Ordem de Serviço", icon: "🔧" },
    { id: "configuracoes", name: "Configurações", icon: "⚙️" },
  ];

  const handleToggleModule = (id: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(id) ? prev.modules.filter(m => m !== id) : [...prev.modules, id],
    }));
  };

  const submitProvisioning = async () => {
    setLoading(true);
    setErrorDetail("");
    setProgressStatus("Provisionando tenant no Supabase...");
    try {
      const supabase = createClient();
      const empresaId = crypto.randomUUID();
      const schemaName = `tenant_${empresaId.replace(/-/g, "").slice(0, 8)}`;
      const { data, error } = await supabase.rpc("provisionar_empresa_master", {
        p_empresa_id: empresaId, p_cnpj: formData.cnpj, p_razao_social: formData.razao_social,
        p_porte: formData.porte, p_segmento: formData.segmento, p_schema_name: schemaName, p_modules: formData.modules,
      });
      if (error) throw new Error(error.message);
      const result = data as { status: string; message: string };
      setProgressStatus(result.message || "Ambiente gerado com sucesso!");
      setTimeout(() => setStep(4), 2000);
    } catch (err: any) {
      setProgressStatus("Provisionamento falhou.");
      setErrorDetail(err?.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3 text-indigo-400 mb-6 border-b border-white/10 pb-4">
              <Building2 className="w-5 h-5" />
              <h2 className="text-xl font-semibold text-white">Dados da Empresa</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Razão Social</label>
                <input value={formData.razao_social} onChange={e => setFormData({ ...formData, razao_social: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Tech Solutions Ltda" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">CNPJ</label>
                  <input value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Porte</label>
                  <select value={formData.porte} onChange={e => setFormData({ ...formData, porte: e.target.value })} className="w-full bg-[#1e1e24] border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option>ME</option><option>EPP</option><option>Médio</option><option>Grande</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-400 mb-6 border-b border-white/10 pb-4">
              <LayoutGrid className="w-5 h-5" /><h2 className="text-xl font-semibold text-white">Onboarding</h2>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <p>Este fluxo cria a empresa e provisiona o schema isolado.</p>
              <p>Módulos permanecem <span className="text-rose-300 font-medium">desativados por padrão</span> e só podem ser ativados pelo usuário-master.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="px-6 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors">Voltar</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3 text-purple-400 mb-6 border-b border-white/10 pb-4">
              <LayoutGrid className="w-5 h-5" /><h2 className="text-xl font-semibold text-white">Feature Toggling</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {availableModules.map(mod => (
                <div key={mod.id} onClick={() => handleToggleModule(mod.id)} className={`cursor-pointer border p-3 rounded-lg flex items-center gap-3 transition-all ${formData.modules.includes(mod.id) ? "border-purple-500 bg-purple-500/10" : "border-white/5 bg-white/5 hover:border-white/20"}`}>
                  <div className="text-xl">{mod.icon}</div>
                  <div className="flex-1"><p className="text-sm font-medium text-white">{mod.name}</p></div>
                  {formData.modules.includes(mod.id) && <Check className="w-4 h-4 text-purple-400" />}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="px-6 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors">Voltar</button>
              <button onClick={submitProvisioning} disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {progressStatus}</> : "Provisionar Tenant Workspace"}
              </button>
            </div>
            {!!errorDetail && <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{errorDetail}</div>}
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-10 h-10 text-green-400" /></div>
            <h2 className="text-2xl font-bold text-white">Schema Isolado Gerado!</h2>
            <p className="text-gray-400">O cliente {formData.razao_social} está pronto para usar os módulos ativados.</p>
            <button onClick={() => setStep(1)} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">Cadastrar Novo Tenant</button>
          </motion.div>
        );
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Setup Master</h1>
        <p className="text-sm text-gray-500">Provisionamento dinâmico SaaS Nível 2</p>
      </div>
      {/* Progress */}
      <div className="h-1 w-full bg-white/5 rounded-full mb-6 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-purple-500" initial={{ width: 0 }} animate={{ width: `${(step / 3) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>
    </>
  );
}
