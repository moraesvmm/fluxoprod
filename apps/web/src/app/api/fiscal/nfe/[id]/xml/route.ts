import { NextResponse } from 'next/server'

import { getAuthenticatedTenantContext } from '@/lib/server/tenant-context'
import { createAdminClient } from '@/utils/supabase/admin'

export const runtime = 'nodejs'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { tenantSchema } = await getAuthenticatedTenantContext()
    const admin = createAdminClient()

    const { data: venda, error } = await admin
      .schema(tenantSchema)
      .from('vendas')
      .select('nfe_xml, nfe_xml_url')
      .eq('id', id)
      .single()

    if (error || !venda) {
      return NextResponse.json({ success: false, error: 'NFe não encontrada.' }, { status: 404 })
    }

    if (venda.nfe_xml) {
      return new NextResponse(venda.nfe_xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      })
    }

    if (venda.nfe_xml_url) {
      const xmlPath = String(venda.nfe_xml_url)
      if (xmlPath.startsWith('http://') || xmlPath.startsWith('https://')) {
        const forwarded = await fetch(xmlPath, { cache: 'no-store' })
        const xml = await forwarded.text()
        return new NextResponse(xml, {
          status: forwarded.ok ? 200 : 404,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
          },
        })
      }

      const { data: xmlBlob, error: downloadError } = await admin.storage
        .from('fiscal')
        .download(xmlPath)

      if (downloadError || !xmlBlob) {
        return NextResponse.json({ success: false, error: 'XML fiscal não encontrado no storage.' }, { status: 404 })
      }

      return new NextResponse(await xmlBlob.text(), {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      })
    }

    return NextResponse.json({ success: false, error: 'XML da NFe ainda não disponível.' }, { status: 404 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao carregar XML da NFe.' },
      { status: 400 }
    )
  }
}
