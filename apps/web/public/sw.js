self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/tenant/vendas/caixa"));
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(payload.title || "Fluxo ERP", {
    body: payload.body || "Há uma atualização na sua operação.",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    data: { url: payload.url || "/tenant/dashboard" },
  }));
});