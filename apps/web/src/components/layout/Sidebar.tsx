"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wallet,
  Settings,
  Tags,
  Briefcase,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const navigation = [
  { name: "Dashboard", href: "/tenant/dashboard", icon: LayoutDashboard },
  { name: "Vendas", href: "/tenant/vendas", icon: ShoppingCart },
  { name: "Estoque", href: "/tenant/estoque", icon: Package },
  { name: "Clientes & CRM", href: "/tenant/crm", icon: Users },
  { name: "Financeiro", href: "/tenant/financeiro", icon: Wallet },
  { name: "Catálogo", href: "/tenant/catalogo", icon: Tags },
  { name: "RH & Equipe", href: "/tenant/rh", icon: Briefcase },
  { name: "Configurações", href: "/tenant/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col overflow-y-auto bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-all duration-300 shadow-xl">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary w-8 h-8 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg leading-none">F</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            FLUXO
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col px-4 py-6">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={twMerge(
                    clsx(
                      "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-indigo-500/20"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300">
            TJ
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Empresa Demo</span>
            <span className="text-xs text-slate-400">Plano Premium</span>
          </div>
        </div>
      </div>
    </div>
  );
}
