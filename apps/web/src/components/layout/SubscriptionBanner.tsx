"use client";

import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { useEmpresa } from "@/lib/hooks/use-empresas";
import Link from "next/link";
import { useState } from "react";

export function SubscriptionBanner() {
  const { data: empresa } = useEmpresa();
  const [isVisible, setIsVisible] = useState(true);

  if (!empresa || empresa.subscription_status !== 'OVERDUE' || !isVisible) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm font-medium shadow-sm sticky top-0 z-[60]">
      <div className="flex items-center gap-3 mx-auto">
        <AlertTriangle className="h-4 w-4 animate-pulse" />
        <p>
          <span className="hidden sm:inline">Atenção: Identificamos uma pendência financeira em sua assinatura. </span>
          <span className="sm:hidden">Assinatura pendente: </span>
          Sua conta poderá ser suspensa em breve.
        </p>
        <Link 
          href="/tenant/configuracoes" 
          className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors font-semibold"
        >
          Regularizar <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="p-1 hover:bg-white/10 rounded-full transition-colors"
        title="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
