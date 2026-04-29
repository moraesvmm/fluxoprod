import { NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/admin'
import { getAuthenticatedTenantContext } from '@/lib/server/tenant-context'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { empresaId } = await getAuthenticatedTenantContext()
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Arquivo de certificado inválido.' }, { status: 400 })
    }

    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith('.pfx') && !lowerName.endsWith('.p12')) {
      return NextResponse.json({ success: false, error: 'Envie um certificado .pfx ou .p12.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.storage
      .from('fiscal')
      .upload(`${empresaId}/certificado.pfx`, file, {
        upsert: true,
        contentType: 'application/x-pkcs12',
      })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao enviar certificado.' },
      { status: 400 }
    )
  }
}
