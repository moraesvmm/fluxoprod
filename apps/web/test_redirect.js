const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, supabaseServiceRole);

async function run() {
  const email = 'test_generate_link_' + Date.now() + '@example.com';
  
  const { data: user, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: false
  });
  
  console.log('Generating signup link with options.redirectTo...');
  const { data: link1 } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: email,
    options: {
      redirectTo: 'http://localhost:3000/login?confirmed=true'
    }
  });
  console.log('Link1 redirect_to:', link1?.properties?.redirect_to);
  
  console.log('Generating signup link with direct redirectTo...');
  const { data: link2 } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: email,
    redirectTo: 'http://localhost:3000/login?confirmed=true'
  });
  console.log('Link2 redirect_to:', link2?.properties?.redirect_to);

  await admin.auth.admin.deleteUser(user.user.id);
}

run();
