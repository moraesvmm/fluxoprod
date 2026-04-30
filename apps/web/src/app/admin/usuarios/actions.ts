"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deleteUsuarioAction(userId: string) {
  const admin = createAdminClient();

  try {
    // 1. Opcional: remover o perfil primeiro se não houver cascade, mas o deleteUser do Auth
    // geralmente cascadeia para public.user_profiles se a foreign key estiver configurada com ON DELETE CASCADE.
    // De toda forma, é mais seguro forçar a exclusão no public.user_profiles primeiro.
    await admin.from("user_profiles").delete().eq("user_id", userId);

    // 2. Deletar permanentemente o usuário do Auth
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath("/admin/usuarios");
    return { success: true, message: "Usuário excluído permanentemente." };
  } catch (error: any) {
    console.error("Erro na Server Action de exclusão de usuário:", error);
    return { success: false, error: error.message || "Erro interno ao excluir usuário." };
  }
}
