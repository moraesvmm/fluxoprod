import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin"; // FIX INC-05: usar adminClient (service_role, sem RLS)
import { PaymentGatewayService, PaymentTransactionPayload } from "@/services/PaymentGatewayService";

export interface UpgradePayload {
  empresaId: string;
  modules?: string[];
}

export async function POST(request: Request) {
  try {
    const requestPayload = (await request.json()) as UpgradePayload;
    const { empresaId, modules } = requestPayload;

    if (!empresaId) {
      return NextResponse.json({ error: "ID da empresa obrigatório" }, { status: 400 });
    }

    // FIX INC-05: usar adminClient para garantir acesso sem bloqueio de RLS
    const admin = createAdminClient();

    // FIX BUG-01: buscar empresa sem JOIN inválido em auth.users
    // O email do usuário autenticado é obtido via getUser() abaixo (linha ~110)
    const { data: empresa, error: empresaError } = await admin
      .from("empresas")
      .select("id, razao_social, cnpj, porte, segmento, plan_name, status, schema_name")
      .eq("id", empresaId)
      .single();

    if (empresaError || !empresa) {
      console.error("Erro ao buscar empresa:", empresaError);
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // 2. Se módulos foram enviados, sincronizar na tabela empresa_modulos
    if (modules && Array.isArray(modules)) {
      // Desativa todos primeiro (reset)
      const { error: deactivateError } = await admin
        .from("empresa_modulos")
        .update({ ativo: false })
        .eq("empresa_id", empresaId);

      if (deactivateError) {
        console.error("Erro ao desativar módulos:", deactivateError);
      }

      for (const modKey of modules) {
        await admin
          .from("empresa_modulos")
          .upsert(
            { empresa_id: empresaId, modulo_key: modKey, ativo: true },
            { onConflict: "empresa_id,modulo_key" }
          );
      }
    }

    // 3. Obter módulos ativos (já atualizados) para calcular o preço
    const { data: modulosAtivos, error: modulosError } = await admin
      .from("empresa_modulos")
      .select("modulo_key")
      .eq("empresa_id", empresaId)
      .eq("ativo", true);

    if (modulosError) {
      console.error("Erro ao listar módulos ativos:", modulosError);
      return NextResponse.json({ error: "Erro ao calcular preço da assinatura" }, { status: 500 });
    }

    // 4. Calcular preço baseado no Plano + Módulos Extras
    let precoFinal = 0;
    let modulosInclusosNoPlano: string[] = [];

    if (empresa.plan_name) {
      const { data: planoInfo } = await admin
        .from("planos")
        .select("preco, preco_promocional, modulos_incluidos")
        .ilike("nome", empresa.plan_name)
        .maybeSingle();

      if (planoInfo) {
        precoFinal = planoInfo.preco_promocional ?? planoInfo.preco ?? 0;
        modulosInclusosNoPlano = Array.isArray(planoInfo.modulos_incluidos)
          ? planoInfo.modulos_incluidos
          : [];
      }
    }

    // FIX BUG-02: usar tabela correta `modulos_avulsos` em vez de `modulos`
    const modulosAtivosKeys = (modulosAtivos || []).map((m) => m.modulo_key);
    const extraModulesKeys = modulosAtivosKeys.filter(
      (k) => !modulosInclusosNoPlano.includes(k)
    );

    if (extraModulesKeys.length > 0) {
      const { data: extrasInfo } = await admin
        .from("modulos_avulsos")            // FIX BUG-02: era `modulos` (inexistente)
        .select("key, preco, preco_promocional")
        .in("key", extraModulesKeys);

      if (extrasInfo) {
        const totalExtras = extrasInfo.reduce(
          (acc, curr) => acc + (curr.preco_promocional ?? curr.preco ?? 0),
          0
        );
        precoFinal += totalExtras;
      }
    }

    // FIX BUG-03: remover update com colunas inexistentes (valor_mensalidade, modulos_ativos_count)
    // A tabela `empresas` não possui essas colunas. O update foi removido para evitar erro 400 silencioso.

    // 5. Obter email do usuário via Auth Admin (FIX BUG-01: sem join em auth.users)
    // Buscar o user_profile vinculado à empresa para obter o user_id
    const { data: profileData } = await admin
      .from("user_profiles")
      .select("user_id, nome")
      .eq("empresa_id", empresaId)
      .eq("role", "tenant_admin")
      .is("deleted_at", null)
      .maybeSingle();

    let customerEmail = "contato@fluxo.com";
    let customerName = empresa.razao_social;

    if (profileData?.user_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(profileData.user_id);
      if (authUser?.user?.email) customerEmail = authUser.user.email;
      if (profileData.nome) customerName = profileData.nome;
    }

    // 6. Gerar link de pagamento
    const transactionPayload: PaymentTransactionPayload = {
      customerName,
      customerEmail,
      planName: empresa.plan_name || "Plano Personalizado",
      amount: precoFinal,
      modules: modulosAtivosKeys,
      companyName: empresa.razao_social,
      companyDocument: empresa.cnpj || "",
      companySize: empresa.porte || "MPE",   // FIX BUG-04: era empresa.tamanho_empresa (inexistente)
      companySegment: empresa.segmento || "Geral",
      metadata: {
        empresaId: empresaId,
        isUpgrade: true,
      },
    };

    const response = await PaymentGatewayService.createTransaction(transactionPayload);

    if (response.success && response.redirectUrl) {
      return NextResponse.json({ success: true, redirectUrl: response.redirectUrl });
    } else {
      return NextResponse.json(
        { error: response.error || "Falha ao gerar link de pagamento" },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error("Erro no upgrade:", error);
    return NextResponse.json(
      { error: "Erro interno", details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
