import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { decryptCheckoutSecret } from "@/lib/server/checkout-state";
import { PaymentGatewayService } from "@/services/PaymentGatewayService";
import { createAdminClient } from "@/utils/supabase/admin";

type CheckoutConfig = {
  customer_name?: string;
  customer_email?: string;
  encrypted_password?: string;
  modules?: string[];
  company_name?: string;
  company_document?: string;
  company_size?: string;
  company_segment?: string;
};

type ProvisionResult = {
  status?: string;
  message?: string;
  empresa_id?: string;
  schema_name?: string;
};

function isDuplicateUserError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("duplicate")
  );
}

function buildSchemaName(input: string) {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

  return `tenant_${base || "empresa"}_${randomUUID().replace(/-/g, "").slice(0, 6)}`;
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(error.message);
    }

    const foundUser = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (foundUser) {
      return foundUser;
    }

    if (data.users.length < 1000) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  let createdUserId: string | null = null;

  try {
    const payloadBuffer = await request.text();
    let body: any;

    try {
      body = JSON.parse(payloadBuffer);
    } catch {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    const signature =
      request.headers.get("asaas-access-token") ||
      request.headers.get("x-gateway-signature") ||
      "";

    if (!PaymentGatewayService.verifyWebhookSignature(signature)) {
      console.error("Assinatura/token do webhook invalida");
      return NextResponse.json({ error: "Assinatura invalida" }, { status: 403 });
    }

    const successEvents = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];
    if (!successEvents.includes(body.event)) {
      return NextResponse.json({ message: "Evento ignorado" }, { status: 200 });
    }

    const payment = body.payment || {};
    const metadata = payment.metadata || {};
    const checkoutReference = String(
      payment.externalReference || metadata.checkoutReference || payment.id || ""
    );

    if (!checkoutReference) {
      return NextResponse.json(
        { error: "Checkout sem referencia de rastreio" },
        { status: 400 }
      );
    }

    const { data: checkoutRow, error: checkoutError } = await admin
      .from("checkout_vendas")
      .select("id, external_transaction_id, config_payload, email, cliente_nome, status")
      .eq("external_transaction_id", checkoutReference)
      .maybeSingle();

    if (checkoutError) {
      console.error("Erro ao localizar checkout pendente:", checkoutError);
      return NextResponse.json({ error: "Erro ao localizar checkout" }, { status: 500 });
    }

    if (!checkoutRow) {
      return NextResponse.json({ error: "Checkout nao encontrado" }, { status: 404 });
    }

    if (checkoutRow.status === "paga") {
      await admin.from("webhook_audit_log").insert({
        external_transaction_id: checkoutReference,
        status: "ignorado",
        payload: body,
        detalhes: "Evento repetido recebido apos checkout ja processado.",
      });

      return NextResponse.json({
        success: true,
        message: "Pagamento ja processado anteriormente.",
      });
    }

    const config = (checkoutRow.config_payload || {}) as CheckoutConfig;
    const customerEmail = String(config.customer_email || metadata.customerEmail || checkoutRow.email || "");
    const customerName = String(
      config.customer_name || metadata.customerName || checkoutRow.cliente_nome || "Cliente Asaas"
    );
    const companyDocument = String(
      config.company_document || metadata.companyDocument || "00.000.000/0000-00"
    );
    const companyName = String(config.company_name || metadata.companyName || customerName);
    const companySize = String(config.company_size || metadata.companySize || "MPE");
    const companySegment = String(config.company_segment || metadata.companySegment || "Varejo");
    const modules = Array.isArray(config.modules)
      ? config.modules
      : typeof metadata.modules === "string"
        ? JSON.parse(metadata.modules)
        : Array.isArray(metadata.modules)
          ? metadata.modules
          : [];

    let password = "";
    if (config.encrypted_password) {
      password = decryptCheckoutSecret(config.encrypted_password);
    } else if (metadata.password) {
      password = String(metadata.password);
    }

    if (!customerEmail || !password) {
      await admin.from("webhook_audit_log").insert({
        external_transaction_id: checkoutReference,
        status: "falha",
        payload: body,
        detalhes: "Dados insuficientes para provisionamento.",
      });

      return NextResponse.json(
        { message: "Dados insuficientes para provisionamento" },
        { status: 200 }
      );
    }

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: customerEmail,
      password,
      email_confirm: true,
    });

    let authUserId = createdUser?.user?.id ?? null;
    createdUserId = authUserId;

    if (createUserError) {
      if (!isDuplicateUserError(createUserError.message)) {
        console.error("Erro ao criar usuario auth:", createUserError);
        return NextResponse.json(
          { error: "Erro ao criar usuario de acesso", details: createUserError.message },
          { status: 500 }
        );
      }

      const existingUser = await findAuthUserByEmail(admin, customerEmail);
      if (!existingUser?.id) {
        return NextResponse.json(
          { error: "Usuario existente nao localizado no Auth" },
          { status: 500 }
        );
      }

      authUserId = existingUser.id;
      createdUserId = null;
    }

    if (!authUserId) {
      return NextResponse.json(
        { error: "Usuario auth nao disponivel para provisionamento" },
        { status: 500 }
      );
    }

    const empresaId = randomUUID();
    const schemaName = buildSchemaName(companyName);

    const { data: provisionData, error: provisionError } = await admin.rpc(
      "provisionar_empresa_master",
      {
        p_empresa_id: empresaId,
        p_cnpj: companyDocument,
        p_razao_social: companyName,
        p_porte: companySize,
        p_segmento: companySegment,
        p_schema_name: schemaName,
        p_modules: modules,
      }
    );

    if (provisionError) {
      throw new Error(provisionError.message);
    }

    const provisionResult = (provisionData || {}) as ProvisionResult;
    if (provisionResult.status && provisionResult.status !== "success") {
      throw new Error(provisionResult.message || "Provisionamento retornou falha.");
    }

    const { error: profileError } = await admin.from("user_profiles").upsert(
      {
        user_id: authUserId,
        role: "tenant_admin",
        empresa_id: empresaId,
        nome: customerName,
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: checkoutUpdateError } = await admin
      .from("checkout_vendas")
      .update({
        status: "paga",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", checkoutRow.id);

    if (checkoutUpdateError) {
      throw new Error(checkoutUpdateError.message);
    }

    const { error: auditError } = await admin.from("webhook_audit_log").insert({
      external_transaction_id: checkoutReference,
      status: "sucesso",
      payload: body,
      detalhes: `Tenant provisionado via backend. schema=${schemaName}`,
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado e tenant provisionado.",
      data: {
        empresa_id: empresaId,
        schema_name: schemaName,
        auth_user_id: authUserId,
      },
    });
  } catch (error: any) {
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }

    console.error("Erro catastrofico no webhook:", error);
    return NextResponse.json(
      { error: "Erro interno do webhook", details: error?.message || null },
      { status: 500 }
    );
  }
}
