import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkxtlvxotvutycbupfuh.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU';

export async function GET(request: NextRequest) {
  /**
   * Verificação do Webhook pela Meta.
   * A Meta envia hub.mode=subscribe, hub.verify_token e hub.challenge.
   * Validamos o verify_token contra TODOS os tenants via RPC dedicada.
   * Cada tenant possui um verify_token único gerado automaticamente.
   */
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  if (mode !== 'subscribe' || !token || !challenge) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }
  
  try {
    const supabaseAdmin = createServerClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Verificar se algum tenant ativo possui este verify_token
    const { data: isValid, error } = await supabaseAdmin.rpc('webhook_verificar_token_whatsapp', {
      p_verify_token: token,
    });

    if (error || !isValid) {
      console.error('Webhook verify: token não encontrado em nenhum tenant:', token);
      return NextResponse.json({ error: 'Token de verificação inválido' }, { status: 403 });
    }

    // Token válido — retornar o challenge para confirmar o webhook
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (err) {
    console.error('Erro na verificação do webhook:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Retornar 200 o mais rápido possível (requisito da Meta)
    const response = NextResponse.json({ success: true }, { status: 200 });
    
    // Validação básica do payload
    if (body.object !== 'whatsapp_business_account' || !body.entry || !body.entry.length) {
      return response;
    }

    const entry = body.entry[0];
    const changes = entry.changes && entry.changes[0];
    
    if (!changes || !changes.value || !changes.value.metadata) {
      return response;
    }

    // Extrair o phone_number_id do payload do webhook
    const phone_number_id = changes.value.metadata.phone_number_id;

    if (!phone_number_id) {
      return response;
    }

    const supabaseAdmin = createServerClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Buscar credenciais completas via RPC para identificar qual tenant corresponde a este número
    const { data: creds, error } = await supabaseAdmin.rpc('tenant_whatsapp_cloud_api_credentials', {
      p_phone_number_id: phone_number_id
    });

    if (error || !creds) {
      console.error('Webhook: Tenant não encontrado para o phone_number_id:', phone_number_id);
      return response;
    }

    // O tenant foi identificado. O schema e detalhes estariam disponíveis nos metadados 
    // ou na sessão caso fosse processar internamente.
    // Aqui processamos os status das mensagens ou as mensagens recebidas:
    
    if (changes.value.messages) {
      console.log('Mensagens recebidas:', changes.value.messages);
      // TODO: Salvar mensagem recebida no banco de dados do tenant correspondente
    }
    
    if (changes.value.statuses) {
      console.log('Atualização de status:', changes.value.statuses);
      // TODO: Atualizar status da mensagem (entregue, lida, falha) no banco de dados
    }

    return response;
  } catch (err) {
    console.error('Erro interno no webhook:', err);
    // Para webhooks, mesmo em erro é recomendado retornar 200 se for um erro de processamento nosso,
    // para evitar que a Meta fique re-enviando indefinidamente, a menos que queiramos retentativas.
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
