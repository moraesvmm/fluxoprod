import 'server-only';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

interface CreateUserPayload {
  nome: string;
  email: string;
  password: string;
  modulos_permitidos: string[]; // keys dos módulos liberados
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  let createdAuthUserId: string | null = null;

  try {
    // 1. Validar sessão do chamador via cookie de sessão
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user: caller }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !caller) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // 2. Verificar que o chamador é tenant_admin e obter empresa_id
    const { data: callerProfile } = await admin
      .from('user_profiles')
      .select('role, empresa_id')
      .eq('user_id', caller.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Permissão negada. Apenas administradores podem convidar usuários.' }, { status: 403 });
    }

    const empresa_id = callerProfile.empresa_id;

    // 3. Verificar limite de usuários do plano
    const { data: limiteRows } = await admin.rpc('verificar_limite_usuarios', { p_empresa_id: empresa_id });
    const limiteData = limiteRows?.[0];

    if (!limiteData?.pode_criar) {
      const { data: empresa } = await admin.from('empresas').select('plan_name, limite_usuarios').eq('id', empresa_id).maybeSingle();
      return NextResponse.json({
        error: `Limite de usuários atingido para o plano ${empresa?.plan_name || 'atual'} (${empresa?.limite_usuarios || 3} usuários). Faça upgrade para adicionar mais membros.`,
        upgrade_required: true,
        usuarios_ativos: limiteData?.usuarios_ativos,
        limite: limiteData?.limite,
      }, { status: 403 });
    }

    // 4. Validar payload
    const payload = (await request.json()) as CreateUserPayload;

    if (!payload.nome?.trim() || !payload.email?.trim() || !payload.password?.trim()) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }
    if (payload.password.trim().length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    // 5. Criar usuário no Auth (email_confirm: false → Supabase envia link de ativação)
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      email_confirm: false,
      user_metadata: { nome: payload.nome.trim() },
    });

    if (createError) {
      if (createError.message.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 409 });
      }
      throw new Error(createError.message);
    }

    createdAuthUserId = newUser.user.id;

    // 6. Vincular ao tenant (role sempre inicia como tenant_user)
    const { error: profileError } = await admin.from('user_profiles').insert({
      user_id: createdAuthUserId,
      empresa_id,
      role: 'tenant_user',
      nome: payload.nome.trim(),
    });

    if (profileError) throw new Error(profileError.message);

    // 7. Gravar permissões de módulo iniciais
    if (payload.modulos_permitidos && payload.modulos_permitidos.length > 0) {
      const modulosPayload = payload.modulos_permitidos.map(key => ({
        user_id: createdAuthUserId!,
        empresa_id,
        modulo_key: key,
        permitido: true,
      }));

      const { error: modulosError } = await admin
        .from('usuario_modulos_permitidos')
        .insert(modulosPayload);

      if (modulosError) {
        console.error('[users/create] Erro ao gravar módulos:', modulosError);
        // Não derruba o fluxo — módulos podem ser configurados depois
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário criado. Um e-mail de confirmação foi enviado.',
      data: { user_id: createdAuthUserId },
    });

  } catch (error: any) {
    // Rollback: remover usuário do Auth se o vínculo falhou
    if (createdAuthUserId) {
      await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    }
    console.error('[POST /api/tenant/users/create]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
