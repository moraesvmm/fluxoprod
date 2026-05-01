/**
 * WhatsApp Media Proxy Route — Fluxo ERP
 * Serve arquivos binários (áudio, imagens) do microserviço.
 */

import { NextRequest, NextResponse } from 'next/server';

const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = process.env.WHATSAPP_API_KEY || 'fluxo-wa-9f3k2m8x4p7q1r6t';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const response = await fetch(`${WA_SERVICE_URL}/media/${id}`, {
      headers: { 'x-api-key': WA_API_KEY },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Mídia não encontrada' }, { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Erro no proxy de mídia WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
