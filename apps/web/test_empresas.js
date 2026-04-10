const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkxtlvxotvutycbupfuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTEyNjAsImV4cCI6MjA5MTA2NzI2MH0.XUEkBM2dCEvHNbh00W969QjZ-gIwJ0yA5T-KLO3PtIw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'vidanovaimobiliaria@fluxo.local',
    password: 'FluxoAdmin123!',
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('Logged in successfully', authData.user.id);

  const { data, error } = await supabase.from('empresas').select('*').single();

  console.log('Empresas data:', data);
  console.log('Empresas error:', error);
}

testQuery();
