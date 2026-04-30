import { NextResponse } from 'next/server'

import { getFiscalConfig, updateFiscalConfig } from '@/lib/server/fiscal-config'
import { getAuthenticatedTenantContext } from '@/lib/server/tenant-context'

export async function GET() {
  try {
    const { empresaId } = await getAuthenticatedTenantContext()
    const config = await getFiscalConfig(empresaId)
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    // Se for um erro de contexto de master, retornamos um sucesso com config vazia
    if (error.message?.includes('Usuário master não possui contexto tenant')) {
      return NextResponse.json({ 
        success: true, 
        config: { 
          inscricao_estadual: '',
          inscricao_municipal: '',
          regime_tributario: '',
          nfe_ambiente: 'homologacao',
          codigo_municipio_ibge: '',
          certificado_configurado: false,
          senha_certificado_configurada: false
        } 
      })
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao carregar configuração fiscal.' },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { empresaId } = await getAuthenticatedTenantContext()
    const body = await request.json()
    const config = await updateFiscalConfig(empresaId, body || {})
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    if (error.message?.includes('Usuário master não possui contexto tenant')) {
      return NextResponse.json(
        { success: false, error: 'Usuários Master não podem configurar parâmetros fiscais.' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao salvar configuração fiscal.' },
      { status: 400 }
    )
  }
}
