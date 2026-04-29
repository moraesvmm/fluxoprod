import 'server-only'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export interface TenantContext {
  userId: string
  empresaId: string
  tenantSchema: string
}

export async function getAuthenticatedTenantContext(): Promise<TenantContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Usuário não autenticado.')
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('role, empresa_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Perfil do usuário não encontrado.')
  }

  if (profile.role === 'master') {
    throw new Error('Usuário master não possui contexto tenant para emissão fiscal.')
  }

  if (!profile.empresa_id) {
    throw new Error('Usuário tenant sem empresa vinculada.')
  }

  const { data: empresa, error: empresaError } = await admin
    .from('empresas')
    .select('id, schema_name')
    .eq('id', profile.empresa_id)
    .single()

  if (empresaError || !empresa?.schema_name) {
    throw new Error('Empresa tenant sem schema configurado.')
  }

  return {
    userId: user.id,
    empresaId: empresa.id,
    tenantSchema: empresa.schema_name,
  }
}
