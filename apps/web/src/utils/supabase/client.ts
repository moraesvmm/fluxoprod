import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient<any>> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return browserClient;
}

// NOTA: Schema routing é garantido via RPC set_tenant_schema no middleware.
// O middleware configura o search_path no backend antes de cada requisição.
// Como todas as operações agora usam RPCs (Opção A - Database as Source of Truth),
// o schema correto é garantido automaticamente. O client-side não precisa configurar
// search_path explicitamente, pois as RPCs executam no schema configurado pelo middleware.
