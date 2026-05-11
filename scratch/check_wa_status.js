const WA_SERVICE_URL = 'https://fluxo-whatsapp-service-production.up.railway.app';
const WA_API_KEY = 'fluxo-wa-9f3k2m8x4p7q1r6t';

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uynabqysfyytdsogdwhc.supabase.co"; // Get from .env.local if possible, but I can just use the DB URL
  // Actually, I can just query the endpoint using a random tenantId to see what it returns by default.
  const tenantId = 'fake-new-tenant-' + Date.now();
  
  const res = await fetch(`${WA_SERVICE_URL}/status`, {
    headers: { 'x-api-key': WA_API_KEY, 'x-tenant-id': tenantId },
  });
  const data = await res.json();
  console.log(data);
}
main();
