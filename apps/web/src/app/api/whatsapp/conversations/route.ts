/**
 * WhatsApp Conversations API Route — Fluxo ERP
 * Retorna lista de conversas e mensagens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
const WA_API_KEY = process.env.WHATSAPP_API_KEY || 'fluxo-wa-secret-change-me';

// GET /api/whatsapp/conversations — Listar conversas
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const response = await fetch(`${WA_SERVICE_URL}/conversations`, {
      headers: { 'x-api-key': WA_API_KEY },
    });

    if (!response.ok) {
      return NextResponse.json({ conversations: [], totalUnread: 0 }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ conversations: [], totalUnread: 0 }, { status: 200 });
  }
}
