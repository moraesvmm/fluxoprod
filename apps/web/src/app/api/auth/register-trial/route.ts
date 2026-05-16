import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";

export interface TrialRegistrationPayload {
  customerName: string;
  customerEmail: string;
  password: string;
  planName: string;
  modules: string[];
  companyName: string;
  companyDocument: string;
  companySize: string;
  companySegment: string;
  couponId?: string;
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

function isDuplicateUserError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("duplicate")
  );
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
    const payload = (await request.json()) as TrialRegistrationPayload;

    if (
      !payload.customerName?.trim() ||
      !payload.customerEmail?.trim() ||
      !payload.password?.trim() ||
      !payload.companyName?.trim() ||
      !payload.companyDocument?.trim()
    ) {
      return NextResponse.json({ error: "Payload de cadastro inválido." }, { status: 400 });
    }

    // Validação de e-mail real
    const disposableDomains = [
      "test.com", "example.com", "mailinator.com", "tempmail.com", 
      "dispostable.com", "guerrillamail.com", "10minutemail.com",
      "trashmail.com", "fake.com", "ficticio.com", "teste.com"
    ];
    const emailDomain = payload.customerEmail.split("@")[1]?.toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      return NextResponse.json(
        { error: "Por favor, utilize um e-mail real. E-mails temporários não são permitidos." },
        { status: 400 }
      );
    }

    // Cria o usuário com necessidade de confirmação de e-mail (para teste do fluxo)
    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: payload.customerEmail,
      password: payload.password,
      email_confirm: false, 
      user_metadata: {
        nome: payload.customerName,
        trial_user: true
      }
    });

    let authUserId = createdUser?.user?.id ?? null;
    createdUserId = authUserId;

    if (createUserError) {
      if (!isDuplicateUserError(createUserError.message)) {
        console.error("Erro ao criar usuário auth:", createUserError);
        return NextResponse.json(
          { error: "Erro ao criar usuário de acesso", details: createUserError.message },
          { status: 500 }
        );
      }

      const existingUser = await findAuthUserByEmail(admin, payload.customerEmail);
      if (!existingUser?.id) {
        return NextResponse.json(
          { error: "Usuário existente não localizado no Auth" },
          { status: 500 }
        );
      }

      authUserId = existingUser.id;
      createdUserId = null;
    }

    if (!authUserId) {
      return NextResponse.json(
        { error: "Usuário não disponível para provisionamento" },
        { status: 500 }
      );
    }

    const empresaId = randomUUID();
    const schemaName = buildSchemaName(payload.companyName);

    // Chaves técnicas válidas no modulos_catalogo — usadas como whitelist (dashboard é nativo e não precisa constar aqui)
    const VALID_MODULE_KEYS = new Set([
      "crm", "catalogo", "estoque", "vendas",
      "financeiro", "rh", "os", "obras", "comissoes", "relatorios"
    ]);

    // Resolver módulos: se payload.modules vazio, buscar do plano na tabela planos
    let modulesToProvision = (payload.modules || []).filter(m => VALID_MODULE_KEYS.has(m));
    if (modulesToProvision.length === 0 && payload.planName) {
      const { data: planoData } = await admin
        .from("planos")
        .select("modulos_incluidos")
        .ilike("nome", payload.planName)
        .maybeSingle();
      
      if (planoData?.modulos_incluidos && Array.isArray(planoData.modulos_incluidos)) {
        // Filtrar apenas chaves técnicas válidas — descartar strings de marketing
        modulesToProvision = (planoData.modulos_incluidos as string[]).filter(
          (m: string) => VALID_MODULE_KEYS.has(m)
        );
      }
    }

    // Fallback final: se ainda vazio, usar módulos mínimos do Starter
    if (modulesToProvision.length === 0) {
      if (!payload.planName || payload.planName.toLowerCase().includes("la carte")) {
        return NextResponse.json({ 
          error: "Seleção inválida", 
          details: "É necessário selecionar pelo menos um plano ou módulo." 
        }, { status: 400 });
      }
      modulesToProvision = ["crm", "catalogo", "estoque"];
    }

    // Chama o provisionamento
    const { data: provisionData, error: provisionError } = await admin.rpc(
      "provisionar_empresa_master",
      {
        p_empresa_id: empresaId,
        p_cnpj: payload.companyDocument.replace(/[^0-9]/g, ""),
        p_razao_social: payload.companyName,
        p_porte: payload.companySize,
        p_segmento: payload.companySegment,
        p_schema_name: schemaName,
        p_modules: modulesToProvision,
      }
    );

    if (provisionError) {
      throw new Error(provisionError.message);
    }

    const provisionResult = (provisionData ?? {}) as Record<string, unknown>;
    if (provisionResult.status && provisionResult.status !== "success") {
      console.error("Falha no provisionamento técnico:", provisionResult.message);
      return NextResponse.json({ 
        error: "Falha técnica no provisionamento", 
        details: provisionResult.message 
      }, { status: 500 });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const limiteUsuariosMap: Record<string, number> = {
      'Starter': 3, 'Business': 10, 'Pro': 50
    };
    const planKey = Object.keys(limiteUsuariosMap).find(k =>
      payload.planName?.toLowerCase().includes(k.toLowerCase())
    );
    const limiteUsuarios = planKey ? limiteUsuariosMap[planKey] : 3;

    const { error: empresaUpdateError } = await admin.from("empresas").update({
      subscription_status: "TRIAL",
      status: "ativo",
      trial_ends_at: trialEndsAt.toISOString(),
      plan_name: payload.planName || "Trial",
      limite_usuarios: limiteUsuarios,
    }).eq("id", empresaId);

    if (empresaUpdateError) {
      console.error("Erro ao atualizar status trial na empresa:", empresaUpdateError);
      throw new Error(empresaUpdateError.message);
    }

    // Cria profile do admin
    const { error: profileError } = await admin.from("user_profiles").upsert(
      {
        user_id: authUserId,
        role: "tenant_admin",
        empresa_id: empresaId,
        nome: payload.customerName,
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    // Registrar uso do cupom (se houver)
    if (payload.couponId) {
      try {
        await admin.from("cupons_utilizados").insert({
          cupom_id: payload.couponId,
          empresa_id: empresaId,
          email_usuario: payload.customerEmail
        });
        
        await admin.rpc("incrementar_uso_cupom", { p_cupom_id: payload.couponId });
      } catch (err) {
        console.error("Erro ao registrar uso de cupom:", err);
        // Não trava o fluxo principal se falhar o registro do cupom
      }
    }

    // 1. Gerar o link de confirmação oficial do Supabase
    const origin = request.headers.get("origin") || "https://fluxoprod.vercel.app";
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: payload.customerEmail,
      options: {
        redirectTo: `${origin}/login?confirmed=true`
      }
    });

    const activationLink = linkData?.properties?.action_link || undefined;

    if (linkError) {
      console.error("Erro ao gerar link de ativação:", linkError);
    }

    // 2. Enviar e-mail de boas-vindas com o link de ativação
    await sendWelcomeEmail(payload.customerEmail, payload.customerName, activationLink).catch(err => 
      console.error("Erro ao disparar e-mail de boas-vindas no trial:", err)
    );

    return NextResponse.json({
      success: true,
      message: "Conta trial criada com sucesso. Verifique seu e-mail.",
      data: {
        empresa_id: empresaId,
        auth_user_id: authUserId,
      },
    });
  } catch (error: unknown) {
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }

    return NextResponse.json(
      { 
        error: "Erro interno no registro", 
        details: error instanceof Error ? error.message : "Erro desconhecido durante o provisionamento",
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
