/**
 * WhatsApp QR Code API Route — Fluxo ERP
 * Retorna o QR Code para pareamento.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
const WA_API_KEY = process.env.WHATSAPP_API_KEY || 'fluxo-wa-secret-change-me';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const response = await fetch(`${WA_SERVICE_URL}/qr`, {
      headers: { 'x-api-key': WA_API_KEY },
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
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const response = await fetch(`${WA_SERVICE_URL}/connect`, {
      method: 'POST',
      headers: { 'x-api-key': WA_API_KEY, 'Content-Type': 'application/json' },
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
