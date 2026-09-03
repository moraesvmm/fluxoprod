import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  moduleKey?: string;
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
    let payload = (await request.json()) as CheckoutSessionPayload;
    let existingSubscriptionId: string | null = null;
    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Configuração do gateway ausente no servidor." },
        { status: 500 }
      );
    }

    const admin = createAdminClient();

    if (payload.isUpgrade) {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("empresa_id, role")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single();
      if (!profile?.empresa_id || profile.role !== "tenant_admin") {
        return NextResponse.json({ error: "Apenas o administrador da empresa pode alterar a assinatura." }, { status: 403 });
      }

      const { data: empresa } = await admin
        .from("empresas")
        .select("id, razao_social, cnpj, porte, segmento, plan_name, subscription_id")
        .eq("id", profile.empresa_id)
        .single();
      if (!empresa) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
      existingSubscriptionId = empresa.subscription_id;

      const { data: activeRows } = await admin
        .from("empresa_modulos")
        .select("modulo_key")
        .eq("empresa_id", empresa.id)
        .eq("ativo", true);
      const activeModules = [...new Set((activeRows || []).map((row) => row.modulo_key))];
      const requestedModule = typeof payload.moduleKey === "string" ? payload.moduleKey.trim() : "";
      if (requestedModule) {
        if (activeModules.includes(requestedModule)) {
          return NextResponse.json({ error: "Este módulo já está ativo para a empresa." }, { status: 409 });
        }
        const { data: module } = await admin
          .from("modulos_avulsos")
          .select("key, ativo")
          .eq("key", requestedModule)
          .eq("ativo", true)
          .maybeSingle();
        if (!module) return NextResponse.json({ error: "Módulo não disponível." }, { status: 400 });
        activeModules.push(requestedModule);
      }

      let basePrice = 0;
      let includedModules: string[] = [];
      if (empresa.plan_name) {
        const { data: plan } = await admin
          .from("planos")
          .select("preco, preco_promocional, modulos_incluidos")
          .ilike("nome", empresa.plan_name)
          .maybeSingle();
        basePrice = plan?.preco_promocional ?? plan?.preco ?? 0;
        includedModules = Array.isArray(plan?.modulos_incluidos) ? plan.modulos_incluidos : [];
      }
      const extraKeys = activeModules.filter((key) => !includedModules.includes(key));
      const { data: extras } = extraKeys.length
        ? await admin.from("modulos_avulsos").select("key, preco, preco_promocional").in("key", extraKeys).eq("ativo", true)
        : { data: [] as Array<{ key: string; preco: number; preco_promocional: number | null }> };
      const amount = basePrice + (extras || []).reduce((sum, extra) => sum + (extra.preco_promocional ?? extra.preco), 0);
      payload = {
        ...payload,
        empresaId: empresa.id,
        customerName: user.user_metadata?.nome || empresa.razao_social,
        customerEmail: user.email || "",
        planName: empresa.plan_name || "Plano Personalizado",
        amount,
        modules: activeModules,
        companyName: empresa.razao_social,
        companyDocument: empresa.cnpj || "",
        companySize: empresa.porte || "MPE",
        companySegment: empresa.segmento || "Geral",
      };
    } else {
      const requestedModules = [...new Set((payload.modules || []).filter((module): module is string => typeof module === "string"))];
      const normalizedPlanName = payload.planName?.trim() || "";
      const isALaCarte = /personalizado|a la carte/i.test(normalizedPlanName);

      const { data: plan } = isALaCarte
        ? { data: null }
        : await admin
          .from("planos")
          .select("key, nome, preco, preco_promocional, modulos_incluidos")
          .ilike("nome", normalizedPlanName)
          .maybeSingle();

      if (!isALaCarte && !plan) {
        return NextResponse.json({ error: "Plano não disponível." }, { status: 400 });
      }

      const planModules = Array.isArray(plan?.modulos_incluidos) ? plan.modulos_incluidos : [];
      const extraKeys = requestedModules.filter((key) => !planModules.includes(key));
      const { data: extras } = extraKeys.length
        ? await admin.from("modulos_avulsos").select("key, preco, preco_promocional").in("key", extraKeys).eq("ativo", true)
        : { data: [] as Array<{ key: string; preco: number; preco_promocional: number | null }> };

      if (extraKeys.length !== (extras || []).length || (isALaCarte && requestedModules.length === 0)) {
        return NextResponse.json({ error: "Seleção de módulos inválida." }, { status: 400 });
      }

      const amount = (plan?.preco_promocional ?? plan?.preco ?? 0)
        + (extras || []).reduce((sum, module) => sum + (module.preco_promocional ?? module.preco), 0);
      payload = {
        ...payload,
        planName: plan?.nome || "Personalizado (A La Carte)",
        amount,
        modules: [...new Set([...planModules, ...requestedModules])],
      };
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
          subscription_id: existingSubscriptionId,
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
    const subscriptionUrl = existingSubscriptionId
      ? `https://${mode}.asaas.com/v3/subscriptions/${existingSubscriptionId}`
      : `https://${mode}.asaas.com/v3/subscriptions`;
    const paymentResponse = await fetch(subscriptionUrl, {
      method: existingSubscriptionId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
      body: JSON.stringify({
        ...(existingSubscriptionId ? {} : { customer: customerId, billingType: "PIX", cycle: "MONTHLY" }),
        value: payload.amount,
        nextDueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        externalReference: checkoutReference,
        description: payload.planName.includes("Personalizado") 
          ? "Assinatura Fluxo ERP - Módulos A La Carte" 
          : `Assinatura Fluxo ERP - Plano ${payload.planName}`,
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
  } catch (error: unknown) {
    console.error("Checkout Session Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao iniciar checkout." },
      { status: 500 }
    );
  }
}
