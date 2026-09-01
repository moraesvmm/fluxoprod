"use client";

import { useEffect, useState } from "react";
import { BellRing, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const instalar = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const ativarNotificacoes = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  return (
    <>
      {installPrompt && (
        <button
          type="button"
          onClick={instalar}
          className="-m-2.5 rounded-lg p-2.5 text-muted-foreground/70 transition-all hover:bg-muted hover:text-foreground"
          title="Instalar atalho do Fluxo"
          aria-label="Instalar atalho do Fluxo"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      {notificationPermission !== "granted" && notificationPermission !== "unsupported" && (
        <button
          type="button"
          onClick={ativarNotificacoes}
          className="-m-2.5 rounded-lg p-2.5 text-muted-foreground/70 transition-all hover:bg-muted hover:text-foreground"
          title={notificationPermission === "denied" ? "Notificações bloqueadas no navegador" : "Ativar notificações de vendas"}
          aria-label="Ativar notificações de vendas"
        >
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </>
  );
}