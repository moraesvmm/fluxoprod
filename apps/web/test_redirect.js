const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wkxtlvxotvutycbupfuh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU');

async function run() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email: 'teste_redirect@teste.com',
    password: 'password123',
    options: {
      redirectTo: 'https://seufluxoerp.com.br/login'
    }
  });
  console.log("Action Link 1:", data?.properties?.action_link);
  
  const actionLink = data?.properties?.action_link;
  if (actionLink) {
    const res = await fetch(actionLink, { redirect: 'manual' });
    console.log("Redirects to 1:", res.headers.get('location'));
  }

  const { data: data2 } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email: 'teste_redirect2@teste.com',
    password: 'password123',
    options: {
      redirectTo: 'https://fluxoprod.vercel.app/login'
    }
  });
  console.log("Action Link 2:", data2?.properties?.action_link);
  
  const actionLink2 = data2?.properties?.action_link;
  if (actionLink2) {
    const res2 = await fetch(actionLink2, { redirect: 'manual' });
    console.log("Redirects to 2:", res2.headers.get('location'));
  }
}
run();
