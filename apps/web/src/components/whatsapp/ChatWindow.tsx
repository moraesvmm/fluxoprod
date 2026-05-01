"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Mic, Smile, FileText, MapPin, User, Film, Image } from "lucide-react";

interface ChatMessageItem {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  fromMe: boolean;
  pushName?: string;
  type?: 'text' | 'audio' | 'sticker' | 'image' | 'video' | 'document' | 'contact' | 'location' | 'unknown';
  hasMedia?: boolean;
  mediaMime?: string;
}

interface ChatWindowProps {
  phone: string;
  contactName: string;
  initialMessage?: string | null;
  onBack: () => void;
}

export function ChatWindow({ phone, contactName, initialMessage, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [newMessage, setNewMessage] = useState(initialMessage || "");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar mensagens
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/messages?phone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // Silenciar
    }
  }, [phone]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focar input ao abrir
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Preencher mensagem inicial (se houver) ao abrir o chat para esse telefone
  useEffect(() => {
    if (initialMessage) {
      setNewMessage(initialMessage);
    }
  }, [initialMessage, phone]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage("");
        // Buscar mensagens atualizadas imediatamente
        setTimeout(fetchMessages, 500);
      }
    } catch {
      // Toast de erro futuro
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateDivider = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Hoje";
    if (isYesterday) return "Ontem";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  // Agrupar mensagens por dia
  const getMessageGroups = () => {
    const groups: { date: string; messages: ChatMessageItem[] }[] = [];
    let currentDate = "";

    for (const msg of messages) {
      const dateStr = new Date(msg.timestamp).toDateString();
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: formatDateDivider(msg.timestamp), messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  };

  const renderMessageContent = (msg: ChatMessageItem) => {
    switch (msg.type) {
      case 'audio':
        return (
          <div className="flex flex-col gap-2 py-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Mic className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[12px] text-slate-500 italic">Mensagem de áudio</span>
            </div>
            {msg.hasMedia ? (
              <audio 
                controls 
                className="h-8 w-full max-w-[240px] [&::-webkit-media-controls-enclosure]:bg-emerald-50 [&::-webkit-media-controls-panel]:bg-emerald-50"
              >
                <source src={`/api/whatsapp/media/${msg.id}`} type={msg.mediaMime || 'audio/ogg'} />
                Seu navegador não suporta áudio.
              </audio>
            ) : (
              <div className="flex gap-0.5 mt-1">
                {[4,6,8,5,7,4,6,8,5,7,4,6].map((h, i) => (
                  <div key={i} className="w-1 bg-emerald-400 rounded-full opacity-70" style={{ height: h * 2 }} />
                ))}
              </div>
            )}
          </div>
        );

      case 'sticker':
        return (
          <div className="flex flex-col items-center py-1">
            {msg.hasMedia ? (
              <img 
                src={`/api/whatsapp/media/${msg.id}`} 
                alt="Figurinha" 
                className="max-w-[120px] h-auto rounded-lg"
              />
            ) : (
              <>
                <span className="text-4xl">🎭</span>
                <span className="text-[10px] text-slate-400 mt-1">Figurinha</span>
              </>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="flex flex-col gap-2 py-1">
            {msg.hasMedia ? (
              <img 
                src={`/api/whatsapp/media/${msg.id}`} 
                alt="Imagem" 
                className="max-w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => window.open(`/api/whatsapp/media/${msg.id}`, '_blank')}
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Image className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[12px] text-slate-600 italic">Imagem</span>
              </div>
            )}
            {msg.text && <p className="text-[13px] text-slate-900">{msg.text}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center gap-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Film className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <span className="text-[12px] text-slate-600 italic">Vídeo</span>
              {msg.text && <p className="text-[13px] text-slate-900 mt-0.5">{msg.text}</p>}
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[12px] text-slate-600 italic">{msg.text || 'Documento'}</span>
          </div>
        );

      case 'contact':
        return (
          <div className="flex items-center gap-2 py-1">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-[12px] text-slate-700">{msg.text}</span>
          </div>
        );

      case 'location':
        return (
          <div className="flex items-center gap-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-[12px] text-slate-600 italic">{msg.text || 'Localização'}</span>
          </div>
        );

      default: // 'text' ou sem type (mensagens antigas)
        return (
          <p className="text-[13.5px] text-slate-900 whitespace-pre-wrap break-words leading-5">
            {msg.text}
          </p>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Fundo estilo WhatsApp */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{
          backgroundColor: "#ECE5DD",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc6' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/80 backdrop-blur rounded-lg px-4 py-3 shadow-sm text-center">
              <p className="text-sm text-slate-600">
                Nenhuma mensagem ainda. Envie a primeira mensagem para <strong>{contactName}</strong>.
              </p>
            </div>
          </div>
        ) : (
          getMessageGroups().map((group, gi) => (
            <div key={gi}>
              {/* Divisor de data */}
              <div className="flex justify-center my-3">
                <span className="bg-white/90 backdrop-blur text-slate-600 text-xs px-3 py-1 rounded-lg shadow-sm font-medium">
                  {group.date}
                </span>
              </div>

              {/* Mensagens do grupo */}
              {group.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex mb-1 ${msg.fromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-1.5 shadow-sm relative ${
                      msg.fromMe
                        ? "bg-[#DCF8C6] rounded-tr-none"
                        : "bg-white rounded-tl-none"
                    }`}
                  >
                    {renderMessageContent(msg)}
                    <div className="flex justify-end items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-slate-500">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.fromMe && (
                        <svg viewBox="0 0 16 11" width="16" height="11" className="text-blue-500">
                          <path
                            d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.33-.15.446.446 0 0 0-.325.143.477.477 0 0 0-.053.612l2.38 2.649c.084.094.2.152.325.152a.469.469 0 0 0 .36-.18L11.144 1.2a.44.44 0 0 0-.073-.547zm3.179 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L7.375 8.365l-.56-.588a.382.382 0 0 0-.063.46l.679.756c.084.094.2.152.325.152a.469.469 0 0 0 .36-.18L14.323 1.2a.44.44 0 0 0-.073-.547z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensagem */}
      <div className="bg-slate-100 px-3 py-2 border-t border-slate-200 flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 pr-10"
            disabled={sending}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: newMessage.trim()
              ? "linear-gradient(135deg, #25D366 0%, #128C7E 100%)"
              : "#94a3b8",
          }}
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
