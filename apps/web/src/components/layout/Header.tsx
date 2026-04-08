"use client";

import { Bell, Search } from "lucide-react";

export function Header() {
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/60 bg-white/90 backdrop-blur-lg px-4 sm:gap-x-6 sm:px-6 lg:px-8 shadow-sm">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Buscar
          </label>
          <Search
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-muted-foreground/60 ml-2"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-10 pr-0 text-foreground bg-transparent placeholder:text-muted-foreground/60 focus:ring-0 sm:text-sm focus:outline-none transition-colors"
            placeholder="Buscar transações, produtos ou clientes..."
            type="search"
            name="search"
          />
        </form>
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
          </div>
        </div>
      </div>
    </header>
  );
}
