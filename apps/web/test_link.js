const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wkxtlvxotvutycbupfuh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU');

async function run() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email: 'teste@teste.com',
    password: 'password123',
    options: {
      redirectTo: 'https://seufluxoerp.com.br/login?confirmed=true'
    }
  });
  console.log("Error:", error);
  console.log("Action Link:", data?.properties?.action_link);
}
run();
