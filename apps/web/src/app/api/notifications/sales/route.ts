import { NextResponse } from "next/server";
import webpush from "web-push";
import { getAuthenticatedTenantContext } from "@/lib/server/tenant-context";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

interface StoredSubscription {
  endpoint: string;
  subscription: webpush.PushSubscription;
}

interface VendaNotificacaoResult {
  found: boolean;
  cliente?: string;
  valor_total?: number;
  produto_nome?: string;
  error?: string;
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

    // Usa RPC SECURITY DEFINER para contornar a limitação do PostgREST:
    // schemas tenant não ficam nos "Exposed Schemas", então admin.schema()
    // lança "Invalid schema". A RPC roda com privilégio de owner e acessa
    // o schema via SQL dinâmico com format().
    // Migração: apps/api/migrations/rpc_notificacao_buscar_venda.sql
    const { data: vendaData, error: vendaError } = await admin
      .rpc("tenant_buscar_venda_para_notificacao", {
        p_venda_id: vendaId,
        p_schema: tenantSchema,
      });

    if (vendaError) {
      console.error("[sales/route] Erro RPC buscar venda:", vendaError.message);
      return NextResponse.json({ success: true, enviados: 0, warning: `Erro ao buscar venda: ${vendaError.message}` }, { status: 200 });
    }

    const venda = vendaData as VendaNotificacaoResult | null;
    if (!venda?.found) {
      const motivo = venda?.error ? `Erro interno: ${venda.error}` : "Venda não encontrada para envio de notificação.";
      return NextResponse.json({ success: true, enviados: 0, warning: motivo }, { status: 200 });
    }

    const { data: assinaturas, error: assinaturasError } = await admin
      .from("push_assinaturas")
      .select("endpoint, subscription")
      .eq("empresa_id", empresaId);
    if (assinaturasError) throw new Error(assinaturasError.message);

    if (!assinaturas || assinaturas.length === 0) {
      return NextResponse.json({ success: true, enviados: 0, warning: "Nenhuma assinatura ativa para enviar notificações." }, { status: 200 });
    }

    const value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(venda.valor_total ?? 0);
    const payload = JSON.stringify({
      title: "Venda concluída",
      body: `${venda.cliente} comprou ${venda.produto_nome} no valor de ${value}.`,
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