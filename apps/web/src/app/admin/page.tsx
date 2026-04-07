import { createClient } from "@/utils/supabase/server";
import { requireMaster } from "@/utils/auth/requireMaster";

export default async function AdminHome() {
  await requireMaster();
  const supabase = await createClient();

  const [{ count: empresasCount }, { count: usersCount }] = await Promise.all([
    supabase.from("empresas").select("*", { count: "exact", head: true }),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governança central</h1>
        <p className="text-sm text-slate-600">
          Administração global do Fluxo (multiempresa e modular).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <div className="text-sm text-slate-500">Empresas</div>
          <div className="mt-2 text-3xl font-bold">{empresasCount ?? 0}</div>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <div className="text-sm text-slate-500">Usuários</div>
          <div className="mt-2 text-3xl font-bold">{usersCount ?? 0}</div>
        </div>
      </div>
    </div>
  );
}

