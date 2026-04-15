"use client";

import { Bell, Search, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onSearchClick?: () => void;
}

export function Header({ onSearchClick }: HeaderProps) {
  const supabase = createClient();
  const router = useRouter();

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
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/60 bg-white/90 backdrop-blur-lg px-4 sm:gap-x-6 sm:px-6 lg:px-8 shadow-sm">
      <div className="flex items-center gap-2 lg:hidden">
        <img 
          src="/logo-fluxo.png?v=2" 
          alt="Fluxo Logo" 
          className="h-8 w-8 object-contain drop-shadow-sm" 
        />
        <span 
          className="text-2xl font-normal text-slate-800"
          style={{ fontFamily: "var(--font-monsieur), cursive" }}
        >
          Fluxo
        </span>
      </div>
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <button
          onClick={onSearchClick}
          className="relative flex flex-1 items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm text-muted-foreground/60">Buscar transações, produtos ou clientes...</span>
          <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-60">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <div className="hidden lg:block text-sm text-muted-foreground/70 capitalize font-medium">
            {currentDate}
          </div>
          
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
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-white shadow-sm"></span>
          </button>

          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-border/60"
            aria-hidden="true"
          />

          {/* Profile Dropdown (Simulation) */}
          <div className="flex items-center gap-x-4">
            <img
              className="h-9 w-9 rounded-full bg-muted object-cover border-2 border-border/40 shadow-md ring-2 ring-white"
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
