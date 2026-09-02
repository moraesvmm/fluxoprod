import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('tenant_listar_produtos_fiscal')

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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
    }

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
      p_tipo_item: body.tipo_item ? String(body.tipo_item).trim() : null,
      p_unidade_medida: body.unidade_medida ? String(body.unidade_medida).trim() : null,
    }

    const { data, error } = await supabase.rpc('tenant_atualizar_produto_fiscal', payload)

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
