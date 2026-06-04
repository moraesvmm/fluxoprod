"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { GlobalSearch } from "@/components/modules/base/GlobalSearch";
import { PageTransition } from "./PageTransition";
import { useEmpresa } from "@/lib/hooks/use-empresas";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { TutorialCard } from "@/components/onboarding/TutorialCard";
import { TutorialOverlay } from "@/components/onboarding/TutorialOverlay";
import { WhatsAppFloatingButton } from "@/components/whatsapp/WhatsAppFloatingButton";

export function TenantLayout({ children }: { children: ReactNode }) {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <OnboardingProvider>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex h-full">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Offcanvas */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Sidebar content */}
            <div className="relative z-50 flex w-64 max-w-xs flex-col bg-sidebar shadow-2xl h-full transform transition-transform duration-300">
              <Sidebar />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <SubscriptionBanner />
          <Header 
            onSearchClick={() => setShowGlobalSearch(true)} 
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
          <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </main>
        </div>
        <GlobalSearch isOpen={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} />
        <TutorialOverlay />
        <TutorialCard />
        <WhatsAppFloatingButton />
      </div>
    </OnboardingProvider>
  );
}
