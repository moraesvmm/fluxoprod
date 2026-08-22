import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkxtlvxotvutycbupfuh.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { to, type, text, template } = body;

    if (!to || !type) {
      return NextResponse.json(
        { error: 'Parâmetros "to" e "type" são obrigatórios.' },
        { status: 400 }
      );
    }

    // 2. Buscar a configuração mascarada para obter o phone_number_id
    const { data: config, error: configError } = await supabase.rpc('tenant_buscar_whatsapp_cloud_api');

    if (configError || !config || !config.configurado || !config.ativo) {
      return NextResponse.json(
        { error: 'WhatsApp Cloud API não está configurado ou ativo para este tenant.' },
        { status: 400 }
      );
    }

    // 3. Obter credenciais completas usando o admin client
    const supabaseAdmin = createServerClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    const { data: creds, error: credsError } = await supabaseAdmin.rpc('tenant_whatsapp_cloud_api_credentials', {
      p_phone_number_id: config.phone_number_id
    });

    if (credsError || !creds || !creds.access_token) {
      console.error('Erro ao buscar credenciais completas:', credsError);
      return NextResponse.json(
        { error: 'Erro ao acessar credenciais da Meta.' },
        { status: 500 }
      );
    }

    // 4. Enviar mensagem via Meta API
    const metaPayload = {
      messaging_product: 'whatsapp',
      to,
      type,
      ...(type === 'text' ? { text } : { template })
    };

    const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${creds.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaPayload)
    });

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error('Erro ao enviar mensagem pela Meta:', metaResult);
      return NextResponse.json(
        { error: 'Erro ao enviar mensagem via WhatsApp.', details: metaResult },
        { status: metaResponse.status }
      );
    }

    return NextResponse.json({ success: true, data: metaResult });
  } catch (err) {
    console.error('Erro interno ao enviar mensagem:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
