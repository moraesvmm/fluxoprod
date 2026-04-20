const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkxtlvxotvutycbupfuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunctions() {
  const { data, error } = await supabase.rpc('get_functions'); 
  // Wait, get_functions might not exist. I should query pg_proc directly using a view or another rpc if available.
  // Actually, I can use the management key or just run a query if I have a way to run raw SQL.
  // Since I don't have a direct "run_sql" tool, I'll try to find a way to list functions.
  
  // Alternative: List functions by querying pg_proc via an existing RPC that might allow it, 
  // or just try to call them to confirm existence.
  
  console.log('Checking RPC existence...');
  const functionsToCheck = [
    'tenant_listar_clientes',
    'tenant_listar_tags_catalog',
    'tenant_dashboard_metricas',
    'tenant_dashboard_kpis_por_mes'
  ];

  for (const fn of functionsToCheck) {
    try {
      const { error } = await supabase.rpc(fn, {});
      if (error && error.code === 'PGRST202') {
        console.log(`${fn}: NOT FOUND (404)`);
      } else if (error) {
        console.log(`${fn}: ERROR ${error.code} - ${error.message}`);
      } else {
        console.log(`${fn}: EXISTS`);
      }
    } catch (e) {
      console.log(`${fn}: FAILED TO CALL`);
    }
  }
}

checkFunctions();
