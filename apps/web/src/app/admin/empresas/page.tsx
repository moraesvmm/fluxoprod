import { createClient } from "@/utils/supabase/server";
import { requireMaster } from "@/utils/auth/requireMaster";

export default async function AdminEmpresasPage() {
  await requireMaster();
  const supabase = await createClient();

  const { data: empresas, error } = await supabase
    .from("empresas")
    .select("id, cnpj, razao_social, porte, segmento, schema_name, status, criado_em")
    .order("criado_em", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-bold">Empresas</h1>
        <p className="mt-2 text-sm text-rose-600">Erro ao carregar: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
        <p className="text-sm text-slate-600">Cadastro central e schemas provisionados.</p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Razão social</th>
              <th className="px-4 py-3 text-left font-semibold">CNPJ</th>
              <th className="px-4 py-3 text-left font-semibold">Schema</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {(empresas || []).map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-4 py-3 font-medium text-slate-900">{e.razao_social}</td>
                <td className="px-4 py-3 text-slate-700">{e.cnpj}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{e.schema_name}</td>
                <td className="px-4 py-3 text-slate-700">{e.status}</td>
              </tr>
            ))}
            {(!empresas || empresas.length === 0) && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  Nenhuma empresa cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

