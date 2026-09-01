export async function notifySaleCompleted(vendaId: string): Promise<{ enviados: number; erro?: string }> {
  try {
    const response = await fetch("/api/notifications/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendaId }),
    });
    const payload = await response.json() as { enviados?: unknown; error?: unknown };
    if (!response.ok) {
      return { enviados: 0, erro: typeof payload.error === "string" ? payload.error : "Não foi possível enviar notificações." };
    }
    return { enviados: typeof payload.enviados === "number" ? payload.enviados : 0 };
  } catch {
    return { enviados: 0, erro: "Não foi possível contatar o serviço de notificações." };
  }
}