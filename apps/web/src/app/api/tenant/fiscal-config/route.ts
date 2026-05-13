import { NextResponse } from 'next/server'

import { getFiscalConfig, updateFiscalConfig } from '@/lib/server/fiscal-config'
import { getAuthenticatedTenantContext } from '@/lib/server/tenant-context'

function isMasterTenantContextError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return message.includes('master') && message.includes('tenant')
}

function getRouteErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function GET() {
  try {
    const { empresaId } = await getAuthenticatedTenantContext()
    const config = await getFiscalConfig(empresaId)
    return NextResponse.json({ success: true, config })
  } catch (error: unknown) {
    if (isMasterTenantContextError(error)) {
      return NextResponse.json({
        success: true,
        config: {
          inscricao_estadual: '',
          inscricao_municipal: '',
          regime_tributario: '',
          nfe_ambiente: 'homologacao',
          codigo_municipio_ibge: '',
          certificado_configurado: false,
          senha_certificado_configurada: false,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: getRouteErrorMessage(error, 'Falha ao carregar configuracao fiscal.') },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { empresaId } = await getAuthenticatedTenantContext()
    const body = (await request.json()) as Record<string, unknown>
    const config = await updateFiscalConfig(empresaId, body)
    return NextResponse.json({ success: true, config })
  } catch (error: unknown) {
    if (isMasterTenantContextError(error)) {
      return NextResponse.json(
        { success: false, error: 'Usuarios Master nao podem configurar parametros fiscais.' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: getRouteErrorMessage(error, 'Falha ao salvar configuracao fiscal.') },
      { status: 400 }
    )
  }
}
