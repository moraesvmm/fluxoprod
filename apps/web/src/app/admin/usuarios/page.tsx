import { requireMaster } from "@/utils/auth/requireMaster";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

async function createTenantUser(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const empresaId = String(formData.get("empresa_id") || "");
  const role = String(formData.get("role") || "");

  if (!email || !password || !empresaId) return;
  if (role !== "tenant_admin" && role !== "tenant_user") return;

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) return;

  await admin.from("user_profiles").upsert({
    user_id: created.user.id,
    empresa_id: empresaId,
    role,
  });

  revalidatePath("/admin/usuarios");
}

export default async function AdminUsuariosPage() {
  await requireMaster();
  const supabase = await createClient();

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, razao_social")
    .order("razao_social", { ascending: true });

  const { data: perfis } = await supabase
    .from("user_profiles")
    .select("user_id, empresa_id, role, criado_em")
    .order("criado_em", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="text-sm text-slate-600">
          Criação e vínculo de usuários por empresa (somente governança central).
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Criar usuário de empresa</h2>
        <form action={createTenantUser} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Senha (dev)</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Empresa</label>
            <select name="empresa_id" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value="">Selecione…</option>
              {(empresas || []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.razao_social}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Papel</label>
            <select name="role" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value="tenant_admin">Admin da empresa</option>
              <option value="tenant_user">Usuário comum</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Criar
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Perfis (últimos 50)</div>
        <table className="w-full text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">User ID</th>
              <th className="px-4 py-3 text-left font-semibold">Empresa</th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
            </tr>
          </thead>
          <tbody>
            {(perfis || []).map((p) => (
              <tr key={p.user_id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.user_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.empresa_id ?? "-"}</td>
                <td className="px-4 py-3 text-slate-800">{p.role}</td>
              </tr>
            ))}
            {(!perfis || perfis.length === 0) && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={3}>
                  Nenhum perfil encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

