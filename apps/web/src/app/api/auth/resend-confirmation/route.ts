import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "E-mail não informado." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verifica se o usuário existe e ainda não confirmou o e-mail
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) {
      console.error("[resend-confirmation] Erro ao listar usuários:", listError);
      return NextResponse.json({ error: "Erro interno ao localizar usuário." }, { status: 500 });
    }

    const user = listData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      // Por segurança, retornamos sucesso mesmo que o usuário não exista
      return NextResponse.json({ success: true });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Este e-mail já foi confirmado. Acesse o login." },
        { status: 400 }
      );
    }

    // Gera novo magic link de ativação
    const origin = request.headers.get("origin") || "https://fluxoprod.vercel.app";
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email: email,
      options: {
        redirectTo: `${origin}/login?confirmed=true`,
      },
    });

    if (linkError) {
      console.error("[resend-confirmation] Erro ao gerar link:", linkError);
      return NextResponse.json(
        { error: "Não foi possível gerar o link de ativação." },
        { status: 500 }
      );
    }

    const activationLink = linkData?.properties?.action_link;
    const userName =
      (user.user_metadata?.nome as string | undefined) ||
      email.split("@")[0];

    // Reenvia o e-mail de boas-vindas com o novo link
    await sendWelcomeEmail(email, userName, activationLink);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[resend-confirmation] Erro inesperado:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao reenviar confirmação.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
