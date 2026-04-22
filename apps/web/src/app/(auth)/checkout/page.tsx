"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShieldCheck, CreditCard, ArrowRight, Loader2, Building2, UserCircle2, Server, X } from "lucide-react";
import Image from "next/image";
import AppIcon from "../../icon.png";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentGatewayService, PaymentTransactionPayload } from "@/services/PaymentGatewayService";

const PLANOS = [
  { id: "starter", name: "Starter", price: 249, description: "Entrada e Visibilidade", features: ["Dashboard", "CRM", "Catálogo", "Estoque"] },
  { id: "business", name: "Business", price: 499, description: "Operação Central", features: ["Tudo do Starter", "Vendas / PDV", "Financeiro", "RH"] },
  { id: "pro", name: "Pro", price: 849, description: "Vertical Completo", features: ["Tudo do Business", "Ordens de Serviço", "Obras", "Comissões", "Relatórios"] },
];

const MODULOS_AVULSOS = [
  { id: "os", name: "Ordem de Serviço", icon: "🔧", desc: "Acompanhamento completo para serviços pontuais. Cada Ordem de Serviço recebe numeração única, registro do colaborador responsável e controle do histórico de atividades.", features: ["OS numerada com status em tempo real", "Atribuição a colaboradores e técnicos", "Registro completo do histórico do serviço"] },
  { id: "obras", name: "Gestão de Obras", icon: "🏗️", desc: "Controle especializado para projetos de longa duração. O painel integra informações físicas e orçamentárias num fluxo completo.", features: ["Cronograma por etapas e timeline visual", "Financeiro integrado (Previsto vs Real)", "Gestão de recursos, materiais e documentos"] },
  { id: "comissoes", name: "Comissões", icon: "💰", desc: "Gestão transparente das premiações de venda. O cálculo automático é facilmente auditável antes do fechamento de folha de pagamento.", features: ["Cálculo automático integrado ao PDV", "Histórico auditável de bonificações", "Relatórios parametrizados por vendedor"] },
  { id: "relatorios", name: "Relatórios", icon: "📄", desc: "Visão analítica extraída de forma avançada sobre a operação do tenant. Reúne e consolida todos os dados estratégicos das vendas e finanças em inteligência acionável.", features: ["Consolidação de dados cruciais da operação", "Visão estratégica macro para diretores", "Agiliza o controle para a contabilidade"] },
  { id: "rh", name: "RH & Pessoal", icon: "👥", desc: "Módulo administrativo da equipe de retaguarda e atendimento. Organiza cargos e libera comissionamentos ou associações em Ordens de Serviço.", features: ["Gestão global de colaboradores ativos/desligados", "Cadastro e atribuição de cargos funcionais", "Abre caminho para cálculo robusto de comissões"] },
];

