"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Power } from "lucide-react";

type ConnectionStatus = "disconnected" | "qr_pending" | "connecting" | "connected";

export function WhatsAppConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serviceDown, setServiceDown] = useState(false);
  // Ref para acessar status atual dentro do interval sem re-criar o efeito
  const statusRef = useRef<ConnectionStatus>("disconnected");

  // Sincronizar ref com estado
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Polling de status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status || "disconnected");
        setServiceDown(data.serviceDown || false);
      }
    } catch {
      setServiceDown(true);
    }
  }, []);

  // Polling de QR Code (apenas quando conectando)
  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/qr");
      if (res.ok) {
        const data = await res.json();
        if (data.qr) {
          setQrBase64(data.qr);
          setStatus("qr_pending");
        } else if (data.status === "connected") {
          setStatus("connected");
          setQrBase64(null);
        } else if (data.status === "connecting" || data.status === "qr_pending") {
          setStatus(data.status);
        } else {
          setStatus("disconnected");
        }
      }
    } catch {
      // Silenciar
    }
  }, []);

  // Polling estável — sem 'status' nas deps para não recriar o interval a cada mudança
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
      // Lê do ref para não precisar do status como dependência
      if (statusRef.current === "qr_pending" || statusRef.current === "connecting") {
        fetchQR();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchQR]); // sem 'status' — evita piscamento

  const handleConnect = async () => {
    setLoading(true);
    setQrBase64(null); // Limpa QR anterior
    try {
      const res = await fetch("/api/whatsapp/qr", { method: "POST" });
      if (res.ok) {
        setStatus("connecting");
        // Iniciar polling de QR
        setTimeout(fetchQR, 2000);
      }
    } catch {
      // Toast de erro futuro
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      if (res.ok) {
        setStatus("disconnected");
        setQrBase64(null);
      }
    } catch {
      // Toast de erro futuro
    } finally {
      setLoading(false);
    }
  };

  if (serviceDown) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <WifiOff className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">WhatsApp</h3>
            <p className="text-xs text-slate-500">Serviço indisponível</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-800 mb-3">
            O serviço de WhatsApp não está respondendo. Verifique se o microserviço está rodando no Railway.
          </p>
          <button 
            onClick={fetchStatus}
            className="px-4 py-1.5 bg-amber-100 text-amber-800 rounded-md text-xs font-medium hover:bg-amber-200"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
        >
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800">Conexão WhatsApp</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "connected"
                  ? "bg-green-500"
                  : status === "qr_pending" || status === "connecting"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-xs text-slate-500">
              {status === "connected" && "Conectado"}
              {status === "qr_pending" && "Aguardando escaneamento..."}
              {status === "connecting" && "Iniciando conexão..."}
              {status === "disconnected" && "Desconectado"}
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo por estado */}
      {status === "disconnected" && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
            <p className="text-sm text-slate-600">
              Conecte seu WhatsApp para enviar e receber mensagens diretamente pelo sistema.
              As campanhas em massa e o chat com clientes ficarão disponíveis.
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium text-sm transition-all hover:shadow-md disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            {loading ? "Preparando..." : "Conectar WhatsApp"}
          </button>
        </div>
      )}

      {(status === "qr_pending" || status === "connecting") && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="font-medium text-emerald-800 text-sm mb-2">Como conectar:</h4>
            <ol className="text-sm text-emerald-700 space-y-1.5 list-decimal list-inside">
              <li>Abra o WhatsApp no celular</li>
              <li>Toque em <strong>Aparelhos Conectados</strong></li>
              <li>Toque em <strong>Conectar aparelho</strong></li>
              <li>Escaneie o QR Code abaixo</li>
            </ol>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            {qrBase64 ? (
              <div className="bg-white p-3 rounded-xl border-2 border-slate-200 shadow-inner">
                <img
                  src={qrBase64}
                  alt="QR Code WhatsApp"
                  width={260}
                  height={260}
                  className="rounded-lg"
                />
              </div>
            ) : (
              <div className="w-[260px] h-[260px] bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
                  <p className="text-xs text-slate-500 mt-2">Gerando QR Code...</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Isso pode levar até 30 segundos na primeira vez</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setStatus("disconnected");
              setQrBase64(null);
            }}
            className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {status === "connected" && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Wifi className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">WhatsApp conectado com sucesso!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Mensagens recebidas aparecerão no botão flutuante. Campanhas serão enviadas automaticamente.
              </p>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            {loading ? "Desconectando..." : "Desconectar WhatsApp"}
          </button>
        </div>
      )}
    </div>
  );
}
