export async function notifySaleCompleted(vendaId: string): Promise<{ enviados: number; erro?: string; warning?: string }> {
  try {
    if (!vendaId || typeof vendaId !== "string") {
      return { enviados: 0, erro: "Id da venda inválido." };
    }

    const response = await fetch("/api/notifications/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendaId }),
    });

    const payload = await response.json() as { enviados?: unknown; error?: unknown; success?: unknown; warning?: unknown };
    if (!response.ok) {
      const message = typeof payload.error === "string" ? payload.error : typeof payload.warning === "string" ? payload.warning : "Não foi possível enviar notificações.";
      return { enviados: 0, erro: message };
    }

    if (typeof payload.warning === "string") {
      return { enviados: typeof payload.enviados === "number" ? payload.enviados : 0, warning: payload.warning };
    }

    return { enviados: typeof payload.enviados === "number" ? payload.enviados : 0 };
  } catch {
    return { enviados: 0, erro: "Não foi possível contatar o serviço de notificações." };
  }
}