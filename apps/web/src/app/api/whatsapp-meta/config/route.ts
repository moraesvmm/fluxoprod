import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.rpc('tenant_buscar_whatsapp_cloud_api');

    if (error) {
      console.error('Erro ao buscar configuração do WhatsApp Cloud API:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { access_token, phone_number_id, waba_id } = body;

    if (!access_token || !phone_number_id || !waba_id) {
      return NextResponse.json(
        { error: 'Parâmetros ausentes. É necessário access_token, phone_number_id e waba_id.' },
        { status: 400 }
      );
    }

    // Validar as credenciais com a API da Meta
    const metaVerifyResponse = await fetch(`https://graph.facebook.com/v21.0/${phone_number_id}?access_token=${access_token}`, {
      method: 'GET'
    });

    if (!metaVerifyResponse.ok) {
      const metaError = await metaVerifyResponse.json();
      console.error('Erro na validação da Meta:', metaError);
      return NextResponse.json(
        { error: 'As credenciais fornecidas são inválidas ou o token não possui permissão para este ID de telefone.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('tenant_salvar_whatsapp_cloud_api', {
      p_access_token: access_token,
      p_phone_number_id: phone_number_id,
      p_waba_id: waba_id
    });

    if (error) {
      console.error('Erro ao salvar configuração do WhatsApp Cloud API:', error);
      return NextResponse.json(
        { error: 'Erro ao salvar configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { error } = await supabase.rpc('tenant_remover_whatsapp_cloud_api');

    if (error) {
      console.error('Erro ao remover configuração do WhatsApp Cloud API:', error);
      return NextResponse.json(
        { error: 'Erro ao remover configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro interno:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
