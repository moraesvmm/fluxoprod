import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PaymentGatewayService } from '@/services/PaymentGatewayService';

// Supabase client instance with SERVICE_ROLE to bypass RLS and perform Administrative RPC.
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl) {
    console.warn("⚠️ URL do Supabase não configurada para o Webhook!");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: Request) {
  try {
    const payloadBuffer = await request.text();
    let body;
    
    try {
      body = JSON.parse(payloadBuffer);
    } catch {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    // 1. Validação de Assinatura do Webhook (Asaas Token)
    const signature = request.headers.get('asaas-access-token') || request.headers.get('x-gateway-signature') || '';
    const isValid = PaymentGatewayService.verifyWebhookSignature(signature, payloadBuffer);
    
    if (!isValid) {
      console.error("❌ Assinatura/Token do Webhook Inválida!");
      return NextResponse.json({ error: "Assinatura Inválida" }, { status: 403 });
    }

    console.log("📥 Webhook Recebido:", body.event, body.payment?.id);

    // Eventos de sucesso financeiro no Asaas
    const successEvents = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];
    if (!successEvents.includes(body.event)) {
      return NextResponse.json({ message: "Evento ignorado" }, { status: 200 });
    }

    const payment = body.payment;
    const metadata = payment.metadata || {};

    // No Asaas, o customer pode vir como ID, mas nós salvamos os dados no metadata no createTransaction
    // para garantir que o webhook tenha tudo que o provisionamento precisa.
    const rpcPayload = {
      p_transaction_id: String(payment.id),
      p_cliente_nome: String(metadata.customerName || 'Cliente Asaas'),
      p_email: String(metadata.customerEmail || ''),
      p_senha: String(metadata.password || ''), 
      p_cnpj: String(metadata.companyDocument || '00.000.000/0000-00'),
      p_razao_social: String(metadata.companyName || ''),
      p_porte: String(metadata.companySize || 'MPE'),
      p_segmento: String(metadata.companySegment || 'Varejo'),
      p_valor_total: Number(payment.value || 0),
      p_modules: typeof metadata.modules === 'string' ? JSON.parse(metadata.modules) : (metadata.modules || []),
      p_gateway_payload: body 
    };

    if (!rpcPayload.p_email || !rpcPayload.p_senha) {
      console.warn("⚠️ Webhook ignorado: Faltando e-mail ou senha no metadata para provisionamento.");
      return NextResponse.json({ message: "Dados insuficientes no metadata." }, { status: 200 });
    }

    const supabaseAdmin = getAdminSupabase();

    // 2. Chamada Roteada Transacional
    console.log("🔄 Iniciando Provisionamento Atômico para:", rpcPayload.p_email);
    
    const { data: dbResult, error: rpcError } = await supabaseAdmin.rpc(
      'webhook_provisionar_assinatura', 
      rpcPayload
    );

    if (rpcError) {
      console.error("❌ Erro na RPC webhook_provisionar_assinatura:", rpcError);
      return NextResponse.json({ 
        error: "Erro no Banco de Dados durante Provisionamento", 
        details: rpcError.message 
      }, { status: 500 });
    }

    console.log("✅ Provisionamento Concluído com Sucesso:", dbResult);
    
    return NextResponse.json({ 
      success: true, 
      message: "Webhook processado e Tenant provisionado.",
      data: dbResult
    });

  } catch (error: any) {
    console.error("❌ Erro catastrófico no endpoint Webhook:", error);
    return NextResponse.json({ error: "Erro interno do Webhook Handler" }, { status: 500 });
  }
}
