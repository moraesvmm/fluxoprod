import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";
import {
  encryptCheckoutSecret,
  generateCheckoutReference,
} from "@/lib/server/checkout-state";

interface CheckoutSessionPayload {
  customerName: string;
  customerEmail: string;
  password: string;
  planName: string;
  amount: number;
  modules: string[];
  companyName: string;
  companyDocument: string;
  companySize: string;
  companySegment: string;
  empresaId?: string;
  isUpgrade?: boolean;
}

async function findOrCreateAsaasCustomer(
  apiKey: string,
  payload: CheckoutSessionPayload
) {
  const mode = process.env.NEXT_PUBLIC_GATEWAY_MODE === "production" ? "api" : "sandbox";
  const baseUrl = `https://${mode}.asaas.com/v3`;

  const createResponse = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: JSON.stringify({
      name: payload.customerName,
      email: payload.customerEmail,
      cpfCnpj: payload.companyDocument.replace(/[^0-9]/g, ""),
      notificationDisabled: true,
    }),
  });

  const createdCustomer = await createResponse.json();
  if (createdCustomer?.id) {
    return createdCustomer.id as string;
  }

  const searchResponse = await fetch(
    `${baseUrl}/customers?email=${encodeURIComponent(payload.customerEmail)}`,
    {
      headers: {
        access_token: apiKey,
      },
    }
  );
  const searchData = await searchResponse.json();
  const existingId = searchData?.data?.[0]?.id;

  if (!existingId) {
    throw new Error(
      createdCustomer?.errors?.[0]?.description ||
        "Falha ao criar ou localizar cliente no Asaas."
    );
  }

  return existingId as string;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CheckoutSessionPayload;
    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Configuração do gateway ausente no servidor." },
        { status: 500 }
      );
    }

    if (
      !payload.customerName?.trim() ||
      !payload.customerEmail?.trim() ||
      (!payload.isUpgrade && !payload.password?.trim()) ||
      !payload.companyName?.trim() ||
      !payload.companyDocument?.trim() ||
      !Number.isFinite(payload.amount) ||
      payload.amount <= 0
    ) {
      return NextResponse.json({ error: "Payload de checkout inválido." }, { status: 400 });
    }

    // Validação de e-mail real (bloqueio de domínios fictícios)
    const disposableDomains = [
      "test.com", "example.com", "mailinator.com", "tempmail.com", 
      "dispostable.com", "guerrillamail.com", "10minutemail.com",
      "trashmail.com", "fake.com", "ficticio.com", "teste.com"
    ];
    const emailDomain = payload.customerEmail.split("@")[1]?.toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      return NextResponse.json(
        { error: "Por favor, utilize um e-mail real (Gmail, Outlook, etc.). E-mails temporários ou fictícios não são permitidos." },
        { status: 400 }
      );
    }

    const checkoutReference = generateCheckoutReference();
    const admin = createAdminClient();

    const { error: checkoutPersistError } = await admin.from("checkout_vendas").upsert(
      {
        external_transaction_id: checkoutReference,
        cliente_nome: payload.customerName,
        email: payload.customerEmail,
        valor_total: payload.amount,
        status: "pendente",
        config_payload: {
          customer_name: payload.customerName,
          customer_email: payload.customerEmail,
          encrypted_password: payload.password ? encryptCheckoutSecret(payload.password) : null,
          plan_name: payload.planName,
          modules: payload.modules,
          company_name: payload.companyName,
          company_document: payload.companyDocument,
          company_size: payload.companySize,
          company_segment: payload.companySegment,
          empresa_id: payload.empresaId,
          is_upgrade: payload.isUpgrade,
        },
      },
      {
        onConflict: "external_transaction_id",
      }
    );

    if (checkoutPersistError) {
      throw new Error(checkoutPersistError.message);
    }

    const customerId = await findOrCreateAsaasCustomer(apiKey, payload);
    const mode = process.env.NEXT_PUBLIC_GATEWAY_MODE === "production" ? "api" : "sandbox";
    const paymentResponse = await fetch(`https://${mode}.asaas.com/v3/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: payload.amount,
        nextDueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        cycle: "MONTHLY",
        description: payload.planName.includes("Personalizado") 
          ? "Assinatura Fluxo ERP - Módulos A La Carte" 
          : `Assinatura Fluxo ERP - Plano ${payload.planName}`,
        externalReference: checkoutReference,
        metadata: {
          checkoutReference,
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          companyDocument: payload.companyDocument,
          companyName: payload.companyName,
          companySize: payload.companySize,
          companySegment: payload.companySegment,
          planName: payload.planName,
          modules: JSON.stringify(payload.modules),
          empresaId: payload.empresaId,
          isUpgrade: payload.isUpgrade ? "true" : "false",
        },
      }),
    });

    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok) {
      return NextResponse.json(
        {
          error:
            paymentData?.errors?.[0]?.description ||
            "Falha ao criar pagamento no Asaas.",
        },
        { status: paymentResponse.status }
      );
    }

    let invoiceUrl = paymentData.invoiceUrl;
    if (!invoiceUrl && paymentData.id) {
      try {
        const paymentsResponse = await fetch(`https://${mode}.asaas.com/v3/subscriptions/${paymentData.id}/payments`, {
          headers: { access_token: apiKey }
        });
        const paymentsData = await paymentsResponse.json();
        if (paymentsData?.data && paymentsData.data.length > 0) {
          invoiceUrl = paymentsData.data[0].invoiceUrl;
        }
      } catch (err) {
        console.error("Erro ao buscar link de pagamento da assinatura", err);
      }
    }

    return NextResponse.json({
      success: true,
      transactionId: paymentData.id,
      redirectUrl: invoiceUrl || `https://${mode}.asaas.com/v3/subscriptions/${paymentData.id}/payments`,
      checkoutReference,
    });
  } catch (error: any) {
    console.error("Checkout Session Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao iniciar checkout." },
      { status: 500 }
    );
  }
}
