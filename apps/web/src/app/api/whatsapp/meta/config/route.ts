import { NextRequest, NextResponse } from 'next/server';
import {
  disableMetaConfig,
  getAuthenticatedEmpresaId,
  getMetaConfig,
  saveMetaConfig,
  summarizeMetaConfig,
} from '@/lib/whatsapp/meta';

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (message === 'COMPANY_NOT_FOUND') return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });
  if (message === 'META_TOKEN_INVALID') return NextResponse.json({ error: 'Token Meta ou número de telefone inválido.' }, { status: 422 });
  if (message.endsWith('_INVALID')) return NextResponse.json({ error: 'Dados da configuração Meta inválidos.' }, { status: 400 });
  console.error('Erro na configuração Meta WhatsApp:', error);
  return NextResponse.json({ error: 'Não foi possível configurar o WhatsApp Meta.' }, { status: 500 });
}

export async function GET() {
  try {
    const empresaId = await getAuthenticatedEmpresaId();
    const config = await getMetaConfig(empresaId);
    return NextResponse.json({ configured: Boolean(config), config: config ? summarizeMetaConfig(config) : null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const empresaId = await getAuthenticatedEmpresaId();
    const body = await request.json() as Record<string, unknown>;
    const phoneNumberId = typeof body.phoneNumberId === 'string' ? body.phoneNumberId.trim() : '';
    const wabaId = typeof body.wabaId === 'string' ? body.wabaId.trim() : undefined;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const appSecret = typeof body.appSecret === 'string' ? body.appSecret.trim() : '';
    const verifyToken = typeof body.verifyToken === 'string' ? body.verifyToken.trim() : '';
    const config = await saveMetaConfig({ empresaId, phoneNumberId, wabaId, accessToken, appSecret, verifyToken });
    return NextResponse.json({ configured: true, config });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    const empresaId = await getAuthenticatedEmpresaId();
    await disableMetaConfig(empresaId);
    return NextResponse.json({ configured: false });
  } catch (error) {
    return errorResponse(error);
  }
}
