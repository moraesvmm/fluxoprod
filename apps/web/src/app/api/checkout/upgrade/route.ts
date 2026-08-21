import { NextResponse } from "next/server";

/** Compatibilidade: o checkout canônico agora é /api/checkout/session. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { modules?: unknown };
  const moduleKey = Array.isArray(body.modules) && body.modules.length === 1 && typeof body.modules[0] === "string"
    ? body.modules[0]
    : undefined;
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(new URL("/api/checkout/session", request.url), {
    method: "POST",
    headers,
    body: JSON.stringify({ isUpgrade: true, moduleKey }),
  });
  const result = await response.json().catch(() => ({ error: "Erro ao iniciar checkout." }));
  return NextResponse.json(result, { status: response.status });
}
