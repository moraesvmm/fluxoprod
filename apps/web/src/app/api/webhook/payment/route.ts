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

    // 1. Validação de Assinatura do Webhook (Idempotência e Segurança)
    const signature = request.headers.get('x-gateway-signature') || '';
    const isValid = PaymentGatewayService.verifyWebhookSignature(signature, payloadBuffer);
    
    if (!isValid) {
      console.error("❌ Assinatura do Webhook Inválida!");
      return NextResponse.json({ error: "Assinatura Inválida" }, { status: 403 });
    }

    // Adaptador de payload (Isso dependerá da documentação do Gateway real, ex: VisionPay, AbacatePay)
    // Para simplificar, assumiremos formato padrão que desenhamos no Frontend.
    // Lembre-se: em produção, o gateway geralmente manda algo como req.body.data.id, req.body.type === 'payment.succeeded'.
    const eventType = body.type || 'payment.succeeded'; 
    
    if (eventType !== 'payment.succeeded' && eventType !== 'paid') {
      return NextResponse.json({ message: "Evento ignorado (não é de sucesso financeiro)" }, { status: 200 });
    }

    const transactionId = body.transactionId || body.id;
    const metadata = body.metadata || {};
    const customer = body.customer || {};

    const requiredFields = [transactionId, customer.name, customer.email, metadata.companyName, metadata.password];
    if (requiredFields.some(field => !field)) {
      console.warn("⚠️ Webhook ignorado: Faltando informações obrigatórias no metadata", requiredFields);
      // Retornar 200 para que o gateway não fique "retentando" algo malformado incondicionalmente
      return NextResponse.json({ message: "Payload insuficiente para provisionamento." }, { status: 200 });
    }

    // Aqui mapeamos os dados recebidos para o nosso banco
    const rpcPayload = {
      p_transaction_id: String(transactionId),
      p_cliente_nome: String(customer.name),
      p_email: String(customer.email),
      p_senha: String(metadata.password), 
      p_cnpj: String(customer.document || '00.000.000/0000-00'),
      p_razao_social: String(metadata.companyName),
      p_porte: String(metadata.companySize || 'MPE'),
      p_segmento: String(metadata.companySegment || 'Tecnologia'),
      p_valor_total: Number(body.amount || metadata.amount || 0),
      p_modules: metadata.modules || [],
      p_gateway_payload: body // Salvamos tudo para auditoria na tabela 'webhook_audit_log'
    };

    const supabaseAdmin = getAdminSupabase();

    // 2. Chamada Roteada Transacional (Tudo ocorre dentro do banco atômico!)
    console.log("🔄 Processando Venda e Provisionamento Mestre Atômico:", transactionId);
    
    const { data: dbResult, error: rpcError } = await supabaseAdmin.rpc(
      'webhook_provisionar_assinatura', 
      rpcPayload
    );

    if (rpcError) {
      console.error("❌ Falha Transacional de Banco:", rpcError);
      
      // Dependendo da estratégia do Gateway, retornamos 500 para acionar Retry.
      // E usamos transações no Postgres, o que significa que se algo falhou, não deixou lixo.
      return NextResponse.json({ 
        error: "Erro no Banco de Dados durante Provisionamento", 
        details: rpcError.message 
      }, { status: 500 });
    }

    console.log("✅ Venda processada e Tenant Provisionado Atômico:", dbResult);
    
    // Suporte transacional confirmando webhook (Idempotente)
    return NextResponse.json({ 
      success: true, 
      message: "Webhook recebido e Provisionamento realizado com sucesso",
      data: dbResult
    });

  } catch (error: any) {
    console.error("❌ Erro catastrófico no endpoint Webhook:", error);
    return NextResponse.json({ error: "Erro interno do Webhook Handler" }, { status: 500 });
  }
}
