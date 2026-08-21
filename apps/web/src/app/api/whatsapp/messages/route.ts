/**
 * WhatsApp Messages API Route — Fluxo ERP
 * Retorna mensagens de uma conversa específica e marca como lidas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMetaConfig } from '@/lib/whatsapp/meta';

const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = process.env.WHATSAPP_API_KEY;

// GET /api/whatsapp/messages?phone=5511... — Obter mensagens de uma conversa
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('user_profiles').select('empresa_id').eq('user_id', user.id).single();
    if (!profile?.empresa_id) return NextResponse.json({ phone: '', messages: [], totalUnread: 0 }, { status: 200 });

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Parâmetro "phone" é obrigatório.' }, { status: 400 });
    }

    const metaConfig = await getMetaConfig(profile.empresa_id);
    if (metaConfig) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('whatsapp_messages_meta')
        .select('id, phone, direction, message_type, body, occurred_at, wa_message_id')
        .eq('empresa_id', profile.empresa_id)
        .eq('phone', phone.replace(/\D/g, ''))
        .order('occurred_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return NextResponse.json({
        phone,
        provider: 'meta',
        totalUnread: 0,
        messages: (data || []).map((item: Record<string, unknown>) => ({
          id: item.id || item.wa_message_id,
          from: item.direction === 'inbound' ? item.phone : metaConfig.phone_number_id,
          to: item.direction === 'inbound' ? metaConfig.phone_number_id : item.phone,
          text: item.body || '',
          timestamp: new Date(String(item.occurred_at)).getTime(),
          fromMe: item.direction === 'outbound',
          type: item.message_type || 'text',
        })),
      });
    }

    if (!WA_API_KEY) return NextResponse.json({ phone, messages: [], totalUnread: 0, serviceDown: true }, { status: 200 });
    const response = await fetch(`${WA_SERVICE_URL}/messages/${encodeURIComponent(phone)}`, {
      headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': profile.empresa_id },
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
