/**
 * WhatsApp Disconnect API Route — Fluxo ERP
 * Desconecta a sessão WhatsApp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
const WA_API_KEY = process.env.WHATSAPP_API_KEY || 'fluxo-wa-secret-change-me';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const response = await fetch(`${WA_SERVICE_URL}/disconnect`, {
      method: 'POST',
      headers: { 'x-api-key': WA_API_KEY, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro ao desconectar.' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Serviço WhatsApp indisponível.' }, { status: 503 });
  }
}
