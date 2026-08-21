/**
 * WhatsApp Send API Route — Fluxo ERP
 * Envia mensagens individuais e em massa via microserviço.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getMetaConfig, metaSendText, storeMetaOutboundMessage } from '@/lib/whatsapp/meta';

const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = process.env.WHATSAPP_API_KEY;

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

    const metaConfig = await getMetaConfig(profile.empresa_id);

    const body = await request.json();
    const { to, message, messages, delay_ms } = body;

    if (metaConfig && metaConfig.status === 'disabled') {
      return NextResponse.json({ error: 'WhatsApp Meta está desativado.' }, { status: 503 });
    }
    if (metaConfig) {
      const batch = Array.isArray(messages) ? messages : to && message ? [{ to, message }] : [];
      if (batch.length === 0) return NextResponse.json({ error: 'Informe destinatário e mensagem.' }, { status: 400 });
      if (batch.length > 100) return NextResponse.json({ error: 'O envio está limitado a 100 mensagens por operação.' }, { status: 400 });

      let enviados = 0;
      const errors: string[] = [];
      for (const item of batch) {
        if (typeof item?.to !== 'string' || typeof item?.message !== 'string' || !item.message.trim()) {
          errors.push('Destinatário ou mensagem inválidos.');
          continue;
        }
        const phone = item.to.replace(/\D/g, '');
        if (!/^\d{8,15}$/.test(phone) || item.message.length > 4096) {
          errors.push(`Mensagem inválida para ${item.to}.`);
          continue;
        }
        const response = await metaSendText(metaConfig, phone, item.message.trim());
        if (response.ok) {
          const result = await response.json() as { messages?: Array<{ id?: string }> };
          if (result.messages?.[0]?.id) {
            await storeMetaOutboundMessage({ empresaId: profile.empresa_id, phone, body: item.message.trim(), messageId: result.messages[0].id });
          }
          enviados += 1;
        } else errors.push((await response.json().catch(() => ({})) as { error?: { message?: string } }).error?.message || 'Falha na Meta.');
        if (batch.length > 1) await new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(Number(delay_ms) || 1000, 1000), 60000)));
      }
      return NextResponse.json({ success: errors.length === 0, provider: 'meta', enviados, total: batch.length, errors });
    }
    if (!WA_API_KEY) return NextResponse.json({ error: 'WhatsApp Meta não configurado.' }, { status: 503 });

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
