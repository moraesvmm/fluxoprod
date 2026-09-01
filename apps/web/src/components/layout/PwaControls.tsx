"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Check, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "default" | "unsupported">("default");
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "subscribing" | "subscribed" | "error">("idle");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if ("Notification" in window) {
      setNotificationsSupported(true);
      setNotificationPermission(Notification.permission);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const inscreverPush = async () => {
    setPushStatus("subscribing");
    try {
      const registration = await navigator.serviceWorker.ready;
      const keyResponse = await fetch("/api/notifications/push-subscription", { cache: "no-store" });
      const keyPayload = await keyResponse.json() as { publicKey?: unknown; error?: unknown };
      if (!keyResponse.ok || typeof keyPayload.publicKey !== "string") {
        throw new Error(typeof keyPayload.error === "string" ? keyPayload.error : "Chave de notificações indisponível.");
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const applicationServerKey = Uint8Array.from(
        atob(keyPayload.publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - keyPayload.publicKey.length % 4) % 4)),
        (character) => character.charCodeAt(0)
      );
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const saveResponse = await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const savePayload = await saveResponse.json() as { error?: unknown };
      if (!saveResponse.ok) {
        throw new Error(typeof savePayload.error === "string" ? savePayload.error : "Não foi possível registrar este dispositivo.");
      }
      setPushStatus("subscribed");
    } catch {
      setPushStatus("error");
    }
  };

  useEffect(() => {
    if (notificationPermission === "granted") {
      void inscreverPush();
    }
  }, [notificationPermission]);

  const instalar = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const ativarNotificacoes = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      await inscreverPush();
      return;
    }
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
      <button
        type="button"
        onClick={ativarNotificacoes}
        disabled={!notificationsSupported || pushStatus === "subscribing"}
        className={`relative -m-2.5 rounded-lg p-2.5 transition-all ${pushStatus === "subscribed" ? "text-emerald-600 dark:text-emerald-400" : pushStatus === "error" ? "text-destructive" : "text-primary hover:bg-primary/10"} disabled:cursor-default disabled:opacity-100`}
        title={
          !notificationsSupported
            ? "Notificações não são suportadas neste navegador"
            : pushStatus === "subscribed"
              ? "Notificações de vendas ativadas neste dispositivo"
              : pushStatus === "subscribing"
                ? "Ativando notificações neste dispositivo"
                : pushStatus === "error"
                  ? "Permissão concedida, mas o dispositivo não foi inscrito. Configure VAPID e a tabela push_assinaturas, depois toque aqui para tentar novamente."
              : notificationPermission === "granted"
                ? "Toque para finalizar a ativação de notificações"
              : notificationPermission === "denied"
                ? "Notificações bloqueadas: libere nos Ajustes do iPhone"
                : "Ativar notificações de vendas"
        }
        aria-label={
          !notificationsSupported
            ? "Notificações não suportadas"
            : pushStatus === "subscribed"
              ? "Notificações de vendas ativadas"
              : pushStatus === "error"
                ? "Falha ao ativar notificações"
              : notificationPermission === "granted"
                ? "Finalizar ativação de notificações"
              : notificationPermission === "denied"
                ? "Notificações bloqueadas"
                : "Ativar notificações de vendas"
        }
      >
        {pushStatus === "subscribed" ? (
          <BellRing className="h-5 w-5" aria-hidden="true" />
        ) : notificationPermission === "denied" || !notificationsSupported ? (
          <BellOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <BellRing className="h-5 w-5" aria-hidden="true" />
        )}
        {pushStatus === "subscribed" && (
          <Check className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-card" aria-hidden="true" />
        )}
      </button>
    </>
  );
}