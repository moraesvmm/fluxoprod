const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkxtlvxotvutycbupfuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '31929d4a-33de-4c5d-8597-576679a54fb2',
    { password: 'FluxoAdmin123!' }
  );

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Password updated successfully!');
  }
}

updatePassword();
