import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// NOTA: Schema routing é garantido via RPC set_tenant_schema no middleware.
// O middleware configura o search_path no backend antes de cada requisição.
// Como todas as operações agora usam RPCs (Opção A - Database as Source of Truth),
// o schema correto é garantido automaticamente. O client-side não precisa configurar
// search_path explicitamente, pois as RPCs executam no schema configurado pelo middleware.
