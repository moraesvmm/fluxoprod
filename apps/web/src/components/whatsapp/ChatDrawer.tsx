"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Search, ArrowLeft, Send, WifiOff, QrCode } from "lucide-react";
import { ChatWindow } from "./ChatWindow";

interface ConversationItem {
  phone: string;
  name: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  status: string;
  initialPhone?: string | null;
  initialName?: string | null;
  initialMessage?: string | null;
}

export function ChatDrawer({ isOpen, onClose, status, initialPhone, initialName, initialMessage }: ChatDrawerProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(initialPhone || null);
  const [selectedName, setSelectedName] = useState<string | null>(initialName || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Buscar conversas
  const fetchConversations = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const res = await fetch("/api/whatsapp/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Silenciar erros de conectividade
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && (status === "connected" || status === "connecting")) {
      const initialFetch = setTimeout(() => fetchConversations(false), 0);
      const interval = setInterval(() => fetchConversations(true), 4000);
      return () => {
        clearTimeout(initialFetch);
        clearInterval(interval);
      };
    }
  }, [isOpen, status, fetchConversations]);

  useEffect(() => {
    if (initialPhone && isOpen) {
      const timer = setTimeout(() => {
        setSelectedPhone(initialPhone);
        setSelectedName(initialName || null);
      }, 0);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      const timer = setTimeout(() => {
        setSelectedPhone(null);
        setSelectedName(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialPhone, initialName, isOpen]);

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    }

    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const getInitial = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-card shadow-2xl z-[10000] flex flex-col overflow-hidden border-l border-border"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground shadow-md flex-shrink-0"
      >
        {selectedPhone ? (
          <>
            <button
              onClick={() => setSelectedPhone(null)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {selectedName || conversations.find((c) => c.phone === selectedPhone)?.name || selectedPhone}
              </div>
              <div className="text-xs text-white/70">
                +{selectedPhone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, "$1 ($2) $3-$4")}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1">
              <div className="font-semibold text-lg">WhatsApp</div>
              <div className="text-xs text-white/70 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-green-400" : status === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-400"}`} />
                {status === "connected" ? "Conectado" : status === "connecting" ? "Sincronizando..." : "Desconectado"}
              </div>
            </div>
          </>
        )}
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Conteúdo */}
      {status === "disconnected" ? (
        /* Estado Desconectado */
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">WhatsApp Desconectado</h3>
          <p className="text-sm text-muted-foreground">
            Para enviar e receber mensagens, conecte seu WhatsApp nas Configurações do sistema.
          </p>
          <a
            href="/tenant/configuracoes"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Ir para Configurações
          </a>
        </div>
      ) : selectedPhone ? (
        /* Chat Individual */
        <ChatWindow
          phone={selectedPhone}
          contactName={selectedName || conversations.find((c) => c.phone === selectedPhone)?.name || selectedPhone}
          initialMessage={initialMessage}
        />
      ) : (
        /* Lista de Conversas */
        <div className="flex-1 flex flex-col overflow-hidden">
          {status === "connecting" && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center gap-2 text-amber-800 text-[11px] font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              Sincronizando. O envio de mensagens pode atrasar.
            </div>
          )}
          {/* Busca */}
          <div className="px-3 py-2 bg-muted border-b border-slate-100 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-muted-foreground hover:bg-slate-200 rounded-lg transition-colors"
              title="Fechar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {loading && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Send className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {searchTerm
                    ? "Nenhuma conversa encontrada."
                    : "Nenhuma conversa ainda. As mensagens recebidas aparecerão aqui."}
                </p>
              </div>
            ) : (
              filteredConversations.map((convo) => (
                <button
                  key={convo.phone}
                  onClick={() => setSelectedPhone(convo.phone)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-slate-100 text-left"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm border border-primary/20">
                    {getInitial(convo.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground truncate text-sm">
                        {convo.name}
                      </span>
                      <span className={`text-xs flex-shrink-0 ml-2 ${convo.unreadCount > 0 ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                        {formatTime(convo.lastTimestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">
                        {convo.lastMessage}
                      </span>
                      {convo.unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 ml-2">
                          {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
