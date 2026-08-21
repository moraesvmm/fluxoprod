/**
 * WhatsApp Conversations API Route — Fluxo ERP
 * Retorna lista de conversas e mensagens.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMetaConfig } from '@/lib/whatsapp/meta';

const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = process.env.WHATSAPP_API_KEY;

// GET /api/whatsapp/conversations — Listar conversas
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('user_profiles').select('empresa_id').eq('user_id', user.id).single();
    if (!profile?.empresa_id) return NextResponse.json({ conversations: [], totalUnread: 0 }, { status: 200 });

    const metaConfig = await getMetaConfig(profile.empresa_id);
    if (metaConfig) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('whatsapp_messages_meta')
        .select('phone, direction, body, occurred_at')
        .eq('empresa_id', profile.empresa_id)
        .order('occurred_at', { ascending: false })
        .limit(1000);
      if (error) throw error;

      const conversations = new Map<string, {
        phone: string;
        name: string;
        lastMessage: string;
        lastTimestamp: number;
        unreadCount: number;
      }>();
      for (const item of (data || []) as Array<Record<string, unknown>>) {
        const phone = String(item.phone || '');
        if (!phone || conversations.has(phone)) continue;
        conversations.set(phone, {
          phone,
          name: phone,
          lastMessage: String(item.body || ''),
          lastTimestamp: new Date(String(item.occurred_at)).getTime(),
          unreadCount: item.direction === 'inbound' ? 1 : 0,
        });
      }
      return NextResponse.json({ provider: 'meta', conversations: [...conversations.values()], totalUnread: 0 });
    }

    if (!WA_API_KEY) return NextResponse.json({ conversations: [], totalUnread: 0, serviceDown: true }, { status: 200 });
    const response = await fetch(`${WA_SERVICE_URL}/conversations`, {
      headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': profile.empresa_id },
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
