"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { GlobalSearch } from "@/components/modules/base/GlobalSearch";
import { PageTransition } from "./PageTransition";
import { useEmpresa } from "@/lib/hooks/use-empresas";

export function TenantLayout({ children }: { children: ReactNode }) {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const { data: empresa } = useEmpresa();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (empresa?.subscription_status === 'TRIAL' && empresa.trial_ends_at) {
      const endsAt = new Date(empresa.trial_ends_at);
      const now = new Date();
      if (now > endsAt && !pathname.includes('/tenant/assinatura')) {
        router.push('/tenant/assinatura');
      }
    }
  }, [empresa, router, pathname]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <SubscriptionBanner />
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
