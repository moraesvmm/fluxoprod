import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/admin'
import { getAuthenticatedTenantContext } from '@/lib/server/tenant-context'

export async function GET() {
  try {
    const { tenantSchema } = await getAuthenticatedTenantContext()
    const admin = createAdminClient()
    const { data, error } = await admin
      .schema(tenantSchema)
      .from('produtos')
      .select('id, ncm, cfop_padrao, origem')
      .order('nome', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao carregar dados fiscais do catálogo.' },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { tenantSchema } = await getAuthenticatedTenantContext()
    const admin = createAdminClient()
    const body = await request.json()
    const produtoId = String(body?.produtoId || '')

    if (!produtoId) {
      return NextResponse.json({ success: false, error: 'produtoId é obrigatório.' }, { status: 400 })
    }

    const payload = {
      ncm: body?.ncm ? String(body.ncm).trim() : null,
      cfop_padrao: body?.cfop_padrao ? String(body.cfop_padrao).trim() : null,
      origem: Number.isFinite(Number(body?.origem)) ? Number(body.origem) : 0,
    }

    const { error } = await admin
      .schema(tenantSchema)
      .from('produtos')
      .update(payload)
      .eq('id', produtoId)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao salvar dados fiscais do produto.' },
      { status: 400 }
    )
  }
}
