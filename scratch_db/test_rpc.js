const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wkxtlvxotvutycbupfuh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU'
);

async function test() {
  const { data, error } = await supabase.rpc('get_frase_do_dia');
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
