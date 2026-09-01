export async function notifySaleCompleted(vendaId: string) {
  try {
    await fetch("/api/notifications/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendaId }),
    });
  } catch {
    // Push nao pode comprometer uma venda que ja foi concluida com sucesso.
  }
}