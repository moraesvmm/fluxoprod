const { Client } = require('pg');
const client = new Client('postgresql://postgres:Vmm041126!Database@db.wkxtlvxotvutycbupfuh.supabase.co:5432/postgres');
client.connect().then(async () => {
  const res = await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'empresas' AND schemaname = 'public'");
  console.log(JSON.stringify(res.rows, null, 2));
  
  const res2 = await client.query("SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'empresas' AND constraint_schema = 'public'");
  console.log(JSON.stringify(res2.rows, null, 2));
  
  client.end();
}).catch(console.error);
