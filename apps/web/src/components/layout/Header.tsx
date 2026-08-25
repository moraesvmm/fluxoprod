"use client";

import { Bell, Search, LogOut, Menu } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useUserProfile } from "@/lib/hooks/use-user-profile";

interface HeaderProps {
  onSearchClick?: () => void;
  onMenuClick?: () => void;
}

export function Header({ onSearchClick, onMenuClick }: HeaderProps) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { nome } = useUserProfile();

  const iniciais = (nome || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("") || "\u2014";

  const [currentDate] = useState(() => new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/60 bg-background/90 backdrop-blur-lg px-4 sm:gap-x-6 sm:px-6 lg:px-8 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="-m-2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
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
          className="object-contain hidden sm:block"
          style={{ width: "auto", height: "auto" }}
        />
        <span 
          className="text-xl font-semibold tracking-tight text-foreground ml-1"
          style={{ fontFamily: "var(--font-brand)" }}
        >
          Fluxo
        </span>
      </div>
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <button
          onClick={onSearchClick}
          data-tour="global-search"
          className="relative flex flex-1 items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm text-muted-foreground/60">Buscar transações, produtos ou clientes...</span>
          <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-60">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <div className="hidden lg:block text-sm text-muted-foreground/70 capitalize font-medium min-w-[200px] text-right">
            {currentDate}
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
            className="-m-2.5 p-2.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-all rounded-lg relative"
          >
            <span className="sr-only">Notificações</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-white dark:border-border shadow-sm"></span>
          </button>

          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-border/60"
            aria-hidden="true"
          />

          {/* Perfil */}
          <div className="flex items-center gap-x-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold tracking-wide select-none"
            >
              {iniciais}
            </span>
            <span className="hidden lg:flex lg:items-center">
              <span
                className="text-sm font-medium leading-6 text-foreground"
                aria-hidden="true"
              >
                {nome || "\u2026"}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="-m-2.5 p-2.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-all rounded-lg"
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
