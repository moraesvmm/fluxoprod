"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useMemo } from "react";
import { useSidebarData } from "@/lib/hooks/use-sidebar-data";
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
  ShieldAlert,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const navigation = [
  { key: "dashboard", name: "Dashboard", href: "/tenant/dashboard", icon: LayoutDashboard },
  { key: "vendas", name: "Vendas", href: "/tenant/vendas", icon: ShoppingCart },
  { key: "estoque", name: "Estoque", href: "/tenant/estoque", icon: Package },
  { key: "crm", name: "Clientes & CRM", href: "/tenant/crm", icon: Users },
  { key: "financeiro", name: "Financeiro", href: "/tenant/financeiro", icon: Wallet },
  { key: "catalogo", name: "Catalogo", href: "/tenant/catalogo", icon: Tags },
  { key: "rh", name: "RH & Equipe", href: "/tenant/rh", icon: Briefcase },
  { key: "os", name: "Ordem de Servico", href: "/tenant/os", icon: Wrench },
  { key: "obras", name: "Obras", href: "/tenant/obras", icon: Building2 },
  { key: "comissoes", name: "Comissoes", href: "/tenant/comissoes", icon: DollarSign },
  { key: "relatorios", name: "Relatorios", href: "/tenant/relatorios", icon: FileText },
  { key: "configuracoes", name: "Configuracoes", href: "/tenant/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data, isLoading } = useSidebarData();

  const activeKeys = data?.activeKeys ?? null;
  const empresaNome = data?.empresaNome ?? "";
  const empresaIniciais = data?.empresaIniciais ?? "";

  const visibleNavigation = useMemo(() => {
    if (activeKeys === null) return [];
    const base = navigation.filter((n) => activeKeys.includes(n.key));
    
    // Injetar link mestre se o usuário for master
    if (data?.role === "master") {
      base.unshift({ 
        key: "mestre", 
        name: "Setup Master", 
        href: "/mestre", 
        icon: ShieldAlert 
      });
    }
    
    return base;
  }, [activeKeys, data?.role]);

  return (
    <div
      className="flex h-full w-64 flex-col overflow-y-auto border-r border-sidebar-border/60 text-sidebar-foreground shadow-lg transition-all duration-300"
      style={{ background: "linear-gradient(180deg, #0f0a1e 0%, #1a1145 40%, #0d1b2a 100%)" }}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border/40 px-6">
        <Link href="/tenant/dashboard" className="group flex items-center gap-3">
          <div className="relative flex items-center justify-center transition-all duration-300 group-hover:scale-105">
            <Image
              src="/logo-fluxo.png"
              alt="Fluxo Logo"
              width={44}
              height={44}
              priority
              className="relative z-10 object-contain drop-shadow-[0_0_10px_rgba(192,132,252,0.4)]"
            />
          </div>
          <div className="mt-1 flex flex-col">
            <span
              className="text-3xl font-normal leading-none tracking-normal text-white"
              style={{ fontFamily: "var(--font-brand)", textShadow: "0 2px 8px rgba(192, 132, 252, 0.35)" }}
            >
              Fluxo
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col px-3 py-5">
        <div className="mb-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500/60">Modulos</span>
        </div>
        <ul role="list" className="flex flex-1 flex-col gap-y-0.5">
          {activeKeys !== null && visibleNavigation.length === 0 && !isLoading && (
            <li className="px-3 py-3 text-sm text-slate-400/80">
              Nenhum modulo ativo. Solicite ativacao ao administrador do sistema.
            </li>
          )}
          {isLoading && (
            <li className="flex items-center gap-x-3 px-3 py-3">
              <div className="h-4 w-4 animate-pulse rounded bg-slate-800"></div>
              <div className="h-4 w-24 animate-pulse rounded bg-slate-800"></div>
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
                        isActive
                          ? "text-sidebar-primary-foreground"
                          : "text-slate-400/80 group-hover:text-sidebar-accent-foreground"
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

      <div className="border-t border-sidebar-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 text-[11px] font-bold text-white shadow-sm ring-1 ring-white/10">
            {empresaIniciais || "-"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold text-white/90">
              {empresaNome || "Carregando..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
