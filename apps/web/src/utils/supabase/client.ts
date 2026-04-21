import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Log para debug de variáveis de ambiente no client-side
  console.log('[CLIENT] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET')
  console.log('[CLIENT] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// NOTA: Schema routing é garantido via RPC set_tenant_schema no middleware.
// O middleware configura o search_path no backend antes de cada requisição.
// Como todas as operações agora usam RPCs (Opção A - Database as Source of Truth),
// o schema correto é garantido automaticamente. O client-side não precisa configurar
// search_path explicitamente, pois as RPCs executam no schema configurado pelo middleware.
