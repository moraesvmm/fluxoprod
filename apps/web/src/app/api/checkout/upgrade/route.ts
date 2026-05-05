import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PaymentGatewayService, PaymentTransactionPayload } from "@/services/PaymentGatewayService";

export async function POST(request: Request) {
  try {
    const { empresaId } = await request.json();

    if (!empresaId) {
      return NextResponse.json({ error: "ID da empresa obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Obter dados da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("*, auth_user_id:user_profiles!inner(user_id, nome, auth_users!inner(email))")
      .eq("id", empresaId)
      .single();

    if (empresaError || !empresa) {
      console.error("Erro ao buscar empresa:", empresaError);
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // Obter módulos ativos para calcular o preço
    // empresa_modulos usa modulo_key (text) que referencia modulos_catalogo.key
    const { data: modulosAtivos, error: modulosError } = await supabase
      .from("empresa_modulos")
      .select("modulo_key")
      .eq("empresa_id", empresaId)
      .eq("ativo", true);

    if (modulosError) {
      console.error("Erro ao buscar módulos:", modulosError);
      return NextResponse.json({ error: "Erro ao calcular preço da assinatura" }, { status: 500 });
    }

    // Calcular o total baseado no plano da empresa (fonte da verdade: tabela planos)
    let totalValue = 0;
    const modulesNames: string[] = (modulosAtivos || []).map((m: any) => m.modulo_key);
    
    if (empresa.plan_name) {
      const { data: planoInfo } = await supabase
        .from("planos")
        .select("preco, preco_promocional")
        .ilike("nome", empresa.plan_name)
        .maybeSingle();
      
      if (planoInfo) {
        totalValue = planoInfo.preco_promocional ?? planoInfo.preco ?? 0;
      }
    }

    // Fallback: se não encontrou preço do plano
    if (totalValue === 0) {
       totalValue = 249; // Default starter value
    }

    // Extrair email do auth_user_id (vem do user_profiles join auth.users se possível)
    // Para simplificar e evitar falhas de RLS complexas no RPC admin auth,
    // Pegamos o email da sessão atual.
    const { data: userData } = await supabase.auth.getUser();
    const customerEmail = userData.user?.email || "contato@fluxo.com";
    
    // Na query de cima, tentamos pegar o nome pelo inner join `user_profiles` 
    // mas pode vir array se tiver múltiplos, vamos pegar do JWT atual
    const customerName = userData.user?.user_metadata?.nome || empresa.razao_social;

    const payload: PaymentTransactionPayload = {
      customerName,
      customerEmail,
      planName: empresa.plan_name || "Upgrade de Conta Trial",
      amount: totalValue,
      modules: modulesNames,
      companyName: empresa.razao_social,
      companyDocument: empresa.cnpj || "",
      companySize: empresa.porte || "MPE",
      companySegment: empresa.segmento || "Varejo",
      metadata: {
        empresaId: empresaId,
        isUpgrade: true
      }
    };

    const response = await PaymentGatewayService.createTransaction(payload);

    if (response.success && response.redirectUrl) {
      return NextResponse.json({ success: true, redirectUrl: response.redirectUrl });
    } else {
      return NextResponse.json({ error: response.error || "Falha na integração com gateway" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Erro no upgrade:", error);
    return NextResponse.json(
      { error: "Erro interno", details: error?.message },
      { status: 500 }
    );
  }
}
