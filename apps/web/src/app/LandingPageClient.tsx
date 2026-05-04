"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  ArrowRight, BarChart3, ShieldCheck, Zap, Users, Package, TrendingUp,
  Menu, X, Star, CheckCircle2, Sparkles, Globe, Clock, Layers, Moon, Sun,
  Play, ChevronRight, Cpu, Lock, Gauge, FileText, Printer, Ban, Trash2, RotateCcw, Banknote
} from "lucide-react";
import dynamic from "next/dynamic";
import { AnimatedSection, FloatingParticles, GradientText, SectionBadge } from "./landing-components";
import { useTheme } from "@/components/providers/ThemeProvider";

const VideoDemo = dynamic(() => import("@/components/VideoDemo"), {
  ssr: false,
  loading: () => <div className="w-full aspect-video rounded-2xl bg-slate-900/10 animate-pulse" />,
});

/* ─── DATA ─── */
const features = [
  { icon: BarChart3, title: "Dashboard & DRE", description: "Visão 360° com gráficos inteligentes e DRE automático por módulo. Insights acionáveis que transformam dados em decisões estratégicas." },
  { icon: Package, title: "Gestão de Estoque", description: "Controle total com alertas de estoque mínimo, rastreabilidade de lote e valorização automática (Custo Médio/PEPS)." },
  { icon: Zap, title: "NFe Nativa Inclusa", description: "Emissão de Notas Fiscais (NF-e 4.00) diretamente pelo sistema com custo zero. Assinatura digital e mTLS nativos de nível enterprise." },
  { icon: Users, title: "CRM & Funil Kanban", description: "Pipeline visual de vendas, histórico completo de interações e automações que convertem leads em clientes fiéis." },
  { icon: TrendingUp, title: "Ordem de Serviço (OS)", description: "Controle de produtividade com timer, laudos técnicos, gestão de peças e histórico completo de manutenção por cliente." },
  { icon: Layers, title: "Gestão de Obras", description: "Acompanhamento de cronograma, custos orçados vs realizados, gestão de recursos e repositório de documentos por projeto." },
];

const stats = [
  { value: "99.9%", label: "Uptime Garantido", icon: Gauge },
  { value: "<200ms", label: "Tempo de Resposta", icon: Zap },
  { value: "256-bit", label: "Criptografia", icon: Lock },
  { value: "∞", label: "Escalabilidade", icon: Cpu },
];

const benefits = [
  "7 dias de teste grátis (sem cartão)",
  "Setup em menos de 5 minutos",
  "Tour interativo e onboarding guiado",
  "Emissão de NFe inclusa (Custo Zero)",
  "Suporte técnico dedicado via WhatsApp",
  "Dados hospedados no Brasil (LGPD)",
  "Atualizações automáticas semanais",
];

const navLinks = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#vantagens", label: "Vantagens" },
  { href: "#contato", label: "Contato" },
];

