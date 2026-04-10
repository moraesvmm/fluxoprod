"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wallet,
  Settings,
  Tags,
  Briefcase,
  FileText,
  Wrench,
  Building2,
  DollarSign,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createClient } from "@/utils/supabase/client";
import { Meow_Script } from "next/font/google";

const meowScript = Meow_Script({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-meow",
});

const navigation = [
  { key: "dashboard", name: "Dashboard", href: "/tenant/dashboard", icon: LayoutDashboard },
  { key: "vendas", name: "Vendas", href: "/tenant/vendas", icon: ShoppingCart },
  { key: "estoque", name: "Estoque", href: "/tenant/estoque", icon: Package },
  { key: "crm", name: "Clientes & CRM", href: "/tenant/crm", icon: Users },
  { key: "financeiro", name: "Financeiro", href: "/tenant/financeiro", icon: Wallet },
  { key: "catalogo", name: "Catálogo", href: "/tenant/catalogo", icon: Tags },
  { key: "rh", name: "RH & Equipe", href: "/tenant/rh", icon: Briefcase },
  { key: "os", name: "Ordem de Serviço", href: "/tenant/os", icon: Wrench },
  { key: "obras", name: "Obras", href: "/tenant/obras", icon: Building2 },
  { key: "comissoes", name: "Comissões", href: "/tenant/comissoes", icon: DollarSign },
  { key: "relatorios", name: "Relatórios", href: "/tenant/relatorios", icon: FileText },
  { key: "configuracoes", name: "Configurações", href: "/tenant/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [activeKeys, setActiveKeys] = useState<string[] | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string>("");
  const [empresaIniciais, setEmpresaIniciais] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        if (!cancelled) setActiveKeys([]);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role, empresa_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile || profile.role === "master" || !profile.empresa_id) {
        if (!cancelled) setActiveKeys([]);
        return;
      }

      // Carregar nome da empresa
      const { data: empresa } = await supabase
        .from("empresas")
        .select("razao_social")
        .eq("id", profile.empresa_id)
        .maybeSingle();

      if (!cancelled && empresa) {
        const nome = empresa.razao_social || "Empresa";
        setEmpresaNome(nome);
        // Gerar iniciais: pegar primeira letra de cada palavra (máx 2)
        const palavras = nome.split(/\s+/).filter(Boolean);
        const iniciais = palavras.length >= 2
          ? (palavras[0][0] + palavras[1][0]).toUpperCase()
          : nome.substring(0, 2).toUpperCase();
        setEmpresaIniciais(iniciais);
      }

      const { data: mods } = await supabase
        .from("v_empresa_modulos")
        .select("modulo_key, ativo")
        .eq("empresa_id", profile.empresa_id);

      if (!cancelled) setActiveKeys((mods || []).filter((m: any) => m.ativo).map((m: any) => m.modulo_key));
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleNavigation = useMemo(() => {
    if (activeKeys === null) return [];
    return navigation.filter((n) => activeKeys.includes(n.key));
  }, [activeKeys]);

  return (
    <div className="flex h-full w-64 flex-col overflow-y-auto border-r border-sidebar-border/60 text-sidebar-foreground transition-all duration-300 shadow-lg" style={{ background: 'linear-gradient(180deg, #0f0a1e 0%, #1a1145 40%, #0d1b2a 100%)' }}>
      {/* Logo — Premium UI */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border/40">
        <Link href="/tenant/dashboard" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center transition-all duration-300 group-hover:scale-105 relative">
            <img 
              src="/logo-fluxo.png" 
              alt="Fluxo Logo" 
              className="w-11 h-11 object-contain drop-shadow-[0_0_10px_rgba(192,132,252,0.4)] relative z-10" 
            />
          </div>
          <div className="flex flex-col mt-1">
            <span 
              className={`${meowScript.className} text-3xl font-normal text-white leading-none tracking-normal`}
              style={{ textShadow: "0 2px 8px rgba(192, 132, 252, 0.35)" }}
            >
              Fluxo
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col px-3 py-5">
        <div className="mb-2 px-3">
          <span className="text-[10px] font-semibold text-slate-500/60 uppercase tracking-[0.12em]">Módulos</span>
        </div>
        <ul role="list" className="flex flex-1 flex-col gap-y-0.5">
          {activeKeys !== null && visibleNavigation.length === 0 && (
            <li className="px-3 py-3 text-sm text-slate-400/80">
              Nenhum módulo ativo. Solicite ativação ao administrador do sistema.
            </li>
          )}
          {visibleNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={twMerge(
                    clsx(
                      "group flex gap-x-3 rounded-lg px-3 py-2 text-[13px] font-medium leading-6 transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )
                  )}
                >
                  <item.icon
                    className={twMerge(
                      clsx(
                        "h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-sidebar-primary-foreground" : "text-slate-400/80 group-hover:text-sidebar-accent-foreground"
                      )
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tenant Indicator — dados reais */}
      <div className="p-4 border-t border-sidebar-border/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white shadow-sm ring-1 ring-white/10">
            {empresaIniciais || "—"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[13px] font-semibold text-white/90 truncate">
              {empresaNome || "Carregando..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
