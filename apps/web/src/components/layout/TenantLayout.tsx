"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalSearch } from "@/components/modules/base/GlobalSearch";
import { PageTransition } from "./PageTransition";

export function TenantLayout({ children }: { children: ReactNode }) {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header onSearchClick={() => setShowGlobalSearch(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>
      <GlobalSearch isOpen={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} />
    </div>
  );
}
