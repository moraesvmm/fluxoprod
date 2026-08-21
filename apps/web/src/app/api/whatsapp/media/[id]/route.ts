/**
 * WhatsApp Media Proxy Route — Fluxo ERP
 * Serve arquivos binários (áudio, imagens) do microserviço.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getMetaConfig, metaGraphRequest } from '@/lib/whatsapp/meta';

const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = process.env.WHATSAPP_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const { data: profile } = await supabase.from('user_profiles').select('empresa_id').eq('user_id', user.id).single();
    if (!profile?.empresa_id) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    const metaConfig = await getMetaConfig(profile.empresa_id);
    if (metaConfig && metaConfig.status === 'disabled') {
      return NextResponse.json({ error: 'WhatsApp Meta está desativado.' }, { status: 503 });
    }
    if (metaConfig) {
      const metadataResponse = await metaGraphRequest(id, metaConfig.accessToken);
      if (!metadataResponse.ok) return NextResponse.json({ error: 'Mídia não encontrada' }, { status: 404 });
      const metadata = await metadataResponse.json() as { url?: string; mime_type?: string };
      if (!metadata.url) return NextResponse.json({ error: 'URL da mídia não encontrada' }, { status: 404 });
      const mediaResponse = await fetch(metadata.url, { headers: { Authorization: `Bearer ${metaConfig.accessToken}` }, cache: 'no-store' });
      if (!mediaResponse.ok) return NextResponse.json({ error: 'Mídia não encontrada' }, { status: 404 });
      return new NextResponse(await mediaResponse.arrayBuffer(), {
        headers: {
          'Content-Type': metadata.mime_type || mediaResponse.headers.get('Content-Type') || 'application/octet-stream',
          'Cache-Control': 'private, max-age=300',
        },
      });
    }
    if (!WA_API_KEY) return NextResponse.json({ error: 'WhatsApp Meta não configurado.' }, { status: 503 });

    const response = await fetch(`${WA_SERVICE_URL}/media/${id}`, {
      headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': profile.empresa_id },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Mídia não encontrada' }, { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Erro no proxy de mídia WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
