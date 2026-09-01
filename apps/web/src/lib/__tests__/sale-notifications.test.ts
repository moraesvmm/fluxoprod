import { describe, it, expect, vi, afterEach } from "vitest";
import { notifySaleCompleted } from "../sale-notifications";

const getSession = vi.fn();

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { getSession } }),
}));

describe("notifySaleCompleted", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getSession.mockReset();
  });

  it("não trata ausência de assinatura ativa como erro de venda", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-do-usuario" } } });
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
    expect(fetch).toHaveBeenCalledWith("/api/notifications/sales", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer token-do-usuario" }),
    }));
  });
});
