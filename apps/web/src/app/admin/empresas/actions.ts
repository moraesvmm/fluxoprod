"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteEmpresaComUsuariosAction(empresaId: string) {
  const admin = createAdminClient();

  try {
    // 1. Buscar todos os usuários vinculados à empresa
    const { data: profiles, error: profilesError } = await admin
      .from("user_profiles")
      .select("user_id")
      .eq("empresa_id", empresaId);

    if (profilesError) throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);

    // 2. Deletar os usuários do Auth
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        if (profile.user_id) {
          const { error: deleteUserError } = await admin.auth.admin.deleteUser(profile.user_id);
          if (deleteUserError) {
            console.error(`Falha ao deletar usuário Auth ${profile.user_id}:`, deleteUserError);
            // Continua mesmo com erro, para tentar limpar o resto
          }
        }
      }
    }

    // 3. Chamar a RPC para deletar o resto (schema, etc)
    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc('deletar_empresa_master', {
      p_empresa_id: empresaId,
      p_confirmacao_exclusao: true
    });

    if (rpcError) throw new Error(`Erro na RPC de exclusão: ${rpcError.message}`);

    const result = data as { status: string; message: string };
    if (result.status !== 'success') {
      throw new Error(result.message);
    }

    revalidatePath("/admin/empresas");
    return { success: true, message: "Empresa e usuários excluídos permanentemente." };
  } catch (error: any) {
    console.error("Erro na Server Action de exclusão de empresa:", error);
    return { success: false, error: error.message || "Erro interno ao excluir empresa." };
  }
}
