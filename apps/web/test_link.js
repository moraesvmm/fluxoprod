const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, supabaseServiceRole);

async function run() {
  const email = 'test_generate_link_' + Date.now() + '@example.com';
  console.log('Creating user:', email);
  
  const { data: user, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: false
  });
  
  if (createErr) {
    console.error('Create error:', createErr);
    return;
  }
  
  console.log('User created:', user.user.id);
  
  console.log('Generating signup link...');
  const { data: link1, error: linkErr1 } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: email,
    password: 'password123'
  });
  console.log('Signup link result:', { link1, linkErr1 });
  
  console.log('Generating signup link without password...');
  const { data: link2, error: linkErr2 } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: email,
  });
  console.log('Signup link no-pass result:', { link2, linkErr2 });

  console.log('Generating magic link...');
  const { data: link3, error: linkErr3 } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
  });
  console.log('Magic link result:', { link3, linkErr3 });
  
  await admin.auth.admin.deleteUser(user.user.id);
  console.log('Cleaned up');
}

run();
