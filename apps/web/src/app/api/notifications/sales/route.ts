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

    // Colunas corretas conforme interface Venda em api.ts: cliente (não cliente_nome) e valor (não valor_total)
    const { data: venda, error: vendaError } = await admin
      .schema(tenantSchema)
      .from("vendas")
      .select("id, cliente, valor")
      .eq("id", vendaId)
      .maybeSingle();

    if (vendaError) {
      console.error("[sales/route] Erro ao buscar venda:", vendaError.message);
      return NextResponse.json({ success: true, enviados: 0, warning: "Erro ao buscar venda para notificação." }, { status: 200 });
    }
    if (!venda) {
      return NextResponse.json({ success: true, enviados: 0, warning: "Venda não encontrada para envio de notificação." }, { status: 200 });
    }

    // Buscar nome do primeiro produto via itens_venda → estoque → produtos (falha silenciosa)
    let productName = "produto(s)";
    try {
      const { data: itens } = await admin
        .schema(tenantSchema)
        .from("itens_venda")
        .select("produto_id")
        .eq("venda_id", vendaId)
        .limit(1);

      const primeiroProdutoId = itens?.[0]?.produto_id as string | undefined;
      if (primeiroProdutoId) {
        const { data: produto } = await admin
          .schema(tenantSchema)
          .from("produtos")
          .select("nome")
          .eq("id", primeiroProdutoId)
          .maybeSingle();
        if (produto?.nome) productName = produto.nome as string;
      }
    } catch {
      // Não bloqueia o envio se a busca do produto falhar
    }

    const { data: assinaturas, error: assinaturasError } = await admin
      .from("push_assinaturas")
      .select("endpoint, subscription")
      .eq("empresa_id", empresaId);
    if (assinaturasError) throw new Error(assinaturasError.message);

    if (!assinaturas || assinaturas.length === 0) {
      return NextResponse.json({ success: true, enviados: 0, warning: "Nenhuma assinatura ativa para enviar notificações." }, { status: 200 });
    }

    const value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(venda.valor));
    const clientName = (venda.cliente as string | null) || "Cliente avulso";
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

    const enviados = results.filter((result) => result.status === "fulfilled").length;
    const falhas = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => {
        const reason = result.reason as { statusCode?: unknown; message?: unknown };
        return {
          statusCode: typeof reason?.statusCode === "number" ? reason.statusCode : null,
          mensagem: typeof reason?.message === "string" ? reason.message : "Falha desconhecida ao enviar notificação.",
        };
      });

    return NextResponse.json({
      success: true,
      enviados,
      falhas,
      ...(enviados === 0 && falhas.length > 0
        ? { warning: "O dispositivo está inscrito, mas o serviço de notificações recusou a entrega." }
        : {}),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Não foi possível enviar notificações." },
      { status: 400 }
    );
  }
}