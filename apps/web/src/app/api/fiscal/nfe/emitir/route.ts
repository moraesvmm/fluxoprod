import { NextResponse } from 'next/server'

import { NfeService } from '@/lib/services/nfe/nfe-service'
import { emitirNfeFocus } from '@/lib/server/focus-nfe-service'
import { getAuthenticatedTenantContext } from '@/lib/server/tenant-context'
import { createAdminClient } from '@/utils/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { vendaId } = await request.json()

    if (!vendaId) {
      return NextResponse.json({ success: false, error: 'vendaId é obrigatório.' }, { status: 400 })
    }

    const { empresaId, tenantSchema } = await getAuthenticatedTenantContext()
    const admin = createAdminClient()

    const { data: empresa, error: empresaError } = await admin
      .from('empresas')
      .select('id, cnpj, razao_social, inscricao_estadual, inscricao_municipal, logradouro, numero, complemento, bairro, cidade, uf, cep, codigo_municipio_ibge, regime_tributario, nfe_ambiente, nfe_certificado_senha, fiscal_provedor, focusnfe_token_producao, focusnfe_token_homologacao')
      .eq('id', empresaId)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada ou sem acesso.' },
        { status: 404 }
      )
    }

    if (empresa.fiscal_provedor === 'focusnfe') {
      const result = await emitirNfeFocus({ admin, tenantSchema, empresa, vendaId })
      return NextResponse.json(result, { status: 'success' in result && result.success ? 200 : 400 })
    }

    const { data: certBlob, error: downloadError } = await admin.storage
      .from('fiscal')
      .download(`${empresa.id}/certificado.pfx`)

    if (downloadError || !certBlob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Certificado digital não encontrado. Faça o upload nas configurações da empresa.',
        },
        { status: 404 }
      )
    }

    const arrayBuffer = await certBlob.arrayBuffer()
    const certBase64 = Buffer.from(arrayBuffer).toString('base64')

    const result = await NfeService.emitir({
      admin,
      tenantSchema,
      empresa,
      vendaId,
      certBase64,
      certPassword: empresa.nfe_certificado_senha || '',
    })

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao emitir NFe.'
    console.error('API NFe Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
