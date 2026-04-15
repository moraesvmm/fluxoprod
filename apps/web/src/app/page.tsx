"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Zap,
  Users,
  Package,
  TrendingUp,
  ChevronRight,
  Menu,
  X,
  Star,
  CheckCircle2,
  Sparkles,
  Globe,
  Clock,
  Layers,
  Moon,
  Sun,
} from "lucide-react";

/* ─────────────────── DATA ─────────────────── */

const features = [
  {
    icon: BarChart3,
    title: "Dashboard Executivo",
    description:
      "Visão 360° do seu negócio com gráficos inteligentes, KPIs em tempo real e insights acionáveis que transformam dados em decisões.",
  },
  {
    icon: Package,
    title: "Gestão de Estoque",
    description:
      "Controle total do inventário com alertas de estoque mínimo, rastreabilidade de lote e integração automática com vendas.",
  },
  {
    icon: Users,
    title: "CRM Integrado",
    description:
      "Pipeline visual de vendas, histórico completo de interações e automações que convertem leads em clientes fiéis.",
  },
  {
    icon: TrendingUp,
    title: "Financeiro Completo",
    description:
      "Contas a pagar e receber, fluxo de caixa projetado, conciliação bancária e DRE automático com precisão fiscal.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-Tenant Seguro",
    description:
      "Arquitetura isolada por empresa com RLS nativo. Seus dados jamais se misturam — segurança de nível enterprise.",
  },
  {
    icon: Zap,
    title: "Módulos Sob Demanda",
    description:
      "Ative apenas o que precisa. Cada módulo é independente e escalável, do financeiro ao ponto de venda.",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime Garantido" },
  { value: "<200ms", label: "Tempo de Resposta" },
  { value: "256-bit", label: "Criptografia" },
  { value: "∞", label: "Escalabilidade" },
];

const benefits = [
  "Setup em menos de 5 minutos",
  "Sem instalação de software",
  "Suporte técnico dedicado",
  "Atualizações automáticas incluídas",
  "Dados hospedados no Brasil",
  "Conformidade com LGPD",
];

/* ─────────────── ANIMATED SECTION ─────────────── */

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────── FLOATING PARTICLES ─────────────── */

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            background: `rgba(139, 92, 246, ${Math.random() * 0.3 + 0.1})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: Math.random() * 4 + 4,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    // Carregar preferência do localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  const navLinks = [
    { href: "#funcionalidades", label: "Funcionalidades" },
    { href: "#vantagens", label: "Vantagens" },
    { href: "#contato", label: "Contato" },
  ];

  return (
    <div className={`relative min-h-screen text-slate-900 overflow-x-hidden ${darkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50'}`}>

      {/* ─────────── HEADER ─────────── */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? darkMode
              ? "bg-[#1a1a1a]/80 backdrop-blur-xl shadow-lg shadow-violet-500/5 border-b border-slate-700/50"
              : "bg-white/80 backdrop-blur-xl shadow-lg shadow-violet-500/5 border-b border-slate-200/50"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo-fluxo.png"
                alt="Fluxo"
                width={36}
                height={36}
                className="object-contain drop-shadow-[0_0_12px_rgba(139,92,246,0.4)] transition-transform group-hover:scale-110"
              />
              <span
                className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 bg-clip-text text-transparent"
              >
                Fluxo
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors relative group ${darkMode ? 'text-slate-300 hover:text-violet-400' : 'text-slate-600 hover:text-violet-600'}`}
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-violet-500 transition-all duration-300 group-hover:w-full rounded-full" />
                </a>
              ))}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-violet-400 hover:bg-slate-800' : 'text-slate-600 hover:text-violet-600 hover:bg-slate-100'}`}
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link
                href="/login"
                className="ml-2 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.03]"
              >
                Acessar Plataforma
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-violet-400 hover:bg-slate-800' : 'text-slate-600 hover:text-violet-600 hover:bg-slate-100'}`}
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-violet-600 transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`md:hidden backdrop-blur-xl border-t ${darkMode ? 'bg-[#1a1a1a]/95 border-slate-700/50' : 'bg-white/95 border-slate-200/50'}`}
            >
              <div className="px-4 py-6 space-y-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block text-base font-medium transition-colors ${darkMode ? 'text-slate-300 hover:text-violet-400' : 'text-slate-700 hover:text-violet-600'}`}
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  href="/login"
                  className="block w-full text-center px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md"
                >
                  Acessar Plataforma
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ─────────── HERO ─────────── */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 overflow-hidden" ref={heroRef}>
        {/* Background Decoration */}
        <div className="absolute inset-0 -z-10">
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[80rem] h-[50rem] bg-gradient-to-b via-transparent to-transparent rounded-full blur-3xl ${darkMode ? 'from-violet-900/40' : 'from-violet-100/60'}`} />
          <div className={`absolute top-20 right-0 w-96 h-96 bg-gradient-to-br rounded-full blur-3xl animate-pulse ${darkMode ? 'from-indigo-900/20 to-purple-900/20' : 'from-indigo-200/40 to-purple-200/40'}`} />
          <div className={`absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr rounded-full blur-3xl ${darkMode ? 'from-violet-900/20 to-fuchsia-900/20' : 'from-violet-200/30 to-fuchsia-200/30'}`} />
          <FloatingParticles />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-sm border text-xs font-semibold mb-8 ${darkMode ? 'bg-violet-900/80 border-violet-700/50 text-violet-300' : 'bg-violet-100/80 border-violet-200/50 text-violet-700'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Plataforma Multi-Tenant SaaS
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]"
            >
              <span className={darkMode ? 'text-slate-100' : 'text-slate-900'}>Gestão empresarial</span>
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                inteligente e unificada.
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className={`mt-6 sm:mt-8 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}
            >
              <strong className={darkMode ? 'text-slate-200' : 'text-slate-800'}>Fluxo</strong> centraliza finanças, estoque, CRM
              e vendas em uma única plataforma segura — para que você foque no que realmente importa:{" "}
              <strong className="text-violet-600">crescer.</strong>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/login"
                className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-base rounded-2xl shadow-xl shadow-violet-500/25 hover:shadow-2xl hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.03]"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#funcionalidades"
                className={`inline-flex items-center gap-2 px-8 py-4 font-semibold text-base rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-[#1a1a1a] text-slate-300 border-slate-700 hover:border-violet-500/60 hover:text-violet-400' : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:text-violet-600'}`}
              >
                Explorar Recursos
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className={`mt-12 flex flex-wrap items-center justify-center gap-6 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {[
                { icon: ShieldCheck, text: "Dados Protegidos" },
                { icon: Globe, text: "100% Cloud" },
                { icon: Clock, text: "Setup em 5 min" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4 text-violet-500" />
                  {text}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─────────── STATS BAR ─────────── */}
      <AnimatedSection className="relative -mt-8 z-10 max-w-5xl mx-auto px-4 sm:px-6">
        <div className={`rounded-2xl border shadow-xl p-6 sm:p-8 ${darkMode ? 'bg-[#1a1a1a] border-slate-700/80 shadow-slate-900/50' : 'bg-white border-slate-200/80 shadow-slate-200/50'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className={`mt-1 text-xs sm:text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─────────── FEATURES ─────────── */}
      <section id="funcionalidades" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16 sm:mb-20">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 ${darkMode ? 'bg-violet-900/80 border-violet-700/50 text-violet-300' : 'bg-violet-100/80 border-violet-200/50 text-violet-700'}`}>
              <Layers className="w-3.5 h-3.5" />
              Módulos
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Tudo que seu negócio precisa,{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                em um só lugar.
              </span>
            </h2>
            <p className={`mt-4 text-lg max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Módulos independentes que trabalham juntos. Ative sob demanda, escale sem limites.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`group relative h-full p-6 sm:p-8 rounded-2xl border shadow-sm hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 ${darkMode ? 'bg-[#1a1a1a] border-slate-700/80 hover:border-violet-500/60' : 'bg-white border-slate-200/80 hover:border-violet-300/60'}`}
                >
                  {/* Gradient glow on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── BENEFITS / VANTAGENS ─────────── */}
      <section id="vantagens" className={`py-24 sm:py-32 relative ${darkMode ? 'bg-gradient-to-b from-[#0a0a0a] to-[#121212]' : 'bg-gradient-to-b from-slate-50 to-white'}`}>
        <div className="absolute inset-0 -z-10">
          <div className={`absolute top-1/2 left-0 w-72 h-72 rounded-full blur-3xl ${darkMode ? 'bg-violet-900/30' : 'bg-violet-100/40'}`} />
          <div className={`absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-100/30'}`} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <AnimatedSection>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 ${darkMode ? 'bg-violet-900/80 border-violet-700/50 text-violet-300' : 'bg-violet-100/80 border-violet-200/50 text-violet-700'}`}
                <Star className="w-3.5 h-3.5" />
                Vantagens
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
                Por que empresas escolhem o{" "}
                <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                  Fluxo?
                </span>
              </h2>
              <p className={`text-lg mb-8 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Desenvolvido com tecnologia de ponta para negócios que levam gestão a sério.
                Sem complexidade desnecessária, sem custos ocultos.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <motion.li
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className={`flex items-center gap-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-violet-500 flex-shrink-0" />
                    <span className="text-sm sm:text-base font-medium">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </AnimatedSection>

            {/* Right — Visual Card */}
            <AnimatedSection delay={0.2}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4 }}
                className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-2xl shadow-violet-500/30 overflow-hidden"
              >
                {/* Decorative orbs */}
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/10 rounded-full blur-xl" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold mb-6">
                    <Zap className="w-3.5 h-3.5" />
                    Enterprise Ready
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mb-4 leading-tight">
                    Infraestrutura que escala com você.
                  </h3>
                  <p className="text-violet-100 text-sm sm:text-base leading-relaxed mb-8">
                    Banco de dados por empresa, cache inteligente, APIs RESTful
                    e deploy contínuo. Tudo em tempo real, sem downtime.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-700 font-bold text-sm rounded-xl hover:bg-violet-50 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    Experimentar Grátis
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─────────── CTA FINAL ─────────── */}
      <section id="contato" className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_50%)]" />
        <FloatingParticles />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6">
              Pronto para transformar{" "}
              <span className="underline decoration-white/30 decoration-4 underline-offset-4">
                sua gestão?
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-violet-100 max-w-2xl mx-auto mb-10 leading-relaxed">
              Comece agora mesmo e descubra por que o Fluxo é a escolha de empresas que
              buscam eficiência real.
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-violet-700 font-bold text-lg rounded-2xl shadow-2xl shadow-black/20 hover:shadow-3xl transition-all duration-300 hover:scale-105"
            >
              Acessar a Plataforma
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1.5" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-fluxo.png"
                alt="Fluxo"
                width={28}
                height={28}
                className="object-contain opacity-80"
              />
              <span className="text-sm font-semibold text-slate-300">
                Fluxo
              </span>
            </div>
            <p className="text-xs text-slate-500 text-center sm:text-right">
              © {new Date().getFullYear()} Fluxo ERP. Todos os direitos reservados.
              <br className="sm:hidden" />{" "}
              <span className="hidden sm:inline">·</span> Plataforma B2B SaaS de Gestão Empresarial.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
