import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/admin'

export const runtime = 'nodejs'

interface FocusWebhookPayload {
  ref?: string
  status?: string
  cnpj_emitente?: string
  chave_nfe?: string
  numero?: string
  serie?: string
  caminho_xml_nota_fiscal?: string
  caminho_danfe?: string
  mensagem_sefaz?: string
  mensagem?: string
  [key: string]: unknown
}

function mapStatus(status: string | undefined): string {
  if (status === 'autorizado') return 'emitida'
  if (status === 'processando_autorizacao') return 'pendente'
  if (status === 'cancelado' || status === 'cancelada') return 'cancelada'
  return 'erro'
}

export async function POST(request: Request) {
  const expectedSecret = process.env.FOCUSNFE_WEBHOOK_SECRET
  if (expectedSecret && request.headers.get('x-fluxo-focus-secret') !== expectedSecret) {
    return NextResponse.json({ success: false, error: 'Webhook não autorizado.' }, { status: 401 })
  }

  try {
    const payload = await request.json() as FocusWebhookPayload
    if (!payload.ref) return NextResponse.json({ success: false, error: 'ref ausente.' }, { status: 400 })

    // A migration FocusNFe adiciona tabelas ainda ausentes do tipo gerado local.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const { data: emission, error: lookupError } = await admin
      .from('fiscal_emissoes')
      .select('id, empresa_id, venda_id, tenant_schema, status')
      .eq('provedor', 'focusnfe')
      .eq('referencia', payload.ref)
      .maybeSingle()

    if (lookupError) throw new Error(`Falha ao localizar emissão: ${lookupError.message}`)
    if (!emission) return NextResponse.json({ success: true, ignored: true })

    const status = mapStatus(payload.status)
    const update = {
      status,
      chave: payload.chave_nfe || null,
      numero: payload.numero || null,
      serie: payload.serie || null,
      xml_url: payload.caminho_xml_nota_fiscal || null,
      danfe_url: payload.caminho_danfe || null,
      resposta: payload,
      erro: status === 'erro' ? payload.mensagem_sefaz || payload.mensagem || 'Rejeição FocusNFe.' : null,
      atualizado_em: new Date().toISOString(),
    }

    const { error: updateError } = await admin
      .from('fiscal_emissoes')
      .update(update)
      .eq('id', emission.id)
    if (updateError) throw new Error(`Falha ao atualizar emissão: ${updateError.message}`)

    await admin
      .schema(emission.tenant_schema)
      .from('vendas')
      .update({
        nfe_status: status,
        nfe_chave: update.chave,
        nfe_xml_url: update.xml_url,
        nfe_pdf_url: update.danfe_url,
      })
      .eq('id', emission.venda_id)

    return NextResponse.json({ success: true, status })
  } catch (error: unknown) {
    console.error('FocusNFe webhook error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Falha no webhook FocusNFe.' },
      { status: 500 },
    )
  }
}
