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
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createClient } from "@/utils/supabase/client";

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

      const { data: mods } = await supabase
        .from("empresa_modulos")
        .select("modulo_key, ativo")
        .eq("empresa_id", profile.empresa_id)
        .eq("ativo", true)
        .order("modulo_key");

      if (!cancelled) setActiveKeys((mods || []).map((m: any) => m.modulo_key));
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
    <div className="flex h-full w-64 flex-col overflow-y-auto bg-sidebar border-r border-sidebar-border/60 text-sidebar-foreground transition-all duration-300 shadow-lg">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border/60">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-sidebar-primary to-indigo-500 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-white font-bold text-lg leading-none">F</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            FLUXO
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col px-3 py-6">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          {activeKeys !== null && visibleNavigation.length === 0 && (
            <li className="px-3 py-3 text-sm text-slate-400/80">
              Nenhum módulo ativo. Solicite ativação ao administrador do sistema.
            </li>
          )}
          {visibleNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={twMerge(
                    clsx(
                      "group flex gap-x-3 rounded-lg px-3 py-2.5 text-sm font-semibold leading-6 transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/25"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )
                  )}
                >
                  <item.icon
                    className={twMerge(
                      clsx(
                        "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-sidebar-primary-foreground" : "text-slate-400 group-hover:text-sidebar-accent-foreground"
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
      {/* Tenant Indicator */}
      <div className="p-4 border-t border-sidebar-border/60 bg-sidebar-accent/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-sidebar-border">
            TJ
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Empresa Demo</span>
            <span className="text-xs text-slate-400/80">Plano Premium</span>
          </div>
        </div>
      </div>
    </div>
  );
}