/* ─── MAIN ─── */
export default function LandingPageClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.97]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const toggleDark = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const d = resolvedTheme === "dark"; // shorthand

  return (
    <div className={`relative min-h-screen overflow-x-hidden transition-colors duration-500 ${d ? "bg-[#060611] text-slate-100" : "bg-[#fafafe] text-slate-900"}`}>

      {/* ═══ HEADER ═══ */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? d
              ? "bg-[#0a0a18]/70 backdrop-blur-2xl border-b border-white/[0.04] shadow-2xl shadow-violet-500/5"
              : "bg-white/70 backdrop-blur-2xl border-b border-slate-200/40 shadow-lg shadow-slate-200/40"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <Image 
                src="/logo-fluxo.png" 
                alt="Fluxo ERP - Sistema de Gestão Empresarial Inteligente" 
                width={38} 
                height={38} 
                priority
                className="object-contain drop-shadow-[0_0_14px_rgba(139,92,246,0.5)] transition-transform group-hover:scale-110" 
              />
              <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-500 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Fluxo</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className={`text-sm font-medium transition-colors relative group ${d ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}>
                  {l.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300 group-hover:w-full rounded-full" />
                </a>
              ))}
              <button onClick={toggleDark} className={`p-2 rounded-xl transition-colors ${d ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`} aria-label="Alternar modo escuro">
                {d ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link href="/login" className="ml-1 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.03]">
                Acessar Plataforma <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={toggleDark} className={`p-2 rounded-xl ${d ? "text-slate-400" : "text-slate-500"}`} aria-label="Modo escuro">
                {d ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2" aria-label="Menu principal">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={`md:hidden border-t ${d ? "bg-[#0a0a18]/95 backdrop-blur-2xl border-white/5" : "bg-white/95 backdrop-blur-2xl border-slate-200/50"}`}>
              <div className="px-5 py-6 space-y-4">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className={`block text-base font-medium ${d ? "text-slate-300" : "text-slate-700"}`}>{l.label}</a>
                ))}
                <Link href="/login" className="block w-full text-center px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md">Acessar Plataforma</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ═══ HERO ═══ */}
      <main>
        <section className="relative pt-36 sm:pt-44 pb-20 sm:pb-28 overflow-hidden" ref={heroRef}>
          {/* BG effects */}
          <div className="absolute inset-0 -z-10">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[90rem] h-[55rem] rounded-full blur-[120px] ${d ? "bg-violet-950/50" : "bg-violet-100/50"}`} />
            <div className={`absolute top-32 right-0 w-[30rem] h-[30rem] rounded-full blur-[100px] animate-pulse ${d ? "bg-indigo-950/30" : "bg-indigo-100/40"}`} />
            <div className={`absolute -bottom-20 left-10 w-80 h-80 rounded-full blur-[90px] ${d ? "bg-purple-950/30" : "bg-purple-100/30"}`} />
            <div className={`absolute inset-0 ${d ? "opacity-[0.03]" : "opacity-[0.04]"}`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0H0v60' fill='none' stroke='%23888' stroke-width='.3'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
            <FloatingParticles />
          </div>

          <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <SectionBadge icon={Sparkles} label="Plataforma ERP Multi-Tenant" dark={d} />
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="mt-8 text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.06]">
                <span className={d ? "text-white" : "text-slate-900"}>Gestão empresarial</span>
                <br />
                <GradientText>inteligente e unificada.</GradientText>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className={`mt-7 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed ${d ? "text-slate-400" : "text-slate-600"}`}>
                <strong className={d ? "text-white" : "text-slate-800"}>Fluxo ERP</strong> centraliza finanças, estoque, CRM e vendas em uma única plataforma segura — para que você foque no que realmente importa: <GradientText className="font-semibold">crescer seu negócio.</GradientText>
              </motion.p>

              {/* CTAs */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login" className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-base rounded-2xl shadow-xl shadow-violet-500/25 hover:shadow-2xl hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.03]">
                  Começar Teste Grátis <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#funcionalidades" className={`inline-flex items-center gap-2 px-8 py-4 font-semibold text-base rounded-2xl border transition-all duration-300 ${d ? "bg-white/[0.03] text-slate-300 border-white/10 hover:border-violet-500/40 hover:bg-white/[0.06]" : "bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:text-violet-700 shadow-sm"}`}>
                  Explorar Recursos ERP
                </a>
              </motion.div>

              {/* Trust row */}
              <div className={`mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium ${d ? "text-slate-500" : "text-slate-400"}`}>
                {[
                  { icon: ShieldCheck, text: "Dados Protegidos (LGPD)" },
                  { icon: Globe, text: "ERP 100% Cloud" },
                  { icon: Sparkles, text: "7 Dias Grátis" },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-violet-500" /> {text}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ═══ VIDEO ═══ */}
        <section className="py-12 sm:py-20" aria-label="Demonstração do Sistema">
          <VideoDemo darkMode={d} />
        </section>

        {/* ═══ STATS ═══ */}
        <AnimatedSection className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
          <div className={`rounded-2xl border p-7 sm:p-10 ${d ? "bg-white/[0.02] border-white/[0.06] shadow-2xl shadow-violet-500/5 backdrop-blur-sm" : "bg-white border-slate-200/80 shadow-xl shadow-slate-200/40"}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {stats.map((s, i) => (
                <motion.div 
                  key={s.label} 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  whileInView={{ opacity: 1, scale: 1 }} 
                  viewport={{ once: true }} 
                  transition={{ delay: i * 0.1 }} 
                  className="text-center"
                >
                  <div className={`mx-auto mb-3 w-10 h-10 rounded-xl flex items-center justify-center ${d ? "bg-violet-500/10" : "bg-violet-50"}`}>
                    <s.icon className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold"><GradientText>{s.value}</GradientText></div>
                  <div className={`mt-1 text-xs sm:text-sm font-medium ${d ? "text-slate-500" : "text-slate-400"}`}>{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ═══ FEATURES ═══ */}
        <section id="funcionalidades" className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16 sm:mb-20">
              <SectionBadge icon={Layers} label="Módulos do Sistema" dark={d} />
              <h2 className={`mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight ${d ? "text-white" : "text-slate-900"}`}>
                Tudo que seu negócio precisa, <GradientText>em um só lugar.</GradientText>
              </h2>
              <p className={`mt-4 text-lg max-w-2xl mx-auto ${d ? "text-slate-400" : "text-slate-500"}`}>Módulos independentes de gestão que trabalham juntos. Ative sob demanda, escale seu ERP sem limites.</p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <AnimatedSection key={f.title} delay={i * 0.07}>
                  <motion.div 
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.3 }}
                    className={`group relative h-full p-7 rounded-2xl border transition-all duration-300 ${d ? "bg-white/[0.02] border-white/[0.06] hover:border-violet-500/30 hover:bg-white/[0.04]" : "bg-white border-slate-200/80 hover:border-violet-300/60 shadow-sm hover:shadow-xl hover:shadow-violet-500/5"}`}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/[0.04] to-indigo-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/35 transition-shadow">
                        <f.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className={`text-lg font-bold mb-2 ${d ? "text-white" : "text-slate-900"}`}>{f.title}</h3>
                      <p className={`text-sm leading-relaxed ${d ? "text-slate-400" : "text-slate-500"}`}>{f.description}</p>
                    </div>
                  </motion.div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ BENEFITS ═══ */}
        <section id="vantagens" className="py-24 sm:py-32 relative">
          <div className="absolute inset-0 -z-10">
            <div className={`absolute top-1/2 left-0 w-80 h-80 rounded-full blur-[100px] ${d ? "bg-violet-950/40" : "bg-violet-100/50"}`} />
            <div className={`absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full blur-[100px] ${d ? "bg-indigo-950/25" : "bg-indigo-100/30"}`} />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <AnimatedSection>
                <SectionBadge icon={Star} label="Diferenciais" dark={d} />
                <h2 className={`mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 ${d ? "text-white" : "text-slate-900"}`}>
                  Por que empresas escolhem o <GradientText>Fluxo ERP?</GradientText>
                </h2>
                <p className={`text-lg mb-8 leading-relaxed ${d ? "text-slate-400" : "text-slate-500"}`}>
                  Desenvolvido com tecnologia de ponta para negócios que levam gestão a sério. Sem complexidade desnecessária, sem custos ocultos na implantação do seu sistema.
                </p>
                <ul className="space-y-4">
                  {benefits.map((b, i) => (
                    <li key={b} className={`flex items-center gap-3 ${d ? "text-slate-300" : "text-slate-700"}`}>
                      <CheckCircle2 className="w-5 h-5 text-violet-500 flex-shrink-0" />
                      <span className="text-sm sm:text-base font-medium">{b}</span>
                    </li>
                  ))}
                </ul>
              </AnimatedSection>

              <AnimatedSection delay={0.15}>
                <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-2xl shadow-violet-500/25 overflow-hidden">
                  <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/10 rounded-full blur-xl" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold mb-6">
                      <Zap className="w-3.5 h-3.5" /> Enterprise Ready
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold mb-4 leading-tight">Infraestrutura que escala com seu negócio.</h3>
                    <p className="text-violet-100 text-sm sm:text-base leading-relaxed mb-8">Banco de dados isolado por empresa, cache inteligente, APIs RESTful e deploy contínuo. Tudo em tempo real, sem downtime para sua gestão.</p>
                    <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-700 font-bold text-sm rounded-xl hover:bg-violet-50 shadow-lg transition-all duration-300 hover:scale-105">
                      Experimentar ERP Grátis <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ═══ CTA FINAL ═══ */}
        <section id="contato" className="py-24 sm:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.12),transparent_50%)]" />
          <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0H0v60' fill='none' stroke='%23fff' stroke-width='.2'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px", opacity: 0.06 }} />
          <FloatingParticles count={4} />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <AnimatedSection>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6">
                Pronto para transformar{" "}
                <span className="underline decoration-white/30 decoration-4 underline-offset-4">sua gestão?</span>
              </h2>
              <p className="text-lg sm:text-xl text-violet-100 max-w-2xl mx-auto mb-10 leading-relaxed">Comece agora mesmo sua jornada com o Fluxo ERP e descubra por que somos a escolha de empresas que buscam eficiência real.</p>
              <Link href="/login" className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-violet-700 font-bold text-lg rounded-2xl shadow-2xl shadow-black/20 transition-all duration-300 hover:scale-105">
                Começar Teste Grátis <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1.5" />
              </Link>
            </AnimatedSection>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className={`border-t ${d ? "border-white/[0.04] bg-[#060611]" : "border-slate-200/60 bg-[#fafafe]"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo-fluxo.png" 
                alt="Fluxo ERP - Logo" 
                width={28} 
                height={28} 
                className="object-contain drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]" 
              />
              <span className="text-sm font-semibold bg-gradient-to-r from-violet-500 to-indigo-400 bg-clip-text text-transparent">Fluxo ERP</span>
            </div>
            <p className={`text-xs ${d ? "text-slate-600" : "text-slate-400"}`}>
              © 2026 Fluxo ERP. Sistema de Gestão Empresarial. Desenvolvido por{" "}
              <a href="https://www.linkedin.com/in/vitor-moraes" target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:text-violet-400 hover:underline transition-colors">Vitor Moraes</a>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
