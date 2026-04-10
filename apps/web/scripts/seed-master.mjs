import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadDotEnvLocal() {
  // Load repo-root .env.local for local execution (no extra deps)
  const envPath = path.resolve(process.cwd(), "..", "..", ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnvLocal();

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

async function getUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = (data?.users || []).find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  return user || null;
}

async function main() {
  let userId = null;

  const { data, error } = await supabase.auth.admin.createUser({
    email: MASTER_EMAIL,
    password: MASTER_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    // Idempotência: se já existir, reseta senha e segue
    if (error.code === "email_exists" || error.status === 422) {
      const existing = await getUserByEmail(MASTER_EMAIL);
      if (!existing?.id) throw error;

      const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: MASTER_PASSWORD,
        email_confirm: true,
      });
      if (updErr) throw updErr;

      userId = existing.id;
    } else {
      throw error;
    }
  } else {
    userId = data?.user?.id || null;
  }

  if (!userId) throw new Error("Master user id not resolved");

  const { error: profileErr } = await supabase.from("user_profiles").upsert({
    user_id: userId,
    empresa_id: null,
    role: "master",
  });
  if (profileErr) throw profileErr;

  console.log("Master user ensured:");
  console.log(`- email: ${MASTER_EMAIL}`);
  console.log(`- password: ${MASTER_PASSWORD}`);
  console.log(`- user_id: ${userId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

