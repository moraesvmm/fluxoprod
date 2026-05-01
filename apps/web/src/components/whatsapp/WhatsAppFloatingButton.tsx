"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useDragControls, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { ChatDrawer } from "./ChatDrawer";

// ─── Ícone WhatsApp SVG ───
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export function WhatsAppFloatingButton() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Polling de status a cada 5 segundos
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data.status || "disconnected");
        setTotalUnread(data.totalUnread || 0);
        setIsServiceAvailable(!data.serviceDown);
      }
    } catch {
      setIsServiceAvailable(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Sempre exibir o botão para evitar que ele "suma" da tela
  return (
    <>
      {/* Área de restrição de arrasto (tela inteira) */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9998 }}
      />

      {/* Botão Flutuante Estilo Vidro (Glassmorphism) com alto contraste */}
      <motion.button
        drag
        dragControls={dragControls}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onClick={() => setIsDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center cursor-pointer pointer-events-auto transition-all duration-300 bg-primary/20 backdrop-blur-xl border border-primary/30 ring-1 ring-primary/20"
        whileHover={{ scale: 1.1, y: -4, backgroundColor: "rgba(var(--primary), 0.25)" }}
        whileTap={{ scale: 0.95 }}
        title={connectionStatus === "connected" ? "WhatsApp Fluxo" : "WhatsApp " + connectionStatus}
      >
        <div className="relative flex items-center justify-center">
           {/* Ícone com cor primária forte para não sumir no branco */}
           <WhatsAppIcon className="w-8 h-8 text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]" />
        </div>

        {/* Badge de não lidas com animação de pulso */}
        <AnimatePresence>
          {totalUnread > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-2 -right-2 min-w-[24px] h-[24px] px-1.5 rounded-lg bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg border border-white/20"
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Indicador de status elegante */}
        <span
          className={`absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full shadow-sm ${
            connectionStatus === "connected" 
              ? "bg-emerald-500 shadow-emerald-500/50" 
              : connectionStatus === "connecting" || connectionStatus === "qr_pending"
              ? "bg-amber-500 shadow-amber-500/50 animate-pulse"
              : "bg-rose-500 shadow-rose-500/50"
          }`}
        />
      </motion.button>

      {/* Drawer de Chat */}
      <AnimatePresence>
        {isDrawerOpen && (
          <ChatDrawer
            isOpen={isDrawerOpen}
            onClose={() => {
              setIsDrawerOpen(false);
              fetchStatus(); // Atualizar badge ao fechar
            }}
            status={connectionStatus}
          />
        )}
      </AnimatePresence>
    </>
  );
}
