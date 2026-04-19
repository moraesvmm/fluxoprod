"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface BoasVindasBannerProps {
  nome: string;
  userId: string;
  onDismiss?: () => void;
}

export default function BoasVindasBanner({ nome, userId, onDismiss }: BoasVindasBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Verificar se localStorage está disponível (SSR check)
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = `boas_vindas_${userId}`;
    const lastViewed = localStorage.getItem(storageKey);

    // Exibir apenas se chave não existe OU data salva < 7 dias atrás
    if (lastViewed) {
      const lastViewedDate = new Date(lastViewed);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastViewedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 7) {
        // Passou 7 dias, exibir novamente
        setIsVisible(true);
      } else {
        // Ainda não passou 7 dias, não exibir
        setIsVisible(false);
      }
    } else {
      // Nunca viu, exibir
      setIsVisible(true);
    }
  }, [userId]);

  const handleDismiss = () => {
    const storageKey = `boas_vindas_${userId}`;
    
    // Marcar como visto
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, new Date().toISOString());
    }

    setIsDismissed(true);
    onDismiss?.();
  };

  // Não renderizar se não visível ou se foi dismissado
  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="mb-8 transition-all duration-500 ease-out opacity-0 translate-y-[-10px] animate-in fade-in slide-in-from-top-4">
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl px-4 sm:px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-white text-xl font-semibold mb-1">
              Bem-vindo de volta, {nome}!
            </h2>
            <p className="text-white/90 text-sm">
              Aqui está um resumo do seu dia.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
