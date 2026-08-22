import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkxtlvxotvutycbupfuh.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU';

export async function GET(request: NextRequest) {
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

    // 2. Buscar a configuração mascarada para obter os IDs
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

    if (credsError || !creds || !creds.access_token || !creds.waba_id) {
      console.error('Erro ao buscar credenciais completas:', credsError);
      return NextResponse.json(
        { error: 'Erro ao acessar credenciais da Meta.' },
        { status: 500 }
      );
    }

    // 4. Buscar templates na Meta API
    const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${creds.waba_id}/message_templates?access_token=${creds.access_token}`, {
      method: 'GET'
    });

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error('Erro ao buscar templates da Meta:', metaResult);
      return NextResponse.json(
        { error: 'Erro ao buscar templates.', details: metaResult },
        { status: metaResponse.status }
      );
    }

    return NextResponse.json({ success: true, data: metaResult });
  } catch (err) {
    console.error('Erro interno ao buscar templates:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
