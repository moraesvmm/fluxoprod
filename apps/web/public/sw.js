self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handler de fetch é obrigatório no iOS para o Service Worker
// não ser encerrado quando o app vai para segundo plano.
// Sem ele, as push notifications são silenciosamente perdidas.
self.addEventListener("fetch", (event) => {
  // Estratégia: network-first, sem cache customizado.
  // Apenas mantém o SW ativo no iOS.
  event.respondWith(fetch(event.request));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/tenant/vendas/caixa"));
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  // iOS exige URLs absolutas para icon/badge — URLs relativas são ignoradas.
  const iconUrl = self.location.origin + "/apple-touch-icon.png";
  event.waitUntil(self.registration.showNotification(payload.title || "Fluxo ERP", {
    body: payload.body || "Há uma atualização na sua operação.",
    icon: iconUrl,
    badge: iconUrl,
    data: { url: payload.url || "/tenant/dashboard" },
  }));
});