/**
 * WhatsApp Status API Route — Fluxo ERP
 * Retorna o status da conexão WhatsApp do tenant.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getMetaConfig, metaGraphRequest } from '@/lib/whatsapp/meta';

// Garantir que a URL não tenha barra no final e seja lida corretamente
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

    const metaConfig = await getMetaConfig(profile.empresa_id);
    if (metaConfig && metaConfig.status === 'disabled') {
      return NextResponse.json({ status: 'disconnected', connected: false, provider: 'meta', serviceDown: false }, { status: 200 });
    }
    if (metaConfig) {
      const response = await metaGraphRequest(metaConfig.phone_number_id, metaConfig.accessToken, {
        searchParams: { fields: 'display_phone_number,verified_name,quality_rating' },
      });
      if (!response.ok) {
        return NextResponse.json({ status: 'error', connected: false, provider: 'meta', serviceDown: false }, { status: 200 });
      }
      const data = await response.json() as Record<string, unknown>;
      return NextResponse.json({
        ...data,
        status: 'connected',
        connected: true,
        provider: 'meta',
        display_phone_number: metaConfig.display_phone_number,
        verified_name: metaConfig.verified_name,
      });
    }

    if (!WA_API_KEY) return NextResponse.json({ status: 'disconnected', connected: false, serviceDown: true }, { status: 200 });
    const response = await fetch(`${WA_SERVICE_URL}/status`, {
      headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': profile.empresa_id },
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
