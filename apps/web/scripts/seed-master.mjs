import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MASTER_EMAIL = process.env.MASTER_EMAIL || "master@fluxo.local";
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "FluxoMaster#123";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: MASTER_EMAIL,
    password: MASTER_PASSWORD,
    email_confirm: true,
  });

  if (error) throw error;
  if (!data?.user?.id) throw new Error("User not created");

  const { error: profileErr } = await supabase.from("user_profiles").upsert({
    user_id: data.user.id,
    empresa_id: null,
    role: "master",
  });
  if (profileErr) throw profileErr;

  console.log("Master user ensured:");
  console.log(`- email: ${MASTER_EMAIL}`);
  console.log(`- password: ${MASTER_PASSWORD}`);
  console.log(`- user_id: ${data.user.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

