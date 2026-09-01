export async function notifySaleCompleted(input: { clientName: string; itemCount: number; total: number }) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(input.total);
  const itemLabel = input.itemCount === 1 ? "1 item" : `${input.itemCount} itens`;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification("Venda concluída", {
    body: `${input.clientName}: ${itemLabel} no valor de ${value}.`,
    icon: "/icon.png",
    badge: "/icon.png",
    tag: "fluxo-venda-concluida",
    data: { url: "/tenant/vendas/caixa" },
  });
}