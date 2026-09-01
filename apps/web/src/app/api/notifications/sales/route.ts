import { NextResponse } from "next/server";
import webpush from "web-push";
import { getAuthenticatedTenantContext } from "@/lib/server/tenant-context";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

interface StoredSubscription {
  endpoint: string;
  subscription: webpush.PushSubscription;
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function getAccessToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
}

export async function POST(request: Request) {
  try {
    if (!configureWebPush()) {
      return NextResponse.json({ success: false, error: "Notificações push não configuradas." }, { status: 503 });
    }

    const { vendaId } = await request.json() as { vendaId?: unknown };
    if (typeof vendaId !== "string" || !vendaId) {
      return NextResponse.json({ success: false, error: "Venda inválida." }, { status: 400 });
    }

    const { empresaId, tenantSchema } = await getAuthenticatedTenantContext(getAccessToken(request));
    const admin = createAdminClient();
    const { data: venda, error: vendaError } = await admin
      .schema(tenantSchema)
      .from("vendas")
      .select("id, cliente_nome, valor_total")
      .eq("id", vendaId)
      .maybeSingle();
    if (vendaError || !venda) {
      return NextResponse.json({ success: true, enviados: 0, warning: "Venda não encontrada para envio de notificação." }, { status: 200 });
    }

    const { data: item } = await admin
      .schema(tenantSchema)
      .from("vendas_itens")
      .select("produto_id")
      .eq("venda_id", vendaId)
      .limit(1)
      .maybeSingle();
    const { data: estoque } = item?.produto_id
      ? await admin.schema(tenantSchema).from("estoque").select("produto_id").eq("id", item.produto_id).maybeSingle()
      : { data: null };
    const { data: produto } = estoque?.produto_id
      ? await admin.schema(tenantSchema).from("produtos").select("nome").eq("id", estoque.produto_id).maybeSingle()
      : { data: null };

    const { data: assinaturas, error: assinaturasError } = await admin
      .from("push_assinaturas")
      .select("endpoint, subscription")
      .eq("empresa_id", empresaId);
    if (assinaturasError) throw new Error(assinaturasError.message);

    if (!assinaturas || assinaturas.length === 0) {
      return NextResponse.json({ success: true, enviados: 0, warning: "Nenhuma assinatura ativa para enviar notificações." }, { status: 200 });
    }

    const value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(venda.valor_total));
    const clientName = venda.cliente_nome || "Cliente avulso";
    const productName = produto?.nome || "produto(s)";
    const payload = JSON.stringify({
      title: "Venda concluída",
      body: `${clientName} comprou ${productName} no valor de ${value}.`,
      url: "/tenant/vendas/caixa",
    });

    const results = await Promise.allSettled(
      ((assinaturas || []) as StoredSubscription[]).map((assinatura) =>
        webpush.sendNotification(assinatura.subscription, payload).catch(async (error: { statusCode?: number }) => {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await admin.from("push_assinaturas").delete().eq("endpoint", assinatura.endpoint);
          }
          throw error;
        })
      )
    );

    return NextResponse.json({ success: true, enviados: results.filter((result) => result.status === "fulfilled").length });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Não foi possível enviar notificações." },
      { status: 400 }
    );
  }
}