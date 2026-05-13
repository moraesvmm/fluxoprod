import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/admin'

function assertRoutePayload(data: unknown): void {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const payload = data as Record<string, unknown>
    if (typeof payload.error === 'string' && payload.error) {
      throw new Error(payload.error)
    }
  }
}

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('tenant_listar_produtos_fiscal')

    if (error) {
      throw new Error(error.message)
    }

    assertRoutePayload(data)

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao carregar dados fiscais do catalogo.',
      },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient()
    const body = (await request.json()) as Record<string, unknown>
    const produtoId = String(body.produtoId || '')

    if (!produtoId) {
      return NextResponse.json({ success: false, error: 'produtoId e obrigatorio.' }, { status: 400 })
    }

    const payload = {
      p_produto_id: produtoId,
      p_ncm: body.ncm ? String(body.ncm).trim() : null,
      p_cfop_padrao: body.cfop_padrao ? String(body.cfop_padrao).trim() : null,
      p_origem: Number.isFinite(Number(body.origem)) ? Number(body.origem) : 0,
    }

    const { data, error } = await admin.rpc('tenant_atualizar_produto_fiscal', payload)

    if (error) {
      throw new Error(error.message)
    }

    assertRoutePayload(data)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao salvar dados fiscais do produto.',
      },
      { status: 400 }
    )
  }
}
