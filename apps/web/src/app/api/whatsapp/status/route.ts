/**
 * WhatsApp Status API Route — Fluxo ERP
 * Retorna o status da conexão WhatsApp do tenant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Garantir que a URL não tenha barra no final e seja lida corretamente
const WA_SERVICE_URL = (process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001').replace(/\/$/, '');
const WA_API_KEY = process.env.WHATSAPP_API_KEY || 'fluxo-wa-secret-change-me';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const response = await fetch(`${WA_SERVICE_URL}/status`, {
      headers: { 'x-api-key': WA_API_KEY },
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: 'disconnected', connected: false, totalUnread: 0, serviceDown: true },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // Se o microserviço estiver fora do ar, retornar estado "desconectado" sem quebrar o frontend
    return NextResponse.json(
      { status: 'disconnected', connected: false, totalUnread: 0, serviceDown: true },
      { status: 200 }
    );
  }
}