const PRECO_MODULO_AVULSO = 79.9;

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccess(true);
    }
  }, [searchParams]);

  // Modais Form/Alert
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Esc listener para Modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    if (activeModal) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeModal]);

  // Seleções do Resumo/Checkout
  const [selectedPlan, setSelectedPlan] = useState(PLANOS[1]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  // Dados do Cliente
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [password, setPassword] = useState("");

  // Dados da Empresa
  const [companyName, setCompanyName] = useState("");
  const [companyDocument, setCompanyDocument] = useState(""); 
  const [companySize, setCompanySize] = useState("MPE");
  const [companySegment, setCompanySegment] = useState("Varejo");

  const totalValue = useMemo(() => {
    return selectedPlan.price + (selectedModules.length * PRECO_MODULO_AVULSO);
  }, [selectedPlan, selectedModules]);

  const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const documentoNormalizado = companyDocument.replace(/\D/g, "");
  const passwordValida = password.trim().length >= 8;

  const toggleModule = (id: string) => {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleCheckout = async () => {
    if (!customerName.trim() || !companyName.trim()) {
      alert("Preencha seu nome e os dados da empresa antes de continuar.");
      return;
    }

    if (!emailValido(customerEmail)) {
      alert("Informe um e-mail válido.");
      return;
    }

    if (!passwordValida) {
      alert("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (documentoNormalizado.length < 11) {
      alert("Informe um CNPJ ou documento válido.");
      return;
    }

    setLoading(true);
    try {
      const payload: PaymentTransactionPayload = {
        customerName, customerEmail, planName: selectedPlan.name, amount: totalValue,
        modules: selectedModules, companyName, companyDocument, companySize, companySegment,
        metadata: { password }
      };

      const response = await PaymentGatewayService.createTransaction(payload);

      if (response.success && response.redirectUrl) {
        // No cenário real, redirecionamos para o checkout do gateway (Asaas Invoice)
        window.location.href = response.redirectUrl;
      } else {
        alert("Erro no checkout: " + (response.error || "Falha ao gerar link de pagamento"));
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Houve um problema ao processar seu pagamento. Por favor, tente novamente.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#121216] border border-white/5 rounded-2xl shadow-2xl p-10 max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Pagamento Aprovado!</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Recebemos seu pedido com sucesso. A infraestrutura segura da sua operação já está sendo <strong>provisionada automaticamente</strong>.
            </p>
            <div className="bg-[#1e1e24] rounded-lg p-4 text-left border border-white/5 mb-8">
               <p className="text-sm text-gray-400 mb-1">Acesso à Plataforma:</p>
               <p className="font-medium text-indigo-400 truncate">{customerEmail}</p>
            </div>
            <button 
              onClick={() => router.push("/login")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 rounded-xl transition-colors"
            >
               Ir para o Login
            </button>
         </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-32 relative">
       {/* HEADER AMBIENTE DE TRANSAÇÃO */}
       <header className="border-b border-white/5 bg-[#121216]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between relative">

             {/* Esquerda - Link para Login */}
             <div className="flex-1 hidden sm:block">
               <a href="/login" className="text-xs font-medium text-gray-500 hover:text-white transition-colors">
                 Já tem conta? Entrar
               </a>
             </div>

             {/* Centro Absoluto - Tipografia/Logo */}
             <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
               <div className="w-8 h-8 flex justify-center items-center">
                 <Image src={AppIcon} alt="Fluxo Logo" width={32} height={32} className="object-contain" />
               </div>
               <h1 className="font-semibold text-xl leading-tight bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 bg-clip-text text-transparent truncate" style={{ fontFamily: "var(--font-meow), cursive", fontSize: "1.7rem" }}>
                 Fluxo ERP
               </h1>
             </div>

             {/* Direita - Hierarquia Visual Corrigida */}
             <div className="flex-1 flex sm:hidden"></div>
             <div className="hidden sm:flex items-center justify-end gap-6 text-sm font-medium text-gray-400 flex-1">
                <span className={step >= 1 ? "text-indigo-400" : ""}>1. Plano</span>
                <span className={step >= 2 ? "text-indigo-400" : ""}>2. Cadastro</span>
                <span className={step >= 3 ? "text-indigo-400" : ""}>3. Pagamento</span>
                <span className="flex items-center justify-center text-emerald-500 hover:text-emerald-400 transition-colors" title="Ambiente Seguro">
                  <ShieldCheck className="w-[18px] h-[18px]"/>
                </span>
             </div>
          </div>
       </header>

       <main className="max-w-5xl mx-auto px-6 pt-12">
          
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
               
               <div className="text-center max-w-2xl mx-auto">
                 <h2 className="text-3xl md:text-4xl font-bold mb-4">Escolha o plano ideal para sua operação</h2>
                 <p className="text-gray-400 text-lg">Mude de plano ou adicione módulos sob demanda. Sem carência.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PLANOS.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPlan(p)}
                      className={`relative cursor-pointer rounded-2xl p-6 transition-all duration-300 border ${
                        selectedPlan.id === p.id 
                        ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500" 
                        : "bg-[#121216] border-white/5 hover:border-white/20"
                      }`}
                    >
                       {selectedPlan.id === p.id && (
                         <div className="absolute top-4 right-4 bg-indigo-500 rounded-full p-1"><Check className="w-4 h-4 text-white"/></div>
                       )}
                       <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                       <p className="text-gray-400 text-sm mb-6">{p.description}</p>
                       <div className="flex items-baseline gap-1 mb-8">
                         <span className="text-sm text-gray-500">R$</span>
                         <span className="text-4xl font-black tracking-tight">{p.price}</span>
                         <span className="text-sm text-gray-500">/mês</span>
                       </div>
                       <div className="space-y-3">
                         {p.features.map((f, i) => (
                           <div key={i} className="flex items-start gap-2">
                             <Check className="w-5 h-5 text-indigo-400 shrink-0"/>
                             <span className="text-sm text-gray-300">{f}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  ))}
               </div>

               <div className="pt-8 border-t border-white/5">
                 <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                   <Server className="w-5 h-5 text-indigo-400"/> Adicione Extensões Avulsas
                 </h3>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {MODULOS_AVULSOS.map(m => (
                      <div 
                        key={m.id}
                        onClick={() => setActiveModal(m.id)}
                        className={`cursor-pointer rounded-xl p-4 border transition-all ${
                          selectedModules.includes(m.id) 
                          ? "bg-purple-500/10 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/50"
                          : "bg-[#121216] border-white/5 hover:bg-white/10 text-gray-400"
                        }`}
                      >
                         <div className="text-2xl mb-2">{m.icon}</div>
                         <div className="text-sm font-semibold mb-1 text-white">{m.name}</div>
                         <div className="text-xs font-mono">
                            {selectedModules.includes(m.id) ? "Incluso" : `+R$ ${PRECO_MODULO_AVULSO.toFixed(2)}/mês`}
                         </div>
                      </div>
                    ))}
                 </div>
               </div>

               <div className="flex justify-end">
                  <button onClick={() => setStep(2)} className="bg-white text-black hover:bg-gray-200 font-medium py-4 px-8 rounded-xl flex items-center gap-2 group transition-all">
                     Continuar para Cadastro <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                  </button>
               </div>
            </motion.div>
          )}

          {step === 2 && (
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-8">
                <div className="bg-[#121216] border border-white/5 rounded-2xl p-8 shadow-2xl">
                   <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                     <UserCircle2 className="w-6 h-6 text-indigo-400"/> Conta Administrador
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                     <div>
                       <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Seu Nome</label>
                       <input value={customerName} onChange={e=>setCustomerName(e.target.value)} className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none hover:border-white/20 transition-colors" placeholder="João da Silva" />
                     </div>
                     <div>
                       <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">E-mail Profissional</label>
                       <input value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none hover:border-white/20 transition-colors" placeholder="joao@suaempresa.com" />
                     </div>
                     <div className="md:col-span-2">
                       <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Definir Senha do ERP</label>
                       <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none hover:border-white/20 transition-colors" placeholder="••••••••" />
                       <p className="mt-2 text-xs text-gray-500">Minimo de 8 caracteres. A senha nao e enviada ao gateway de pagamento.</p>
                     </div>
                   </div>

                   <hr className="border-white/5 mb-8"/>

                   <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                     <Building2 className="w-6 h-6 text-purple-400"/> Dados da Operação
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="md:col-span-2">
                       <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Razão Social / Nome Fantasia</label>
                       <input value={companyName} onChange={e=>setCompanyName(e.target.value)} className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-white focus:ring-1 focus:ring-purple-500 outline-none hover:border-white/20 transition-colors" placeholder="Sua Empresa Ltda" />
                     </div>
                     <div>
                       <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">CNPJ / Documento</label>
                       <input value={companyDocument} onChange={e=>setCompanyDocument(e.target.value)} className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-white focus:ring-1 focus:ring-purple-500 outline-none hover:border-white/20 transition-colors" placeholder="00.000.000/0001-00" />
                     </div>
                     <div>
                       <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Porte</label>
                       <select value={companySize} onChange={e=>setCompanySize(e.target.value)} className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-white hover:border-white/20 transition-colors outline-none cursor-pointer">
                         <option>MPE</option>
                         <option>Pequena</option>
                         <option>Média</option>
                         <option>Grande</option>
                       </select>
                     </div>
                   </div>
                </div>

                <div className="flex justify-between items-center bg-[#121216] border border-white/5 p-4 rounded-2xl">
                   <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white px-4 py-2 font-medium transition-colors">Voltar</button>
                   <button 
                      onClick={() => setStep(3)} 
                       disabled={!customerName || !passwordValida || !customerEmail || !companyName || documentoNormalizado.length < 11}
                      className="bg-white text-black disabled:opacity-50 hover:bg-gray-200 font-medium py-3 px-8 rounded-xl flex items-center gap-2 group transition-all"
                   >
                     Ir para Pagamento <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
             </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-6">
               <div className="bg-[#121216] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <CreditCard className="w-48 h-48"/>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Detalhes do Pagamento</h2>
                  <p className="text-gray-400 mb-8 max-w-sm">Seu pagamento será processado com segurança via <strong>Asaas Gateway</strong>.</p>

                  <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-6 mb-8 relative z-10">
                     <div className="flex justify-between items-center mb-4">
                       <span className="text-gray-400">Titular</span>
                       <span className="font-medium text-white">{customerName}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                       <span className="text-gray-400">E-mail</span>
                       <span className="font-medium text-white">{customerEmail}</span>
                     </div>
                     <div className="flex justify-between items-end">
                       <span className="text-gray-400 font-medium">TOTAL A PAGAR</span>
                       <div className="text-right">
                         <span className="text-xs text-indigo-400 font-bold tracking-widest mr-2 uppercase">BRL</span>
                         <span className="text-4xl font-black">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </div>
                     </div>
                  </div>

                  <button 
                    onClick={handleCheckout} 
                    disabled={loading}
                    className="relative z-10 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/20 font-bold py-5 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-lg"
                  >
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin"/> Mágica Acontecendo...</> : "Confirmar e Assinar"}
                  </button>
               </div>
               
               <div className="text-center">
                 <button onClick={() => setStep(2)} className="text-gray-500 hover:text-white transition-colors text-sm font-medium">Cancelar e Voltar</button>
               </div>
            </motion.div>
          )}

       </main>

       {/* STICKY SUMMARY BOTTOM BAR */}
       <AnimatePresence>
         {(step === 1 || step === 2) && (
           <motion.div 
             initial={{ y: 200 }} 
             animate={{ y: 0 }} 
             exit={{ y: 200 }}
             className="fixed bottom-0 left-0 right-0 bg-[#121216]/90 backdrop-blur-xl border-t border-white/10 p-4 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
           >
              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex flex-col">
                   <div className="text-sm font-semibold text-gray-400 mb-1 flex items-center gap-2">
                     <span className="bg-indigo-500/20 text-indigo-400 py-1 px-3 rounded-full text-xs">Plano {selectedPlan.name}</span>
                     {selectedModules.length > 0 && <span className="bg-purple-500/20 text-purple-400 py-1 px-3 rounded-full text-xs">+{selectedModules.length} Extras</span>}
                   </div>
                   <div className="flex items-baseline gap-2">
                     <span className="text-white text-3xl font-black font-mono">R$ {totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                     <span className="text-gray-500 text-sm">/mês • Recorrente</span>
                   </div>
                 </div>
                 
                 {step === 1 && (
                   <button onClick={() => setStep(2)} className="w-full sm:w-auto bg-white text-black hover:bg-gray-200 font-bold py-3 px-8 rounded-lg flex items-center justify-center gap-2 transition-colors">
                     Ir para Cadastro <ArrowRight className="w-4 h-4"/>
                   </button>
                 )}
                 {step === 2 && (
                   <button 
                     onClick={() => setStep(3)} 
                      disabled={!customerName || !passwordValida || !customerEmail || !companyName || documentoNormalizado.length < 11}
                     className="w-full sm:w-auto bg-emerald-500 text-white disabled:opacity-50 disabled:bg-gray-600 font-bold py-3 px-8 rounded-lg flex items-center justify-center gap-2 transition-colors"
                   >
                     Revisar e Pagar
                   </button>
                 )}
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* MODAL INFORMATIVO DE MÓDULOS */}
       <AnimatePresence>
         {activeModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             {/* Overlay */}
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setActiveModal(null)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
             />
             
             {/* Container Modal */}
             <motion.div 
               role="dialog" 
               aria-labelledby="modal-title"
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-lg bg-[#121216] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col mt-auto sm:mt-0 max-h-[90vh]"
             >
               {(() => {
                  const mod = MODULOS_AVULSOS.find(m => m.id === activeModal);
                  if (!mod) return null;
                  const isSelected = selectedModules.includes(mod.id);
                  
                  return (
                    <>
                       {/* Header do Modal */}
                       <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl" aria-hidden="true">{mod.icon}</div>
                            <h2 id="modal-title" className="text-xl font-bold text-white">{mod.name}</h2>
                          </div>
                          <button 
                            onClick={() => setActiveModal(null)} 
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
                            aria-label="Fechar modal"
                          >
                            <X className="w-5 h-5"/>
                          </button>
                       </div>
                       
                       {/* Corpo do Modal (com Scroll se necessário) */}
                       <div className="p-6 overflow-y-auto custom-scrollbar">
                          <p className="text-gray-300 mb-6 leading-relaxed text-sm md:text-base">
                            {mod.desc}
                          </p>
                          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Funcionalidades incluídas:
                          </h3>
                          <ul className="space-y-3 mb-2" aria-label="Lista de funcionalidades">
                            {mod.features.map((f, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">
                                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                       </div>
                       
                       {/* Footer do Modal */}
                       <div className="p-6 border-t border-white/5 bg-[#0a0a0c] flex flex-col sm:flex-row items-center gap-4 justify-between shrink-0">
                          <div className="flex items-baseline gap-1 w-full sm:w-auto justify-center sm:justify-start">
                            <span className="text-sm text-gray-500">R$</span>
                            <span className="text-2xl font-bold text-white mb-2 sm:mb-0">
                               {PRECO_MODULO_AVULSO.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </span>
                            <span className="text-xs text-gray-500">/mês</span>
                          </div>
                          
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button 
                              onClick={() => setActiveModal(null)} 
                              className="hidden sm:block px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => {
                                toggleModule(mod.id);
                                setActiveModal(null);
                              }}
                              autoFocus
                              className={`w-full sm:w-auto px-6 py-3 sm:py-2.5 text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0c] ${
                                isSelected 
                                ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 shadow-rose-500/10 focus:ring-rose-500" 
                                : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 focus:ring-purple-500"
                              }`}
                            >
                              {isSelected ? "Remover Módulo" : "Adicionar Módulo"}
                            </button>
                          </div>
                       </div>
                    </>
                  );
               })()}
             </motion.div>
           </div>
         )}
       </AnimatePresence>

       <style dangerouslySetInnerHTML={{__html: `
         .custom-scrollbar::-webkit-scrollbar { width: 4px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
       `}} />
    </div>
  );
}
