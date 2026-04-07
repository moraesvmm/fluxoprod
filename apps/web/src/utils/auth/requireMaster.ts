import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function requireMaster() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'master') redirect('/tenant/dashboard')

  return { user }
}

