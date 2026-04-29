import { NextResponse } from 'next/server'

import { getFiscalConfig, updateFiscalConfig } from '@/lib/server/fiscal-config'
import { getAuthenticatedTenantContext } from '@/lib/server/tenant-context'

export async function GET() {
  try {
    const { empresaId } = await getAuthenticatedTenantContext()
    const config = await getFiscalConfig(empresaId)
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
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
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao salvar configuração fiscal.' },
      { status: 400 }
    )
  }
}
