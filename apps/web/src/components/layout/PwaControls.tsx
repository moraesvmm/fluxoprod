"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Check, Download } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Converte uma chave VAPID URL-safe Base64 para Uint8Array de forma robusta.
// O atob() nativo pode falhar silenciosamente no Safari/iOS com padding irregular.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function hasSameApplicationServerKey(current: ArrayBuffer | null, expected: Uint8Array) {
  if (!current) return true;
  const currentKey = new Uint8Array(current);
  return currentKey.length === expected.length && currentKey.every((value, index) => value === expected[index]);
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
      const promptEvent = event as BeforeInstallPromptEvent;
      if (!promptEvent || typeof promptEvent.prompt !== "function") return;
      setInstallPrompt(promptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const inscreverPush = async () => {
    setPushStatus("subscribing");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada. Entre novamente para ativar as notificações.");

      const registration = await navigator.serviceWorker.ready;
      const keyResponse = await fetch("/api/notifications/push-subscription", { cache: "no-store" });
      const keyPayload = await keyResponse.json() as { publicKey?: unknown; error?: unknown };
      if (!keyResponse.ok || typeof keyPayload.publicKey !== "string") {
        throw new Error(typeof keyPayload.error === "string" ? keyPayload.error : "Chave de notificações indisponível.");
      }

      // Conversão robusta de chave VAPID URL-safe Base64 → Uint8Array.
      // A conversão manual com atob() falha no Safari/iOS quando a chave não
      // tem padding exato, gerando um ArrayBuffer incorreto silenciosamente.
      const applicationServerKey = urlBase64ToUint8Array(keyPayload.publicKey);

      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription && !hasSameApplicationServerKey(existingSubscription.options.applicationServerKey, applicationServerKey)) {
        await existingSubscription.unsubscribe();
      }
      const subscription = !existingSubscription || !hasSameApplicationServerKey(existingSubscription.options.applicationServerKey, applicationServerKey)
        ? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
        })
        : existingSubscription;

      const saveResponse = await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(subscription),
      });
      const savePayload = await saveResponse.json() as { error?: unknown };
      if (!saveResponse.ok) {
        throw new Error(typeof savePayload.error === "string" ? savePayload.error : "Não foi possível registrar este dispositivo.");
      }
      setPushStatus("subscribed");
    } catch (err) {
      // Log visível no Web Inspector do Safari para facilitar diagnóstico no iPhone
      console.error("[PwaControls] Falha ao ativar push:", err);
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