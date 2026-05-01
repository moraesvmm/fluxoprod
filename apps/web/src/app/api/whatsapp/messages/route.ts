/**
 * WhatsApp Messages API Route — Fluxo ERP
 * Retorna mensagens de uma conversa específica e marca como lidas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = process.env.WHATSAPP_API_KEY || 'fluxo-wa-secret-change-me';

// GET /api/whatsapp/messages?phone=5511... — Obter mensagens de uma conversa
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Parâmetro "phone" é obrigatório.' }, { status: 400 });
    }

    const response = await fetch(`${WA_SERVICE_URL}/messages/${phone}`, {
      headers: { 'x-api-key': WA_API_KEY },
    });

    if (!response.ok) {
      return NextResponse.json({ phone, messages: [], totalUnread: 0 }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ phone: '', messages: [], totalUnread: 0 }, { status: 200 });
  }
}
