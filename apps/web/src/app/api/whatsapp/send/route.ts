/**
 * WhatsApp Send API Route — Fluxo ERP
 * Envia mensagens individuais e em massa via microserviço.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = process.env.WHATSAPP_API_KEY || 'fluxo-wa-9f3k2m8x4p7q1r6t';

// POST /api/whatsapp/send — Envio individual ou em massa
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('user_profiles').select('empresa_id').eq('user_id', user.id).single();
    if (!profile?.empresa_id) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    const body = await request.json();
    const { to, message, messages, delay_ms } = body;

    // Envio em massa
    if (messages && Array.isArray(messages)) {
      const response = await fetch(`${WA_SERVICE_URL}/send-bulk`, {
        method: 'POST',
        headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': profile.empresa_id, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, delay_ms: delay_ms || 20000 }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: err.error || 'Erro no envio em massa.' }, { status: 500 });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Envio individual
    if (to && message) {
      const response = await fetch(`${WA_SERVICE_URL}/send`, {
        method: 'POST',
        headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': profile.empresa_id, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: err.error || 'Erro ao enviar.' }, { status: 500 });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Informe "to" e "message" ou "messages" (array).' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Serviço WhatsApp indisponível.' }, { status: 503 });
  }
}
