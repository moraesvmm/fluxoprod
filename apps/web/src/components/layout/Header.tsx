"use client";

import { Bell, Search, LogOut, Menu } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onSearchClick?: () => void;
  onMenuClick?: () => void;
}

export function Header({ onSearchClick, onMenuClick }: HeaderProps) {
  const supabase = createClient();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/60 bg-background/90 backdrop-blur-lg px-4 sm:gap-x-6 sm:px-6 lg:px-8 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="-m-2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
        >
          <span className="sr-only">Abrir menu principal</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <Image 
          src="/logo-fluxo.png" 
          alt="Fluxo Logo" 
          width={32}
          height={32}
          priority
          className="object-contain drop-shadow-[0_0_10px_rgba(124,58,237,0.4)] hidden sm:block"
          style={{ width: "auto", height: "auto" }}
        />
        <span 
          className="text-xl font-bold tracking-tight text-foreground ml-1"
          style={{ fontFamily: "var(--font-brand)" }}
        >
          Fluxo
        </span>
      </div>
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <button
          onClick={onSearchClick}
          data-tour="global-search"
          className="relative flex flex-1 items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm text-muted-foreground/60">Buscar transações, produtos ou clientes...</span>
          <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-60">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <div className="hidden lg:block text-sm text-muted-foreground/70 capitalize font-medium min-w-[200px] text-right">
            {mounted ? currentDate : ""}
          </div>
          
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border/60" aria-hidden="true" />
          
          <ThemeToggle />

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-border/60"
            aria-hidden="true"
          />

          <button
            type="button"
            className="-m-2.5 p-2.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-all rounded-lg relative"
          >
            <span className="sr-only">Notificações</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-white dark:border-slate-900 shadow-sm"></span>
          </button>

          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-border/60"
            aria-hidden="true"
          />

          {/* Profile Dropdown (Simulation) */}
          <div className="flex items-center gap-x-4">
            <img
              className="h-9 w-9 rounded-full bg-muted object-cover border-2 border-border/40 shadow-md ring-2 ring-white dark:ring-slate-800"
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Admin&backgroundColor=f8fafc"
              alt="Avatar"
            />
            <span className="hidden lg:flex lg:items-center">
              <span
                className="text-sm font-semibold leading-6 text-foreground"
                aria-hidden="true"
              >
                Admin User
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="-m-2.5 p-2.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-all rounded-lg"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
