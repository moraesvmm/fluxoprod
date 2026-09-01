import { NextResponse } from "next/server";
import { getAuthenticatedTenantContext } from "@/lib/server/tenant-context";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

function getPublicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
}

export async function GET() {
  const publicKey = getPublicVapidKey();
  if (!publicKey) {
    return NextResponse.json({ success: false, error: "Notificações ainda não estão configuradas." }, { status: 503 });
  }
  return NextResponse.json({ success: true, publicKey });
}

export async function POST(request: Request) {
  try {
    const { empresaId, userId } = await getAuthenticatedTenantContext();
    const subscription = await request.json() as { endpoint?: unknown; keys?: unknown };
    if (typeof subscription.endpoint !== "string" || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ success: false, error: "Assinatura de notificação inválida." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("push_assinaturas").upsert({
      endpoint: subscription.endpoint,
      empresa_id: empresaId,
      user_id: userId,
      subscription,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Não foi possível ativar notificações." },
      { status: 400 }
    );
  }
}