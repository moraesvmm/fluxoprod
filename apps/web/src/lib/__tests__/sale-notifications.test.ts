import { describe, it, expect, vi, afterEach } from "vitest";
import { notifySaleCompleted } from "../sale-notifications";

describe("notifySaleCompleted", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não trata ausência de assinatura ativa como erro de venda", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        enviados: 0,
        warning: "Nenhuma assinatura ativa para enviar notificações.",
      }),
    }));

    await expect(notifySaleCompleted("venda-123")).resolves.toEqual({
      enviados: 0,
      warning: "Nenhuma assinatura ativa para enviar notificações.",
    });
  });
});
