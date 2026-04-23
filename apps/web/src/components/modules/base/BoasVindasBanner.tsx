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
    if (typeof window === "undefined") return;

    const storageKey = `boas_vindas_${userId}`;
    const lastViewed = localStorage.getItem(storageKey);

    if (lastViewed) {
      const lastViewedDate = new Date(lastViewed);
      const now = new Date();
      // Exibir novamente após 12 horas
      const diffHours = Math.abs(now.getTime() - lastViewedDate.getTime()) / 36e5;

      if (diffHours >= 12) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } else {
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

  const horaAtual = new Date().getHours();
  let saudacao = "Boa noite";
  if (horaAtual >= 5 && horaAtual < 12) saudacao = "Bom dia";
  else if (horaAtual >= 12 && horaAtual < 18) saudacao = "Boa tarde";

  return (
    <div className="mb-8 animate-page-enter">
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl px-4 sm:px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-white text-xl font-semibold mb-1">
              {saudacao}, {nome}! 👋
            </h2>
            <p className="text-white/90 text-sm">
              Aqui está um resumo das movimentações da sua empresa hoje.
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
