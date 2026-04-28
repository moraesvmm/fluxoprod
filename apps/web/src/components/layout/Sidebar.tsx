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

import { useTheme } from "@/components/providers/ThemeProvider";

export function Sidebar() {
  const pathname = usePathname();
  const { data, isLoading } = useSidebarData();
  const { resolvedTheme } = useTheme();

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
      className="flex h-full w-64 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition-all duration-300"
    >
      <div className="flex h-20 shrink-0 items-center border-b border-sidebar-border/40 px-6">
        <Link href="/tenant/dashboard" className="group flex items-center gap-3">
          <div className="relative flex items-center justify-center transition-all duration-300 group-hover:scale-105">
            <Image
              src="/logo-fluxo.png"
              alt="Fluxo Logo"
              width={40}
              height={40}
              priority
              style={{ width: "auto" }}
              className="relative z-10 object-contain drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]"
            />
          </div>
          <div className="flex flex-col">
            <span
              className="text-2xl font-bold tracking-tight text-sidebar-foreground transition-colors duration-300 group-hover:text-primary"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              Fluxo
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col px-4 py-6">
        <div className="mb-4 px-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Módulos</span>
        </div>
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          {activeKeys !== null && visibleNavigation.length === 0 && !isLoading && (
            <li className="px-3 py-3 text-sm text-muted-foreground/60 italic">
              Nenhum módulo ativo.
            </li>
          )}
          {isLoading && (
            <li className="flex flex-col gap-y-3 px-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-x-3">
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-sidebar-accent/30"></div>
                  <div className="h-4 w-24 animate-pulse rounded bg-sidebar-accent/30"></div>
                </div>
              ))}
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
                      "group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 translate-x-1"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
                    )
                  )}
                >
                  <item.icon
                    className={twMerge(
                      clsx(
                        "h-5 w-5 shrink-0 transition-all duration-200",
                        isActive
                          ? "text-primary-foreground scale-110"
                          : "text-muted-foreground/60 group-hover:text-sidebar-foreground group-hover:scale-110"
                      )
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
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
            <span className="truncate text-[13px] font-semibold text-sidebar-foreground">
              {empresaNome || "Carregando..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
