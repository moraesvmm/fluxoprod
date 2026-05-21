import { requireMaster } from "@/utils/auth/requireMaster";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function setModuleActive(formData: FormData) {
  "use server";
  const empresaId = String(formData.get("empresa_id") || "");
  const moduloKey = String(formData.get("modulo_key") || "");
  const ativo = formData.get("ativo") === "on";

  if (!empresaId || !moduloKey) return;

  const supabase = await createClient();
  // Usar upsert para criar o registro se não existir (fix: update silencioso quando módulo não estava cadastrado)
  await supabase
    .from("empresa_modulos")
    .upsert(
      {
        empresa_id: empresaId,
        modulo_key: moduloKey,
        ativo,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "empresa_id,modulo_key" }
    );

  revalidatePath("/admin/modulos");
}

export default async function AdminModulosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  await requireMaster();
  const supabase = await createClient();
  const { empresa: empresaId } = await searchParams;

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, razao_social")
    .order("razao_social", { ascending: true });

  const { data: catalogo } = await supabase
    .from("modulos_catalogo")
    .select("key, nome, descricao")
    .order("nome", { ascending: true });

  const { data: empresaMods } = empresaId
    ? await supabase
        .from("empresa_modulos")
        .select("modulo_key, ativo")
        .eq("empresa_id", empresaId)
    : { data: null as any };

  const ativoPorKey = new Map<string, boolean>(
    (empresaMods || []).map((m: { modulo_key: string; ativo: boolean }) => [m.modulo_key, !!m.ativo])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Módulos (feature flags)</h1>
        <p className="text-sm text-muted-foreground">
          Nenhum módulo é ativo por padrão. Apenas o usuário-master pode ativar/desativar por empresa.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground">Empresa</label>
            <select
              name="empresa"
              defaultValue={empresaId || ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {(empresas || []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.razao_social}
                </option>
              ))}
            </select>
          </div>
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            type="submit"
          >
            Carregar
          </button>
        </form>
      </div>

      {empresaId && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b bg-muted px-4 py-3 text-sm font-semibold text-foreground">
            Catálogo de módulos
          </div>
          <div className="divide-y">
            {(catalogo || []).map((m) => {
              const checked = ativoPorKey.get(m.key) ?? false;
              return (
                <form
                  key={m.key}
                  action={setModuleActive}
                  className="flex items-start justify-between gap-4 px-4 py-4"
                >
                  <input type="hidden" name="empresa_id" value={empresaId} />
                  <input type="hidden" name="modulo_key" value={m.key} />

                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{m.nome}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{m.descricao}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{m.key}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm text-foreground">
                      <input
                        type="checkbox"
                        name="ativo"
                        defaultChecked={checked}
                        className="mr-2"
                      />
                      Ativo
                    </label>
                    <button
                      className="rounded-md border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
                      type="submit"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

