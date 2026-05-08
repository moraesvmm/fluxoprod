import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PaymentGatewayService, PaymentTransactionPayload } from "@/services/PaymentGatewayService";

export async function POST(request: Request) {
  try {
    const { empresaId, modules } = await request.json();

    if (!empresaId) {
      return NextResponse.json({ error: "ID da empresa obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 1. Obter dados da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("*, auth_user_id:user_profiles!inner(user_id, nome, auth_users!inner(email))")
      .eq("id", empresaId)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // 2. Se módulos foram enviados, sincronizar na tabela empresa_modulos
    if (modules && Array.isArray(modules)) {
      // Desativa todos primeiro (reset)
      await supabase
        .from("empresa_modulos")
        .update({ ativo: false })
        .eq("empresa_id", empresaId);

      for (const modKey of modules) {
        const { data: existing } = await supabase
          .from("empresa_modulos")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("modulo_key", modKey)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("empresa_modulos")
            .update({ ativo: true })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("empresa_modulos")
            .insert({
              empresa_id: empresaId,
              modulo_key: modKey,
              ativo: true
            });
        }
      }
    }

    // 3. Obter módulos ativos (já atualizados) para calcular o preço
    const { data: modulosAtivos, error: modulosError } = await supabase
      .from("empresa_modulos")
      .select("modulo_key")
      .eq("empresa_id", empresaId)
      .eq("ativo", true);

    if (modulosError) {
      return NextResponse.json({ error: "Erro ao calcular preço da assinatura" }, { status: 500 });
    }

    // 4. Calcular preço baseado no Plano + Módulos Extras
    let precoFinal = 0;
    let planoInfo: any = null;

    if (empresa.plan_name) {
      const { data: info } = await supabase
        .from("planos")
        .select("preco, preco_promocional, modulos_incluidos")
        .ilike("nome", empresa.plan_name)
        .maybeSingle();
      planoInfo = info;
      
      if (planoInfo) {
        precoFinal = planoInfo.preco_promocional ?? planoInfo.preco ?? 0;
      }
    }

    // Identificar módulos extras (que não estão inclusos no plano)
    const modulosAtivosKeys = (modulosAtivos || []).map(m => m.modulo_key);
    const modulosInclusosNoPlano = planoInfo?.modulos_incluidos || [];
    const extraModulesKeys = modulosAtivosKeys.filter(k => !modulosInclusosNoPlano.includes(k));

    if (extraModulesKeys.length > 0) {
      const { data: extrasInfo } = await supabase
        .from("modulos")
        .select("key, preco")
        .in("key", extraModulesKeys);
      
      if (extrasInfo) {
        const totalExtras = extrasInfo.reduce((acc, curr) => acc + (curr.preco || 0), 0);
        precoFinal += totalExtras;
      }
    }

    // 5. Atualizar valor mensal na empresa
    await supabase.from("empresas").update({
      valor_mensalidade: precoFinal,
      modulos_ativos_count: modulosAtivosKeys.length
    }).eq("id", empresaId);

    // 6. Gerar link de pagamento
    const { data: userData } = await supabase.auth.getUser();
    
    const payload: PaymentTransactionPayload = {
      customerName: userData.user?.user_metadata?.nome || empresa.razao_social,
      customerEmail: userData.user?.email || "contato@fluxo.com",
      planName: empresa.plan_name || "Plano Personalizado",
      amount: precoFinal,
      modules: modulosAtivosKeys,
      companyName: empresa.razao_social,
      companyDocument: empresa.cnpj || "",
      companySize: empresa.tamanho_empresa || "1-5",
      companySegment: empresa.segmento || "Geral",
      metadata: {
        empresaId: empresaId,
        isUpgrade: true
      }
    };

    const response = await PaymentGatewayService.createTransaction(payload);

    if (response.success && response.redirectUrl) {
      return NextResponse.json({ success: true, redirectUrl: response.redirectUrl });
    } else {
      return NextResponse.json({ error: response.error || "Falha ao gerar link de pagamento" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Erro no upgrade:", error);
    return NextResponse.json(
      { error: "Erro interno", details: error?.message },
      { status: 500 }
    );
  }
}
