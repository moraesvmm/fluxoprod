import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMetaConfigByPhoneNumberId, getMetaConfigByVerifyToken } from '@/lib/whatsapp/meta';

function verifySignature(payload: string, signature: string | null, secret: string | null): boolean {
  if (!secret || !signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (
    params.get('hub.mode') !== 'subscribe' ||
    !(await getMetaConfigByVerifyToken(params.get('hub.verify_token') || ''))
  ) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse(params.get('hub.challenge') || '', { status: 200 });
}

export async function POST(request: NextRequest) {
  const payload = await request.text();

  try {
    const body = JSON.parse(payload) as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            metadata?: { phone_number_id?: string };
            messages?: Array<{
              id?: string;
              from?: string;
              timestamp?: string;
              type?: string;
              text?: { body?: string };
            }>;
          };
        }>;
      }>;
    };
    const firstChange = body.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId = firstChange?.metadata?.phone_number_id;
    if (!phoneNumberId) return NextResponse.json({ error: 'phone_number_id ausente.' }, { status: 400 });
    const metaConfig = await getMetaConfigByPhoneNumberId(phoneNumberId);
    if (!metaConfig?.appSecret || !verifySignature(payload, request.headers.get('x-hub-signature-256'), metaConfig.appSecret)) {
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
    }

    const admin = createAdminClient();
    let stored = 0;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const entryPhoneNumberId = value?.metadata?.phone_number_id;
        if (!entryPhoneNumberId) continue;

        const { data: config } = await admin
          .from('empresa_whatsapp_meta')
          .select('empresa_id')
          .eq('phone_number_id', entryPhoneNumberId)
          .eq('status', 'connected')
          .maybeSingle();
        if (!config?.empresa_id) continue;

        for (const message of value?.messages || []) {
          if (!message.id || !message.from) continue;
          const { error } = await admin.from('whatsapp_messages_meta').upsert({
            empresa_id: config.empresa_id,
            wa_message_id: message.id,
            phone: message.from.replace(/\D/g, ''),
            direction: 'inbound',
            message_type: message.type || 'unknown',
            body: message.text?.body || null,
            payload: message,
            occurred_at: message.timestamp
              ? new Date(Number(message.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
          }, { onConflict: 'empresa_id,wa_message_id' });
          if (!error) stored += 1;
        }
      }
    }

    return NextResponse.json({ received: true, stored });
  } catch (error) {
    console.error('Erro no webhook WhatsApp Meta:', error);
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }
}
