/**
 * WhatsApp QR Code API Route — Fluxo ERP
 * Retorna o QR Code para pareamento.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getMetaConfig } from '@/lib/whatsapp/meta';

const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = process.env.WHATSAPP_API_KEY;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('user_profiles').select('empresa_id').eq('user_id', user.id).single();
    if (!profile?.empresa_id) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });
    if (await getMetaConfig(profile.empresa_id)) return NextResponse.json({ error: 'Este tenant usa conexão Meta; QR Code não está disponível.' }, { status: 409 });
    if (!WA_API_KEY) return NextResponse.json({ error: 'WhatsApp Meta não configurado.' }, { status: 503 });

    const response = await fetch(`${WA_SERVICE_URL}/qr`, {
      headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': profile.empresa_id },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Serviço WhatsApp indisponível.' }, { status: 503 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Serviço WhatsApp indisponível.' }, { status: 503 });
  }
}

// POST /api/whatsapp/qr — Iniciar conexão
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('user_profiles').select('empresa_id').eq('user_id', user.id).single();
    if (!profile?.empresa_id) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });
    if (await getMetaConfig(profile.empresa_id)) return NextResponse.json({ error: 'Este tenant usa conexão Meta; QR Code não está disponível.' }, { status: 409 });
    if (!WA_API_KEY) return NextResponse.json({ error: 'WhatsApp Meta não configurado.' }, { status: 503 });

    const response = await fetch(`${WA_SERVICE_URL}/connect`, {
      method: 'POST',
      headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': profile.empresa_id, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro ao iniciar conexão.' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Serviço WhatsApp indisponível.' }, { status: 503 });
  }
}
